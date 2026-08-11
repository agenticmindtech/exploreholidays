"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, PlusCircle, Receipt, RotateCcw, SlidersHorizontal, type LucideIcon } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import DatePicker from "@/components/ui/DatePicker";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { suppliersApi } from "@/lib/api/suppliersApi";
import type { Supplier, SupplierTransaction, SupplierTxnType } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatMoney } from "@/lib/utils/format";

const TYPE_META: Record<SupplierTxnType, { label: string; icon: LucideIcon; tone: string }> = {
  topup: { label: "Top-up", icon: PlusCircle, tone: "bg-success-50 text-success-600" },
  usage: { label: "Usage", icon: Receipt, tone: "bg-info-50 text-info-600" },
  settlement: { label: "Settlement", icon: CheckCircle2, tone: "bg-primary-50 text-primary-600" },
  refund_credit: { label: "Refund credit", icon: RotateCcw, tone: "bg-accent-50 text-accent-600" },
  adjustment: { label: "Adjustment", icon: SlidersHorizontal, tone: "bg-subtle text-inkMuted" },
};

interface SupplierLedgerDrawerProps {
  supplier: Supplier | null;
  open: boolean;
  onClose: () => void;
}

export default function SupplierLedgerDrawer({ supplier, open, onClose }: SupplierLedgerDrawerProps) {
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!open || !supplier) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    suppliersApi.listTransactions(supplier.id, { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }).then((rows) => {
      if (cancelled) return;
      setTransactions(rows);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, supplier, dateFrom, dateTo]);

  return (
    <Drawer open={open} onClose={onClose} title={supplier ? `${supplier.name} · Ledger` : "Ledger"}>
      {supplier && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4">
              <p className="text-xs text-inkMuted">Wallet balance</p>
              <p className="font-money text-lg font-bold text-ink">{formatMoney(supplier.walletBalance)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-inkMuted">To settle</p>
              <p className="font-money text-lg font-bold text-accent-600">{formatMoney(supplier.toSettle)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DatePicker label="From" value={dateFrom} onChange={setDateFrom} max={dateTo} />
            <DatePicker label="To" value={dateTo} onChange={setDateTo} min={dateFrom} />
          </div>

          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState icon={Receipt} title="No transactions" hint="Top-ups, usage, settlements and refund credits will appear here." />
          ) : (
            <div className="flex flex-col gap-2">
              {transactions.map((t) => {
                const meta = TYPE_META[t.type];
                const Icon = meta.icon;
                const isCredit = t.type === "topup" || t.type === "refund_credit";
                return (
                  <div key={t.id} className="card flex items-center gap-3 p-3">
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", meta.tone)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-ink">{meta.label}</p>
                        <p className={cn("font-money text-sm font-bold", isCredit ? "money-pos" : "text-ink")}>
                          {isCredit ? "+" : ""}
                          {formatMoney(t.amount)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs text-inkMuted">
                        <span>{formatDate(t.date)}{t.reference ? ` · ${t.reference}` : ""}</span>
                        <span className="font-money">
                          Wallet {formatMoney(t.balanceAfterWallet)} · Settle {formatMoney(t.balanceAfterCredit)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
