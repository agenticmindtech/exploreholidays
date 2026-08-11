"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { AlertTriangle, DollarSign, Receipt, Target as TargetIcon, TrendingUp } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import KPIStatCard from "@/components/ui/KPIStatCard";
import ProgressRing from "@/components/ui/ProgressRing";
import StatusPill from "@/components/ui/StatusPill";
import Skeleton from "@/components/ui/Skeleton";
import { useAuthStore } from "@/lib/stores/authStore";
import { dashboardApi } from "@/lib/api/dashboardApi";
import { salesApi } from "@/lib/api/salesApi";
import { targetsApi } from "@/lib/api/targetsApi";
import type { DashboardAggregate, Sale, Target } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils/format";

function trendPct(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prev) / prev) * 100 * 10) / 10;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
function currentMonthStr() {
  return new Date().toISOString().slice(0, 7);
}

export default function MyPerformancePage() {
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [monthAgg, setMonthAgg] = useState<DashboardAggregate | null>(null);
  const [sparkline, setSparkline] = useState<{ date: string; revenue: number }[]>([]);
  const [target, setTarget] = useState<Target | null>(null);
  const [returnedCount, setReturnedCount] = useState(0);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    Promise.all([
      dashboardApi.aggregate({ preset: "month" }, user.role, user.id),
      dashboardApi.aggregate({ dateFrom: daysAgoIso(29), dateTo: todayIso() }, user.role, user.id),
      targetsApi.list({ staffId: user.id, search: currentMonthStr() }),
      salesApi.list({ staffId: user.id, status: "returned", page: 1, pageSize: 1 }),
      salesApi.list({ staffId: user.id, page: 1, pageSize: 8, sortBy: "createdAt", sortDir: "desc" }),
    ]).then(([month, thirtyDay, targetEnvelope, returnedEnvelope, recentEnvelope]) => {
      if (cancelled) return;
      setMonthAgg(month);
      setSparkline(thirtyDay.dailyTrend.map((p) => ({ date: p.date, revenue: p.revenue })));
      setTarget(targetEnvelope.rows[0] ?? null);
      setReturnedCount(returnedEnvelope.total);
      setRecentSales(recentEnvelope.rows);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="My Performance" subtitle="Your sales, profit, and target progress this month." breadcrumb="Staff / Performance" />

      <div className="stagger flex flex-col gap-6">
        {returnedCount > 0 && (
          <Card className="flex items-center gap-3 border-warning-300 bg-warning-50">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-100 text-warning-600">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <p className="flex-1 text-sm text-inkSoft">
              You have <strong className="text-warning-700">{returnedCount}</strong> sale{returnedCount > 1 ? "s" : ""} returned for correction.
            </p>
            <Link href="/staff/sales?tab=returned" className="text-sm font-semibold text-primary-600 hover:underline">
              Review &rarr;
            </Link>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPIStatCard
            icon={Receipt}
            label="Sales this month"
            value={monthAgg?.count ?? 0}
            trend={monthAgg ? trendPct(monthAgg.count, monthAgg.prev.count) : undefined}
            tone="brand"
            loading={loading}
          />
          <KPIStatCard
            icon={DollarSign}
            label="Revenue"
            value={monthAgg?.revenue ?? 0}
            prefix="BHD "
            trend={monthAgg ? trendPct(monthAgg.revenue, monthAgg.prev.revenue) : undefined}
            tone="accent"
            loading={loading}
          />
          <KPIStatCard
            icon={TrendingUp}
            label="Profit"
            value={monthAgg?.profit ?? 0}
            prefix="BHD "
            trend={monthAgg ? trendPct(monthAgg.profit, monthAgg.prev.profit) : undefined}
            tone="success"
            loading={loading}
          />
          <KPIStatCard
            icon={TargetIcon}
            label="Target achieved"
            value={target && target.revenueTarget > 0 ? Math.round((target.achievedRevenue / target.revenueTarget) * 100) : 0}
            suffix="%"
            tone="danger"
            loading={loading}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="flex flex-col items-center justify-center gap-3 text-center lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-inkMuted">Monthly Target</p>
            {target ? (
              <>
                <ProgressRing value={target.achievedRevenue} max={target.revenueTarget} size={96} strokeWidth={8} />
                <p className="font-money text-xs text-inkMuted">
                  {formatMoney(target.achievedRevenue)} of {formatMoney(target.revenueTarget)}
                </p>
              </>
            ) : (
              <p className="text-sm text-inkMuted">No target set for this month.</p>
            )}
          </Card>

          <Card className="lg:col-span-2">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-inkMuted">Last 30 Days — Daily Revenue</p>
            <p className="mb-3 font-money text-xl font-bold text-ink">{formatMoney(monthAgg?.revenue ?? 0)}</p>
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="text-primary-600">
                <ResponsiveContainer width="100%" height={80}>
                  <AreaChart data={sparkline} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="staffRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="currentColor" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="revenue" stroke="currentColor" strokeWidth={2} fill="url(#staffRevenueGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        <Card>
          <p className="mb-4 font-display text-xs font-bold uppercase tracking-wide text-inkMuted">Recent Entries</p>
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentSales.length === 0 ? (
            <p className="text-sm text-inkMuted">No sales yet — your first entry will show up here.</p>
          ) : (
            <div className="flex flex-col divide-y divide-line">
              {recentSales.map((sale) => (
                <Link
                  key={sale.id}
                  href={`/staff/sales/${sale.id}`}
                  className="flex min-h-[48px] items-center justify-between gap-3 py-3 text-sm hover:bg-subtle"
                >
                  <span className="font-money font-semibold text-ink">{sale.bookingNo}</span>
                  <span className="hidden flex-1 truncate text-inkMuted sm:block">{sale.destination}</span>
                  <span className="text-xs text-inkMuted">{formatDate(sale.transactionDate)}</span>
                  <span className={`font-money font-semibold ${sale.profit >= 0 ? "money-pos" : "money-neg"}`}>
                    {formatMoney(sale.sellingPrice)}
                  </span>
                  <StatusPill status={sale.status} />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
