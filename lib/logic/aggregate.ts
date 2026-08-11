import { differenceInCalendarDays, isToday, subDays } from "date-fns";
import type {
  AuditLog,
  Branch,
  DashboardAggregate,
  Filters,
  LeaderboardRow,
  MethodAmount,
  Mistake,
  NamedAmount,
  Payment,
  Receivable,
  Refund,
  RefundStatus,
  Sale,
  SaleStatus,
  ServiceType,
  SessionUser,
  SettlementDueRow,
  Supplier,
  Target,
  TargetProgressRow,
  TrendPoint,
} from "@/lib/types";
import { applyFilters, resolveDateRange } from "./filters";
import { round3 } from "./money";
import { agingSummary } from "./aging";
import { SALE_STATUS, REFUND_STATUS } from "@/lib/constants/enums";

export interface AggregateContext {
  users?: SessionUser[];
  branches?: Branch[];
  serviceTypes?: ServiceType[];
  receivables?: Receivable[];
  suppliers?: Supplier[];
  refunds?: Refund[];
  targets?: Target[];
  auditLogs?: AuditLog[];
  mistakes?: Mistake[];
  payments?: Payment[];
}

export const MONEY_STATUSES: SaleStatus[] = ["posted", "verified"];

export function emptyMoney() {
  return { revenue: 0, cost: 0, profit: 0, count: 0 };
}

export function sumMoney(sales: Sale[]) {
  const totals = sales.reduce(
    (acc, s) => {
      acc.revenue += s.sellingPrice;
      acc.cost += s.netCost;
      acc.profit += s.profit;
      acc.count += 1;
      return acc;
    },
    emptyMoney()
  );
  return {
    revenue: round3(totals.revenue),
    cost: round3(totals.cost),
    profit: round3(totals.profit),
    count: totals.count,
  };
}

export function groupNamedAmount(sales: Sale[], keyOf: (s: Sale) => string, nameOf: (id: string) => string): NamedAmount[] {
  const map = new Map<string, NamedAmount>();
  for (const sale of sales) {
    const id = keyOf(sale);
    const entry = map.get(id) ?? { id, name: nameOf(id), revenue: 0, profit: 0, count: 0 };
    entry.revenue = round3(entry.revenue + sale.sellingPrice);
    entry.profit = round3(entry.profit + sale.profit);
    entry.count += 1;
    map.set(id, entry);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

export function aggregateDashboard(sales: Sale[], filters: Filters, context: AggregateContext = {}): DashboardAggregate {
  const envelope = applyFilters(sales, { ...filters, page: 1, pageSize: Math.max(sales.length, 1) });
  const filtered = envelope.rows;

  const moneyRows = filtered.filter((s) => MONEY_STATUSES.includes(s.status));
  const current = sumMoney(moneyRows);
  const avgMargin = current.revenue > 0 ? round3((current.profit / current.revenue) * 100 * 100) / 100 : 0;

  // Previous period of equal length, immediately preceding the current range.
  const { from, to } = resolveDateRange(filters);
  let prev = emptyMoney();
  let prevMoneyRows: Sale[] = [];
  if (from && to) {
    const spanDays = Math.max(1, differenceInCalendarDays(to, from) + 1);
    const prevTo = subDays(from, 1);
    const prevFrom = subDays(prevTo, spanDays - 1);
    prevMoneyRows = sales.filter((s) => {
      if (!MONEY_STATUSES.includes(s.status)) return false;
      if (filters.branchId && s.branchId !== filters.branchId) return false;
      if (filters.staffId && s.staffId !== filters.staffId) return false;
      const d = new Date(s.transactionDate);
      return d >= prevFrom && d <= prevTo;
    });
    prev = sumMoney(prevMoneyRows);
  }

  const statusCounts = SALE_STATUS.reduce((acc, status) => {
    acc[status] = filtered.filter((s) => s.status === status).length;
    return acc;
  }, {} as Record<SaleStatus, number>);

  const branchName = (id: string) => context.branches?.find((b) => b.id === id)?.name ?? id;
  const serviceName = (id: string) => context.serviceTypes?.find((s) => s.id === id)?.name ?? id;
  const staffName = (id: string) => context.users?.find((u) => u.id === id)?.name ?? id;

  const byBranch = groupNamedAmount(moneyRows, (s) => s.branchId, branchName);
  const byService = groupNamedAmount(moneyRows, (s) => s.serviceTypeId, serviceName);
  const byStaff = groupNamedAmount(moneyRows, (s) => s.staffId, staffName);

  const byMethod: MethodAmount[] = [];
  const methodMap = new Map<string, MethodAmount>();
  for (const sale of moneyRows) {
    const entry = methodMap.get(sale.paymentMethod) ?? { method: sale.paymentMethod, amount: 0, count: 0 };
    entry.amount = round3(entry.amount + sale.sellingPrice);
    entry.count += 1;
    methodMap.set(sale.paymentMethod, entry);
  }
  byMethod.push(...methodMap.values());

  // Collections are the actual Payment ledger, not sale.amountReceived — a payment can
  // land on a different date than the sale itself (e.g. a receivable installment).
  const saleById = new Map(sales.map((s) => [s.id, s]));
  const collectionsMap = new Map<string, MethodAmount>();
  for (const payment of context.payments ?? []) {
    const sale = saleById.get(payment.saleId);
    if (filters.branchId && sale?.branchId !== filters.branchId) continue;
    if (filters.staffId && sale?.staffId !== filters.staffId) continue;
    if (from || to) {
      const d = new Date(payment.date);
      if (from && d < from) continue;
      if (to && d > to) continue;
    }
    const entry = collectionsMap.get(payment.method) ?? { method: payment.method, amount: 0, count: 0 };
    entry.amount = round3(entry.amount + payment.amount);
    entry.count += 1;
    collectionsMap.set(payment.method, entry);
  }
  const collectionsByMethod = [...collectionsMap.values()];

  const trendMap = new Map<string, TrendPoint>();
  for (const sale of moneyRows) {
    const day = sale.transactionDate.slice(0, 10);
    const point = trendMap.get(day) ?? { date: day, revenue: 0, cost: 0, profit: 0 };
    point.revenue = round3(point.revenue + sale.sellingPrice);
    point.cost = round3(point.cost + sale.netCost);
    point.profit = round3(point.profit + sale.profit);
    trendMap.set(day, point);
  }
  const dailyTrend = [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  const scopedAll = sales.filter((s) => {
    if (filters.branchId && s.branchId !== filters.branchId) return false;
    if (filters.staffId && s.staffId !== filters.staffId) return false;
    return true;
  });
  const submittedQueue = scopedAll.filter((s) => s.status === "submitted");
  const oldestSubmittedAt = submittedQueue.reduce<string | null>((oldest, s) => {
    if (!s.submittedAt) return oldest;
    if (!oldest || s.submittedAt < oldest) return s.submittedAt;
    return oldest;
  }, null);
  const queueStats = {
    inQueue: submittedQueue.length,
    oldestSubmittedAt,
    verifiedToday: scopedAll.filter((s) => s.verifiedAt && isToday(new Date(s.verifiedAt))).length,
    postedToday: scopedAll.filter((s) => s.postedAt && isToday(new Date(s.postedAt))).length,
    returnedPeriod: filtered.filter((s) => s.status === "returned").length,
  };

  const agingSummaryRows = context.receivables ? agingSummary(context.receivables) : [];

  const settlementsDue: SettlementDueRow[] = (context.suppliers ?? [])
    .filter((s) => s.toSettle > 0)
    .sort((a, b) => b.toSettle - a.toSettle)
    .slice(0, 5)
    .map((s) => ({ supplierId: s.id, name: s.name, toSettle: round3(s.toSettle) }));

  const totalToSettle = round3((context.suppliers ?? []).reduce((sum, s) => sum + s.toSettle, 0));

  const refundStageCounts = REFUND_STATUS.reduce((acc, status) => {
    acc[status] = (context.refunds ?? []).filter((r) => r.status === status).length;
    return acc;
  }, {} as Record<RefundStatus, number>);

  const refundsAwaitedFromSuppliers = round3(
    (context.refunds ?? [])
      .filter((r) => r.status === "requested" || r.status === "sent_to_supplier")
      .reduce((sum, r) => sum + r.supplierRefundAmount, 0)
  );

  const openMistakes = (context.mistakes ?? []).filter((m) => m.status !== "recovered" && m.status !== "waived");
  const mistakesSummary = {
    openCount: openMistakes.length,
    openAmount: round3(openMistakes.reduce((sum, m) => sum + (m.amount - m.recoveredAmount), 0)),
  };

  // Rank each staff member in the previous equal-length period (full ranking, not just top 5)
  // so rankDelta reflects genuine movement, not just presence in the current top 5.
  const prevByStaff = groupNamedAmount(prevMoneyRows, (s) => s.staffId, staffName);
  const prevRankById = new Map(prevByStaff.map((row, idx) => [row.id, idx]));

  const leaderboard: LeaderboardRow[] = byStaff.slice(0, 5).map((row, idx) => {
    const prevRank = prevRankById.get(row.id);
    return {
      ...row,
      avatar: context.users?.find((u) => u.id === row.id)?.avatar ?? null,
      rankDelta: prevRank === undefined ? 0 : prevRank - idx,
    };
  });

  // Audit logs carry no branchId, so they're scoped by staff + the same date range as
  // everything else; module-level filtering (e.g. "finance actions only") is a pure
  // display join left to the widget/page consuming this array.
  const recentActivity = (context.auditLogs ?? [])
    .filter((log) => {
      if (filters.staffId && log.userId !== filters.staffId) return false;
      if (from || to) {
        const d = new Date(log.timestamp);
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      return true;
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 20);

  const targetsProgress: TargetProgressRow[] = (context.targets ?? []).map((t) => ({
    staffId: t.staffId,
    name: staffName(t.staffId),
    avatar: context.users?.find((u) => u.id === t.staffId)?.avatar ?? null,
    salesCountTarget: t.salesCountTarget,
    revenueTarget: t.revenueTarget,
    profitTarget: t.profitTarget,
    achievedCount: t.achievedCount,
    achievedRevenue: t.achievedRevenue,
    achievedProfit: t.achievedProfit,
  }));

  return {
    revenue: current.revenue,
    cost: current.cost,
    profit: current.profit,
    count: current.count,
    avgMargin,
    prev,
    statusCounts,
    byBranch,
    byService,
    byMethod,
    byStaff,
    dailyTrend,
    queueStats,
    collectionsByMethod,
    agingSummary: agingSummaryRows,
    settlementsDue,
    totalToSettle,
    refundStageCounts,
    refundsAwaitedFromSuppliers,
    mistakesSummary,
    leaderboard,
    targetsProgress,
    recentActivity,
  };
}
