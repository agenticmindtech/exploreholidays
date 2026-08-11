"use client";

import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import { calcMargin, calcProfit } from "@/lib/logic/money";
import { useCountUp } from "@/lib/hooks/useCountUp";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface ProfitPreviewProps {
  netCost: number;
  sellingPrice: number;
  className?: string;
}

export default function ProfitPreview({ netCost, sellingPrice, className }: ProfitPreviewProps) {
  // Never recompute profit/margin locally — always through lib/logic.
  const profit = calcProfit(netCost, sellingPrice);
  const margin = calcMargin(profit, sellingPrice);
  const animatedProfit = useCountUp(profit, { stiffness: 220, damping: 22 });

  const tone = profit > 0 ? "success" : profit < 0 ? "danger" : "neutral";
  const toneClasses = {
    success: "border-success-500 ring-2 ring-success-500/20",
    danger: "border-danger-500 ring-2 ring-danger-500/20",
    neutral: "border-line",
  }[tone];

  return (
    <Card className={cn("border transition-colors duration-300", toneClasses, className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-inkMuted">Profit Preview</p>
      <p
        className={cn(
          "mt-2 font-money text-3xl font-bold",
          profit > 0 ? "money-pos" : profit < 0 ? "money-neg" : "text-ink"
        )}
      >
        {formatMoney(animatedProfit)}
      </p>
      <p className="mt-1 text-xs text-inkMuted">Selling − Cost</p>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-inkSoft">Margin</span>
          <span className={cn("font-money font-bold", profit > 0 ? "money-pos" : profit < 0 ? "money-neg" : "text-ink")}>
            {margin.toFixed(2)}%
          </span>
        </div>
        <ProgressBar value={Math.max(0, Math.min(100, margin))} tone={tone === "danger" ? "danger" : tone === "success" ? "success" : "brand"} />
      </div>
    </Card>
  );
}
