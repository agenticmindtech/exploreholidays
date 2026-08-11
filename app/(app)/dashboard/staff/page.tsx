"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { subDays } from "date-fns";
import { PlusCircle, Receipt, Target as TargetIcon, TrendingUp, Wallet } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import DashboardHeroBanner from "@/components/system/DashboardHeroBanner";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ProgressRing from "@/components/ui/ProgressRing";
import StatusPill from "@/components/ui/StatusPill";
import Table, { type TableColumn } from "@/components/ui/Table";
import EmptyState from "@/components/ui/EmptyState";
import KpiRow, { type KpiItem } from "@/components/dashboard/KpiRow";
import ReturnedAlertCard from "@/components/dashboard/ReturnedAlertCard";
import MiniSparkline from "@/components/charts/MiniSparkline";
import { useAuthStore } from "@/lib/stores/authStore";
import { dashboardApi } from "@/lib/api/dashboardApi";
import { salesApi } from "@/lib/api/salesApi";
import type { DashboardAggregate, Sale } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils/format";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function StaffDashboardPage() {
  const user = useAuthStore((s) => s.user);

  const [today, setToday] = useState<DashboardAggregate | null>(null);
  const [month, setMonth] = useState<DashboardAggregate | null>(null);
  const [sparkline, setSparkline] = useState<DashboardAggregate | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    Promise.all([
      dashboardApi.aggregate({ preset: "today" }, user.role, user.id),
      dashboardApi.aggregate({ preset: "month" }, user.role, user.id),
      dashboardApi.aggregate(
        { dateFrom: subDays(new Date(), 29).toISOString().slice(0, 10), dateTo: todayIso() },
        user.role,
        user.id
      ),
      salesApi.list({ staffId: user.id, sortBy: "transactionDate", sortDir: "desc", page: 1, pageSize: 6 }),
      salesApi.list({ staffId: user.id, page: 1, pageSize: 200 }),
    ]).then(([todayResult, monthResult, sparklineResult, recentEnvelope, allEnvelope]) => {
      if (cancelled) return;
      setToday(todayResult);
      setMonth(monthResult);
      setSparkline(sparklineResult);
      setRecentSales(recentEnvelope.rows);
      setPendingPayments(allEnvelope.rows.filter((s) => s.balanceDue > 0 && s.status !== "cancelled").slice(0, 8));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const selfTarget = month?.targetsProgress.find((t) => t.staffId === user?.id);
  const targetPercent = selfTarget && selfTarget.revenueTarget > 0 ? Math.round((selfTarget.achievedRevenue / selfTarget.revenueTarget) * 100) : 0;

  const trend = (current: number, prev: number) => (prev > 0 ? Math.round(((current - prev) / prev) * 1000) / 10 : undefined);

  const kpis: KpiItem[] = [
    {
      key: "todaySales",
      icon: Receipt,
      label: "Today's Sales",
      value: today?.count ?? 0,
      tone: "brand",
      href: "/staff/sales",
    },
    {
      key: "monthRevenue",
      icon: Wallet,
      label: "Month Revenue",
      value: month?.revenue ?? 0,
      prefix: "BHD ",
      trend: month ? trend(month.revenue, month.prev.revenue) : undefined,
      tone: "accent",
      href: "/staff/sales",
    },
    {
      key: "monthProfit",
      icon: TrendingUp,
      label: "Month Profit",
      value: month?.profit ?? 0,
      prefix: "BHD ",
      trend: month ? trend(month.profit, month.prev.profit) : undefined,
      tone: "success",
      href: "/reports/profit-summary",
    },
    {
      key: "targetPct",
      icon: TargetIcon,
      label: "Target %",
      value: targetPercent,
      suffix: "%",
      tone: "brand",
      href: "/staff/performance",
    },
  ];

  const recentColumns: TableColumn<Sale>[] = [
    {
      key: "bookingNo",
      label: "Booking No",
      render: (row) => (
        <Link href={`/staff/sales/${row.id}`} className="font-money font-semibold text-primary-600 hover:underline">
          {row.bookingNo}
        </Link>
      ),
    },
    { key: "transactionDate", label: "Date", render: (row) => formatDate(row.transactionDate) },
    { key: "sellingPrice", label: "Selling", align: "right", money: true, render: (row) => formatMoney(row.sellingPrice) },
    { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
  ];

  return (
    <div className="mx-auto max-w-[1400px]">
      <DashboardHeroBanner tagline="Your sales, profit, and target progress — keep the momentum going." />
      <PageHeader title="My Dashboard" subtitle="Your sales, profit, and target progress." breadcrumb="Home / Dashboard" />

      <div className="stagger flex flex-col gap-6">
        <KpiRow items={kpis} loading={loading} />

        <ReturnedAlertCard count={month?.queueStats.returnedPeriod ?? 0} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="flex flex-col items-center justify-center gap-3 lg:col-span-4">
            <p className="font-display text-sm font-bold text-ink">Target Progress</p>
            <ProgressRing value={targetPercent} max={100} size={140} strokeWidth={12} />
            <p className="text-center text-xs text-inkMuted">
              {formatMoney(selfTarget?.achievedRevenue ?? 0)} of {formatMoney(selfTarget?.revenueTarget ?? 0)} target
            </p>
          </Card>

          <Card className="chart-hero flex flex-col gap-3 lg:col-span-8">
            <div>
              <p className="font-display text-sm font-bold text-ink">Last 30 Days</p>
              <p className="text-xs text-inkMuted">Your daily revenue</p>
            </div>
            <MiniSparkline data={sparkline?.dailyTrend ?? []} height={140} />
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-7">
            <p className="mb-4 font-display text-sm font-bold text-ink">My Recent Entries</p>
            <Table<Sale>
              columns={recentColumns}
              rows={recentSales}
              loading={loading}
              emptyState={{ icon: Receipt, title: "No sales yet", hint: "Your bookings will show up here." }}
            />
          </Card>

          <Card className="flex flex-col gap-3 lg:col-span-5">
            <p className="font-display text-sm font-bold text-ink">My Pending Payments</p>
            {loading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-subtle" />
                ))}
              </div>
            ) : pendingPayments.length === 0 ? (
              <EmptyState icon={Wallet} title="Nothing outstanding" hint="Sales with a balance due will show up here." />
            ) : (
              <div className="flex flex-col gap-2">
                {pendingPayments.map((sale) => (
                  <Link
                    key={sale.id}
                    href={`/staff/sales/${sale.id}`}
                    className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 hover:border-primary-300"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{sale.bookingNo}</p>
                      <p className="text-xs text-inkMuted">{formatDate(sale.transactionDate)}</p>
                    </div>
                    <span className="shrink-0 font-money text-sm font-bold money-neg">{formatMoney(sale.balanceDue)}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="flex items-center justify-between gap-4">
          <div>
            <p className="font-display text-base font-bold text-ink">Ready for your next booking?</p>
            <p className="text-sm text-inkMuted">Create a new sale in under a minute.</p>
          </div>
          <Link href="/staff/sales/new" className="shrink-0">
            <Button variant="accent" icon={PlusCircle}>
              New Sale
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
