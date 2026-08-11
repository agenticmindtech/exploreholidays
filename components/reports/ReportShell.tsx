"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileQuestion } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Table, { type TableColumn, type TableGroup } from "@/components/ui/Table";
import ReportFilterBar from "./ReportFilterBar";
import SummaryStrip from "./SummaryStrip";
import ExportBar from "./ExportBar";
import ChartCard from "@/components/charts/ChartCard";
import RevenueTrendArea from "@/components/charts/RevenueTrendArea";
import ServiceDonut from "@/components/charts/ServiceDonut";
import BranchBar from "@/components/charts/BranchBar";
import AgingBar from "@/components/charts/AgingBar";
import RefundFunnel from "@/components/dashboard/RefundFunnel";
import { filterHash } from "@/components/charts/chartTheme";
import { useAuthStore } from "@/lib/stores/authStore";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { getReportConfig } from "@/lib/reports/configs";
import { reportsApi } from "@/lib/api/reportsApi";
import { exportExcel } from "@/lib/reports/exportExcel";
import { exportPdf } from "@/lib/reports/exportPdf";
import { branchesApi } from "@/lib/api/branchesApi";
import { usersApi } from "@/lib/api/usersApi";
import { servicesApi } from "@/lib/api/servicesApi";
import { settingsApi } from "@/lib/api/settingsApi";
import { resolveDateRange } from "@/lib/logic/filters";
import { METHOD_META } from "@/lib/constants/display";
import type {
  AgingSummaryRow,
  Branch,
  Filters,
  NamedAmount,
  RefundStatus,
  ReportChart,
  ReportResult,
  ServiceType,
  Settings,
  SessionUser,
  TrendPoint,
} from "@/lib/types";
import { formatDate } from "@/lib/utils/format";

const PAGE_SIZE = 15;

// Tailwind's JIT scanner needs literal class strings — a template-interpolated
// `lg:col-span-${n}` would never be generated, so chart spans map through this table.
const COL_SPAN_CLASS: Record<number, string> = {
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  5: "lg:col-span-5",
  6: "lg:col-span-6",
  7: "lg:col-span-7",
  8: "lg:col-span-8",
  9: "lg:col-span-9",
  12: "lg:col-span-12",
};

function parseFiltersFromParams(params: URLSearchParams): Filters {
  const filters: Filters = {};
  const str = (k: string) => params.get(k) ?? undefined;
  if (str("preset")) filters.preset = str("preset") as Filters["preset"];
  if (str("dateFrom")) filters.dateFrom = str("dateFrom");
  if (str("dateTo")) filters.dateTo = str("dateTo");
  if (str("branchId")) filters.branchId = str("branchId");
  if (str("staffId")) filters.staffId = str("staffId");
  if (str("serviceTypeId")) filters.serviceTypeId = str("serviceTypeId");
  if (str("paymentMethod")) filters.paymentMethod = str("paymentMethod") as Filters["paymentMethod"];
  if (str("search")) filters.search = str("search");
  if (str("month")) filters.month = str("month");
  return filters;
}

function filtersToQueryString(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.preset) params.set("preset", filters.preset);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.branchId) params.set("branchId", filters.branchId);
  if (filters.staffId) params.set("staffId", filters.staffId);
  if (filters.serviceTypeId) params.set("serviceTypeId", filters.serviceTypeId);
  if (filters.paymentMethod) params.set("paymentMethod", filters.paymentMethod);
  if (filters.search) params.set("search", filters.search);
  if (filters.month) params.set("month", filters.month);
  return params.toString();
}

function buildFiltersEcho(filters: Filters, branches: Branch[], staffUsers: SessionUser[], serviceTypes: ServiceType[]): string {
  const parts: string[] = [];
  const { from, to } = resolveDateRange(filters);
  parts.push(from && to ? `Period: ${formatDate(from)} – ${formatDate(to)}` : "Period: All time");
  parts.push(`Branch: ${filters.branchId ? branches.find((b) => b.id === filters.branchId)?.name ?? "—" : "All"}`);
  if (filters.staffId) parts.push(`Staff: ${staffUsers.find((s) => s.id === filters.staffId)?.name ?? "—"}`);
  if (filters.serviceTypeId) parts.push(`Service: ${serviceTypes.find((s) => s.id === filters.serviceTypeId)?.name ?? "—"}`);
  if (filters.paymentMethod) parts.push(`Method: ${METHOD_META[filters.paymentMethod].label}`);
  if (filters.search) parts.push(`Search: "${filters.search}"`);
  return parts.join(" · ");
}

interface ReportShellProps {
  reportId: string;
}

export default function ReportShell({ reportId }: ReportShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const config = getReportConfig(reportId);

  const [filters, setFilters] = useState<Filters>(() => parseFiltersFromParams(searchParams));
  const debouncedFilters = useDebounce(filters, 400);
  const [page, setPage] = useState(1);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffUsers, setStaffUsers] = useState<SessionUser[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [result, setResult] = useState<ReportResult<Record<string, unknown>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    branchesApi.list().then((e) => setBranches(e.rows));
    usersApi.list({ pageSize: 200 }).then((e) => setStaffUsers(e.rows.filter((u) => u.role === "staff")));
    servicesApi.list().then((e) => setServiceTypes(e.rows));
    settingsApi.get().then(setSettings);
  }, []);

  useEffect(() => {
    router.replace(`/reports/${reportId}${filtersToQueryString(filters) ? `?${filtersToQueryString(filters)}` : ""}`, { scroll: false });
  }, [filters, reportId, router]);

  useEffect(() => {
    Promise.resolve().then(() => setPage(1));
  }, [debouncedFilters]);

  useEffect(() => {
    if (!user || !config) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    const dataFn = reportsApi[config.dataFn];
    dataFn(debouncedFilters, user.role, user.id).then((res) => {
      if (cancelled) return;
      setResult(res);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedFilters, user, config]);

  if (!config) {
    return (
      <div className="mx-auto max-w-xl">
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-subtle text-inkMuted">
            <FileQuestion className="h-6 w-6" />
          </span>
          <p className="font-display text-lg font-bold text-ink">Report not found</p>
          <p className="text-sm text-inkMuted">&ldquo;{reportId}&rdquo; isn&apos;t a report we know about.</p>
          <Link href="/reports">
            <Button variant="secondary">Back to Reports</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const rows = result?.rows ?? [];
  const summary = result?.summary ?? {};
  const groups = result?.groups;
  // Built from debouncedFilters (not the live `filters` state) so it always describes
  // exactly what `rows`/`summary` currently hold — otherwise, during the 400ms debounce
  // window after a filter change, the echo string would describe filters newer than the
  // data actually being exported, breaking the WYSIWYG guarantee.
  const filtersEcho = buildFiltersEcho(debouncedFilters, branches, staffUsers, serviceTypes);
  const fHash = filterHash(debouncedFilters);

  const tableColumns = config.columns as unknown as TableColumn<Record<string, unknown>>[];
  const footerCells = tableColumns.map((col, i) => {
    if (i === 0) return "Grand Total";
    const summaryKey = col.summaryKey ?? col.key;
    if (col.money && summary[summaryKey] !== undefined) return col.render ? formatMoneyLike(summary[summaryKey]) : summary[summaryKey];
    return "";
  });

  const tableGroups: TableGroup<Record<string, unknown>>[] | undefined = groups?.map((g) => ({
    key: g.key,
    label: g.label,
    rows: g.rows,
    subtotalCells: tableColumns.map((col, i) => {
      if (i === 0) return "";
      const summaryKey = col.summaryKey ?? col.key;
      return col.money && g.subtotal[summaryKey] !== undefined ? formatMoneyLike(g.subtotal[summaryKey]) : "";
    }),
  }));

  const pageRows = tableGroups ? [] : rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleExportExcel() {
    if (!settings) return;
    exportExcel(config!, rows, groups, summary, filtersEcho, settings);
  }

  function handleExportPdf() {
    if (!settings) return;
    exportPdf(config!, rows, groups, summary, filtersEcho, settings);
  }

  return (
    <div className="report-print-area mx-auto max-w-[1400px] pb-8">
      <PageHeader title={config.title} subtitle={config.description} breadcrumb={`Reports / ${config.title}`} />

      <p className="mb-4 hidden text-xs text-inkMuted print:block">{filtersEcho}</p>

      <div className="stagger flex flex-col gap-6">
        <div className="no-print">
          <ReportFilterBar config={config} filters={filters} onChange={setFilters} branches={branches} staffUsers={staffUsers} serviceTypes={serviceTypes} />
        </div>

        <div className="no-print">
          <SummaryStrip cards={config.summaryCards} summary={summary} loading={loading} />
        </div>

        {config.charts.length > 0 && (
          <div key={fHash} className="no-print grid grid-cols-1 gap-4 lg:grid-cols-12">
            {config.charts.map((chart, i) => (
              <ChartCard
                key={`${chart.dataKey}-${i}`}
                title={chartTitle(chart)}
                loading={loading}
                className={COL_SPAN_CLASS[chart.span] ?? "lg:col-span-12"}
              >
                {renderChart(chart, result?.charts)}
              </ChartCard>
            ))}
          </div>
        )}

        <Table<Record<string, unknown>>
          columns={tableColumns}
          rows={pageRows}
          loading={loading}
          groups={tableGroups}
          footerCells={rows.length > 0 ? footerCells : undefined}
          enableSearch={false}
          page={tableGroups ? undefined : page}
          pageSize={tableGroups ? undefined : PAGE_SIZE}
          total={tableGroups ? undefined : rows.length}
          onPage={tableGroups ? undefined : setPage}
          emptyState={{ title: "No data for these filters", hint: "Try widening the date range or clearing a filter." }}
        />

        <ExportBar onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} loading={loading} disabled={!settings || rows.length === 0} />
      </div>
    </div>
  );
}

function formatMoneyLike(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function chartTitle(chart: ReportChart): string {
  switch (chart.type) {
    case "trend":
      return "Trend";
    case "donut":
      return "Breakdown";
    case "bar":
      return "By Category";
    case "aging":
      return "Aging";
    case "funnel":
      return "Pipeline";
    default:
      return "Chart";
  }
}

function renderChart(chart: ReportChart, chartsData: Record<string, unknown> | undefined) {
  const data = chartsData?.[chart.dataKey];
  switch (chart.type) {
    case "trend":
      return <RevenueTrendArea data={(data as TrendPoint[]) ?? []} />;
    case "donut":
      return <ServiceDonut data={(data as NamedAmount[]) ?? []} />;
    case "bar":
      return <BranchBar data={(data as NamedAmount[]) ?? []} />;
    case "aging":
      return <AgingBar data={(data as AgingSummaryRow[]) ?? []} />;
    case "funnel":
      return <RefundFunnel counts={(data as Partial<Record<RefundStatus, number>>) ?? {}} />;
    default:
      return null;
  }
}
