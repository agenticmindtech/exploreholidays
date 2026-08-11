import { differenceInCalendarDays } from "date-fns";
import type {
  Filters,
  MethodAmount,
  Mistake,
  NamedAmount,
  Payment,
  Receivable,
  Refund,
  RefundStatus,
  ReportGroupRow,
  ReportResult,
  Role,
  Sale,
  StaffLoan,
} from "@/lib/types";
import { applyFilters, resolveDateRange } from "@/lib/logic/filters";
import { calcMargin, round3 } from "@/lib/logic/money";
import { agingBucket, agingDays, agingSummary } from "@/lib/logic/aging";
import { aggregateDashboard, MONEY_STATUSES } from "@/lib/logic/aggregate";
import { REFUND_STATUS } from "@/lib/constants/enums";
import { METHOD_META } from "@/lib/constants/display";
import { delay, getStore } from "./client";

/** Reshapes a MethodAmount[] into NamedAmount[] so it can flow through the same
 * 'bar' chart slot (BranchBar) as any other categorical breakdown — avoids a
 * separate chart type/component just for payment methods. */
function methodAmountsToNamed(rows: MethodAmount[]): NamedAmount[] {
  return rows.map((r) => ({ id: r.method, name: METHOD_META[r.method].label, revenue: r.amount, profit: 0, count: r.count }));
}

function scopeFilters(filters: Filters, role: Role, userId: string): Filters {
  return role === "staff" ? { ...filters, staffId: userId } : filters;
}

function sumBy<Row>(rows: Row[], fn: (row: Row) => number): number {
  return round3(rows.reduce((total, row) => total + fn(row), 0));
}

function matchesSearch(search: string | undefined, ...haystacks: (string | null | undefined)[]): boolean {
  if (!search?.trim()) return true;
  const needle = search.trim().toLowerCase();
  return haystacks.some((h) => h?.toLowerCase().includes(needle));
}

function inRange(dateIso: string, from: Date | null, to: Date | null): boolean {
  if (!from && !to) return true;
  const d = new Date(dateIso);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function buildGroups<Row>(
  rows: Row[],
  keyOf: (row: Row) => string,
  labelOf: (key: string) => string,
  subtotalOf: (rows: Row[]) => Record<string, number>
): ReportGroupRow<Row>[] {
  const map = new Map<string, Row[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const bucket = map.get(key) ?? [];
    bucket.push(row);
    map.set(key, bucket);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, groupRows]) => ({ key, label: labelOf(key), rows: groupRows, subtotal: subtotalOf(groupRows) }));
}

function emptyResult<Row>(): ReportResult<Row> {
  return { rows: [], total: 0, summary: {} };
}

/* ---------- 1. daily-sales ---------- */

export interface DailySalesRow extends Sale {
  staffName: string;
  branchName: string;
  serviceName: string;
}

async function dailySales(filters: Filters, role: Role, userId: string): Promise<ReportResult<DailySalesRow>> {
  await delay();
  const store = getStore();
  const scoped = scopeFilters(filters, role, userId);
  const getCustomerName = (s: Sale) => (s.customerId ? store.customers.find((c) => c.id === s.customerId)?.name : undefined);
  const envelope = applyFilters(store.sales, { ...scoped, page: 1, pageSize: Math.max(store.sales.length, 1) }, getCustomerName);

  const rows: DailySalesRow[] = envelope.rows.map((s) => ({
    ...s,
    staffName: store.users.find((u) => u.id === s.staffId)?.name ?? s.staffId,
    branchName: store.branches.find((b) => b.id === s.branchId)?.name ?? s.branchId,
    serviceName: store.serviceTypes.find((t) => t.id === s.serviceTypeId)?.name ?? s.serviceTypeId,
  }));

  // Every sale row is shown regardless of status (draft/returned/etc. included, for
  // pipeline visibility via the status column) — but subtotals and the grand total only
  // recognize posted+verified sales, matching the same MONEY_STATUSES rule the dashboard
  // aggregate uses everywhere else, so the two reconcile exactly for the same filters.
  const moneyRows = rows.filter((r) => MONEY_STATUSES.includes(r.status));

  const groups = buildGroups(
    rows,
    (r) => r.transactionDate.slice(0, 10),
    (key) => key,
    (groupRows) => {
      const realized = groupRows.filter((r) => MONEY_STATUSES.includes(r.status));
      return {
        count: realized.length,
        revenue: sumBy(realized, (r) => r.sellingPrice),
        cost: sumBy(realized, (r) => r.netCost),
        profit: sumBy(realized, (r) => r.profit),
      };
    }
  );

  return {
    rows,
    total: rows.length,
    summary: {
      count: moneyRows.length,
      revenue: sumBy(moneyRows, (r) => r.sellingPrice),
      cost: sumBy(moneyRows, (r) => r.netCost),
      profit: sumBy(moneyRows, (r) => r.profit),
    },
    groups,
  };
}

/* ---------- 2. profit-summary (grouped by service) ---------- */

export interface ProfitSummaryRow {
  id: string;
  name: string;
  count: number;
  cost: number;
  revenue: number;
  profit: number;
  avgMargin: number;
}

async function profitSummary(filters: Filters, role: Role, userId: string): Promise<ReportResult<ProfitSummaryRow>> {
  await delay();
  const store = getStore();
  const scoped = scopeFilters(filters, role, userId);
  const agg = aggregateDashboard(store.sales, scoped, {
    users: store.users,
    branches: store.branches,
    serviceTypes: store.serviceTypes,
  });

  const rows: ProfitSummaryRow[] = agg.byService.map((r) => {
    const cost = round3(r.revenue - r.profit);
    return { id: r.id, name: r.name, count: r.count, cost, revenue: r.revenue, profit: r.profit, avgMargin: calcMargin(r.profit, r.revenue) };
  });

  return {
    rows,
    total: rows.length,
    summary: { count: agg.count, revenue: agg.revenue, cost: agg.cost, profit: agg.profit, avgMargin: agg.avgMargin },
    charts: { trend: agg.dailyTrend, donut: agg.byService },
  };
}

/* ---------- 3. payment-collection ---------- */

export interface PaymentCollectionRow extends Payment {
  bookingNo: string;
  customerName: string;
  receivedByName: string;
}

async function paymentCollection(filters: Filters, role: Role, userId: string): Promise<ReportResult<PaymentCollectionRow>> {
  await delay();
  const store = getStore();
  const scoped = scopeFilters(filters, role, userId);
  const { from, to } = resolveDateRange(scoped);

  const rows: PaymentCollectionRow[] = store.payments
    .map((p) => ({ payment: p, sale: store.sales.find((s) => s.id === p.saleId) }))
    .filter(({ payment, sale }) => {
      if (scoped.branchId && sale?.branchId !== scoped.branchId) return false;
      if (scoped.staffId && sale?.staffId !== scoped.staffId) return false;
      if (scoped.paymentMethod && payment.method !== scoped.paymentMethod) return false;
      if (!inRange(payment.date, from, to)) return false;
      const customerName = sale?.customerId ? store.customers.find((c) => c.id === sale.customerId)?.name : undefined;
      if (!matchesSearch(scoped.search, sale?.bookingNo, customerName)) return false;
      return true;
    })
    .map(({ payment, sale }) => ({
      ...payment,
      bookingNo: sale?.bookingNo ?? "—",
      customerName: sale?.customerId ? store.customers.find((c) => c.id === sale.customerId)?.name ?? "—" : "Walk-in",
      receivedByName: store.users.find((u) => u.id === payment.receivedById)?.name ?? payment.receivedById,
    }));

  const agg = aggregateDashboard(store.sales, scoped, { payments: store.payments });

  return {
    rows,
    total: rows.length,
    summary: { count: rows.length, amount: sumBy(rows, (r) => r.amount) },
    charts: { bar: methodAmountsToNamed(agg.collectionsByMethod) },
  };
}

/* ---------- 4. supplier-usage ---------- */

export interface SupplierUsageRow {
  id: string;
  name: string;
  openingToSettle: number;
  usage: number;
  settlements: number;
  refundsCredit: number;
  toSettle: number;
  wallet: number;
}

async function supplierUsage(filters: Filters, role: Role): Promise<ReportResult<SupplierUsageRow>> {
  await delay();
  if (role === "staff") return emptyResult();

  const store = getStore();
  const { from, to } = resolveDateRange(filters);

  let rows: SupplierUsageRow[] = store.suppliers.map((supplier) => {
    const inPeriod = store.supplierTransactions.filter((t) => t.supplierId === supplier.id && inRange(t.date, from, to));
    const usage = sumBy(inPeriod.filter((t) => t.type === "usage"), (t) => t.amount);
    const settlements = sumBy(inPeriod.filter((t) => t.type === "settlement"), (t) => t.amount);
    const refundsCredit = sumBy(inPeriod.filter((t) => t.type === "refund_credit"), (t) => t.amount);
    return {
      id: supplier.id,
      name: supplier.name,
      openingToSettle: round3(supplier.toSettle - usage + settlements),
      usage,
      settlements,
      refundsCredit,
      toSettle: supplier.toSettle,
      wallet: supplier.walletBalance,
    };
  });

  if (filters.search?.trim()) rows = rows.filter((r) => matchesSearch(filters.search, r.name));

  const top10 = [...rows]
    .sort((a, b) => b.toSettle - a.toSettle)
    .slice(0, 10)
    .map((r) => ({ id: r.id, name: r.name, revenue: r.toSettle, profit: 0, count: 0 }));

  return {
    rows,
    total: rows.length,
    summary: { count: rows.length, totalToSettle: sumBy(rows, (r) => r.toSettle), totalWallet: sumBy(rows, (r) => r.wallet) },
    charts: { bar: top10 },
  };
}

/* ---------- 5. staff-mistakes ---------- */

export interface StaffMistakeRow extends Mistake {
  staffName: string;
  bookingNo: string | null;
}

async function staffMistakes(filters: Filters, role: Role, userId: string): Promise<ReportResult<StaffMistakeRow>> {
  await delay();
  // Grouped with staffLoans/supplierUsage/managementSummary as the four "finance-only"
  // reports the staff hub hides (spec §8) — blocked at the data layer too, consistent
  // with the other three, not just self-scoped, so the guard isn't only cosmetic.
  if (role === "staff") return emptyResult();

  const store = getStore();
  const scoped = scopeFilters(filters, role, userId);
  const { from, to } = resolveDateRange(scoped);

  const rows: StaffMistakeRow[] = store.mistakes
    .filter((m) => {
      if (scoped.staffId && m.staffId !== scoped.staffId) return false;
      if (!inRange(m.date, from, to)) return false;
      if (!matchesSearch(scoped.search, m.description)) return false;
      return true;
    })
    .map((m) => ({
      ...m,
      staffName: store.users.find((u) => u.id === m.staffId)?.name ?? m.staffId,
      bookingNo: m.saleId ? store.sales.find((s) => s.id === m.saleId)?.bookingNo ?? null : null,
    }));

  const groups = buildGroups(
    rows,
    (r) => r.staffId,
    (key) => store.users.find((u) => u.id === key)?.name ?? key,
    (groupRows) => ({
      count: groupRows.length,
      amount: sumBy(groupRows, (r) => r.amount),
      recoveredAmount: sumBy(groupRows, (r) => r.recoveredAmount),
    })
  );

  return {
    rows,
    total: rows.length,
    summary: { count: rows.length, amount: sumBy(rows, (r) => r.amount), recoveredAmount: sumBy(rows, (r) => r.recoveredAmount) },
    groups,
  };
}

/* ---------- 6 & 10. refunds (supplier-refunds / refund-tracking share the same rows) ---------- */

export interface RefundReportRow extends Refund {
  bookingNo: string;
  supplierName: string;
  responsibleStaffName: string;
}

function buildRefundRows(filters: Filters): RefundReportRow[] {
  const store = getStore();
  const { from, to } = resolveDateRange(filters);

  return store.refunds
    .map((r) => ({ refund: r, sale: store.sales.find((s) => s.id === r.saleId) }))
    .filter(({ refund, sale }) => {
      if (filters.staffId && refund.responsibleStaffId !== filters.staffId) return false;
      if (filters.branchId && sale?.branchId !== filters.branchId) return false;
      if (filters.supplierId && sale?.supplierId !== filters.supplierId) return false;
      if (!inRange(refund.requestDate, from, to)) return false;
      if (!matchesSearch(filters.search, sale?.bookingNo, refund.reason)) return false;
      return true;
    })
    .map(({ refund, sale }) => ({
      ...refund,
      bookingNo: sale?.bookingNo ?? "—",
      supplierName: sale ? store.suppliers.find((s) => s.id === sale.supplierId)?.name ?? "—" : "—",
      responsibleStaffName: store.users.find((u) => u.id === refund.responsibleStaffId)?.name ?? refund.responsibleStaffId,
    }));
}

function refundStageCounts(rows: RefundReportRow[]): Record<RefundStatus, number> {
  return REFUND_STATUS.reduce(
    (acc, status) => {
      acc[status] = rows.filter((r) => r.status === status).length;
      return acc;
    },
    {} as Record<RefundStatus, number>
  );
}

async function supplierRefunds(filters: Filters, role: Role, userId: string): Promise<ReportResult<RefundReportRow>> {
  await delay();
  const rows = buildRefundRows(scopeFilters(filters, role, userId));
  return {
    rows,
    total: rows.length,
    summary: {
      count: rows.length,
      supplierAmount: sumBy(rows, (r) => r.supplierRefundAmount),
      customerAmount: sumBy(rows, (r) => r.customerRefundAmount),
      charge: sumBy(rows, (r) => r.charge),
    },
    charts: { funnel: refundStageCounts(rows) },
  };
}

async function refundTracking(filters: Filters, role: Role, userId: string): Promise<ReportResult<RefundReportRow>> {
  await delay();
  const rows = buildRefundRows(scopeFilters(filters, role, userId));
  return {
    rows,
    total: rows.length,
    summary: {
      count: rows.length,
      supplierAmount: sumBy(rows, (r) => r.supplierRefundAmount),
      customerAmount: sumBy(rows, (r) => r.customerRefundAmount),
      charge: sumBy(rows, (r) => r.charge),
    },
    charts: { funnel: refundStageCounts(rows) },
  };
}

/* ---------- 7. customer-receivables ---------- */

export interface ReceivableReportRow extends Receivable {
  partyName: string;
  bookingNo: string;
}

async function customerReceivables(filters: Filters, role: Role, userId: string): Promise<ReportResult<ReceivableReportRow>> {
  await delay();
  const store = getStore();
  const scoped = scopeFilters(filters, role, userId);

  const rows: ReceivableReportRow[] = store.receivables
    .filter((r) => r.type === "customer")
    .map((r) => ({ receivable: r, sale: store.sales.find((s) => s.id === r.saleId) }))
    .filter(({ receivable, sale }) => {
      if (scoped.staffId && sale?.staffId !== scoped.staffId) return false;
      if (scoped.branchId && sale?.branchId !== scoped.branchId) return false;
      const customerName = store.customers.find((c) => c.id === receivable.partyId)?.name;
      if (!matchesSearch(scoped.search, sale?.bookingNo, customerName)) return false;
      return true;
    })
    .map(({ receivable, sale }) => {
      const days = agingDays(receivable.dueDate);
      return {
        ...receivable,
        agingDays: days,
        agingBucket: agingBucket(days),
        partyName: store.customers.find((c) => c.id === receivable.partyId)?.name ?? receivable.partyId,
        bookingNo: sale?.bookingNo ?? "—",
      };
    });

  const groups = buildGroups(
    rows,
    (r) => r.agingBucket,
    (key) => `${key} days`,
    (groupRows) => ({
      count: groupRows.length,
      original: sumBy(groupRows, (r) => r.originalAmount),
      paid: sumBy(groupRows, (r) => r.paidAmount),
      balance: sumBy(groupRows, (r) => r.balance),
    })
  );

  return {
    rows,
    total: rows.length,
    summary: {
      count: rows.length,
      original: sumBy(rows, (r) => r.originalAmount),
      paid: sumBy(rows, (r) => r.paidAmount),
      balance: sumBy(rows, (r) => r.balance),
    },
    groups,
    charts: { aging: agingSummary(rows) },
  };
}

/* ---------- 8. staff-loans ---------- */

export interface StaffLoanRow extends StaffLoan {
  staffName: string;
}

async function staffLoans(filters: Filters, role: Role): Promise<ReportResult<StaffLoanRow>> {
  await delay();
  if (role === "staff") return emptyResult();

  const store = getStore();
  const { from, to } = resolveDateRange(filters);
  const rows: StaffLoanRow[] = store.staffLoans
    .filter((l) => (!filters.staffId || l.staffId === filters.staffId) && inRange(l.issueDate, from, to))
    .map((l) => ({ ...l, staffName: store.users.find((u) => u.id === l.staffId)?.name ?? l.staffId }));

  return {
    rows,
    total: rows.length,
    summary: { count: rows.length, totalAmount: sumBy(rows, (r) => r.amount), totalRemaining: sumBy(rows, (r) => r.remaining) },
  };
}

/* ---------- 9. pending-transactions ---------- */

export interface PendingTransactionRow extends Sale {
  serviceName: string;
  customerName: string;
  staffName: string;
  daysWaiting: number;
  overdue: boolean;
}

async function pendingTransactions(filters: Filters, role: Role, userId: string): Promise<ReportResult<PendingTransactionRow>> {
  await delay();
  const store = getStore();
  const scoped = scopeFilters(filters, role, userId);
  const activePending = store.sales.filter((s) => s.isPendingService && s.pendingState && s.pendingState !== "completed" && s.pendingState !== "cancelled");
  const envelope = applyFilters(activePending, { ...scoped, page: 1, pageSize: Math.max(activePending.length, 1) });

  const today = new Date();
  const rows: PendingTransactionRow[] = envelope.rows.map((s) => ({
    ...s,
    serviceName: store.serviceTypes.find((t) => t.id === s.serviceTypeId)?.name ?? s.serviceTypeId,
    customerName: s.customerId ? store.customers.find((c) => c.id === s.customerId)?.name ?? "—" : "Walk-in",
    staffName: store.users.find((u) => u.id === s.staffId)?.name ?? s.staffId,
    daysWaiting: Math.max(0, differenceInCalendarDays(today, new Date(s.updatedAt))),
    overdue: !!s.expectedCompletionDate && new Date(s.expectedCompletionDate) < today,
  }));

  return {
    rows,
    total: rows.length,
    summary: { count: rows.length, overdueCount: rows.filter((r) => r.overdue).length },
  };
}

/* ---------- 11. staff-performance ---------- */

export interface StaffPerformanceRow {
  staffId: string;
  name: string;
  month: string;
  salesCountTarget: number;
  revenueTarget: number;
  profitTarget: number;
  achievedCount: number;
  achievedRevenue: number;
  achievedProfit: number;
  achievementPercent: number;
  mistakesAmount: number;
  netContribution: number;
}

async function staffPerformance(filters: Filters, role: Role, userId: string): Promise<ReportResult<StaffPerformanceRow>> {
  await delay();
  const store = getStore();
  const scoped = scopeFilters(filters, role, userId);
  const month = scoped.month ?? new Date().toISOString().slice(0, 7);

  const targets = store.targets.filter((t) => t.month === month && (!scoped.staffId || t.staffId === scoped.staffId));

  const rows: StaffPerformanceRow[] = targets
    .map((t) => {
      const openMistakes = store.mistakes.filter((m) => m.staffId === t.staffId && m.status !== "recovered" && m.status !== "waived");
      const mistakesAmount = sumBy(openMistakes, (m) => m.amount - m.recoveredAmount);
      return {
        staffId: t.staffId,
        name: store.users.find((u) => u.id === t.staffId)?.name ?? t.staffId,
        month: t.month,
        salesCountTarget: t.salesCountTarget,
        revenueTarget: t.revenueTarget,
        profitTarget: t.profitTarget,
        achievedCount: t.achievedCount,
        achievedRevenue: t.achievedRevenue,
        achievedProfit: t.achievedProfit,
        achievementPercent: calcMargin(t.achievedRevenue, t.revenueTarget),
        mistakesAmount,
        netContribution: round3(t.achievedProfit - mistakesAmount),
      };
    })
    .sort((a, b) => b.achievedRevenue - a.achievedRevenue);

  return {
    rows,
    total: rows.length,
    summary: {
      count: rows.length,
      achievedRevenue: sumBy(rows, (r) => r.achievedRevenue),
      achievedProfit: sumBy(rows, (r) => r.achievedProfit),
      mistakesAmount: sumBy(rows, (r) => r.mistakesAmount),
      netContribution: sumBy(rows, (r) => r.netContribution),
    },
  };
}

/* ---------- 12. management-summary ---------- */

export interface ManagementSummaryRow {
  id: string;
  name: string;
  revenue: number;
  profit: number;
  count: number;
}

async function managementSummary(filters: Filters, role: Role, userId: string): Promise<ReportResult<ManagementSummaryRow>> {
  await delay();
  if (role === "staff") return emptyResult();

  const store = getStore();
  const scoped = scopeFilters(filters, role, userId);
  const agg = aggregateDashboard(store.sales, scoped, {
    users: store.users,
    branches: store.branches,
    serviceTypes: store.serviceTypes,
    receivables: store.receivables,
    suppliers: store.suppliers,
    refunds: store.refunds,
    targets: store.targets,
    payments: store.payments,
  });

  const rows: ManagementSummaryRow[] = agg.leaderboard.map((r) => ({ id: r.id, name: r.name, revenue: r.revenue, profit: r.profit, count: r.count }));
  const receivablesOutstanding = round3(agg.agingSummary.reduce((sum, b) => sum + b.balance, 0));

  return {
    rows,
    total: rows.length,
    summary: {
      revenue: agg.revenue,
      cost: agg.cost,
      profit: agg.profit,
      count: agg.count,
      avgMargin: agg.avgMargin,
      totalToSettle: agg.totalToSettle,
      receivablesOutstanding,
    },
    charts: { trend: agg.dailyTrend, donut: agg.byService, bar: agg.byBranch, methodSplit: methodAmountsToNamed(agg.byMethod) },
  };
}

/* ---------- Registry ---------- */

export type ReportDataFn = (filters: Filters, role: Role, userId: string) => Promise<ReportResult<Record<string, unknown>>>;

// Every dataFn's Row type is a plain data interface — structurally compatible with
// Record<string, unknown>, just without a formal index signature — so the registry
// casts each entry to the shared ReportDataFn shape rather than widening every
// function's own (more specific, more useful while authoring) return type.
export const reportsApi: Record<string, ReportDataFn> = {
  dailySales: dailySales as unknown as ReportDataFn,
  profitSummary: profitSummary as unknown as ReportDataFn,
  paymentCollection: paymentCollection as unknown as ReportDataFn,
  supplierUsage: ((filters: Filters, role: Role) => supplierUsage(filters, role)) as unknown as ReportDataFn,
  staffMistakes: staffMistakes as unknown as ReportDataFn,
  supplierRefunds: supplierRefunds as unknown as ReportDataFn,
  customerReceivables: customerReceivables as unknown as ReportDataFn,
  staffLoans: ((filters: Filters, role: Role) => staffLoans(filters, role)) as unknown as ReportDataFn,
  pendingTransactions: pendingTransactions as unknown as ReportDataFn,
  refundTracking: refundTracking as unknown as ReportDataFn,
  staffPerformance: staffPerformance as unknown as ReportDataFn,
  managementSummary: managementSummary as unknown as ReportDataFn,
};
