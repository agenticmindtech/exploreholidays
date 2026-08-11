import type { PaymentMethod, Role, SaleStatus, ServiceKind } from "@/lib/types";

interface MetaEntry {
  label: string;
  color: string;
  icon: string;
}

export const STATUS_META: Record<SaleStatus, MetaEntry> = {
  draft: { label: "Draft", color: "status-draft", icon: "FileEdit" },
  submitted: { label: "Submitted", color: "status-submitted", icon: "Send" },
  verified: { label: "Verified", color: "status-verified", icon: "ShieldCheck" },
  posted: { label: "Posted", color: "status-posted", icon: "CheckCircle2" },
  returned: { label: "Returned", color: "status-returned", icon: "Undo2" },
  cancelled: { label: "Cancelled", color: "status-cancelled", icon: "XCircle" },
};

export const METHOD_META: Record<PaymentMethod, MetaEntry> = {
  benefit_pay: { label: "Benefit Pay", color: "primary-600", icon: "Smartphone" },
  credit_card_online: { label: "Credit Card / Online", color: "info-600", icon: "CreditCard" },
  cash: { label: "Cash", color: "success-600", icon: "Banknote" },
  fawri_cheque: { label: "Fawri / Cheque", color: "accent-600", icon: "FileText" },
  not_paid_refund: { label: "Not Paid / Refund", color: "danger-600", icon: "CircleSlash" },
};

export const ROLE_META: Record<Role, MetaEntry> = {
  admin: { label: "Admin", color: "secondary-600", icon: "ShieldCheck" },
  manager: { label: "Manager", color: "primary-600", icon: "Briefcase" },
  accounts: { label: "Accounts", color: "accent-600", icon: "Calculator" },
  staff: { label: "Staff", color: "info-600", icon: "User" },
};

export const SERVICE_ICONS: Record<ServiceKind, string> = {
  ticket: "Plane",
  hotel: "BedDouble",
  visa: "Stamp",
  package: "Package",
  cruise: "Ship",
  insurance: "ShieldCheck",
  transport: "Car",
  umrah: "Moon",
  other: "MoreHorizontal",
};
