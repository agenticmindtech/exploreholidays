import { Building2, History, Plane, Ship, ShieldCheck, Stamp, BedDouble, MoreHorizontal, type LucideIcon } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import type { Supplier, SupplierType } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatMoney } from "@/lib/utils/format";

const TYPE_ICONS: Record<SupplierType, LucideIcon> = {
  airline: Plane,
  hotel: BedDouble,
  visa_center: Stamp,
  cruise_line: Ship,
  dmc: Building2,
  insurance: ShieldCheck,
  other: MoreHorizontal,
};

interface SupplierBalanceCardProps {
  supplier: Supplier;
  onLedger: () => void;
  onTopUp: () => void;
  onSettle: () => void;
  /** Hides Top-up/Settle (money-moving actions) — Ledger stays visible either way. Manager view-only access, per the permissions matrix. */
  canManage?: boolean;
}

export default function SupplierBalanceCard({ supplier, onLedger, onTopUp, onSettle, canManage = true }: SupplierBalanceCardProps) {
  const Icon = TYPE_ICONS[supplier.type] ?? MoreHorizontal;
  const usagePercent = supplier.creditLimit > 0 ? (supplier.usedCredit / supplier.creditLimit) * 100 : 0;
  const tone = usagePercent >= 95 ? "danger" : usagePercent >= 80 ? "warning" : "brand";
  const nearLimit = usagePercent >= 80;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-grad-brand text-white">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-ink">{supplier.name}</p>
            <p className="text-xs capitalize text-inkMuted">{supplier.type.replace(/_/g, " ")}</p>
          </div>
        </div>
        {nearLimit && (
          <span className="shrink-0 rounded-full bg-danger-50 px-2 py-0.5 text-[10px] font-bold text-danger-700">Near limit</span>
        )}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-inkMuted">
          <span>Used credit</span>
          <span className="font-money">
            {formatMoney(supplier.usedCredit)} / {formatMoney(supplier.creditLimit)}
          </span>
        </div>
        <ProgressBar value={supplier.usedCredit} max={Math.max(supplier.creditLimit, 1)} tone={tone} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-inkMuted">Wallet balance</p>
          <p className="font-money text-base font-bold text-ink">{formatMoney(supplier.walletBalance)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-inkMuted">To settle</p>
          <p className={cn("font-money text-lg font-bold", supplier.toSettle > 0 ? "text-accent-600" : "text-ink")}>{formatMoney(supplier.toSettle)}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" size="sm" icon={History} className="flex-1" onClick={onLedger}>
          Ledger
        </Button>
        {canManage && (
          <>
            <Button variant="secondary" size="sm" className="flex-1" onClick={onTopUp}>
              Top-up
            </Button>
            <Button variant="primary" size="sm" className="flex-1" onClick={onSettle} disabled={supplier.toSettle <= 0}>
              Settle
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
