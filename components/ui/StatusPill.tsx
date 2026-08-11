import { cn } from "@/lib/utils/cn";

export type SaleStatus =
  | "draft"
  | "submitted"
  | "verified"
  | "posted"
  | "returned"
  | "refunded"
  | "pending"
  | "cancelled";

const LABELS: Record<SaleStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  verified: "Verified",
  posted: "Posted",
  returned: "Returned",
  refunded: "Refunded",
  pending: "Pending",
  cancelled: "Cancelled",
};

interface StatusPillProps {
  status: SaleStatus;
  className?: string;
}

export default function StatusPill({ status, className }: StatusPillProps) {
  return (
    <span className={cn("pill animate-scale-in", `pill-${status}`, className)}>
      <span className="pill-dot" />
      {LABELS[status] ?? status}
    </span>
  );
}
