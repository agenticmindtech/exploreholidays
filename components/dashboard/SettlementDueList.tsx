import Link from "next/link";
import { Building2, CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import type { SettlementDueRow } from "@/lib/types";
import { formatMoney } from "@/lib/utils/format";

interface SettlementDueListProps {
  rows: SettlementDueRow[];
  loading?: boolean;
}

export default function SettlementDueList({ rows, loading = false }: SettlementDueListProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyState icon={CheckCircle2} title="All settled" hint="No suppliers currently have an outstanding balance." />;
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.supplierId} className="flex items-center gap-3 rounded-xl border border-line p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-subtle text-inkMuted">
            <Building2 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{row.name}</p>
            <p className="font-money text-xs text-accent-600">{formatMoney(row.toSettle)} to settle</p>
          </div>
          <Link href={`/accounts/suppliers?settle=${row.supplierId}`} className="shrink-0">
            <Button variant="secondary" size="sm">
              Settle
            </Button>
          </Link>
        </div>
      ))}
    </div>
  );
}
