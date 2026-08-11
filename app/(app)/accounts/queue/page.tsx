"use client";

import { useEffect, useState } from "react";
import { isToday } from "date-fns";
import { CheckSquare, Clock, Eye, ListChecks, Square, Undo2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import KPIStatCard from "@/components/ui/KPIStatCard";
import Table, { type TableColumn } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import Select from "@/components/ui/Select";
import SalesFilterBar from "@/components/sales/SalesFilterBar";
import SaleReviewDrawer from "@/components/accounts/SaleReviewDrawer";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/stores/authStore";
import { canManageFinance } from "@/lib/auth/permissions";
import { salesApi } from "@/lib/api/salesApi";
import { servicesApi } from "@/lib/api/servicesApi";
import { branchesApi } from "@/lib/api/branchesApi";
import { suppliersApi } from "@/lib/api/suppliersApi";
import { usersApi } from "@/lib/api/usersApi";
import type { Branch, Filters, Sale, SessionUser, ServiceType, Supplier } from "@/lib/types";
import { formatMoney, relativeTime } from "@/lib/utils/format";

const PAGE_SIZE = 10;

function refreshQueueBadge() {
  window.dispatchEvent(new Event("queue-count-refresh"));
}

export default function VerificationQueuePage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const canAct = canManageFinance(user?.role ?? "staff");

  const [filters, setFilters] = useState<Filters>({ page: 1, pageSize: PAGE_SIZE, sortBy: "submittedAt", sortDir: "asc" });
  const [branchId, setBranchId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [rows, setRows] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [staffUsers, setStaffUsers] = useState<SessionUser[]>([]);

  const [kpis, setKpis] = useState({ inQueue: 0, oldestSubmittedAt: null as string | null, verifiedToday: 0, returnedToday: 0 });
  const [kpiLoading, setKpiLoading] = useState(true);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reviewSaleId, setReviewSaleId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    servicesApi.list().then((e) => setServiceTypes(e.rows));
    branchesApi.list().then((e) => setBranches(e.rows));
    suppliersApi.list().then((e) => setSuppliers(e.rows));
    usersApi.list({ pageSize: 200 }).then((e) => setStaffUsers(e.rows.filter((u) => u.role === "staff")));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    const scoped: Filters = { ...filters, status: "submitted", branchId: branchId || undefined, staffId: staffId || undefined, supplierId: supplierId || undefined };
    salesApi.list(scoped).then((envelope) => {
      if (cancelled) return;
      setRows(envelope.rows);
      setTotal(envelope.total);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [filters, branchId, staffId, supplierId, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setKpiLoading(true);
    });

    Promise.all([
      salesApi.list({ status: "submitted", branchId: branchId || undefined, staffId: staffId || undefined, page: 1, pageSize: 2000 }),
      salesApi.list({ status: "verified", branchId: branchId || undefined, staffId: staffId || undefined, page: 1, pageSize: 500 }),
      salesApi.list({ status: "returned", branchId: branchId || undefined, staffId: staffId || undefined, page: 1, pageSize: 500 }),
    ]).then(([queueEnv, verifiedEnv, returnedEnv]) => {
      if (cancelled) return;
      const oldest = queueEnv.rows.reduce<string | null>((acc, s) => {
        if (!s.submittedAt) return acc;
        if (!acc || s.submittedAt < acc) return s.submittedAt;
        return acc;
      }, null);
      setKpis({
        inQueue: queueEnv.total,
        oldestSubmittedAt: oldest,
        verifiedToday: verifiedEnv.rows.filter((s) => s.verifiedAt && isToday(new Date(s.verifiedAt))).length,
        returnedToday: returnedEnv.rows.filter((s) => s.returnedAt && isToday(new Date(s.returnedAt))).length,
      });
      setKpiLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [branchId, staffId, reloadKey]);

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    setSelected((prev) => {
      const allSelected = rows.every((r) => prev.has(r.id));
      const next = new Set(prev);
      if (allSelected) {
        rows.forEach((r) => next.delete(r.id));
      } else {
        rows.forEach((r) => next.add(r.id));
      }
      return next;
    });
  }

  function onReviewed() {
    setReloadKey((k) => k + 1);
    refreshQueueBadge();
  }

  async function handleBulkVerify() {
    if (!user || selected.size === 0) return;
    const ids = [...selected];
    setBulkBusy(true);
    setBulkProgress({ done: 0, total: ids.length });

    const succeeded: string[] = [];
    const failed: { id: string; bookingNo: string; reason: string }[] = [];

    for (const id of ids) {
      const row = rows.find((r) => r.id === id);
      try {
        await salesApi.verify(id, user.id);
        succeeded.push(id);
      } catch (err) {
        failed.push({ id, bookingNo: row?.bookingNo ?? id, reason: err instanceof Error ? err.message : "Failed" });
      }
      setBulkProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }

    setBulkBusy(false);
    setBulkProgress(null);
    setSelected(new Set(failed.map((f) => f.id)));
    setReloadKey((k) => k + 1);
    refreshQueueBadge();

    const summary = `${succeeded.length} verified${failed.length ? ` · ${failed.length} failed (${failed.map((f) => `${f.bookingNo}: ${f.reason}`).join("; ")})` : ""}`;
    if (failed.length === 0) toast.success("Bulk verify complete", summary);
    else toast.error("Bulk verify finished with errors", summary);
  }

  const columns: TableColumn<Sale>[] = [
    ...(canAct
      ? [
          {
            key: "select",
            label: (
              <button type="button" onClick={toggleAllOnPage} className="flex h-5 w-5 items-center justify-center text-inkMuted hover:text-primary-600" aria-label="Select all on page">
                {rows.length > 0 && rows.every((r) => selected.has(r.id)) ? <CheckSquare className="h-4 w-4 text-primary-600" /> : <Square className="h-4 w-4" />}
              </button>
            ),
            render: (row: Sale) => (
              <button type="button" onClick={() => toggleRow(row.id)} className="flex h-5 w-5 items-center justify-center text-inkMuted hover:text-primary-600" aria-label={`Select ${row.bookingNo}`}>
                {selected.has(row.id) ? <CheckSquare className="h-4 w-4 text-primary-600" /> : <Square className="h-4 w-4" />}
              </button>
            ),
          },
        ]
      : []),
    {
      key: "bookingNo",
      label: "Booking No",
      sortable: true,
      render: (row) => (
        <button type="button" onClick={() => setReviewSaleId(row.id)} className="font-money font-semibold text-primary-600 hover:underline">
          {row.bookingNo}
        </button>
      ),
    },
    { key: "submittedAt", label: "Submitted", sortable: true, render: (row) => relativeTime(row.submittedAt) },
    {
      key: "staffId",
      label: "Staff",
      render: (row) => {
        const staff = staffUsers.find((s) => s.id === row.staffId);
        return (
          <span className="inline-flex items-center gap-2">
            <Avatar name={staff?.name} size="sm" />
            <span className="truncate text-sm">{staff?.name ?? "—"}</span>
          </span>
        );
      },
    },
    { key: "branchId", label: "Branch", hideBelow: "md", render: (row) => branches.find((b) => b.id === row.branchId)?.name ?? "—" },
    { key: "serviceTypeId", label: "Service", hideBelow: "md", render: (row) => serviceTypes.find((s) => s.id === row.serviceTypeId)?.name ?? "—" },
    { key: "supplierId", label: "Supplier", hideBelow: "md", render: (row) => suppliers.find((s) => s.id === row.supplierId)?.name ?? "—" },
    { key: "netCost", label: "Cost", align: "right", money: true, hideBelow: "md", render: (row) => formatMoney(row.netCost) },
    { key: "sellingPrice", label: "Selling", align: "right", money: true, render: (row) => formatMoney(row.sellingPrice) },
    {
      key: "profit",
      label: "Profit",
      align: "right",
      money: true,
      render: (row) => <span className={row.profit >= 0 ? "money-pos" : "money-neg"}>{formatMoney(row.profit)}</span>,
    },
    {
      key: "paymentMethod",
      label: "Method",
      hideBelow: "md",
      render: (row) => <span className="text-xs capitalize">{row.paymentMethod.replace(/_/g, " ")}</span>,
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <Button variant="ghost" size="sm" icon={Eye} onClick={() => setReviewSaleId(row.id)}>
          {canAct ? "Review" : "View"}
        </Button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl pb-24">
      <PageHeader
        title="Verification Queue"
        subtitle={canAct ? "Review submitted sales, verify or return with a reason." : "View only — submitted sales awaiting Accounts review."}
        breadcrumb="Accounts / Verification Queue"
      />

      <div className="stagger flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPIStatCard icon={ListChecks} label="In queue" value={kpis.inQueue} loading={kpiLoading} tone="brand" />
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-inkMuted">Oldest waiting</p>
            <p className="mt-3 flex items-center gap-1.5 font-money text-2xl font-bold text-ink">
              <Clock className="h-4 w-4 text-inkMuted" />
              {kpis.oldestSubmittedAt ? relativeTime(kpis.oldestSubmittedAt) : "—"}
            </p>
          </Card>
          <KPIStatCard label="Verified today" value={kpis.verifiedToday} loading={kpiLoading} tone="success" />
          <KPIStatCard icon={Undo2} label="Returned today" value={kpis.returnedToday} loading={kpiLoading} tone="danger" />
        </div>

        <SalesFilterBar filters={filters} onChange={setFilters} serviceTypes={serviceTypes} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">All staff</option>
            {staffUsers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">All suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        <Table<Sale>
          columns={columns}
          rows={rows}
          loading={loading}
          page={filters.page ?? 1}
          pageSize={PAGE_SIZE}
          total={total}
          onPage={(page) => setFilters((f) => ({ ...f, page }))}
          onSort={(sortBy, sortDir) => setFilters((f) => ({ ...f, sortBy, sortDir, page: 1 }))}
          emptyState={{ icon: ListChecks, title: "Queue is clear", hint: "Nothing waiting for verification." }}
          enableSearch={false}
        />
      </div>

      {canAct && selected.size > 0 && (
        <div className="card-glass fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-3xl items-center justify-between gap-4 rounded-t-2xl border p-4 shadow-lg md:left-[264px] md:right-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{selected.size} selected</p>
            {bulkProgress && (
              <p className="text-xs text-inkMuted">
                Verifying {bulkProgress.done} / {bulkProgress.total}…
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSelected(new Set())} disabled={bulkBusy}>
              Clear
            </Button>
            <Button variant="primary" size="sm" loading={bulkBusy} onClick={handleBulkVerify}>
              Verify {selected.size} selected
            </Button>
          </div>
        </div>
      )}

      <SaleReviewDrawer saleId={reviewSaleId} open={!!reviewSaleId} onClose={() => setReviewSaleId(null)} onDone={onReviewed} />
    </div>
  );
}
