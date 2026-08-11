"use client";

import { useEffect, useState } from "react";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { AlertTriangle, Building2, Receipt, RotateCcw, TrendingUp, Wallet } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import DashboardHeroBanner from "@/components/system/DashboardHeroBanner";
import Card from "@/components/ui/Card";
import DashboardFilterBar from "@/components/dashboard/DashboardFilterBar";
import KpiRow, { type KpiItem } from "@/components/dashboard/KpiRow";
import TargetTable from "@/components/dashboard/TargetTable";
import StaffLeaderboard from "@/components/dashboard/StaffLeaderboard";
import ChartCard from "@/components/charts/ChartCard";
import MonthlyProgressLine from "@/components/charts/MonthlyProgressLine";
import { filterHash } from "@/components/charts/chartTheme";
import { useAuthStore } from "@/lib/stores/authStore";
import { dashboardApi } from "@/lib/api/dashboardApi";
import { branchesApi } from "@/lib/api/branchesApi";
import { usersApi } from "@/lib/api/usersApi";
import type { Branch, DashboardAggregate, Filters, SessionUser, TrendPoint } from "@/lib/types";
import { formatMoney } from "@/lib/utils/format";

function currentMonthStr() {
  return new Date().toISOString().slice(0, 7);
}

export default function ManagerDashboardPage() {
  const user = useAuthStore((s) => s.user);

  const [filters, setFilters] = useState<Filters>({ preset: "month", month: currentMonthStr() });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffUsers, setStaffUsers] = useState<SessionUser[]>([]);
  const [data, setData] = useState<DashboardAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastMonthTrend, setLastMonthTrend] = useState<TrendPoint[]>([]);

  useEffect(() => {
    branchesApi.list().then((e) => setBranches(e.rows));
    usersApi.list({ pageSize: 200 }).then((e) => setStaffUsers(e.rows.filter((u) => u.role === "staff")));
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    dashboardApi.aggregate(filters, user.role, user.id).then((result) => {
      if (cancelled) return;
      setData(result);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [filters, user]);

  // "Monthly progress line" is always this-calendar-month vs last-calendar-month,
  // independent of whatever date preset is selected in the shared filter bar above —
  // still sourced exclusively from dashboardApi.aggregate (no other list API).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const lastMonthDate = subMonths(new Date(), 1);
    const lastMonthFilters: Filters = {
      dateFrom: startOfMonth(lastMonthDate).toISOString().slice(0, 10),
      dateTo: endOfMonth(lastMonthDate).toISOString().slice(0, 10),
      branchId: filters.branchId,
      staffId: filters.staffId,
    };
    dashboardApi.aggregate(lastMonthFilters, user.role, user.id).then((result) => {
      if (!cancelled) setLastMonthTrend(result.dailyTrend);
    });
    return () => {
      cancelled = true;
    };
  }, [filters.branchId, filters.staffId, user]);

  const trend = (current: number, prev: number) => (prev > 0 ? Math.round(((current - prev) / prev) * 1000) / 10 : undefined);

  const kpis: KpiItem[] = [
    {
      key: "sales",
      icon: Receipt,
      label: "Period Sales",
      value: data?.revenue ?? 0,
      prefix: "BHD ",
      suffix: data ? ` · ${data.count} sale${data.count === 1 ? "" : "s"}` : "",
      trend: data ? trend(data.revenue, data.prev.revenue) : undefined,
      tone: "brand",
      href: "/staff/sales",
    },
    {
      key: "profit",
      icon: TrendingUp,
      label: "Profit",
      value: data?.profit ?? 0,
      prefix: "BHD ",
      suffix: data ? ` · ${data.avgMargin.toFixed(1)}% margin` : "",
      trend: data ? trend(data.profit, data.prev.profit) : undefined,
      tone: "success",
      href: "/reports/profit-summary",
    },
    {
      key: "supplier",
      icon: Building2,
      label: "Supplier Balances",
      value: data?.totalToSettle ?? 0,
      prefix: "BHD ",
      tone: "accent",
      href: "/accounts/suppliers",
    },
    {
      key: "receivables",
      icon: Wallet,
      label: "Receivables",
      value: data ? data.agingSummary.reduce((sum, b) => sum + b.balance, 0) : 0,
      prefix: "BHD ",
      tone: "danger",
      href: "/accounts/receivables",
    },
  ];

  const openRefundsCount = data
    ? Object.entries(data.refundStageCounts).reduce((sum, [status, count]) => (status === "paid_to_customer" || status === "rejected" ? sum : sum + count), 0)
    : 0;

  return (
    <div className="mx-auto max-w-[1400px]">
      <DashboardHeroBanner tagline="Team performance, targets, and refund summaries at a glance." />
      <PageHeader title="Manager Dashboard" subtitle="Team performance, targets, and refund summaries." breadcrumb="Home / Dashboard" />

      <div className="stagger flex flex-col gap-6">
        <DashboardFilterBar filters={filters} onChange={setFilters} branches={branches} staffUsers={staffUsers} />

        <KpiRow items={kpis} loading={loading} />

        <ChartCard
          key={filterHash(filters)}
          title="Staff Targets"
          subtitle="This month's progress vs last month"
          loading={loading}
          minHeight={420}
          className="chart-hero"
        >
          <div className="flex flex-col gap-6">
            <TargetTable
              rows={data?.targetsProgress ?? []}
              month={filters.month ?? currentMonthStr()}
              onMonthChange={(month) => setFilters((f) => ({ ...f, month }))}
              loading={loading}
            />
            <MonthlyProgressLine current={data?.dailyTrend ?? []} previous={lastMonthTrend} />
          </div>
        </ChartCard>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-danger-50 text-danger-600">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <p className="font-display text-sm font-bold text-ink">Mistakes</p>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-inkMuted">Open</p>
                <p className="font-money text-xl font-bold text-ink">{data?.mistakesSummary.openCount ?? 0}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-inkMuted">Amount</p>
                <p className="font-money text-xl font-bold text-danger-600">{formatMoney(data?.mistakesSummary.openAmount ?? 0)}</p>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                <RotateCcw className="h-4 w-4" />
              </span>
              <p className="font-display text-sm font-bold text-ink">Refunds</p>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-inkMuted">Open</p>
                <p className="font-money text-xl font-bold text-ink">{openRefundsCount}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-inkMuted">Awaited from suppliers</p>
                <p className="font-money text-xl font-bold text-accent-600">{formatMoney(data?.refundsAwaitedFromSuppliers ?? 0)}</p>
              </div>
            </div>
          </Card>

          <Card>
            <p className="mb-3 font-display text-sm font-bold text-ink">Leaderboard</p>
            <StaffLeaderboard rows={data?.leaderboard ?? []} loading={loading} />
          </Card>
        </div>
      </div>
    </div>
  );
}
