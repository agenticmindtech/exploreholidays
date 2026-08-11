"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ListChecks, Send, Undo2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import DashboardHeroBanner from "@/components/system/DashboardHeroBanner";
import DashboardFilterBar from "@/components/dashboard/DashboardFilterBar";
import KpiRow, { type KpiItem } from "@/components/dashboard/KpiRow";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import SettlementDueList from "@/components/dashboard/SettlementDueList";
import RefundFunnel from "@/components/dashboard/RefundFunnel";
import ChartCard from "@/components/charts/ChartCard";
import MethodSplit from "@/components/charts/MethodSplit";
import AgingBar from "@/components/charts/AgingBar";
import { filterHash } from "@/components/charts/chartTheme";
import { useAuthStore } from "@/lib/stores/authStore";
import { dashboardApi } from "@/lib/api/dashboardApi";
import { branchesApi } from "@/lib/api/branchesApi";
import { usersApi } from "@/lib/api/usersApi";
import type { AuditModule, Branch, DashboardAggregate, Filters, SessionUser } from "@/lib/types";

const FINANCE_MODULES: AuditModule[] = ["sales", "payments", "refunds", "receivables", "suppliers", "loans", "mistakes"];

export default function AccountsDashboardPage() {
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

  const kpis: KpiItem[] = [
    {
      key: "inQueue",
      icon: ListChecks,
      label: "In Queue",
      value: data?.queueStats.inQueue ?? 0,
      tone: "brand",
      href: "/accounts/queue",
    },
    {
      key: "verifiedToday",
      icon: CheckCircle2,
      label: "Verified Today",
      value: data?.queueStats.verifiedToday ?? 0,
      tone: "success",
      href: "/accounts/posting",
    },
    {
      key: "postedToday",
      icon: Send,
      label: "Posted Today",
      value: data?.queueStats.postedToday ?? 0,
      tone: "accent",
      href: "/accounts/posting",
    },
    {
      key: "returnedPeriod",
      icon: Undo2,
      label: "Returned (period)",
      value: data?.queueStats.returnedPeriod ?? 0,
      tone: "danger",
      href: "/accounts/queue",
    },
  ];

  const financeActivity = (data?.recentActivity ?? []).filter((log) => FINANCE_MODULES.includes(log.module));
  const fHash = filterHash(filters);

  return (
    <div className="mx-auto max-w-[1400px]">
      <DashboardHeroBanner tagline="Queue status, collections, and receivable aging — your finance control room." />
      <PageHeader title="Accounts Dashboard" subtitle="Queue status, collections, and receivable aging." breadcrumb="Home / Dashboard" />

      <div className="stagger flex flex-col gap-6">
        <DashboardFilterBar filters={filters} onChange={setFilters} branches={branches} staffUsers={staffUsers} />

        <KpiRow items={kpis} loading={loading} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <ChartCard key={`collections-${fHash}`} title="Collections" subtitle="Payments received by method" loading={loading} className="chart-hero lg:col-span-6">
            <MethodSplit data={data?.collectionsByMethod ?? []} />
          </ChartCard>
          <ChartCard key={`aging-${fHash}`} title="Receivable Aging" subtitle="Outstanding balance by bucket" loading={loading} className="lg:col-span-6">
            <AgingBar data={data?.agingSummary ?? []} />
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <ChartCard title="Settlements Due" subtitle="Top suppliers by balance owed" loading={loading} className="lg:col-span-4">
            <SettlementDueList rows={data?.settlementsDue ?? []} loading={loading} />
          </ChartCard>
          <ChartCard key={`refunds-${fHash}`} title="Refund Pipeline" subtitle="Count per stage" loading={loading} className="lg:col-span-4">
            <RefundFunnel counts={data?.refundStageCounts ?? {}} />
          </ChartCard>
          <ChartCard title="Finance Activity" loading={loading} className="lg:col-span-4">
            <ActivityFeed logs={financeActivity} loading={loading} emptyHint="Finance actions (verify, post, refunds, payments…) will show up here." />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
