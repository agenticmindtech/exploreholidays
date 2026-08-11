import { Target as TargetIcon } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import ProgressBar from "@/components/ui/ProgressBar";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import type { TargetProgressRow } from "@/lib/types";
import { formatMoney } from "@/lib/utils/format";

interface TargetTableProps {
  rows: TargetProgressRow[];
  month: string;
  onMonthChange: (month: string) => void;
  loading?: boolean;
}

function progressTone(achieved: number, target: number): "success" | "warning" | "brand" {
  if (target <= 0) return "brand";
  const pct = (achieved / target) * 100;
  if (pct >= 100) return "success";
  if (pct >= 60) return "brand";
  return "warning";
}

export default function TargetTable({ rows, month, onMonthChange, loading = false }: TargetTableProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-bold text-ink">Staff Targets</p>
        <input
          type="month"
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
          className="input w-auto min-h-[40px] py-1.5 text-sm"
          aria-label="Select month"
        />
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={TargetIcon} title="No targets set" hint="Targets for this month haven't been configured yet." />
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((row) => (
            <div key={row.staffId} className="flex flex-col gap-2 rounded-xl border border-line p-3">
              <div className="flex items-center gap-2">
                <Avatar name={row.name} src={row.avatar ?? undefined} size="sm" />
                <p className="text-sm font-semibold text-ink">{row.name}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <div className="mb-1 flex justify-between text-[11px] text-inkMuted">
                    <span>Sales</span>
                    <span className="font-money">
                      {row.achievedCount} / {row.salesCountTarget}
                    </span>
                  </div>
                  <ProgressBar value={row.achievedCount} max={Math.max(row.salesCountTarget, 1)} tone={progressTone(row.achievedCount, row.salesCountTarget)} />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-[11px] text-inkMuted">
                    <span>Revenue</span>
                    <span className="font-money">
                      {formatMoney(row.achievedRevenue)} / {formatMoney(row.revenueTarget)}
                    </span>
                  </div>
                  <ProgressBar value={row.achievedRevenue} max={Math.max(row.revenueTarget, 1)} tone={progressTone(row.achievedRevenue, row.revenueTarget)} />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-[11px] text-inkMuted">
                    <span>Profit</span>
                    <span className="font-money">
                      {formatMoney(row.achievedProfit)} / {formatMoney(row.profitTarget)}
                    </span>
                  </div>
                  <ProgressBar value={row.achievedProfit} max={Math.max(row.profitTarget, 1)} tone={progressTone(row.achievedProfit, row.profitTarget)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
