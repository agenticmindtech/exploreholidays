"use client";

import { useEffect, useState } from "react";
import { isPast } from "date-fns";
import { AlertTriangle, LayoutGrid, Plus, RotateCcw, Table2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import SearchInput from "@/components/ui/SearchInput";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Skeleton from "@/components/ui/Skeleton";
import RefundPipeline from "@/components/accounts/RefundPipeline";
import SaleDetailCard from "@/components/sales/SaleDetailCard";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/stores/authStore";
import { canManageFinance } from "@/lib/auth/permissions";
import { refundsApi, type CreateRefundInput } from "@/lib/api/refundsApi";
import { salesApi } from "@/lib/api/salesApi";
import { servicesApi } from "@/lib/api/servicesApi";
import { suppliersApi } from "@/lib/api/suppliersApi";
import { branchesApi } from "@/lib/api/branchesApi";
import { customersApi } from "@/lib/api/customersApi";
import { usersApi } from "@/lib/api/usersApi";
import type { Branch, Refund, RefundStatus, Sale, ServiceType, SessionUser, Supplier } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatMoney } from "@/lib/utils/format";

type ViewMode = "table" | "board";

const BOARD_STAGES: { status: RefundStatus; label: string }[] = [
  { status: "requested", label: "Requested" },
  { status: "sent_to_supplier", label: "Sent to supplier" },
  { status: "received_from_supplier", label: "Received from supplier" },
  { status: "paid_to_customer", label: "Paid to customer" },
  { status: "rejected", label: "Rejected" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function moneyInputHandlers(setValue: (v: string) => void) {
  return {
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const stripped = e.target.value.replace(/,/g, "");
      if (/^\d*\.?\d*$/.test(stripped)) setValue(stripped);
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      const n = Math.max(0, Number(e.target.value.replace(/,/g, "")) || 0);
      setValue(n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }));
    },
  };
}

export default function RefundsPage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const canAct = canManageFinance(user?.role ?? "staff");

  const [view, setView] = useState<ViewMode>("table");
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [salesById, setSalesById] = useState<Record<string, Sale>>({});
  const [usersById, setUsersById] = useState<Record<string, SessionUser>>({});
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [advanceTarget, setAdvanceTarget] = useState<Refund | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Refund | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | undefined>();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [chargeBusyId, setChargeBusyId] = useState<string | null>(null);

  const [newOpen, setNewOpen] = useState(false);
  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customersById, setCustomersById] = useState<Record<string, string>>({});

  useEffect(() => {
    usersApi.list({ pageSize: 200 }).then((e) => setUsersById(Object.fromEntries(e.rows.map((u) => [u.id, u]))));
    servicesApi.list().then((e) => setServiceTypes(e.rows));
    suppliersApi.list({ pageSize: 500 }).then((e) => setSuppliers(e.rows));
    branchesApi.list().then((e) => setBranches(e.rows));
  }, []);

  useEffect(() => {
    if (!viewSale?.customerId || customersById[viewSale.customerId]) return;
    customersApi.get(viewSale.customerId).then((c) => setCustomersById((prev) => ({ ...prev, [c.id]: c.name })));
  }, [viewSale, customersById]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    refundsApi.list({ pageSize: 1000 }).then((envelope) => {
      if (cancelled) return;
      setRefunds(envelope.rows);

      const ids = [...new Set(envelope.rows.map((r) => r.saleId))];
      Promise.all(ids.map((id) => salesApi.get(id).catch(() => null))).then((sales) => {
        if (cancelled) return;
        setSalesById(Object.fromEntries(sales.filter((s): s is Sale => !!s).map((s) => [s.id, s])));
        setLoading(false);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function closeRejectModal() {
    setRejectTarget(null);
    setRejectReason("");
    setRejectError(undefined);
  }

  async function handleAdvance() {
    if (!advanceTarget || !user) return;
    setBusyId(advanceTarget.id);
    try {
      const updated = await refundsApi.advance(advanceTarget.id, user.id);
      const note = updated.status === "received_from_supplier" ? " · supplier credited" : "";
      toast.success("Refund advanced", `${advanceTarget.id} → ${updated.status.replace(/_/g, " ")}${note}`);
      setAdvanceTarget(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error("Could not advance refund", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject() {
    if (!rejectTarget || !user) return;
    if (!rejectReason.trim()) {
      setRejectError("Enter a reason for rejecting this refund.");
      return;
    }
    setBusyId(rejectTarget.id);
    try {
      await refundsApi.reject(rejectTarget.id, user.id, rejectReason.trim());
      toast.success("Refund rejected", rejectTarget.id);
      closeRejectModal();
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error("Could not reject refund", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleChargeStaffChange(refund: Refund, staffId: string) {
    if (!user) return;
    setChargeBusyId(refund.id);
    try {
      await refundsApi.setChargeToStaff(refund.id, staffId || null, user.id);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error("Could not update charge", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setChargeBusyId(null);
    }
  }

  const openRefunds = refunds.filter((r) => r.status !== "paid_to_customer" && r.status !== "rejected");
  const awaitedFromSuppliers = openRefunds
    .filter((r) => r.status === "requested" || r.status === "sent_to_supplier")
    .reduce((sum, r) => sum + r.supplierRefundAmount, 0);
  const owedToCustomers = openRefunds.reduce((sum, r) => sum + r.customerRefundAmount, 0);

  function RefundDetails({ refund }: { refund: Refund }) {
    const sale = salesById[refund.saleId];
    const responsible = usersById[refund.responsibleStaffId];
    const staffOptions = Object.values(usersById).filter((u) => u.role === "staff");
    const overdue = refund.expectedRefundDate && isPast(new Date(refund.expectedRefundDate)) && refund.status !== "paid_to_customer";

    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {sale ? (
            <button
              type="button"
              onClick={() => setViewSale(sale)}
              className="font-money font-semibold text-primary-600 hover:underline"
            >
              {sale.bookingNo}
            </button>
          ) : (
            <span className="font-money font-semibold text-ink">{refund.saleId}</span>
          )}
          {overdue && (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger-50 px-2 py-0.5 text-[10px] font-bold text-danger-700">
              <AlertTriangle className="h-3 w-3" /> Overdue
            </span>
          )}
        </div>
        <p className="line-clamp-2 text-xs text-inkSoft">{refund.reason}</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <span className="text-inkMuted">Supplier refund</span>
          <span className="text-right font-money font-semibold text-ink">{formatMoney(refund.supplierRefundAmount)}</span>
          <span className="text-inkMuted">Customer refund</span>
          <span className="text-right font-money font-semibold text-ink">{formatMoney(refund.customerRefundAmount)}</span>
          <span className="text-inkMuted">Charge</span>
          <span className={cn("text-right font-money font-semibold", refund.charge > 0 ? "text-danger-600" : "text-inkMuted")}>
            {formatMoney(refund.charge)}
          </span>
        </div>
        {refund.charge > 0 && (
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[11px] font-medium text-danger-600">Charge to staff:</span>
            {canAct ? (
              <Select
                value={refund.chargeToStaffId ?? ""}
                disabled={chargeBusyId === refund.id}
                onChange={(e) => handleChargeStaffChange(refund, e.target.value)}
                className="!min-h-[32px] !py-1 text-xs"
              >
                <option value="">Unassigned</option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            ) : (
              <span className="text-xs font-semibold text-ink">{usersById[refund.chargeToStaffId ?? ""]?.name ?? "Unassigned"}</span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-inkMuted">
          <span>Responsible: {responsible?.name ?? "—"}</span>
          <span>{refund.expectedRefundDate ? formatDate(refund.expectedRefundDate) : "No expected date"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Refunds"
        subtitle={canAct ? "Track supplier and customer refunds through every stage." : "View only — supplier and customer refunds through every stage."}
        breadcrumb="Accounts / Refunds"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-line p-1">
              <button
                type="button"
                onClick={() => setView("table")}
                className={cn("flex h-8 w-8 items-center justify-center rounded-lg", view === "table" ? "bg-primary-50 text-primary-600" : "text-inkMuted")}
                aria-label="Table view"
              >
                <Table2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView("board")}
                className={cn("flex h-8 w-8 items-center justify-center rounded-lg", view === "board" ? "bg-primary-50 text-primary-600" : "text-inkMuted")}
                aria-label="Board view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            {canAct && (
              <Button variant="primary" icon={Plus} onClick={() => setNewOpen(true)}>
                New Refund
              </Button>
            )}
          </div>
        }
      />

      <div className="stagger flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-inkMuted">Open refunds</p>
            <p className="mt-1 font-money text-xl font-bold text-ink">{openRefunds.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-inkMuted">Awaited from suppliers</p>
            <p className="mt-1 font-money text-xl font-bold text-ink">{formatMoney(awaitedFromSuppliers)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-inkMuted">Owed to customers</p>
            <p className="mt-1 font-money text-xl font-bold text-ink">{formatMoney(owedToCustomers)}</p>
          </Card>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : refunds.length === 0 ? (
          <Card className="flex flex-col items-center gap-1 py-14 text-center">
            <RotateCcw className="mb-2 h-8 w-8 text-inkMuted" />
            <p className="font-display text-base font-semibold text-ink">No refunds yet</p>
            <p className="text-sm text-inkMuted">Start a refund from a posted sale to see it here.</p>
          </Card>
        ) : view === "table" ? (
          <div className="table-wrap overflow-x-auto">
            <table className="table w-full min-w-[900px]">
              <thead>
                <tr>
                  <th>Details</th>
                  <th>Pipeline</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((refund) => (
                  <tr key={refund.id}>
                    <td className="max-w-md">
                      <RefundDetails refund={refund} />
                    </td>
                    <td>
                      <RefundPipeline
                        status={refund.status}
                        dense
                        disabled={busyId === refund.id}
                        readOnly={!canAct}
                        onAdvance={() => setAdvanceTarget(refund)}
                        onReject={() => setRejectTarget(refund)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {BOARD_STAGES.map((stage) => (
              <div key={stage.status} className="flex flex-col gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-inkMuted">
                  {stage.label} ({refunds.filter((r) => r.status === stage.status).length})
                </p>
                <div className="flex flex-col gap-3">
                  {refunds
                    .filter((r) => r.status === stage.status)
                    .map((refund) => (
                      <Card key={refund.id} className="flex flex-col gap-3 p-4">
                        <RefundDetails refund={refund} />
                        <RefundPipeline
                          status={refund.status}
                          disabled={busyId === refund.id}
                          readOnly={!canAct}
                          onAdvance={() => setAdvanceTarget(refund)}
                          onReject={() => setRejectTarget(refund)}
                        />
                      </Card>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!advanceTarget}
        onClose={() => setAdvanceTarget(null)}
        title="Advance this refund?"
        body={advanceTarget ? `${advanceTarget.id} will move to the next pipeline stage.` : undefined}
        confirmLabel="Advance"
        onConfirm={handleAdvance}
      />

      <Modal open={!!rejectTarget} onClose={closeRejectModal} title={`Reject ${rejectTarget?.id ?? "refund"}`} size="sm">
        <Textarea
          label="Reason"
          required
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          error={rejectError}
        />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={closeRejectModal}>
            Back
          </Button>
          <Button variant="danger" loading={busyId === rejectTarget?.id} onClick={handleReject}>
            Reject refund
          </Button>
        </div>
      </Modal>

      <NewRefundModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={() => {
          setNewOpen(false);
          setReloadKey((k) => k + 1);
        }}
      />

      <Modal open={!!viewSale} onClose={() => setViewSale(null)} title={viewSale ? `Booking · ${viewSale.bookingNo}` : "Booking"} size="lg">
        {viewSale && (
          <SaleDetailCard
            sale={viewSale}
            serviceTypeName={serviceTypes.find((s) => s.id === viewSale.serviceTypeId)?.name}
            supplierName={suppliers.find((s) => s.id === viewSale.supplierId)?.name}
            customerName={viewSale.customerId ? customersById[viewSale.customerId] : undefined}
            branchName={branches.find((b) => b.id === viewSale.branchId)?.name}
          />
        )}
      </Modal>
    </div>
  );
}

interface NewRefundModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function NewRefundModal({ open, onClose, onCreated }: NewRefundModalProps) {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Sale[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [staffUsers, setStaffUsers] = useState<SessionUser[]>([]);

  const [reason, setReason] = useState("");
  const [requestDate, setRequestDate] = useState(todayIso());
  const [expectedRefundDate, setExpectedRefundDate] = useState("");
  const [supplierRefundAmount, setSupplierRefundAmount] = useState("0.000");
  const [customerRefundAmount, setCustomerRefundAmount] = useState("0.000");
  const [responsibleStaffId, setResponsibleStaffId] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) usersApi.list({ pageSize: 200 }).then((e) => setStaffUsers(e.rows.filter((u) => u.role === "staff")));
  }, [open]);

  useEffect(() => {
    let cancelled = false;

    if (!query.trim()) {
      Promise.resolve().then(() => {
        if (!cancelled) setMatches([]);
      });
      return () => {
        cancelled = true;
      };
    }

    Promise.resolve().then(() => {
      if (!cancelled) setSearching(true);
    });
    salesApi.list({ search: query, status: "posted", page: 1, pageSize: 5 }).then((envelope) => {
      if (!cancelled) {
        setMatches(envelope.rows);
        setSearching(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  function pickSale(sale: Sale) {
    setSelectedSale(sale);
    setSupplierRefundAmount(sale.netCost.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }));
    setCustomerRefundAmount(sale.sellingPrice.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }));
    setResponsibleStaffId(sale.staffId);
    setMatches([]);
    setQuery(sale.bookingNo);
  }

  function reset() {
    setQuery("");
    setMatches([]);
    setSelectedSale(null);
    setReason("");
    setRequestDate(todayIso());
    setExpectedRefundDate("");
    setSupplierRefundAmount("0.000");
    setCustomerRefundAmount("0.000");
    setResponsibleStaffId("");
    setError(undefined);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!selectedSale) {
      setError("Search and select a posted sale first.");
      return;
    }
    if (!reason.trim()) {
      setError("Enter a reason for this refund.");
      return;
    }
    if (!responsibleStaffId) {
      setError("Select the staff member responsible.");
      return;
    }
    if (!user) return;

    const data: CreateRefundInput = {
      saleId: selectedSale.id,
      requestDate,
      reason: reason.trim(),
      supplierRefundAmount: Number(supplierRefundAmount.replace(/,/g, "")) || 0,
      customerRefundAmount: Number(customerRefundAmount.replace(/,/g, "")) || 0,
      responsibleStaffId,
      expectedRefundDate: expectedRefundDate || null,
    };

    setSubmitting(true);
    try {
      const refund = await refundsApi.create(data, user.id);
      toast.success("Refund created", `${refund.id} for ${selectedSale.bookingNo}`);
      reset();
      onCreated();
    } catch (err) {
      toast.error("Could not create refund", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const supplierHandlers = moneyInputHandlers(setSupplierRefundAmount);
  const customerHandlers = moneyInputHandlers(setCustomerRefundAmount);

  return (
    <Modal open={open} onClose={handleClose} title="New refund" size="md">
      <div className="flex flex-col gap-4">
        <div>
          <SearchInput placeholder="Search posted sale by booking no..." defaultValue={query} onSearch={setQuery} />
          {searching && <p className="mt-1 text-xs text-inkMuted">Searching…</p>}
          {matches.length > 0 && (
            <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-line">
              {matches.map((sale) => (
                <button
                  key={sale.id}
                  type="button"
                  onClick={() => pickSale(sale)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-subtle"
                >
                  <span className="font-money font-semibold text-ink">{sale.bookingNo}</span>
                  <span className="text-xs text-inkMuted">{formatMoney(sale.sellingPrice)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedSale && (
          <div className="rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-700">
            Prefilled from <span className="font-semibold">{selectedSale.bookingNo}</span> — amounts below default to net cost / selling price, adjust as needed.
          </div>
        )}

        <Textarea label="Reason" required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />

        <div className="grid grid-cols-2 gap-3">
          <DatePicker label="Request date" required value={requestDate} onChange={setRequestDate} />
          <DatePicker label="Expected refund date (optional)" value={expectedRefundDate} onChange={setExpectedRefundDate} min={requestDate} />
        </div>

        <Select label="Responsible staff" required value={responsibleStaffId} onChange={(e) => setResponsibleStaffId(e.target.value)}>
          <option value="">Select staff</option>
          {staffUsers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Supplier refund amount" required value={supplierRefundAmount} onChange={supplierHandlers.onChange} onBlur={supplierHandlers.onBlur} className="font-money" />
          <Input label="Customer refund amount" required value={customerRefundAmount} onChange={customerHandlers.onChange} onBlur={customerHandlers.onBlur} className="font-money" />
        </div>

        {error && <p className="text-xs text-danger-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={submitting} onClick={handleSubmit}>
            Create refund
          </Button>
        </div>
      </div>
    </Modal>
  );
}
