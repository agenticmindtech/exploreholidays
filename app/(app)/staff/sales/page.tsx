"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BedDouble,
  Banknote,
  Car,
  CircleSlash,
  CreditCard,
  Eye,
  FileText,
  Lock,
  Moon,
  MoreHorizontal,
  Package,
  Pencil,
  Plane,
  Plus,
  RotateCcw,
  ShieldCheck,
  Ship,
  Smartphone,
  Stamp,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Tabs from "@/components/ui/Tabs";
import Table, { type TableColumn } from "@/components/ui/Table";
import StatusPill from "@/components/ui/StatusPill";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SalesFilterBar from "@/components/sales/SalesFilterBar";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/stores/authStore";
import { salesApi } from "@/lib/api/salesApi";
import { servicesApi } from "@/lib/api/servicesApi";
import { customersApi } from "@/lib/api/customersApi";
import { METHOD_META } from "@/lib/constants/display";
import type { Filters, PaymentMethod, Sale, SaleStatus, ServiceType } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils/format";

const SERVICE_ICONS: Record<string, LucideIcon> = {
  Plane,
  BedDouble,
  Stamp,
  Package,
  Ship,
  Moon,
  ShieldCheck,
  Car,
  MoreHorizontal,
};

const METHOD_ICONS: Record<PaymentMethod, LucideIcon> = {
  benefit_pay: Smartphone,
  credit_card_online: CreditCard,
  cash: Banknote,
  fawri_cheque: FileText,
  not_paid_refund: CircleSlash,
};

type TabKey = "all" | "draft" | "submitted" | "returned" | "verified" | "posted";
const TABS: { key: TabKey; label: string; status?: SaleStatus }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft", status: "draft" },
  { key: "submitted", label: "Submitted", status: "submitted" },
  { key: "returned", label: "Returned", status: "returned" },
  { key: "verified", label: "Verified", status: "verified" },
  { key: "posted", label: "Posted", status: "posted" },
];
const PAGE_SIZE = 10;

function parseParams(params: URLSearchParams): { tab: TabKey; filters: Filters } {
  const rawTab = params.get("tab");
  const tab: TabKey = TABS.some((t) => t.key === rawTab) ? (rawTab as TabKey) : "all";
  const filters: Filters = {
    preset: (params.get("preset") as Filters["preset"]) ?? undefined,
    dateFrom: params.get("dateFrom") ?? undefined,
    dateTo: params.get("dateTo") ?? undefined,
    serviceTypeId: params.get("serviceTypeId") ?? undefined,
    paymentMethod: (params.get("paymentMethod") as Filters["paymentMethod"]) ?? undefined,
    search: params.get("search") ?? undefined,
    page: params.get("page") ? Number(params.get("page")) : 1,
    pageSize: PAGE_SIZE,
  };
  return { tab, filters };
}

function toQueryString(tab: TabKey, filters: Filters): string {
  const params = new URLSearchParams();
  if (tab !== "all") params.set("tab", tab);
  if (filters.preset) params.set("preset", filters.preset);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.serviceTypeId) params.set("serviceTypeId", filters.serviceTypeId);
  if (filters.paymentMethod) params.set("paymentMethod", filters.paymentMethod);
  if (filters.search) params.set("search", filters.search);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}

export default function MySalesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const [tab, setTab] = useState<TabKey>(() => parseParams(searchParams).tab);
  const [filters, setFilters] = useState<Filters>(() => parseParams(searchParams).filters);
  const [reloadKey, setReloadKey] = useState(0);

  const [rows, setRows] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ count: 0, revenue: 0, cost: 0, profit: 0 });
  const [statusCounts, setStatusCounts] = useState<Partial<Record<TabKey, number>>>({});
  const [loading, setLoading] = useState(true);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);

  useEffect(() => {
    servicesApi.list().then((e) => setServiceTypes(e.rows));
  }, []);

  useEffect(() => {
    const qs = toQueryString(tab, filters);
    router.replace(`/staff/sales${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [tab, filters, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    const activeTab = TABS.find((t) => t.key === tab);
    const scoped: Filters = { ...filters, status: activeTab?.status };
    if (user.role === "staff") scoped.staffId = user.id;

    salesApi.list(scoped).then((envelope) => {
      if (cancelled) return;
      setRows(envelope.rows);
      setTotal(envelope.total);
      setSummary(envelope.summary);

      const ids = [...new Set(envelope.rows.map((r) => r.customerId).filter((id): id is string => !!id))];
      Promise.all(ids.map((id) => customersApi.get(id).then((c) => [id, c.name] as const))).then((pairs) => {
        if (cancelled) return;
        setCustomerNames(Object.fromEntries(pairs));
        setLoading(false);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [filters, tab, user, reloadKey]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const base: Filters = { ...filters, page: 1, pageSize: 1 };
    if (user.role === "staff") base.staffId = user.id;

    Promise.all(
      TABS.map((t) => salesApi.list({ ...base, status: t.status }).then((envelope) => [t.key, envelope.total] as const))
    ).then((results) => {
      if (!cancelled) setStatusCounts(Object.fromEntries(results));
    });

    return () => {
      cancelled = true;
    };
  }, [filters, user, reloadKey]);

  function changeTab(nextTab: string) {
    setTab(nextTab as TabKey);
    setFilters((f) => ({ ...f, page: 1 }));
  }

  async function handleDelete() {
    if (!deleteTarget || !user) return;
    try {
      await salesApi.delete(deleteTarget.id, user.id);
      toast.success("Draft deleted", deleteTarget.bookingNo);
      setDeleteTarget(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error("Could not delete", err instanceof Error ? err.message : "Please try again.");
    }
  }

  function renderActions(row: Sale) {
    if (row.status === "draft") {
      return (
        <div className="flex justify-end gap-1">
          <Link href={`/staff/sales/${row.id}?edit=1`}>
            <Button variant="ghost" size="sm" icon={Pencil}>
              Edit
            </Button>
          </Link>
          <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setDeleteTarget(row)}>
            Delete
          </Button>
        </div>
      );
    }
    if (row.status === "returned") {
      return (
        <Link href={`/staff/sales/${row.id}?edit=1`} className="flex justify-end">
          <Button variant="secondary" size="sm" icon={RotateCcw}>
            Fix &amp; Resubmit
          </Button>
        </Link>
      );
    }
    if (row.status === "posted") {
      return (
        <Link
          href={`/staff/sales/${row.id}`}
          className="flex min-h-[40px] items-center justify-end gap-1 text-xs font-semibold text-inkMuted hover:text-ink"
        >
          <Lock className="h-3.5 w-3.5" /> View
        </Link>
      );
    }
    return (
      <Link href={`/staff/sales/${row.id}`} className="flex justify-end">
        <Button variant="ghost" size="sm" icon={Eye}>
          View
        </Button>
      </Link>
    );
  }

  const columns: TableColumn<Sale>[] = [
    {
      key: "bookingNo",
      label: "Booking No",
      sortable: true,
      render: (row) => (
        <Link href={`/staff/sales/${row.id}`} className="font-money font-semibold text-primary-600 hover:underline">
          {row.bookingNo}
        </Link>
      ),
    },
    { key: "transactionDate", label: "Date", sortable: true, hideBelow: "sm", render: (row) => formatDate(row.transactionDate) },
    {
      key: "serviceTypeId",
      label: "Service",
      hideBelow: "md",
      render: (row) => {
        const service = serviceTypes.find((s) => s.id === row.serviceTypeId);
        const Icon = (service && SERVICE_ICONS[service.icon]) ?? MoreHorizontal;
        return (
          <span className="inline-flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 shrink-0 text-inkMuted" />
            {service?.name ?? "—"}
          </span>
        );
      },
    },
    { key: "destination", label: "Destination", hideBelow: "md" },
    { key: "customerId", label: "Customer", hideBelow: "md", render: (row) => (row.customerId ? customerNames[row.customerId] ?? "…" : "Walk-in") },
    { key: "sellingPrice", label: "Selling", align: "right", sortable: true, money: true, render: (row) => formatMoney(row.sellingPrice) },
    {
      key: "profit",
      label: "Profit",
      align: "right",
      sortable: true,
      money: true,
      hideBelow: "sm",
      render: (row) => <span className={row.profit >= 0 ? "money-pos" : "money-neg"}>{formatMoney(row.profit)}</span>,
    },
    {
      key: "paymentMethod",
      label: "Payment",
      hideBelow: "md",
      filterable: true,
      filterLabel: (v) => METHOD_META[v as keyof typeof METHOD_META]?.label ?? String(v),
      render: (row) => {
        const Icon = METHOD_ICONS[row.paymentMethod];
        return (
          <div className="flex items-center gap-1.5 text-xs">
            <Icon className="h-3.5 w-3.5 shrink-0 text-inkMuted" />
            <div className="flex flex-col">
              <span className="font-medium text-ink">{METHOD_META[row.paymentMethod].label}</span>
              <span className="capitalize text-inkMuted">{row.paymentStatus}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      filterable: true,
      filterLabel: (v) => (typeof v === "string" ? v.charAt(0).toUpperCase() + v.slice(1) : String(v)),
      render: (row) => <StatusPill status={row.status} />,
    },
    { key: "actions", label: "", align: "right", render: renderActions },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="My Sales"
        subtitle="Every booking you've created, from draft to posted."
        breadcrumb="Staff / My Sales"
        actions={
          <Link href="/staff/sales/new">
            <Button variant="primary" icon={Plus}>
              New Sale
            </Button>
          </Link>
        }
      />

      <div className="stagger flex flex-col gap-4">
        <div className="flex items-center overflow-x-auto">
          <Tabs
            tabs={TABS.map((t) => ({
              id: t.key,
              label: t.key === "returned" && (statusCounts.returned ?? 0) > 0 ? `${t.label} •` : t.label,
              count: statusCounts[t.key],
            }))}
            active={tab}
            onChange={changeTab}
          />
        </div>

        <SalesFilterBar filters={filters} onChange={setFilters} serviceTypes={serviceTypes} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-inkMuted">Count</p>
            <p className="mt-1 font-money text-xl font-bold text-ink">{summary.count}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-inkMuted">Revenue</p>
            <p className="mt-1 font-money text-xl font-bold text-ink">{formatMoney(summary.revenue)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-inkMuted">Profit</p>
            <p className={`mt-1 font-money text-xl font-bold ${summary.profit >= 0 ? "money-pos" : "money-neg"}`}>{formatMoney(summary.profit)}</p>
          </Card>
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
          emptyState={{ title: "No sales here yet", hint: "Create your first booking to get started." }}
          enableSearch={false}
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete this draft?"
        body={deleteTarget ? `${deleteTarget.bookingNo} will be permanently removed. This cannot be undone.` : undefined}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
      />
    </div>
  );
}
