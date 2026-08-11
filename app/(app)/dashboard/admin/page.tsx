"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, ListChecks, Receipt, TrendingUp, Wallet } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import DashboardHeroBanner from "@/components/system/DashboardHeroBanner";
import DashboardFilterBar from "@/components/dashboard/DashboardFilterBar";
import KpiRow, { type KpiItem } from "@/components/dashboard/KpiRow";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import StaffLeaderboard from "@/components/dashboard/StaffLeaderboard";
import ChartCard from "@/components/charts/ChartCard";
import RevenueTrendArea from "@/components/charts/RevenueTrendArea";
import ServiceDonut from "@/components/charts/ServiceDonut";
import BranchBar from "@/components/charts/BranchBar";
import MethodSplit from "@/components/charts/MethodSplit";
import StatusFunnel from "@/components/charts/StatusFunnel";
import { filterHash } from "@/components/charts/chartTheme";
import { useAuthStore } from "@/lib/stores/authStore";
import { dashboardApi } from "@/lib/api/dashboardApi";
import { branchesApi } from "@/lib/api/branchesApi";
import { usersApi } from "@/lib/api/usersApi";
import type { Branch, DashboardAggregate, Filters, SessionUser } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);

  const [filters, setFilters] = useState<Filters>({ preset: "month" });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffUsers, setStaffUsers] = useState<SessionUser[]>([]);
  const [data, setData] = useState<DashboardAggregate | null>(null);
  const [loading, setLoading] = useState(true);

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

  const trend = (current: number, prev: number) => (prev > 0 ? Math.round(((current - prev) / prev) * 1000) / 10 : undefined);
  // Remounts every chart on filter change so Recharts/framer-motion replay their
  // entrance/draw-in animation from scratch rather than silently morphing in place.
  const fHash = filterHash(filters);

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

  return (
    <div className="mx-auto max-w-[1400px]">
      <DashboardHeroBanner tagline="Agency-wide KPIs, charts, and the full activity trail — all in one view." />
      <PageHeader title="Admin Dashboard" subtitle="Agency-wide KPIs, charts, and activity." breadcrumb="Home / Dashboard" />

      <div className="stagger flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <DashboardFilterBar filters={filters} onChange={setFilters} branches={branches} staffUsers={staffUsers} />
          <Link
            href="/accounts/queue"
            className={cn(
              "inline-flex min-h-[40px] shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-colors",
              (data?.queueStats.inQueue ?? 0) > 0
                ? "border-accent-300 bg-accent-50 text-accent-700 hover:border-accent-400"
                : "border-line text-inkSoft hover:border-primary-300"
            )}
          >
            <ListChecks className="h-4 w-4" />
            {data?.queueStats.inQueue ?? 0} awaiting verification
          </Link>
        </div>

        <KpiRow items={kpis} loading={loading} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <ChartCard key={`trend-${fHash}`} title="Revenue Trend" subtitle="Revenue vs cost vs profit" loading={loading} className="chart-hero lg:col-span-8">
            <RevenueTrendArea data={data?.dailyTrend ?? []} />
          </ChartCard>
          <ChartCard key={`service-${fHash}`} title="By Service" subtitle="Revenue share" loading={loading} className="lg:col-span-4">
            <ServiceDonut data={data?.byService ?? []} />
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <ChartCard key={`branch-${fHash}`} title="By Branch" subtitle="Revenue per branch" loading={loading} className="lg:col-span-4">
            <BranchBar data={data?.byBranch ?? []} />
          </ChartCard>
          <ChartCard key={`method-${fHash}`} title="Payment Methods" subtitle="Revenue by method" loading={loading} className="lg:col-span-4">
            <MethodSplit data={data?.byMethod ?? []} />
          </ChartCard>
          <ChartCard title="Leaderboard" subtitle="Top performers" loading={loading} className="lg:col-span-4">
            <StaffLeaderboard rows={data?.leaderboard ?? []} loading={loading} />
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <ChartCard title="Recent Activity" loading={loading} className="lg:col-span-6">
            <ActivityFeed
              logs={data?.recentActivity ?? []}
              loading={loading}
              linkFor={(log) => (log.module === "sales" ? `/staff/sales/${log.entityId}` : undefined)}
            />
          </ChartCard>
          <ChartCard key={`funnel-${fHash}`} title="Sale Funnel" subtitle="Draft → Posted" loading={loading} className="lg:col-span-6">
            <StatusFunnel statusCounts={data?.statusCounts ?? {}} />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
