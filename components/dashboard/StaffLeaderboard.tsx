import { ArrowDown, ArrowUp, Medal, Minus, Users } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import type { LeaderboardRow } from "@/lib/types";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const MEDAL_TONE = ["text-accent-500", "text-inkMuted", "text-accent-700"];

interface StaffLeaderboardProps {
  rows: LeaderboardRow[];
  loading?: boolean;
}

export default function StaffLeaderboard({ rows, loading = false }: StaffLeaderboardProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyState icon={Users} title="No sales yet" hint="Top performers for this period will appear here." />;
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, i) => (
        <div key={row.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-subtle">
          <span className="flex w-6 shrink-0 items-center justify-center">
            {i < 3 ? (
              <Medal className={cn("h-4 w-4", MEDAL_TONE[i])} />
            ) : (
              <span className="text-xs font-bold text-inkMuted">{i + 1}</span>
            )}
          </span>
          <Avatar name={row.name} src={row.avatar ?? undefined} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{row.name}</p>
            <p className="text-xs text-inkMuted">{row.count} sale{row.count === 1 ? "" : "s"}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-money text-sm font-bold text-ink">{formatMoney(row.revenue)}</p>
            <p className="font-money text-xs money-pos">{formatMoney(row.profit)}</p>
          </div>
          <span className="flex w-8 shrink-0 items-center justify-end">
            {row.rankDelta > 0 && <ArrowUp className="h-3.5 w-3.5 text-success-600" />}
            {row.rankDelta < 0 && <ArrowDown className="h-3.5 w-3.5 text-danger-600" />}
            {row.rankDelta === 0 && <Minus className="h-3.5 w-3.5 text-inkMuted" />}
          </span>
        </div>
      ))}
    </div>
  );
}
