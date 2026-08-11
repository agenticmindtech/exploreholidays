import type { AgingBucket, AgingSummaryRow } from "@/lib/types";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const BUCKET_TONE: Record<AgingBucket, string> = {
  "0-30": "border-line bg-subtle text-ink",
  "31-60": "border-warning-200 bg-warning-50 text-warning-700",
  "61-90": "border-accent-300 bg-accent-50 text-accent-700",
  "90+": "border-danger-300 bg-danger-50 text-danger-700",
};

interface AgingChipsProps {
  summary: AgingSummaryRow[];
  activeBucket?: AgingBucket;
  onSelect?: (bucket?: AgingBucket) => void;
}

export default function AgingChips({ summary, activeBucket, onSelect }: AgingChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {summary.map((row) => (
        <button
          key={row.bucket}
          type="button"
          onClick={() => onSelect?.(activeBucket === row.bucket ? undefined : row.bucket)}
          className={cn(
            "flex min-h-[52px] flex-col items-start gap-0.5 rounded-xl border px-3.5 py-2 text-left transition-colors",
            BUCKET_TONE[row.bucket],
            activeBucket === row.bucket && "ring-2 ring-primary-400"
          )}
        >
          <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">{row.bucket} days</span>
          <span className="font-money text-sm font-bold">{formatMoney(row.balance)}</span>
          <span className="text-[10px] opacity-70">
            {row.count} record{row.count === 1 ? "" : "s"}
          </span>
        </button>
      ))}
    </div>
  );
}
