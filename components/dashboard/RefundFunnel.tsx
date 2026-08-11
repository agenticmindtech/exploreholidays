import type { RefundStatus } from "@/lib/types";
import { REFUND_STAGE_COLORS } from "@/components/charts/chartTheme";

const STAGES: { status: RefundStatus; label: string }[] = [
  { status: "requested", label: "Requested" },
  { status: "sent_to_supplier", label: "Sent to supplier" },
  { status: "received_from_supplier", label: "Received" },
  { status: "paid_to_customer", label: "Paid" },
  { status: "rejected", label: "Rejected" },
];

interface RefundFunnelProps {
  counts: Partial<Record<RefundStatus, number>>;
}

export default function RefundFunnel({ counts }: RefundFunnelProps) {
  const max = Math.max(...STAGES.map((s) => counts[s.status] ?? 0), 1);

  return (
    <div className="flex flex-col gap-2.5">
      {STAGES.map((s) => {
        const count = counts[s.status] ?? 0;
        const pct = Math.max(4, (count / max) * 100);
        return (
          <div key={s.status} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-xs font-medium text-inkSoft">{s.label}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: `${REFUND_STAGE_COLORS[s.status]}14` }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${REFUND_STAGE_COLORS[s.status]}CC, ${REFUND_STAGE_COLORS[s.status]})` }}
              />
            </div>
            <span className="w-6 shrink-0 text-right font-money text-xs font-bold text-ink">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
