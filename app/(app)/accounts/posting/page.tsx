"use client";

import { useEffect, useState } from "react";
import { CheckSquare, Lock, Printer, Send, Square } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Tabs from "@/components/ui/Tabs";
import Table, { type TableColumn } from "@/components/ui/Table";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Tooltip from "@/components/ui/Tooltip";
import SalesFilterBar from "@/components/sales/SalesFilterBar";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/stores/authStore";
import { salesApi } from "@/lib/api/salesApi";
import { servicesApi } from "@/lib/api/servicesApi";
import { branchesApi } from "@/lib/api/branchesApi";
import { suppliersApi } from "@/lib/api/suppliersApi";
import { usersApi } from "@/lib/api/usersApi";
import { METHOD_META } from "@/lib/constants/display";
import type { Branch, Filters, Sale, SessionUser, ServiceType, Supplier } from "@/lib/types";
import { formatDate, formatMoney, relativeTime } from "@/lib/utils/format";

const PAGE_SIZE = 10;

type TabKey = "toPost" | "posted";

function refreshQueueBadge() {
  window.dispatchEvent(new Event("queue-count-refresh"));
}

export default function PostingPage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<TabKey>("toPost");
  const [filters, setFilters] = useState<Filters>({ page: 1, pageSize: PAGE_SIZE, sortBy: "verifiedAt", sortDir: "asc" });
  const [reloadKey, setReloadKey] = useState(0);

  const [rows, setRows] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toPostCount, setToPostCount] = useState(0);

  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [usersById, setUsersById] = useState<Record<string, SessionUser>>({});

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [postTarget, setPostTarget] = useState<Sale | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    servicesApi.list().then((e) => setServiceTypes(e.rows));
    branchesApi.list().then((e) => setBranches(e.rows));
    suppliersApi.list({ pageSize: 500 }).then((e) => setSuppliers(e.rows));
    usersApi.list({ pageSize: 200 }).then((e) => setUsersById(Object.fromEntries(e.rows.map((u) => [u.id, u]))));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    const status = tab === "toPost" ? "verified" : "posted";
    const scoped: Filters = { ...filters, status };
    salesApi.list(scoped).then((envelope) => {
      if (cancelled) return;
      setRows(envelope.rows);
      setTotal(envelope.total);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [filters, tab, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    salesApi.list({ status: "verified", page: 1, pageSize: 1 }).then((e) => {
      if (!cancelled) setToPostCount(e.total);
    });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function changeTab(next: string) {
    setTab(next as TabKey);
    setFilters((f) => ({ ...f, page: 1, sortBy: next === "toPost" ? "verifiedAt" : "postedAt", sortDir: "asc" }));
    setSelected(new Set());
  }

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
      if (allSelected) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });
  }

  function toastPostResult(sale: Sale) {
    const createsReceivable = sale.balanceDue > 0 && !!sale.customerId;
    toast.success("Posted", createsReceivable ? `${sale.bookingNo} · receivable created` : sale.bookingNo);
  }

  async function handlePostOne() {
    if (!postTarget || !user) return;
    try {
      const sale = await salesApi.post(postTarget.id, user.id);
      toastPostResult(sale);
      setPostTarget(null);
      setReloadKey((k) => k + 1);
      refreshQueueBadge();
    } catch (err) {
      toast.error("Could not post", err instanceof Error ? err.message : "Please try again.");
    }
  }

  async function handleBulkPost() {
    if (!user || selected.size === 0) return;
    const ids = [...selected];
    setBusy(true);
    setProgress({ done: 0, total: ids.length });

    let succeeded = 0;
    let receivablesCreated = 0;
    const failed: { id: string; bookingNo: string; reason: string }[] = [];

    for (const id of ids) {
      const row = rows.find((r) => r.id === id);
      try {
        const sale = await salesApi.post(id, user.id);
        succeeded += 1;
        if (sale.balanceDue > 0 && sale.customerId) receivablesCreated += 1;
      } catch (err) {
        failed.push({ id, bookingNo: row?.bookingNo ?? id, reason: err instanceof Error ? err.message : "Failed" });
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }

    setBusy(false);
    setProgress(null);
    setBulkConfirmOpen(false);
    setSelected(new Set(failed.map((f) => f.id)));
    setReloadKey((k) => k + 1);
    refreshQueueBadge();

    const summary = `${succeeded} posted${receivablesCreated ? ` · ${receivablesCreated} receivable(s) created` : ""}${failed.length ? ` · ${failed.length} failed (${failed.map((f) => `${f.bookingNo}: ${f.reason}`).join("; ")})` : ""}`;
    if (failed.length === 0) toast.success("Bulk post complete", summary);
    else toast.error("Bulk post finished with errors", summary);
  }

  const selectedTotal = rows.filter((r) => selected.has(r.id)).reduce((sum, r) => sum + r.sellingPrice, 0);

  const baseColumns: TableColumn<Sale>[] = [
    {
      key: "bookingNo",
      label: "Booking No",
      sortable: true,
      render: (row) => <span className="font-money font-semibold text-ink">{row.bookingNo}</span>,
    },
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
      render: (row) => <span className="text-xs capitalize">{METHOD_META[row.paymentMethod].label}</span>,
    },
  ];

  const toPostColumns: TableColumn<Sale>[] = [
    {
      key: "select",
      label: (
        <button type="button" onClick={toggleAllOnPage} className="flex h-5 w-5 items-center justify-center text-inkMuted hover:text-primary-600" aria-label="Select all on page">
          {rows.length > 0 && rows.every((r) => selected.has(r.id)) ? <CheckSquare className="h-4 w-4 text-primary-600" /> : <Square className="h-4 w-4" />}
        </button>
      ),
      render: (row) => (
        <button type="button" onClick={() => toggleRow(row.id)} className="flex h-5 w-5 items-center justify-center text-inkMuted hover:text-primary-600" aria-label={`Select ${row.bookingNo}`}>
          {selected.has(row.id) ? <CheckSquare className="h-4 w-4 text-primary-600" /> : <Square className="h-4 w-4" />}
        </button>
      ),
    },
    ...baseColumns,
    {
      key: "verifiedAt",
      label: "Verified",
      sortable: true,
      render: (row) => {
        const verifier = row.verifiedById ? usersById[row.verifiedById] : undefined;
        return (
          <div className="text-xs">
            <p className="font-medium text-ink">{relativeTime(row.verifiedAt)}</p>
            <p className="text-inkMuted">{verifier?.name ?? "—"}</p>
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <Button variant="primary" size="sm" icon={Send} onClick={() => setPostTarget(row)}>
          Post
        </Button>
      ),
    },
  ];

  const postedColumns: TableColumn<Sale>[] = [
    ...baseColumns,
    {
      key: "postedAt",
      label: "Posted",
      sortable: true,
      render: (row) => {
        const poster = row.postedById ? usersById[row.postedById] : undefined;
        return (
          <div className="text-xs">
            <p className="font-medium text-ink">{formatDate(row.postedAt)}</p>
            <p className="text-inkMuted">{poster?.name ?? "—"}</p>
          </div>
        );
      },
    },
    {
      key: "locked",
      label: "",
      align: "right",
      render: () => (
        <Tooltip content="Posted entries are locked for audit">
          <Lock className="ml-auto h-4 w-4 text-inkMuted" />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl pb-24">
      <PageHeader
        title="Posting"
        subtitle="Post verified sales to accounts and review the posted history."
        breadcrumb="Accounts / Posting"
        actions={
          tab === "posted" ? (
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
              Print
            </Button>
          ) : undefined
        }
      />

      <div className="stagger flex flex-col gap-4">
        <div className="flex items-center overflow-x-auto">
          <Tabs
            tabs={[
              { id: "toPost", label: "To Post", count: toPostCount },
              { id: "posted", label: "Posted history" },
            ]}
            active={tab}
            onChange={changeTab}
          />
        </div>

        <SalesFilterBar filters={filters} onChange={setFilters} serviceTypes={serviceTypes} />

        <Table<Sale>
          columns={tab === "toPost" ? toPostColumns : postedColumns}
          rows={rows}
          loading={loading}
          page={filters.page ?? 1}
          pageSize={PAGE_SIZE}
          total={total}
          onPage={(page) => setFilters((f) => ({ ...f, page }))}
          onSort={(sortBy, sortDir) => setFilters((f) => ({ ...f, sortBy, sortDir, page: 1 }))}
          emptyState={
            tab === "toPost"
              ? { icon: Send, title: "Nothing to post", hint: "Verified sales will appear here, ready to post." }
              : { icon: Lock, title: "No posted entries yet", hint: "Posted sales will show up here as an audit trail." }
          }
          enableSearch={false}
        />
      </div>

      {tab === "toPost" && selected.size > 0 && (
        <div className="card-glass fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-3xl items-center justify-between gap-4 rounded-t-2xl border p-4 shadow-lg md:left-[264px] md:right-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">
              {selected.size} selected · <span className="font-money">{formatMoney(selectedTotal)}</span>
            </p>
            {progress && (
              <p className="text-xs text-inkMuted">
                Posting {progress.done} / {progress.total}…
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSelected(new Set())} disabled={busy}>
              Clear
            </Button>
            <Button variant="primary" size="sm" icon={Send} loading={busy} onClick={() => setBulkConfirmOpen(true)}>
              Post to Accounts
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!postTarget}
        onClose={() => setPostTarget(null)}
        title="Post this sale?"
        body={postTarget ? `${postTarget.bookingNo} (${formatMoney(postTarget.sellingPrice)}) will be posted and locked for audit.` : undefined}
        confirmLabel="Post"
        onConfirm={handlePostOne}
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        onClose={() => setBulkConfirmOpen(false)}
        title={`Post ${selected.size} sales to accounts?`}
        body={`Total selling amount: ${formatMoney(selectedTotal)}. Posted entries are locked for audit.`}
        confirmLabel="Post all"
        onConfirm={handleBulkPost}
      />
    </div>
  );
}
