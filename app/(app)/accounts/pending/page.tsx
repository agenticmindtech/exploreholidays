"use client";

import { useEffect, useState } from "react";
import { isPast } from "date-fns";
import { Bell, CheckCircle2, Hourglass, MessageSquarePlus, XCircle } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Table, { type TableColumn } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import Textarea from "@/components/ui/Textarea";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/stores/authStore";
import { canManageFinance } from "@/lib/auth/permissions";
import { pendingApi } from "@/lib/api/pendingApi";
import { servicesApi } from "@/lib/api/servicesApi";
import { customersApi } from "@/lib/api/customersApi";
import { usersApi } from "@/lib/api/usersApi";
import type { PendingState, Sale, SessionUser, ServiceType, Customer } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";

const PIPELINE: PendingState[] = ["in_process", "awaiting_supplier", "awaiting_customer", "completed"];
const PIPELINE_LABELS: Record<PendingState, string> = {
  in_process: "In process",
  awaiting_supplier: "Awaiting supplier",
  awaiting_customer: "Awaiting customer",
  completed: "Completed",
  cancelled: "Cancelled",
};

function PipelineChips({ current }: { current: PendingState }) {
  const currentIdx = PIPELINE.indexOf(current);
  return (
    <div className="flex items-center gap-1">
      {PIPELINE.map((stage, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <span
            key={stage}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
              isCurrent && "border-primary-500 bg-primary-50 text-primary-700",
              isDone && "border-success-300 bg-success-50 text-success-600",
              !isCurrent && !isDone && "border-line bg-subtle text-inkMuted"
            )}
            title={PIPELINE_LABELS[stage]}
          >
            {PIPELINE_LABELS[stage]}
          </span>
        );
      })}
    </div>
  );
}

export default function PendingTransactionsPage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const canAct = canManageFinance(user?.role ?? "staff");

  const [rows, setRows] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [customersById, setCustomersById] = useState<Record<string, Customer>>({});
  const [usersById, setUsersById] = useState<Record<string, SessionUser>>({});

  const [advanceTarget, setAdvanceTarget] = useState<Sale | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | undefined>();
  const [noteTarget, setNoteTarget] = useState<Sale | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | undefined>();
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    servicesApi.list().then((e) => setServiceTypes(e.rows));
    usersApi.list({ pageSize: 200 }).then((e) => setUsersById(Object.fromEntries(e.rows.map((u) => [u.id, u]))));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    pendingApi.list({ pageSize: 500 }).then((envelope) => {
      if (cancelled) return;
      const active = envelope.rows.filter((s) => s.pendingState !== "completed" && s.pendingState !== "cancelled");
      setRows(active);
      setLoading(false);

      const ids = [...new Set(active.map((s) => s.customerId).filter((id): id is string => !!id))];
      Promise.all(ids.map((id) => customersApi.get(id))).then((customers) => {
        if (!cancelled) setCustomersById(Object.fromEntries(customers.map((c) => [c.id, c])));
      });
    });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function closeCancelModal() {
    setCancelTarget(null);
    setCancelReason("");
    setCancelError(undefined);
  }

  function closeNoteModal() {
    setNoteTarget(null);
    setNote("");
    setNoteError(undefined);
  }

  async function handleAdvance() {
    if (!advanceTarget || !user) return;
    setBusyId(advanceTarget.id);
    try {
      await pendingApi.advance(advanceTarget.id, user.id);
      toast.success("Stage advanced", advanceTarget.bookingNo);
      setAdvanceTarget(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error("Could not advance", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel() {
    if (!cancelTarget || !user) return;
    if (cancelReason.trim().length < 10) {
      setCancelError("Reason must be at least 10 characters.");
      return;
    }
    setBusyId(cancelTarget.id);
    try {
      await pendingApi.cancel(cancelTarget.id, cancelReason.trim(), user.id);
      toast.success("Pending service cancelled", cancelTarget.bookingNo);
      closeCancelModal();
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error("Could not cancel", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAddNote() {
    if (!noteTarget || !user) return;
    if (!note.trim()) {
      setNoteError("Enter a note before saving.");
      return;
    }
    setBusyId(noteTarget.id);
    try {
      await pendingApi.addFollowUpNote(noteTarget.id, note.trim(), user.id);
      toast.success("Follow-up note added", noteTarget.bookingNo);
      closeNoteModal();
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error("Could not save note", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleNotifyStaff(row: Sale) {
    if (!user) return;
    setBusyId(row.id);
    try {
      await pendingApi.notifyStaff(row.id, user.id);
      toast.success("Staff notified", `${usersById[row.staffId]?.name ?? row.staffId} was notified about ${row.bookingNo}.`);
    } catch (err) {
      toast.error("Could not notify staff", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  const columns: TableColumn<Sale>[] = [
    { key: "bookingNo", label: "Booking No", render: (row) => <span className="font-money font-semibold text-ink">{row.bookingNo}</span> },
    { key: "serviceTypeId", label: "Service", render: (row) => serviceTypes.find((s) => s.id === row.serviceTypeId)?.name ?? "—" },
    { key: "customerId", label: "Customer", render: (row) => (row.customerId ? customersById[row.customerId]?.name ?? "…" : "Walk-in") },
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
    {
      key: "expectedCompletionDate",
      label: "Expected",
      render: (row) => {
        const overdue = row.expectedCompletionDate && isPast(new Date(row.expectedCompletionDate));
        return <span className={cn("text-sm", overdue && "font-semibold text-danger-600")}>{row.expectedCompletionDate ? formatDate(row.expectedCompletionDate) : "—"}</span>;
      },
    },
    {
      key: "pendingState",
      label: "Pipeline",
      filterable: true,
      filterLabel: (v) => PIPELINE_LABELS[v as PendingState] ?? String(v),
      render: (row) => <PipelineChips current={row.pendingState ?? "in_process"} />,
    },
    ...(canAct
      ? [
          {
            key: "actions",
            label: "",
            align: "right" as const,
            render: (row: Sale) => (
              <div className="flex flex-wrap justify-end gap-1">
                <Button variant="ghost" size="sm" icon={MessageSquarePlus} onClick={() => setNoteTarget(row)} disabled={busyId === row.id}>
                  Note
                </Button>
                <Button variant="ghost" size="sm" icon={Bell} onClick={() => handleNotifyStaff(row)} disabled={busyId === row.id}>
                  Notify
                </Button>
                <Button variant="secondary" size="sm" icon={CheckCircle2} onClick={() => setAdvanceTarget(row)} disabled={busyId === row.id}>
                  Advance
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={XCircle}
                  className="text-danger-600 hover:text-danger-700"
                  onClick={() => setCancelTarget(row)}
                  disabled={busyId === row.id}
                >
                  Cancel
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Pending Transactions"
        subtitle={canAct ? "Track services still in progress with suppliers or customers." : "View only — services still in progress with suppliers or customers."}
        breadcrumb="Accounts / Pending"
      />

      <Table<Sale>
        columns={columns}
        rows={rows}
        loading={loading}
        emptyState={{ icon: Hourglass, title: "Nothing pending", hint: "Services awaiting supplier or customer action will appear here." }}
      />

      <ConfirmDialog
        open={!!advanceTarget}
        onClose={() => setAdvanceTarget(null)}
        title="Advance to the next stage?"
        body={
          advanceTarget
            ? `${advanceTarget.bookingNo} will move from "${PIPELINE_LABELS[advanceTarget.pendingState ?? "in_process"]}" to the next stage.`
            : undefined
        }
        confirmLabel="Advance"
        onConfirm={handleAdvance}
      />

      <Modal open={!!cancelTarget} onClose={closeCancelModal} title={`Cancel ${cancelTarget?.bookingNo ?? "service"}`} size="sm">
        <Textarea
          label="Reason for cancellation"
          required
          rows={4}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          error={cancelError}
          hint="At least 10 characters — appended to the booking's remarks."
        />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={closeCancelModal}>
            Back
          </Button>
          <Button variant="danger" loading={busyId === cancelTarget?.id} onClick={handleCancel}>
            Cancel service
          </Button>
        </div>
      </Modal>

      <Modal open={!!noteTarget} onClose={closeNoteModal} title={`Follow-up · ${noteTarget?.bookingNo ?? ""}`} size="sm">
        <Textarea
          label="Note"
          required
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          error={noteError}
          hint="Timestamped and appended to the booking's remarks."
        />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={closeNoteModal}>
            Cancel
          </Button>
          <Button variant="primary" loading={busyId === noteTarget?.id} onClick={handleAddNote}>
            Save note
          </Button>
        </div>
      </Modal>
    </div>
  );
}
