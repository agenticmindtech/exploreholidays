import { ArrowRight, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import type { RefundStatus } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const PIPELINE: RefundStatus[] = ["requested", "sent_to_supplier", "received_from_supplier", "paid_to_customer"];
const STAGE_LABELS: Record<RefundStatus, string> = {
  requested: "Requested",
  sent_to_supplier: "Sent to supplier",
  received_from_supplier: "Received from supplier",
  paid_to_customer: "Paid to customer",
  rejected: "Rejected",
};

interface RefundPipelineProps {
  status: RefundStatus;
  onAdvance?: () => void;
  onReject?: () => void;
  disabled?: boolean;
  dense?: boolean;
  /** Hides the Advance/Reject buttons entirely (manager view-only access, per the permissions matrix). */
  readOnly?: boolean;
}

export default function RefundPipeline({ status, onAdvance, onReject, disabled, dense, readOnly }: RefundPipelineProps) {
  const currentIdx = PIPELINE.indexOf(status);
  const isTerminal = status === "paid_to_customer" || status === "rejected";

  return (
    <div className={cn("flex flex-col gap-2", dense && "gap-1.5")}>
      <div className="flex flex-wrap items-center gap-1">
        {status === "rejected" ? (
          <span className="rounded-full border border-danger-300 bg-danger-50 px-2 py-0.5 text-[10px] font-semibold text-danger-700">
            {STAGE_LABELS.rejected}
          </span>
        ) : (
          PIPELINE.map((stage, idx) => {
            const isDone = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <span
                key={stage}
                title={STAGE_LABELS[stage]}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                  isCurrent && "border-primary-500 bg-primary-50 text-primary-700",
                  isDone && "border-success-300 bg-success-50 text-success-600",
                  !isCurrent && !isDone && "border-line bg-subtle text-inkMuted"
                )}
              >
                {dense ? STAGE_LABELS[stage].split(" ")[0] : STAGE_LABELS[stage]}
              </span>
            );
          })
        )}
      </div>
      {!isTerminal && !readOnly && (
        <div className="flex gap-1.5">
          <Button variant="primary" size="sm" icon={ArrowRight} disabled={disabled} onClick={onAdvance}>
            Advance
          </Button>
          <Button variant="ghost" size="sm" icon={XCircle} className="text-danger-600 hover:text-danger-700" disabled={disabled} onClick={onReject}>
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
