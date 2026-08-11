"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Building2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import SupplierBalanceCard from "@/components/accounts/SupplierBalanceCard";
import SupplierLedgerDrawer from "@/components/accounts/SupplierLedgerDrawer";
import TopupSettleModal from "@/components/accounts/TopupSettleModal";
import ChartCard from "@/components/charts/ChartCard";
import ServiceDonut from "@/components/charts/ServiceDonut";
import { useAuthStore } from "@/lib/stores/authStore";
import { canManageFinance } from "@/lib/auth/permissions";
import { suppliersApi } from "@/lib/api/suppliersApi";
import type { Supplier } from "@/lib/types";
import { formatMoney } from "@/lib/utils/format";

const NEAR_LIMIT_THRESHOLD = 0.8;

export default function SupplierBalancesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const canAct = canManageFinance(user?.role ?? "staff");

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [ledgerSupplier, setLedgerSupplier] = useState<Supplier | null>(null);
  const [modal, setModal] = useState<{ mode: "topup" | "settle"; supplier: Supplier } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });
    suppliersApi.list({ pageSize: 500 }).then((envelope) => {
      if (cancelled) return;
      setSuppliers(envelope.rows.filter((s) => s.isActive));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Deep-link shortcut from dashboard's SettlementDueList: /accounts/suppliers?settle=SUP-004.
  // Gated on canAct too — a manager (view-only per the permissions matrix) crafting this
  // URL by hand must not be able to open the settle modal just because the button is hidden.
  useEffect(() => {
    if (loading || !canAct) return;
    const settleId = searchParams.get("settle");
    if (!settleId) return;
    const supplier = suppliers.find((s) => s.id === settleId);
    Promise.resolve().then(() => {
      if (supplier) setModal({ mode: "settle", supplier });
      router.replace("/accounts/suppliers", { scroll: false });
    });
  }, [loading, canAct, suppliers, searchParams, router]);

  const totalToSettle = suppliers.reduce((sum, s) => sum + s.toSettle, 0);
  const totalWallet = suppliers.reduce((sum, s) => sum + s.walletBalance, 0);
  const nearLimitCount = suppliers.filter((s) => s.creditLimit > 0 && s.usedCredit / s.creditLimit >= NEAR_LIMIT_THRESHOLD).length;

  const toSettleByName = [...suppliers]
    .filter((s) => s.toSettle > 0)
    .sort((a, b) => b.toSettle - a.toSettle)
    .map((s) => ({ id: s.id, name: s.name, revenue: s.toSettle, profit: 0, count: 0 }));

  function refreshSupplier(updated: Supplier) {
    setSuppliers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setModal(null);
    setReloadKey((k) => k + 1);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Supplier Balances"
        subtitle={canAct ? "Credit usage, wallet balances and settlements per supplier." : "View only — credit usage, wallet balances and settlements per supplier."}
        breadcrumb="Accounts / Suppliers"
      />

      <div className="stagger flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-inkMuted">Total to settle</p>
            <p className="mt-1 font-money text-xl font-bold text-accent-600">{formatMoney(totalToSettle)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-inkMuted">Total wallet available</p>
            <p className="mt-1 font-money text-xl font-bold text-ink">{formatMoney(totalWallet)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-inkMuted">Near credit limit</p>
            <p className={`mt-1 flex items-center gap-1.5 font-money text-xl font-bold ${nearLimitCount > 0 ? "text-danger-600" : "text-ink"}`}>
              {nearLimitCount > 0 && <AlertTriangle className="h-4 w-4" />}
              {nearLimitCount}
            </p>
          </Card>
        </div>

        {!loading && toSettleByName.length > 0 && (
          <ChartCard title="Amount to settle by supplier" subtitle="Where outstanding supplier balances are concentrated" minHeight={260}>
            <ServiceDonut data={toSettleByName} />
          </ChartCard>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full" />
            ))}
          </div>
        ) : suppliers.length === 0 ? (
          <EmptyState icon={Building2} title="No suppliers yet" hint="Active suppliers will show balances here." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {suppliers.map((supplier) => (
              <SupplierBalanceCard
                key={supplier.id}
                supplier={supplier}
                canManage={canAct}
                onLedger={() => setLedgerSupplier(supplier)}
                onTopUp={() => setModal({ mode: "topup", supplier })}
                onSettle={() => setModal({ mode: "settle", supplier })}
              />
            ))}
          </div>
        )}
      </div>

      <SupplierLedgerDrawer supplier={ledgerSupplier} open={!!ledgerSupplier} onClose={() => setLedgerSupplier(null)} />

      <TopupSettleModal
        open={!!modal}
        mode={modal?.mode ?? "topup"}
        supplier={modal?.supplier ?? null}
        onClose={() => setModal(null)}
        onDone={refreshSupplier}
      />
    </div>
  );
}
