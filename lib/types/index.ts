/* ============================================================
   04-TYPES.ts — TravelDesk Pro: AUTHORITATIVE TYPE SYSTEM
   Copy verbatim into lib/types/index.ts in Phase 2.
   Matches 02-DATA-MODELS.md field-for-field. Do not rename.
   ============================================================ */

import type React from "react";

/* ---------- ENUM UNION TYPES ---------- */
export type Role = 'admin' | 'manager' | 'accounts' | 'staff';

export type SaleStatus =
  | 'draft' | 'submitted' | 'verified' | 'posted' | 'returned' | 'cancelled';

export type PaymentMethod =
  | 'benefit_pay' | 'credit_card_online' | 'cash' | 'fawri_cheque' | 'not_paid_refund';

export type PaymentStatus = 'paid' | 'partial' | 'pending' | 'refund';

export type ServiceKind =
  | 'ticket' | 'hotel' | 'visa' | 'package' | 'cruise'
  | 'insurance' | 'transport' | 'umrah' | 'other';

export type RefundStatus =
  | 'requested' | 'sent_to_supplier' | 'received_from_supplier'
  | 'paid_to_customer' | 'rejected';

export type ReceivableType = 'customer' | 'staff';
export type ReceivableState = 'open' | 'partial' | 'settled' | 'written_off';
export type AgingBucket = '0-30' | '31-60' | '61-90' | '90+';

export type SupplierTxnType =
  | 'topup' | 'usage' | 'settlement' | 'refund_credit' | 'adjustment';

export type SupplierType =
  | 'airline' | 'hotel' | 'visa_center' | 'cruise_line' | 'dmc' | 'insurance' | 'other';

export type SettlementCycle = 'weekly' | 'biweekly' | 'monthly';

export type LoanStatus = 'active' | 'completed' | 'defaulted';

export type PendingState =
  | 'in_process' | 'awaiting_supplier' | 'awaiting_customer' | 'completed' | 'cancelled';

export type MistakeStatus =
  | 'reported' | 'accepted' | 'recovering' | 'recovered' | 'waived';

export type NotificationType =
  | 'sale_submitted' | 'sale_returned' | 'sale_verified' | 'sale_posted'
  | 'refund_update' | 'payment_received' | 'target_alert' | 'system';

export type CustomerType = 'individual' | 'corporate';

export type AuditAction =
  | 'create' | 'update' | 'submit' | 'verify' | 'return' | 'post'
  | 'cancel' | 'delete' | 'payment' | 'refund_advance' | 'topup'
  | 'settlement' | 'loan' | 'installment' | 'login' | 'settings';

export type AuditModule =
  | 'sales' | 'payments' | 'refunds' | 'receivables' | 'suppliers'
  | 'loans' | 'mistakes' | 'users' | 'branches' | 'services'
  | 'customers' | 'targets' | 'settings' | 'auth';

/* ---------- ENTITIES (16 tables) ---------- */

export interface User {
  id: string;                    // "USR-003"
  name: string;
  email: string;
  password: string;              // mock only — stripped from session
  role: Role;
  branchId: string;
  phone: string;
  avatar: string | null;
  designation: string;
  joinDate: string;              // ISO date
  isActive: boolean;
  commissionPercent: number;
  lastLoginAt: string | null;    // ISO datetime
  createdAt: string;
}

/** User as stored in session / authStore (never carries password). */
export type SessionUser = Omit<User, 'password'>;

export interface Branch {
  id: string;                    // "BR-001"
  name: string;
  code: string;                  // "MNM"
  address: string;
  phone: string;
  managerId: string | null;
  isActive: boolean;
  color: string;                 // token hex from palette swatches
}

export interface Supplier {
  id: string;                    // "SUP-004"
  name: string;
  code: string;
  type: SupplierType;
  contactPerson: string;
  phone: string;
  email: string;
  creditLimit: number;
  walletBalance: number;
  usedCredit: number;
  toSettle: number;
  settlementCycle: SettlementCycle;
  currency: string;              // "BHD"
  isActive: boolean;
}

export interface ServiceType {
  id: string;                    // "SRV-001"
  name: string;
  kind: ServiceKind;
  icon: string;                  // lucide icon name, e.g. "Plane"
  color: string;
  requiresPnr: boolean;
  isActive: boolean;
}

export interface Customer {
  id: string;                    // "CUS-021"
  name: string;
  phone: string;
  email: string | null;
  nationality: string | null;
  passportNo: string | null;
  type: CustomerType;
  companyName: string | null;
  totalPurchases: number;
  outstanding: number;
  createdAt: string;
}

export interface Sale {
  id: string;                    // "SAL-0142"
  bookingNo: string;             // "BK-2026-0142" — unique, duplicate-checked
  pnr: string | null;
  transactionDate: string;       // ISO date
  branchId: string;
  staffId: string;               // AUTO from session — never user-editable for staff
  customerId: string | null;
  serviceTypeId: string;
  destination: string;
  description: string;
  supplierId: string;

  netCost: number;
  sellingPrice: number;
  profit: number;                // AUTO: sellingPrice − netCost
  marginPercent: number;         // AUTO
  currency: string;
  exchangeRate: number;
  vatPercent: number;
  vatAmount: number;

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amountReceived: number;
  balanceDue: number;            // AUTO: sellingPrice − amountReceived

  status: SaleStatus;
  isPendingService: boolean;
  pendingState: PendingState | null;
  expectedCompletionDate: string | null;

  returnReason: string | null;
  returnedById: string | null;
  returnedAt: string | null;
  verifiedById: string | null;
  verifiedAt: string | null;
  postedById: string | null;
  postedAt: string | null;

  remarks: string | null;
  attachments: string[];

  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
}

export interface Payment {
  id: string;                    // "PAY-0311"
  saleId: string;
  date: string;
  method: PaymentMethod;
  amount: number;
  reference: string | null;
  receivedById: string;
  note: string | null;
  createdAt: string;
}

export interface Refund {
  id: string;                    // "REF-0009"
  saleId: string;
  requestDate: string;
  reason: string;
  status: RefundStatus;
  expectedRefundDate: string | null;
  supplierRefundAmount: number;
  customerRefundAmount: number;
  charge: number;                // customerRefundAmount − supplierRefundAmount
  chargeToStaffId: string | null;
  responsibleStaffId: string;
  handledById: string | null;
  notes: string | null;
  updatedAt: string;
}

export interface Installment {
  no: number;
  dueDate: string;
  amount: number;
  paidOn: string | null;
}

export interface Receivable {
  id: string;                    // "RCV-0033"
  type: ReceivableType;
  partyId: string;               // customerId or userId
  saleId: string;
  originalAmount: number;
  paidAmount: number;
  balance: number;
  dueDate: string;
  agingDays: number;
  agingBucket: AgingBucket;
  state: ReceivableState;
  installments: Installment[];
  createdAt: string;
}

export interface LoanPaymentRow { date: string; amount: number; }

export interface StaffLoan {
  id: string;                    // "LON-0004"
  staffId: string;
  amount: number;
  reason: string;
  issueDate: string;
  installmentAmount: number;
  installmentsTotal: number;
  installmentsPaid: number;
  remaining: number;
  deductFromSalary: boolean;
  status: LoanStatus;
  approvedById: string;
  history: LoanPaymentRow[];
}

export interface SupplierTransaction {
  id: string;                    // "STX-0210"
  supplierId: string;
  date: string;
  type: SupplierTxnType;
  amount: number;
  saleId: string | null;
  balanceAfterWallet: number;
  balanceAfterCredit: number;
  reference: string | null;
  byUserId: string;
}

export interface Mistake {
  id: string;                    // "MST-0006"
  staffId: string;
  saleId: string | null;
  date: string;
  description: string;
  amount: number;
  status: MistakeStatus;
  recoveredAmount: number;
  reportedById: string;
  notes: string | null;
}

export interface FieldChange { from: unknown; to: unknown; }

export interface AuditLog {
  id: string;                    // "AUD-1042"
  timestamp: string;
  userId: string;
  userName: string;
  role: Role;
  module: AuditModule;
  entityId: string;
  action: AuditAction;
  fromStatus: SaleStatus | string | null;
  toStatus: SaleStatus | string | null;
  changes: Record<string, FieldChange> | null;
  ip: string | null;
  note: string | null;
}

export interface AppNotification {
  id: string;                    // "NTF-0512"
  toUserId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Target {
  id: string;                    // "TGT-2026-08-USR-003"
  staffId: string;
  month: string;                 // "2026-08"
  salesCountTarget: number;
  revenueTarget: number;
  profitTarget: number;
  achievedCount: number;
  achievedRevenue: number;
  achievedProfit: number;
}

export interface Settings {
  agencyName: string;
  logo: string;
  address: string;
  phone: string;
  currency: string;
  currencyDecimals: 2 | 3;
  vatPercent: number;
  fiscalYearStart: string;       // "01-01"
  duplicateCheckEnabled: boolean;
  defaultTheme: 'light' | 'dark';
  receivableDueDays: number;
}

/* ---------- UNIVERSAL FILTERS & API ENVELOPES ---------- */

export type DatePreset = 'today' | 'week' | 'month' | 'quarter' | 'year';
export type SortDir = 'asc' | 'desc';

export interface Filters {
  preset?: DatePreset;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
  staffId?: string;
  supplierId?: string;
  serviceTypeId?: string;
  customerId?: string;
  status?: SaleStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: SortDir;
  /** "YYYY-MM" — scopes dashboardApi.aggregate()'s targetsProgress to one month (Phase 6 TargetTable selector). */
  month?: string;
}

export interface ListSummary {
  count: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface ApiEnvelope<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  summary: ListSummary;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;  // field → human message
}

/* ---------- DASHBOARD AGGREGATE CONTRACT (Phase 6) ---------- */

export interface TrendPoint { date: string; revenue: number; cost: number; profit: number; }
export interface NamedAmount { id: string; name: string; revenue: number; profit: number; count: number; }
export interface MethodAmount { method: PaymentMethod; amount: number; count: number; }
export interface AgingSummaryRow { bucket: AgingBucket; count: number; balance: number; }
export interface LeaderboardRow extends NamedAmount { avatar: string | null; rankDelta: number; }
export interface SettlementDueRow { supplierId: string; name: string; toSettle: number; }
export interface QueueStats {
  inQueue: number;
  oldestSubmittedAt: string | null;
  verifiedToday: number;
  postedToday: number;
  returnedPeriod: number;
}
export interface TargetProgressRow {
  staffId: string; name: string; avatar: string | null;
  salesCountTarget: number; revenueTarget: number; profitTarget: number;
  achievedCount: number; achievedRevenue: number; achievedProfit: number;
}

export interface DashboardAggregate {
  revenue: number;
  cost: number;
  profit: number;
  count: number;
  avgMargin: number;
  prev: { revenue: number; cost: number; profit: number; count: number };
  statusCounts: Record<SaleStatus, number>;
  byBranch: NamedAmount[];
  byService: NamedAmount[];
  byMethod: MethodAmount[];
  byStaff: NamedAmount[];
  dailyTrend: TrendPoint[];
  queueStats: QueueStats;
  collectionsByMethod: MethodAmount[];
  agingSummary: AgingSummaryRow[];
  settlementsDue: SettlementDueRow[];
  /** Sum of toSettle across ALL suppliers (settlementsDue above is capped to the top 5). */
  totalToSettle: number;
  refundStageCounts: Record<RefundStatus, number>;
  /** Sum of supplierRefundAmount for refunds still requested/sent_to_supplier (not yet received). */
  refundsAwaitedFromSuppliers: number;
  /** Open (not reported→recovered/waived) staff mistakes — count and outstanding (unrecovered) amount. */
  mistakesSummary: { openCount: number; openAmount: number };
  leaderboard: LeaderboardRow[];
  targetsProgress: TargetProgressRow[];
  /** Most recent audit log entries in scope, newest first — feeds ActivityFeed. */
  recentActivity: AuditLog[];
}

/* ---------- REPORT CONFIG CONTRACT (Phase 7) ---------- */

export type ReportGroup = 'core' | 'additional';
export type ReportChartType = 'trend' | 'donut' | 'bar' | 'aging' | 'funnel';

export interface ReportSummaryCard {
  key: string;
  label: string;
  money?: boolean;
  tone?: 'success' | 'danger' | 'accent';
}

export interface ReportChart { type: ReportChartType; dataKey: string; span: number; }

export interface ReportColumn<Row = Record<string, unknown>> {
  key: string;
  label: string;
  money?: boolean;
  align?: 'left' | 'right' | 'center';
  render?: (row: Row) => React.ReactNode;
  /** Grand-total/subtotal lookup key into a dataFn's summary/group.subtotal object, when it differs from `key` (e.g. column "netCost" totals under summary.cost). Defaults to `key`. */
  summaryKey?: string;
}

export interface ReportConfig {
  id: string;
  title: string;
  group: ReportGroup;
  icon: string;
  description: string;
  filters: Array<'dateRange' | 'branch' | 'staff' | 'service' | 'method' | 'search'>;
  summaryCards: ReportSummaryCard[];
  charts: ReportChart[];
  columns: ReportColumn[];
  groupBy: 'staff' | 'branch' | 'date' | 'bucket' | 'service' | null;
  dataFn: string;                // reportsApi method name
}

/** Subtotal group row for a groupBy report — rows belonging to one group + its subtotal. */
export interface ReportGroupRow<Row = Record<string, unknown>> {
  key: string;
  label: string;
  rows: Row[];
  subtotal: Record<string, number>;
}

/**
 * Standard return shape for every reportsApi dataFn (hard rule: {rows, total, summary},
 * grouped reports also return groups). `rows` is the FULL filtered set (not paginated) so
 * the grand-total footer and exports are always computed from the complete data, per spec.
 * `charts` holds any chart-ready arrays a config's charts[].dataKey refers to.
 */
export interface ReportResult<Row = Record<string, unknown>> {
  rows: Row[];
  total: number;
  summary: Record<string, number>;
  groups?: ReportGroupRow<Row>[];
  charts?: Record<string, unknown>;
}

/* ---------- MISC UI CONTRACTS ---------- */

export interface CrudFormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'select' | 'money' | 'number'
      | 'toggle' | 'color' | 'icon' | 'month';
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  hint?: string;
  /** Only rendered when another field currently equals this value (e.g. Customer.companyName reveal when type='corporate'). */
  showWhen?: { field: string; equals: string };
}

export interface CrudConfig<T extends { id: string }> {
  entity: string;
  title: string;
  icon: string;
  searchKeys: Array<keyof T & string>;
  columns: Array<{ key: string; label: string; render?: (row: T) => React.ReactNode }>;
  form: CrudFormField[];
  rules: {
    // Human reason to block, or null = allowed. Async because a real guard has to check
    // related data via the APIs (e.g. "this user has 42 sales") — a sync function could
    // never await that check.
    deleteGuard?: (row: T) => string | null | Promise<string | null>;
    uniqueKeys?: Array<keyof T & string>;
  };
  /**
   * The spec's own config pseudocode embeds `api` directly in the config object (§4) so
   * CrudPage stays a pure function of config with zero per-entity wiring — the locked
   * Phase-2 shape above omitted it, so it's added here rather than passed as a separate
   * CrudPage prop. `create`/`update` take a plain field-name-keyed record (what the
   * generic form collects); each entity's config adapts that to its real CreateXInput.
   */
  api: {
    list: (filters?: Filters) => Promise<ApiEnvelope<T>>;
    create: (data: Record<string, unknown>, byUserId: string) => Promise<T>;
    update: (id: string, data: Record<string, unknown>, byUserId: string) => Promise<T>;
    delete: (id: string, byUserId: string) => Promise<void>;
  };
  /** Renders a live Toggle in its own table column, calling api.update(id,{isActive}). */
  hasActiveToggle?: boolean;
  /** Muted, read-only stat chips shown in the drawer (e.g. supplier wallet/used/toSettle). */
  readOnlyStats?: (row: T) => Array<{ label: string; value: string }>;
  /** Extra buttons shown only in edit mode (e.g. Users' "Reset password" mock button). */
  editOnlyActions?: Array<{
    label: string;
    icon?: string;
    /** When set, a ConfirmDialog with this body must be accepted before onClick fires. */
    confirm?: string;
    onClick: (row: T) => void | Promise<void>;
  }>;
  /** 'grid' switches CrudPage to the inline-editable month grid used only by Targets. */
  mode?: 'form' | 'grid';
}

export interface SessionData { user: SessionUser; loginAt: string; }
