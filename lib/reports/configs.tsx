import type { ReportConfig } from "@/lib/types";
import StatusPill from "@/components/ui/StatusPill";
import ProgressBar from "@/components/ui/ProgressBar";
import { METHOD_META } from "@/lib/constants/display";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type {
  DailySalesRow,
  PaymentCollectionRow,
  PendingTransactionRow,
  ProfitSummaryRow,
  ReceivableReportRow,
  RefundReportRow,
  StaffLoanRow,
  StaffMistakeRow,
  StaffPerformanceRow,
  SupplierUsageRow,
} from "@/lib/api/reportsApi";

const MISTAKE_TONE: Record<string, string> = {
  reported: "bg-subtle text-inkSoft",
  accepted: "bg-info-50 text-info-600",
  recovering: "bg-accent-50 text-accent-700",
  recovered: "bg-success-50 text-success-600",
  waived: "bg-line/60 text-inkMuted",
};

const LOAN_TONE: Record<string, string> = {
  active: "bg-primary-50 text-primary-700",
  completed: "bg-success-50 text-success-600",
  defaulted: "bg-danger-50 text-danger-700",
};

const RECEIVABLE_TONE: Record<string, string> = {
  open: "bg-info-50 text-info-600",
  partial: "bg-warning-50 text-warning-700",
  settled: "bg-success-50 text-success-600",
  written_off: "bg-line/60 text-inkMuted",
};

const AGING_TONE: Record<string, string> = {
  "0-30": "bg-subtle text-inkSoft",
  "31-60": "bg-warning-50 text-warning-700",
  "61-90": "bg-accent-50 text-accent-700",
  "90+": "bg-danger-50 text-danger-700",
};

const REFUND_TONE: Record<string, string> = {
  requested: "bg-subtle text-inkSoft",
  sent_to_supplier: "bg-info-50 text-info-600",
  received_from_supplier: "bg-accent-50 text-accent-700",
  paid_to_customer: "bg-success-50 text-success-600",
  rejected: "bg-danger-50 text-danger-700",
};

function tonePill(label: string, toneClass: string) {
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold capitalize", toneClass)}>{label.replace(/_/g, " ")}</span>;
}

export const REPORT_CONFIGS: ReportConfig[] = [
  /* ---------- CORE ---------- */
  {
    id: "daily-sales",
    title: "Daily Sales Report",
    group: "core",
    icon: "CalendarDays",
    description: "Every sale, grouped by date with running subtotals.",
    filters: ["dateRange", "branch", "staff", "service", "method", "search"],
    summaryCards: [
      { key: "count", label: "Sales" },
      { key: "revenue", label: "Revenue", money: true },
      { key: "cost", label: "Cost", money: true },
      { key: "profit", label: "Profit", money: true, tone: "success" },
    ],
    charts: [],
    columns: [
      { key: "transactionDate", label: "Date", render: (row) => formatDate((row as unknown as DailySalesRow).transactionDate) },
      { key: "bookingNo", label: "Booking No" },
      { key: "staffName", label: "Staff" },
      { key: "branchName", label: "Branch" },
      { key: "serviceName", label: "Service" },
      { key: "destination", label: "Destination" },
      { key: "netCost", label: "Cost", money: true, align: "right", summaryKey: "cost", render: (row) => formatMoney((row as unknown as DailySalesRow).netCost) },
      { key: "sellingPrice", label: "Selling", money: true, align: "right", summaryKey: "revenue", render: (row) => formatMoney((row as unknown as DailySalesRow).sellingPrice) },
      { key: "profit", label: "Profit", money: true, align: "right", render: (row) => formatMoney((row as unknown as DailySalesRow).profit) },
      { key: "paymentMethod", label: "Method", render: (row) => METHOD_META[(row as unknown as DailySalesRow).paymentMethod].label },
      { key: "status", label: "Status", render: (row) => <StatusPill status={(row as unknown as DailySalesRow).status} /> },
    ],
    groupBy: "date",
    dataFn: "dailySales",
  },
  {
    id: "profit-summary",
    title: "Profit Summary",
    group: "core",
    icon: "TrendingUp",
    description: "Cost, revenue and profit grouped by service, with trend and share charts.",
    filters: ["dateRange", "branch", "staff", "service"],
    summaryCards: [
      { key: "count", label: "Sales" },
      { key: "revenue", label: "Revenue", money: true },
      { key: "cost", label: "Cost", money: true },
      { key: "profit", label: "Profit", money: true, tone: "success" },
    ],
    charts: [
      { type: "trend", dataKey: "trend", span: 8 },
      { type: "donut", dataKey: "donut", span: 4 },
    ],
    columns: [
      { key: "name", label: "Service" },
      { key: "count", label: "Sales", align: "right" },
      { key: "cost", label: "Cost", money: true, align: "right", render: (row) => formatMoney((row as unknown as ProfitSummaryRow).cost) },
      { key: "revenue", label: "Selling", money: true, align: "right", render: (row) => formatMoney((row as unknown as ProfitSummaryRow).revenue) },
      { key: "profit", label: "Profit", money: true, align: "right", render: (row) => formatMoney((row as unknown as ProfitSummaryRow).profit) },
      { key: "avgMargin", label: "Avg Margin", align: "right", render: (row) => `${(row as unknown as ProfitSummaryRow).avgMargin.toFixed(2)}%` },
    ],
    groupBy: null,
    dataFn: "profitSummary",
  },
  {
    id: "payment-collection",
    title: "Payment Collection Report",
    group: "core",
    icon: "Banknote",
    description: "Every payment received, with a breakdown by method.",
    filters: ["dateRange", "branch", "staff", "method", "search"],
    summaryCards: [
      { key: "count", label: "Payments" },
      { key: "amount", label: "Amount", money: true, tone: "success" },
    ],
    charts: [{ type: "bar", dataKey: "bar", span: 12 }],
    columns: [
      { key: "date", label: "Date", render: (row) => formatDate((row as unknown as PaymentCollectionRow).date) },
      { key: "bookingNo", label: "Booking No" },
      { key: "customerName", label: "Customer" },
      { key: "method", label: "Method", render: (row) => METHOD_META[(row as unknown as PaymentCollectionRow).method].label },
      { key: "amount", label: "Amount", money: true, align: "right", render: (row) => formatMoney((row as unknown as PaymentCollectionRow).amount) },
      { key: "receivedByName", label: "Received By" },
    ],
    groupBy: null,
    dataFn: "paymentCollection",
  },
  {
    id: "supplier-usage",
    title: "Supplier Usage Report",
    group: "core",
    icon: "Building2",
    description: "Ledger-style opening balance, usage, settlements and refund credit per supplier.",
    filters: ["dateRange", "search"],
    summaryCards: [
      { key: "count", label: "Suppliers" },
      { key: "totalToSettle", label: "To Settle", money: true, tone: "accent" },
      { key: "totalWallet", label: "Wallet Available", money: true },
    ],
    charts: [{ type: "bar", dataKey: "bar", span: 12 }],
    columns: [
      { key: "name", label: "Supplier" },
      { key: "openingToSettle", label: "Opening", money: true, align: "right", render: (row) => formatMoney((row as unknown as SupplierUsageRow).openingToSettle) },
      { key: "usage", label: "Usage", money: true, align: "right", render: (row) => formatMoney((row as unknown as SupplierUsageRow).usage) },
      { key: "settlements", label: "Settlements", money: true, align: "right", render: (row) => formatMoney((row as unknown as SupplierUsageRow).settlements) },
      { key: "refundsCredit", label: "Refund Credit", money: true, align: "right", render: (row) => formatMoney((row as unknown as SupplierUsageRow).refundsCredit) },
      { key: "toSettle", label: "To Settle", money: true, align: "right", summaryKey: "totalToSettle", render: (row) => formatMoney((row as unknown as SupplierUsageRow).toSettle) },
      { key: "wallet", label: "Wallet", money: true, align: "right", summaryKey: "totalWallet", render: (row) => formatMoney((row as unknown as SupplierUsageRow).wallet) },
    ],
    groupBy: null,
    dataFn: "supplierUsage",
  },
  {
    id: "staff-mistakes",
    title: "Staff Mistakes Report",
    group: "core",
    icon: "AlertTriangle",
    description: "Reported mistakes and recovery progress, grouped by staff.",
    filters: ["dateRange", "staff", "search"],
    summaryCards: [
      { key: "count", label: "Mistakes" },
      { key: "amount", label: "Amount", money: true, tone: "danger" },
      { key: "recoveredAmount", label: "Recovered", money: true, tone: "success" },
    ],
    charts: [],
    columns: [
      { key: "date", label: "Date", render: (row) => formatDate((row as unknown as StaffMistakeRow).date) },
      { key: "staffName", label: "Staff" },
      { key: "bookingNo", label: "Booking No", render: (row) => (row as unknown as StaffMistakeRow).bookingNo ?? "—" },
      { key: "description", label: "Description" },
      { key: "amount", label: "Amount", money: true, align: "right", render: (row) => formatMoney((row as unknown as StaffMistakeRow).amount) },
      { key: "recoveredAmount", label: "Recovered", money: true, align: "right", render: (row) => formatMoney((row as unknown as StaffMistakeRow).recoveredAmount) },
      { key: "status", label: "Status", render: (row) => tonePill((row as unknown as StaffMistakeRow).status, MISTAKE_TONE[(row as unknown as StaffMistakeRow).status]) },
    ],
    groupBy: "staff",
    dataFn: "staffMistakes",
  },
  {
    id: "supplier-refunds",
    title: "Supplier Refunds Report",
    group: "core",
    icon: "RotateCcw",
    description: "Refund requests through the supplier-facing pipeline.",
    filters: ["dateRange", "branch", "staff", "search"],
    summaryCards: [
      { key: "count", label: "Refunds" },
      { key: "supplierAmount", label: "Supplier Amount", money: true },
      { key: "customerAmount", label: "Customer Amount", money: true },
      { key: "charge", label: "Charge", money: true, tone: "danger" },
    ],
    charts: [{ type: "funnel", dataKey: "funnel", span: 12 }],
    columns: [
      { key: "requestDate", label: "Request Date", render: (row) => formatDate((row as unknown as RefundReportRow).requestDate) },
      { key: "bookingNo", label: "Booking No" },
      { key: "supplierName", label: "Supplier" },
      { key: "responsibleStaffName", label: "Staff Responsible" },
      { key: "supplierRefundAmount", label: "Supplier Amount", money: true, align: "right", summaryKey: "supplierAmount", render: (row) => formatMoney((row as unknown as RefundReportRow).supplierRefundAmount) },
      { key: "customerRefundAmount", label: "Customer Amount", money: true, align: "right", summaryKey: "customerAmount", render: (row) => formatMoney((row as unknown as RefundReportRow).customerRefundAmount) },
      {
        key: "charge",
        label: "Charge",
        money: true,
        align: "right",
        render: (row) => {
          const charge = (row as unknown as RefundReportRow).charge;
          return <span className={charge > 0 ? "money-neg" : undefined}>{formatMoney(charge)}</span>;
        },
      },
      { key: "status", label: "Status", render: (row) => tonePill((row as unknown as RefundReportRow).status, REFUND_TONE[(row as unknown as RefundReportRow).status]) },
      { key: "expectedRefundDate", label: "Expected Date", render: (row) => ((row as unknown as RefundReportRow).expectedRefundDate ? formatDate((row as unknown as RefundReportRow).expectedRefundDate!) : "—") },
    ],
    groupBy: null,
    dataFn: "supplierRefunds",
  },

  /* ---------- ADDITIONAL ---------- */
  {
    id: "customer-receivables",
    title: "Customer Receivables Report",
    group: "additional",
    icon: "Wallet",
    description: "Outstanding customer balances grouped by aging bucket.",
    filters: ["branch", "staff", "search"],
    summaryCards: [
      { key: "count", label: "Receivables" },
      { key: "original", label: "Original", money: true },
      { key: "paid", label: "Paid", money: true, tone: "success" },
      { key: "balance", label: "Balance", money: true, tone: "danger" },
    ],
    charts: [{ type: "aging", dataKey: "aging", span: 12 }],
    columns: [
      { key: "partyName", label: "Party" },
      { key: "bookingNo", label: "Booking No" },
      { key: "originalAmount", label: "Original", money: true, align: "right", summaryKey: "original", render: (row) => formatMoney((row as unknown as ReceivableReportRow).originalAmount) },
      { key: "paidAmount", label: "Paid", money: true, align: "right", summaryKey: "paid", render: (row) => formatMoney((row as unknown as ReceivableReportRow).paidAmount) },
      { key: "balance", label: "Balance", money: true, align: "right", render: (row) => formatMoney((row as unknown as ReceivableReportRow).balance) },
      { key: "dueDate", label: "Due Date", render: (row) => formatDate((row as unknown as ReceivableReportRow).dueDate) },
      { key: "agingBucket", label: "Aging", render: (row) => tonePill((row as unknown as ReceivableReportRow).agingBucket, AGING_TONE[(row as unknown as ReceivableReportRow).agingBucket]) },
      { key: "state", label: "State", render: (row) => tonePill((row as unknown as ReceivableReportRow).state, RECEIVABLE_TONE[(row as unknown as ReceivableReportRow).state]) },
    ],
    groupBy: "bucket",
    dataFn: "customerReceivables",
  },
  {
    id: "staff-loans",
    title: "Staff Loans Report",
    group: "additional",
    icon: "HandCoins",
    description: "Every staff loan and its repayment progress.",
    filters: ["dateRange", "staff"],
    summaryCards: [
      { key: "count", label: "Loans" },
      { key: "totalAmount", label: "Total Issued", money: true },
      { key: "totalRemaining", label: "Total Outstanding", money: true, tone: "danger" },
    ],
    charts: [],
    columns: [
      { key: "staffName", label: "Staff" },
      { key: "amount", label: "Amount", money: true, align: "right", summaryKey: "totalAmount", render: (row) => formatMoney((row as unknown as StaffLoanRow).amount) },
      { key: "issueDate", label: "Issued", render: (row) => formatDate((row as unknown as StaffLoanRow).issueDate) },
      {
        key: "installments",
        label: "Installments",
        render: (row) => `${(row as unknown as StaffLoanRow).installmentsPaid} / ${(row as unknown as StaffLoanRow).installmentsTotal}`,
      },
      { key: "remaining", label: "Remaining", money: true, align: "right", summaryKey: "totalRemaining", render: (row) => formatMoney((row as unknown as StaffLoanRow).remaining) },
      { key: "status", label: "Status", render: (row) => tonePill((row as unknown as StaffLoanRow).status, LOAN_TONE[(row as unknown as StaffLoanRow).status]) },
    ],
    groupBy: null,
    dataFn: "staffLoans",
  },
  {
    id: "pending-transactions",
    title: "Pending Transactions Report",
    group: "additional",
    icon: "Hourglass",
    description: "Services still awaiting supplier or customer action.",
    filters: ["dateRange", "branch", "staff", "service", "search"],
    summaryCards: [
      { key: "count", label: "Pending" },
      { key: "overdueCount", label: "Overdue", tone: "danger" },
    ],
    charts: [],
    columns: [
      { key: "bookingNo", label: "Booking No" },
      { key: "serviceName", label: "Service" },
      { key: "customerName", label: "Customer" },
      { key: "staffName", label: "Staff" },
      { key: "pendingState", label: "State", render: (row) => tonePill((row as unknown as PendingTransactionRow).pendingState ?? "in_process", "bg-subtle text-inkSoft") },
      {
        key: "expectedCompletionDate",
        label: "Expected Date",
        render: (row) => {
          const r = row as unknown as PendingTransactionRow;
          return <span className={r.overdue ? "font-semibold text-danger-600" : undefined}>{r.expectedCompletionDate ? formatDate(r.expectedCompletionDate) : "—"}</span>;
        },
      },
      { key: "daysWaiting", label: "Days Waiting", align: "right", render: (row) => `${(row as unknown as PendingTransactionRow).daysWaiting}d` },
    ],
    groupBy: null,
    dataFn: "pendingTransactions",
  },
  {
    id: "refund-tracking",
    title: "Refund Tracking Report",
    group: "additional",
    icon: "RefreshCw",
    description: "Customer-facing refund status with overdue emphasis.",
    filters: ["dateRange", "branch", "staff", "search"],
    summaryCards: [
      { key: "count", label: "Refunds" },
      { key: "customerAmount", label: "Owed to Customers", money: true, tone: "accent" },
    ],
    charts: [{ type: "funnel", dataKey: "funnel", span: 12 }],
    columns: [
      { key: "requestDate", label: "Request Date", render: (row) => formatDate((row as unknown as RefundReportRow).requestDate) },
      { key: "bookingNo", label: "Booking No" },
      { key: "reason", label: "Reason" },
      { key: "customerRefundAmount", label: "Customer Amount", money: true, align: "right", summaryKey: "customerAmount", render: (row) => formatMoney((row as unknown as RefundReportRow).customerRefundAmount) },
      {
        key: "timeline",
        label: "Status",
        render: (row) => {
          const r = row as unknown as RefundReportRow;
          const overdue = !!r.expectedRefundDate && new Date(r.expectedRefundDate) < new Date() && r.status !== "paid_to_customer";
          return (
            <div className="flex items-center gap-2">
              {tonePill(r.status, REFUND_TONE[r.status])}
              {overdue && <span className="text-[10px] font-bold text-danger-600">OVERDUE</span>}
            </div>
          );
        },
      },
      { key: "expectedRefundDate", label: "Expected Date", render: (row) => ((row as unknown as RefundReportRow).expectedRefundDate ? formatDate((row as unknown as RefundReportRow).expectedRefundDate!) : "—") },
    ],
    groupBy: null,
    dataFn: "refundTracking",
  },
  {
    id: "staff-performance",
    title: "Staff Performance Report",
    group: "additional",
    icon: "Trophy",
    description: "Target vs achieved for the current month, ranked by revenue.",
    filters: ["staff"],
    summaryCards: [
      { key: "count", label: "Staff" },
      { key: "achievedRevenue", label: "Achieved Revenue", money: true },
      { key: "achievedProfit", label: "Achieved Profit", money: true, tone: "success" },
      { key: "mistakesAmount", label: "Mistakes", money: true, tone: "danger" },
    ],
    charts: [],
    columns: [
      { key: "name", label: "Staff" },
      { key: "achievedCount", label: "Sales", align: "right", render: (row) => `${(row as unknown as StaffPerformanceRow).achievedCount} / ${(row as unknown as StaffPerformanceRow).salesCountTarget}` },
      {
        key: "achievedRevenue",
        label: "Revenue (achieved / target)",
        money: true,
        align: "right",
        render: (row) => {
          const r = row as unknown as StaffPerformanceRow;
          return (
            <span>
              {formatMoney(r.achievedRevenue)} <span className="text-inkMuted">/ {formatMoney(r.revenueTarget)}</span>
            </span>
          );
        },
      },
      {
        key: "achievedProfit",
        label: "Profit (achieved / target)",
        money: true,
        align: "right",
        render: (row) => {
          const r = row as unknown as StaffPerformanceRow;
          return (
            <span>
              {formatMoney(r.achievedProfit)} <span className="text-inkMuted">/ {formatMoney(r.profitTarget)}</span>
            </span>
          );
        },
      },
      {
        key: "achievementPercent",
        label: "Achievement",
        render: (row) => {
          const r = row as unknown as StaffPerformanceRow;
          return (
            <div className="flex w-28 flex-col gap-1">
              <span className="text-[11px] font-semibold text-inkSoft">{r.achievementPercent.toFixed(1)}%</span>
              <ProgressBar value={r.achievementPercent} max={100} tone={r.achievementPercent >= 100 ? "success" : r.achievementPercent >= 60 ? "brand" : "warning"} />
            </div>
          );
        },
      },
      { key: "mistakesAmount", label: "Mistakes", money: true, align: "right", render: (row) => formatMoney((row as unknown as StaffPerformanceRow).mistakesAmount) },
      {
        key: "netContribution",
        label: "Net Contribution",
        money: true,
        align: "right",
        render: (row) => {
          const v = (row as unknown as StaffPerformanceRow).netContribution;
          return <span className={v >= 0 ? "money-pos" : "money-neg"}>{formatMoney(v)}</span>;
        },
      },
    ],
    groupBy: null,
    dataFn: "staffPerformance",
  },
  {
    id: "management-summary",
    title: "Management Summary",
    group: "additional",
    icon: "LayoutDashboard",
    description: "The executive one-pager: period KPIs, breakdowns and top performers.",
    filters: ["dateRange", "branch"],
    summaryCards: [
      { key: "revenue", label: "Revenue", money: true },
      { key: "cost", label: "Cost", money: true },
      { key: "profit", label: "Profit", money: true, tone: "success" },
      { key: "totalToSettle", label: "To Settle", money: true, tone: "accent" },
      { key: "receivablesOutstanding", label: "Receivables", money: true, tone: "danger" },
    ],
    charts: [
      { type: "trend", dataKey: "trend", span: 8 },
      { type: "donut", dataKey: "donut", span: 4 },
      { type: "bar", dataKey: "bar", span: 6 },
      { type: "bar", dataKey: "methodSplit", span: 6 },
    ],
    columns: [
      { key: "name", label: "Staff" },
      { key: "revenue", label: "Revenue", money: true, align: "right", render: (row) => formatMoney((row.revenue as number)) },
      { key: "profit", label: "Profit", money: true, align: "right", render: (row) => formatMoney((row.profit as number)) },
      { key: "count", label: "Sales", align: "right" },
    ],
    groupBy: null,
    dataFn: "managementSummary",
  },
];

export function getReportConfig(id: string): ReportConfig | undefined {
  return REPORT_CONFIGS.find((c) => c.id === id);
}
