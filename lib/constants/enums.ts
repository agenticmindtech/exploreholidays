import type {
  AgingBucket,
  AuditAction,
  AuditModule,
  CustomerType,
  LoanStatus,
  MistakeStatus,
  NotificationType,
  PaymentMethod,
  PaymentStatus,
  PendingState,
  ReceivableState,
  ReceivableType,
  RefundStatus,
  Role,
  SaleStatus,
  ServiceKind,
  SettlementCycle,
  SupplierTxnType,
  SupplierType,
} from "@/lib/types";

export const ROLES: Role[] = ["admin", "manager", "accounts", "staff"];

export const SALE_STATUS: SaleStatus[] = [
  "draft",
  "submitted",
  "verified",
  "posted",
  "returned",
  "cancelled",
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  "benefit_pay",
  "credit_card_online",
  "cash",
  "fawri_cheque",
  "not_paid_refund",
];

export const PAYMENT_STATUS: PaymentStatus[] = ["paid", "partial", "pending", "refund"];

export const SERVICE_KIND: ServiceKind[] = [
  "ticket",
  "hotel",
  "visa",
  "package",
  "cruise",
  "insurance",
  "transport",
  "umrah",
  "other",
];

export const REFUND_STATUS: RefundStatus[] = [
  "requested",
  "sent_to_supplier",
  "received_from_supplier",
  "paid_to_customer",
  "rejected",
];

export const RECEIVABLE_TYPES: ReceivableType[] = ["customer", "staff"];
export const RECEIVABLE_STATES: ReceivableState[] = ["open", "partial", "settled", "written_off"];
export const AGING_BUCKETS: AgingBucket[] = ["0-30", "31-60", "61-90", "90+"];

export const SUPPLIER_TXN_TYPES: SupplierTxnType[] = [
  "topup",
  "usage",
  "settlement",
  "refund_credit",
  "adjustment",
];

export const SUPPLIER_TYPES: SupplierType[] = [
  "airline",
  "hotel",
  "visa_center",
  "cruise_line",
  "dmc",
  "insurance",
  "other",
];

export const SETTLEMENT_CYCLES: SettlementCycle[] = ["weekly", "biweekly", "monthly"];

export const LOAN_STATUS: LoanStatus[] = ["active", "completed", "defaulted"];

export const PENDING_STATE: PendingState[] = [
  "in_process",
  "awaiting_supplier",
  "awaiting_customer",
  "completed",
  "cancelled",
];

export const MISTAKE_STATUS: MistakeStatus[] = [
  "reported",
  "accepted",
  "recovering",
  "recovered",
  "waived",
];

export const NOTIFICATION_TYPES: NotificationType[] = [
  "sale_submitted",
  "sale_returned",
  "sale_verified",
  "sale_posted",
  "refund_update",
  "payment_received",
  "target_alert",
  "system",
];

export const CUSTOMER_TYPES: CustomerType[] = ["individual", "corporate"];

export const AUDIT_ACTIONS: AuditAction[] = [
  "create",
  "update",
  "submit",
  "verify",
  "return",
  "post",
  "cancel",
  "delete",
  "payment",
  "refund_advance",
  "topup",
  "settlement",
  "loan",
  "installment",
  "login",
  "settings",
];

export const AUDIT_MODULES: AuditModule[] = [
  "sales",
  "payments",
  "refunds",
  "receivables",
  "suppliers",
  "loans",
  "mistakes",
  "users",
  "branches",
  "services",
  "customers",
  "targets",
  "settings",
  "auth",
];
