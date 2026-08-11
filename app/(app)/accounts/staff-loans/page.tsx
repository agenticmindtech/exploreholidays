"use client";

import { useEffect, useState } from "react";
import { HandCoins, Plus } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Table, { type TableColumn } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import ProgressBar from "@/components/ui/ProgressBar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LoanFormModal from "@/components/accounts/LoanFormModal";
import InstallmentModal from "@/components/accounts/InstallmentModal";
import ChartCard from "@/components/charts/ChartCard";
import CategoryDonut from "@/components/charts/CategoryDonut";
import { CHART_PALETTE } from "@/components/charts/chartTheme";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/stores/authStore";
import { loansApi } from "@/lib/api/loansApi";
import { usersApi } from "@/lib/api/usersApi";
import type { LoanStatus, SessionUser, StaffLoan } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatMoney } from "@/lib/utils/format";

const STATUS_TONE: Record<LoanStatus, string> = {
  active: "bg-primary-50 text-primary-700",
  completed: "bg-success-50 text-success-600",
  defaulted: "bg-danger-50 text-danger-700",
};

const STATUS_LABEL: Record<LoanStatus, string> = {
  active: "Active",
  completed: "Completed",
  defaulted: "Defaulted",
};

export default function StaffLoansPage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const [loans, setLoans] = useState<StaffLoan[]>([]);
  const [usersById, setUsersById] = useState<Record<string, SessionUser>>({});
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [installmentTarget, setInstallmentTarget] = useState<StaffLoan | null>(null);
  const [defaultTarget, setDefaultTarget] = useState<StaffLoan | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    usersApi.list({ pageSize: 200 }).then((e) => setUsersById(Object.fromEntries(e.rows.map((u) => [u.id, u]))));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });
    loansApi.list({ pageSize: 500 }).then((envelope) => {
      if (cancelled) return;
      setLoans(envelope.rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const statusCounts = {
    active: loans.filter((l) => l.status === "active").length,
    completed: loans.filter((l) => l.status === "completed").length,
    defaulted: loans.filter((l) => l.status === "defaulted").length,
  };
  const statusDonutData = [
    { key: "active", label: "Active", value: statusCounts.active, color: CHART_PALETTE[0] },
    { key: "completed", label: "Completed", value: statusCounts.completed, color: CHART_PALETTE[4] },
    { key: "defaulted", label: "Defaulted", value: statusCounts.defaulted, color: CHART_PALETTE[7] },
  ];

  function handleLoanCreated() {
    setFormOpen(false);
    setReloadKey((k) => k + 1);
  }

  function handleInstallmentRecorded() {
    setInstallmentTarget(null);
    setReloadKey((k) => k + 1);
  }

  async function handleMarkDefaulted() {
    if (!defaultTarget || !user) return;
    setBusyId(defaultTarget.id);
    try {
      await loansApi.markDefaulted(defaultTarget.id, user.id);
      toast.success("Loan marked defaulted", usersById[defaultTarget.staffId]?.name ?? defaultTarget.id);
      setDefaultTarget(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error("Could not update loan", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  const columns: TableColumn<StaffLoan>[] = [
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
    { key: "amount", label: "Amount", align: "right", money: true, render: (row) => formatMoney(row.amount) },
    { key: "issueDate", label: "Issued", render: (row) => formatDate(row.issueDate) },
    {
      key: "plan",
      label: "Installment plan",
      render: (row) => (
        <div className="w-32">
          <div className="mb-1 flex justify-between text-[11px] text-inkMuted">
            <span>
              {row.installmentsPaid} / {row.installmentsTotal}
            </span>
            <span className="font-money">{formatMoney(row.installmentAmount)}</span>
          </div>
          <ProgressBar value={row.installmentsPaid} max={Math.max(row.installmentsTotal, 1)} tone={row.status === "defaulted" ? "danger" : "brand"} />
        </div>
      ),
    },
    { key: "remaining", label: "Remaining", align: "right", money: true, render: (row) => formatMoney(row.remaining) },
    {
      key: "status",
      label: "Status",
      filterable: true,
      filterLabel: (v) => STATUS_LABEL[v as keyof typeof STATUS_LABEL] ?? String(v),
      render: (row) => (
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", STATUS_TONE[row.status])}>{STATUS_LABEL[row.status]}</span>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) =>
        row.status === "active" ? (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" className="text-danger-600 hover:text-danger-700" onClick={() => setDefaultTarget(row)} disabled={busyId === row.id}>
              Mark defaulted
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setInstallmentTarget(row)} disabled={busyId === row.id}>
              Record installment
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Staff Loans"
        subtitle="Issue advances and track installment repayments."
        breadcrumb="Accounts / Staff Loans"
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setFormOpen(true)}>
            Issue Loan
          </Button>
        }
      />

      {!loading && loans.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard title="Loans by status" subtitle="Active, completed and defaulted advances" minHeight={220} className="lg:col-span-1">
            <CategoryDonut data={statusDonutData} centerLabel="Loans" />
          </ChartCard>
        </div>
      )}

      <Table<StaffLoan>
        columns={columns}
        rows={loans}
        loading={loading}
        emptyState={{ icon: HandCoins, title: "No staff loans yet", hint: "Loans issued to staff will appear here." }}
      />

      <LoanFormModal open={formOpen} onClose={() => setFormOpen(false)} onCreated={handleLoanCreated} />

      <InstallmentModal
        open={!!installmentTarget}
        loan={installmentTarget}
        staffName={installmentTarget ? usersById[installmentTarget.staffId]?.name : undefined}
        onClose={() => setInstallmentTarget(null)}
        onRecorded={handleInstallmentRecorded}
      />

      <ConfirmDialog
        open={!!defaultTarget}
        onClose={() => setDefaultTarget(null)}
        title="Mark this loan as defaulted?"
        body={defaultTarget ? `${usersById[defaultTarget.staffId]?.name ?? defaultTarget.id} · remaining ${formatMoney(defaultTarget.remaining)} will no longer accept installments.` : undefined}
        confirmLabel="Mark defaulted"
        danger
        onConfirm={handleMarkDefaulted}
      />
    </div>
  );
}
