"use client";

import { Fragment, useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Circle, Wallet } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Tabs from "@/components/ui/Tabs";
import Select from "@/components/ui/Select";
import SearchInput from "@/components/ui/SearchInput";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import AgingChips from "@/components/accounts/AgingChips";
import RecordPaymentModal from "@/components/accounts/RecordPaymentModal";
import ChartCard from "@/components/charts/ChartCard";
import CategoryDonut from "@/components/charts/CategoryDonut";
import { CHART_PALETTE } from "@/components/charts/chartTheme";
import { useAuthStore } from "@/lib/stores/authStore";
import { canManageFinance } from "@/lib/auth/permissions";
import { receivablesApi } from "@/lib/api/receivablesApi";
import { salesApi } from "@/lib/api/salesApi";
import { customersApi } from "@/lib/api/customersApi";
import { usersApi } from "@/lib/api/usersApi";
import { agingSummary } from "@/lib/logic/aging";
import { RECEIVABLE_STATES } from "@/lib/constants/enums";
import type { AgingBucket, Receivable, ReceivableState, ReceivableType, Sale } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatMoney } from "@/lib/utils/format";

const STATE_LABELS: Record<ReceivableState, string> = {
  open: "Open",
  partial: "Partial",
  settled: "Settled",
  written_off: "Written off",
};

const BUCKET_PILL: Record<AgingBucket, string> = {
  "0-30": "bg-subtle text-inkSoft",
  "31-60": "bg-warning-50 text-warning-700",
  "61-90": "bg-accent-50 text-accent-700",
  "90+": "bg-danger-50 text-danger-700",
};

export default function ReceivablesPage() {
  const user = useAuthStore((s) => s.user);
  const canAct = canManageFinance(user?.role ?? "staff");
  const [tab, setTab] = useState<ReceivableType>("customer");
  const [state, setState] = useState<ReceivableState | "">("");
  const [bucket, setBucket] = useState<AgingBucket | undefined>();
  const [search, setSearch] = useState("");

  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [partyNames, setPartyNames] = useState<Record<string, string>>({});
  const [salesById, setSalesById] = useState<Record<string, Sale>>({});
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payTarget, setPayTarget] = useState<Receivable | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    receivablesApi.list({ pageSize: 2000 }).then((envelope) => {
      if (cancelled) return;
      setReceivables(envelope.rows);

      const saleIds = [...new Set(envelope.rows.map((r) => r.saleId))];
      Promise.all(saleIds.map((id) => salesApi.get(id).catch(() => null))).then((sales) => {
        if (cancelled) return;
        setSalesById(Object.fromEntries(sales.filter((s): s is Sale => !!s).map((s) => [s.id, s])));

        const customerIds = [...new Set(envelope.rows.filter((r) => r.type === "customer").map((r) => r.partyId))];
        const staffIds = [...new Set(envelope.rows.filter((r) => r.type === "staff").map((r) => r.partyId))];
        Promise.all([
          Promise.all(customerIds.map((id) => customersApi.get(id).then((c) => [id, c.name] as const).catch(() => [id, id] as const))),
          Promise.all(staffIds.map((id) => usersApi.get(id).then((u) => [id, u.name] as const).catch(() => [id, id] as const))),
        ]).then(([customerPairs, staffPairs]) => {
          if (cancelled) return;
          setPartyNames(Object.fromEntries([...customerPairs, ...staffPairs]));
          setLoading(false);
        });
      });
    });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const byType = receivables.filter((r) => r.type === tab);
  const agingRows = agingSummary(byType);
  const stateDonutData = [
    { key: "open", label: "Open", value: byType.filter((r) => r.state === "open").length, color: CHART_PALETTE[6] },
    { key: "partial", label: "Partial", value: byType.filter((r) => r.state === "partial").length, color: CHART_PALETTE[2] },
    { key: "settled", label: "Settled", value: byType.filter((r) => r.state === "settled").length, color: CHART_PALETTE[4] },
    { key: "written_off", label: "Written off", value: byType.filter((r) => r.state === "written_off").length, color: "#94A3B8" },
  ];

  const visible = byType.filter((r) => {
    if (state && r.state !== state) return false;
    if (bucket && r.agingBucket !== bucket) return false;
    if (search.trim()) {
      const name = partyNames[r.partyId]?.toLowerCase() ?? "";
      const booking = salesById[r.saleId]?.bookingNo.toLowerCase() ?? "";
      const q = search.trim().toLowerCase();
      if (!name.includes(q) && !booking.includes(q)) return false;
    }
    return true;
  });

  function changeTab(next: string) {
    setTab(next as ReceivableType);
    setBucket(undefined);
    setState("");
    setExpandedId(null);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Receivables"
        subtitle={canAct ? "Outstanding balances owed by customers and staff." : "View only — outstanding balances owed by customers and staff."}
        breadcrumb="Accounts / Receivables"
      />

      <div className="stagger flex flex-col gap-4">
        <div className="flex items-center overflow-x-auto">
          <Tabs
            tabs={[
              { id: "customer", label: "Customer", count: receivables.filter((r) => r.type === "customer").length },
              { id: "staff", label: "Staff", count: receivables.filter((r) => r.type === "staff").length },
            ]}
            active={tab}
            onChange={changeTab}
          />
        </div>

        {loading ? (
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-32" />
            ))}
          </div>
        ) : (
          <>
            <AgingChips summary={agingRows} activeBucket={bucket} onSelect={setBucket} />
            {byType.length > 0 && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ChartCard title={`${tab === "customer" ? "Customer" : "Staff"} receivables by state`} subtitle="Open, partial, settled and written off" minHeight={220} className="lg:col-span-1">
                  <CategoryDonut data={stateDonutData} centerLabel="Records" />
                </ChartCard>
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select value={state} onChange={(e) => setState(e.target.value as ReceivableState | "")}>
            <option value="">All states</option>
            {RECEIVABLE_STATES.map((s) => (
              <option key={s} value={s}>
                {STATE_LABELS[s]}
              </option>
            ))}
          </Select>
          <SearchInput className="sm:col-span-2" placeholder="Search party or booking no..." onSearch={setSearch} />
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState icon={Wallet} title="No receivables here" hint="Nothing matches the current filters." />
        ) : (
          <div className="table-wrap overflow-x-auto">
            <table className="table w-full min-w-[880px]">
              <thead>
                <tr>
                  <th></th>
                  <th>Party</th>
                  <th>Booking</th>
                  <th className="text-right">Original</th>
                  <th className="text-right">Paid</th>
                  <th className="text-right">Balance</th>
                  <th>Due date</th>
                  <th>Aging</th>
                  <th>State</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <Fragment key={r.id}>
                    <tr className="cursor-pointer" onClick={() => setExpandedId((id) => (id === r.id ? null : r.id))}>
                      <td className="w-8">
                        {expandedId === r.id ? <ChevronDown className="h-4 w-4 text-inkMuted" /> : <ChevronRight className="h-4 w-4 text-inkMuted" />}
                      </td>
                      <td className="font-medium text-ink">{partyNames[r.partyId] ?? "…"}</td>
                      <td className="font-money text-xs text-inkMuted">{salesById[r.saleId]?.bookingNo ?? "—"}</td>
                      <td className="text-right font-money">{formatMoney(r.originalAmount)}</td>
                      <td className="text-right font-money">{formatMoney(r.paidAmount)}</td>
                      <td className="text-right font-money font-bold text-ink">{formatMoney(r.balance)}</td>
                      <td className="text-xs">{formatDate(r.dueDate)}</td>
                      <td>
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", BUCKET_PILL[r.agingBucket])}>{r.agingBucket}</span>
                      </td>
                      <td>
                        <span className="pill">{STATE_LABELS[r.state]}</span>
                      </td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        {canAct && r.state !== "settled" && r.state !== "written_off" && (
                          <Button variant="secondary" size="sm" onClick={() => setPayTarget(r)}>
                            Record payment
                          </Button>
                        )}
                      </td>
                    </tr>
                    {expandedId === r.id && (
                      <tr>
                        <td colSpan={10} className="bg-subtle/60">
                          {r.installments.length === 0 ? (
                            <p className="px-3 py-3 text-xs text-inkMuted">No installments recorded yet.</p>
                          ) : (
                            <div className="flex flex-col gap-1.5 px-3 py-3">
                              {r.installments.map((inst) => (
                                <div key={inst.no} className="flex items-center gap-3 text-xs">
                                  {inst.paidOn ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success-600" />
                                  ) : (
                                    <Circle className="h-3.5 w-3.5 shrink-0 text-inkMuted" />
                                  )}
                                  <span className="text-inkMuted">#{inst.no}</span>
                                  <span className="font-money font-semibold text-ink">{formatMoney(inst.amount)}</span>
                                  <span className="text-inkMuted">due {formatDate(inst.dueDate)}</span>
                                  {inst.paidOn && <span className="text-success-600">paid {formatDate(inst.paidOn)}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RecordPaymentModal
        open={!!payTarget}
        receivable={payTarget}
        partyName={payTarget ? partyNames[payTarget.partyId] : undefined}
        onClose={() => setPayTarget(null)}
        onRecorded={() => {
          setPayTarget(null);
          setReloadKey((k) => k + 1);
        }}
      />
    </div>
  );
}
