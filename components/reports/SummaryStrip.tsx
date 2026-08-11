import Skeleton from "@/components/ui/Skeleton";
import type { ReportSummaryCard } from "@/lib/types";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const TONE_CLASS: Record<string, string> = {
  success: "text-success-600",
  danger: "text-danger-600",
  accent: "text-accent-600",
};

interface SummaryStripProps {
  cards: ReportSummaryCard[];
  summary: Record<string, number>;
  loading?: boolean;
}

export default function SummaryStrip({ cards, summary, loading = false }: SummaryStripProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {cards.map((card) => {
        const value = summary[card.key] ?? 0;
        return (
          <div key={card.key} className="card flex min-w-[140px] flex-1 flex-col gap-1 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-inkMuted">{card.label}</span>
            {loading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <span className={cn("font-money text-xl font-bold", card.tone ? TONE_CLASS[card.tone] : "text-ink")}>
                {card.money ? formatMoney(value) : value.toLocaleString("en-US")}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
