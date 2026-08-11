"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Table, { type TableColumn } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import ProgressBar from "@/components/ui/ProgressBar";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MistakeFormModal from "@/components/accounts/MistakeFormModal";
import ChartCard from "@/components/charts/ChartCard";
import CategoryDonut from "@/components/charts/CategoryDonut";
import { CHART_PALETTE } from "@/components/charts/chartTheme";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/stores/authStore";
import { mistakesApi } from "@/lib/api/mistakesApi";
import { salesApi } from "@/lib/api/salesApi";
import { usersApi } from "@/lib/api/usersApi";
import type { Mistake, MistakeStatus, Sale, SessionUser } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatMoney } from "@/lib/utils/format";

const STATUS_TONE: Record<MistakeStatus, string> = {
  reported: "bg-subtle text-inkSoft",
  accepted: "bg-info-50 text-info-600",
  recovering: "bg-accent-50 text-accent-700",
  recovered: "bg-success-50 text-success-600",
  waived: "bg-line/60 text-inkMuted",
};

const STATUS_LABEL: Record<MistakeStatus, string> = {
  reported: "Reported",
  accepted: "Accepted",
  recovering: "Recovering",
  recovered: "Recovered",
  waived: "Waived",
};

const NEXT_STAGE: Partial<Record<MistakeStatus, { status: MistakeStatus; label: string }>> = {
  reported: { status: "accepted", label: "Accept" },
  accepted: { status: "recovering", label: "Start recovery" },
};

export default function MistakesPage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [usersById, setUsersById] = useState<Record<string, SessionUser>>({});
  const [salesById, setSalesById] = useState<Record<string, Sale>>({});
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [advanceTarget, setAdvanceTarget] = useState<{ mistake: Mistake; next: MistakeStatus; label: string } | null>(null);
  const [waiveTarget, setWaiveTarget] = useState<Mistake | null>(null);
  const [recoverTarget, setRecoverTarget] = useState<Mistake | null>(null);
  const [recoverAmount, setRecoverAmount] = useState("0.000");
  const [recoverError, setRecoverError] = useState<string | undefined>();

  useEffect(() => {
    usersApi.list({ pageSize: 200 }).then((e) => setUsersById(Object.fromEntries(e.rows.map((u) => [u.id, u]))));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });
    mistakesApi.list({ pageSize: 500 }).then((envelope) => {
      if (cancelled) return;
      setMistakes(envelope.rows);

      const saleIds = [...new Set(envelope.rows.map((m) => m.saleId).filter((id): id is string => !!id))];
      Promise.all(saleIds.map((id) => salesApi.get(id).catch(() => null))).then((sales) => {
        if (cancelled) return;
        setSalesById(Object.fromEntries(sales.filter((s): s is Sale => !!s).map((s) => [s.id, s])));
        setLoading(false);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const statusDonutData = [
    { key: "reported", label: "Reported", value: mistakes.filter((m) => m.status === "reported").length, color: "#94A3B8" },
    { key: "accepted", label: "Accepted", value: mistakes.filter((m) => m.status === "accepted").length, color: CHART_PALETTE[6] },
    { key: "recovering", label: "Recovering", value: mistakes.filter((m) => m.status === "recovering").length, color: CHART_PALETTE[2] },
    { key: "recovered", label: "Recovered", value: mistakes.filter((m) => m.status === "recovered").length, color: CHART_PALETTE[4] },
    { key: "waived", label: "Waived", value: mistakes.filter((m) => m.status === "waived").length, color: "#64748B" },
  ];

  function handleCreated() {
    setFormOpen(false);
    setReloadKey((k) => k + 1);
  }

  async function handleAdvance() {
    if (!advanceTarget || !user) return;
    setBusyId(advanceTarget.mistake.id);
    try {
      await mistakesApi.updateStatus(advanceTarget.mistake.id, advanceTarget.next, user.id);
      toast.success("Mistake updated", `${usersById[advanceTarget.mistake.staffId]?.name ?? advanceTarget.mistake.id} → ${STATUS_LABEL[advanceTarget.next]}`);
      setAdvanceTarget(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error("Could not update", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleWaive() {
    if (!waiveTarget || !user) return;
    setBusyId(waiveTarget.id);
    try {
      await mistakesApi.updateStatus(waiveTarget.id, "waived", user.id);
      toast.success("Mistake waived", usersById[waiveTarget.staffId]?.name ?? waiveTarget.id);
      setWaiveTarget(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error("Could not waive", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  function openRecoverModal(mistake: Mistake) {
    setRecoverTarget(mistake);
    setRecoverAmount(mistake.recoveredAmount.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }));
    setRecoverError(undefined);
  }

  async function handleRecoverySubmit() {
    if (!recoverTarget || !user) return;
    const numeric = Number(recoverAmount.replace(/,/g, "")) || 0;
    if (numeric < 0) {
      setRecoverError("Enter a valid amount.");
      return;
    }
    if (numeric > recoverTarget.amount) {
      setRecoverError(`Cannot exceed the mistake amount of ${formatMoney(recoverTarget.amount)}.`);
      return;
    }
    setBusyId(recoverTarget.id);
    try {
      const nextStatus: MistakeStatus = numeric >= recoverTarget.amount ? "recovered" : "recovering";
      await mistakesApi.updateStatus(recoverTarget.id, nextStatus, user.id, numeric);
      toast.success(nextStatus === "recovered" ? "Fully recovered" : "Recovery updated", usersById[recoverTarget.staffId]?.name ?? recoverTarget.id);
      setRecoverTarget(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error("Could not update recovery", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  const columns: TableColumn<Mistake>[] = [
    { key: "date", label: "Date", render: (row) => formatDate(row.date) },
    {
      key: "staffId",
      label: "Staff",
      render: (row) => {
        const staff = usersById[row.staffId];
        return (
          <span className="inline-flex items-center gap-2">
            <Avatar name={staff?.name} size="sm" />
            <span className="truncate text-sm">{staff?.name ?? "—"}</span>
          </span>
        );
      },
    },
    { key: "saleId", label: "Booking", render: (row) => (row.saleId ? salesById[row.saleId]?.bookingNo ?? "…" : "—") },
    { key: "description", label: "Description", render: (row) => <span className="line-clamp-2 max-w-xs text-xs text-inkSoft">{row.description}</span> },
    { key: "amount", label: "Amount", align: "right", money: true, render: (row) => formatMoney(row.amount) },
    {
      key: "recoveredAmount",
      label: "Recovered",
      render: (row) => (
        <div className="w-28">
          <div className="mb-1 flex justify-between text-[11px] text-inkMuted">
            <span>{formatMoney(row.recoveredAmount)}</span>
            <span>{row.amount > 0 ? Math.round((row.recoveredAmount / row.amount) * 100) : 0}%</span>
          </div>
          <ProgressBar value={row.recoveredAmount} max={Math.max(row.amount, 1)} tone={row.status === "recovered" ? "success" : "brand"} />
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      filterable: true,
      filterLabel: (v) => STATUS_LABEL[v as keyof typeof STATUS_LABEL] ?? String(v),
      render: (row) => <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", STATUS_TONE[row.status])}>{STATUS_LABEL[row.status]}</span>,
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => {
        const disabled = busyId === row.id;
        if (row.status === "recovered" || row.status === "waived") return null;
        const next = NEXT_STAGE[row.status];
        return (
          <div className="flex flex-wrap justify-end gap-1">
            {row.status === "recovering" && (
              <Button variant="secondary" size="sm" onClick={() => openRecoverModal(row)} disabled={disabled}>
                Update recovery
              </Button>
            )}
            {next && (
              <Button variant="secondary" size="sm" onClick={() => setAdvanceTarget({ mistake: row, next: next.status, label: next.label })} disabled={disabled}>
                {next.label}
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-danger-600 hover:text-danger-700" onClick={() => setWaiveTarget(row)} disabled={disabled}>
              Waive
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Mistakes"
        subtitle="Track service errors, financial impact and recovery."
        breadcrumb="Accounts / Mistakes"
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setFormOpen(true)}>
            Report Mistake
          </Button>
        }
      />

      {!loading && mistakes.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard title="Mistakes by status" subtitle="Recovery pipeline breakdown" minHeight={220} className="lg:col-span-1">
            <CategoryDonut data={statusDonutData} centerLabel="Mistakes" />
          </ChartCard>
        </div>
      )}

      <Table<Mistake>
        columns={columns}
        rows={mistakes}
        loading={loading}
        emptyState={{ icon: AlertTriangle, title: "No mistakes reported", hint: "Reported mistakes and their recovery status will appear here." }}
      />

      <MistakeFormModal open={formOpen} onClose={() => setFormOpen(false)} onCreated={handleCreated} />

      <ConfirmDialog
        open={!!advanceTarget}
        onClose={() => setAdvanceTarget(null)}
        title={advanceTarget ? `${advanceTarget.label}?` : undefined}
        body={advanceTarget ? `${usersById[advanceTarget.mistake.staffId]?.name ?? advanceTarget.mistake.id} will move to "${STATUS_LABEL[advanceTarget.next]}".` : undefined}
        confirmLabel={advanceTarget?.label}
        onConfirm={handleAdvance}
      />

      <ConfirmDialog
        open={!!waiveTarget}
        onClose={() => setWaiveTarget(null)}
        title="Waive this mistake?"
        body={waiveTarget ? `${usersById[waiveTarget.staffId]?.name ?? waiveTarget.id} will be marked waived and no further recovery tracked.` : undefined}
        confirmLabel="Waive"
        danger
        onConfirm={handleWaive}
      />

      <Modal open={!!recoverTarget} onClose={() => setRecoverTarget(null)} title="Update recovery" size="sm">
        {recoverTarget && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-subtle px-3 py-2 text-xs text-inkSoft">
              Mistake amount: <span className="font-money font-bold text-ink">{formatMoney(recoverTarget.amount)}</span>
            </div>
            <Input
              label="Recovered so far"
              required
              value={recoverAmount}
              className="font-money"
              onChange={(e) => {
                const stripped = e.target.value.replace(/,/g, "");
                if (/^\d*\.?\d*$/.test(stripped)) setRecoverAmount(stripped);
              }}
              onBlur={() => {
                const n = Math.max(0, Number(recoverAmount.replace(/,/g, "")) || 0);
                setRecoverAmount(n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }));
              }}
              error={recoverError}
              hint="Reaching the full amount automatically marks the mistake as recovered."
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRecoverTarget(null)}>
                Cancel
              </Button>
              <Button variant="primary" loading={busyId === recoverTarget.id} onClick={handleRecoverySubmit}>
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
