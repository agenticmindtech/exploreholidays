"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  Building2,
  CalendarDays,
  HandCoins,
  Hourglass,
  LayoutDashboard,
  RefreshCw,
  RotateCcw,
  TrendingUp,
  Trophy,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import { REPORT_CONFIGS } from "@/lib/reports/configs";
import { useAuthStore } from "@/lib/stores/authStore";
import type { ReportConfig } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<string, LucideIcon> = {
  CalendarDays,
  TrendingUp,
  Banknote,
  Building2,
  AlertTriangle,
  RotateCcw,
  Wallet,
  HandCoins,
  Hourglass,
  RefreshCw,
  Trophy,
  LayoutDashboard,
};

// Finance-only reports the staff role never sees on its own hub (phase 7 spec §8).
const STAFF_HIDDEN_IDS = new Set(["staff-mistakes", "staff-loans", "supplier-usage", "management-summary"]);

function ReportCard({ config }: { config: ReportConfig }) {
  const Icon = ICONS[config.icon] ?? LayoutDashboard;
  return (
    <Link href={`/reports/${config.id}`}>
      <Card hover className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-subtle text-primary-600">
            <Icon className="h-5 w-5" />
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              config.group === "core" ? "bg-primary-50 text-primary-700" : "bg-accent-50 text-accent-700"
            )}
          >
            {config.group}
          </span>
        </div>
        <div>
          <p className="font-display text-sm font-bold text-ink">{config.title}</p>
          <p className="mt-1 text-xs text-inkSoft">{config.description}</p>
        </div>
      </Card>
    </Link>
  );
}

export default function ReportsHubPage() {
  const user = useAuthStore((s) => s.user);
  const visible = REPORT_CONFIGS.filter((c) => !(user?.role === "staff" && STAFF_HIDDEN_IDS.has(c.id)));
  const core = visible.filter((c) => c.group === "core");
  const additional = visible.filter((c) => c.group === "additional");

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Reports" subtitle="Every report the agency runs, in one place." breadcrumb="Home / Reports" />

      <div className="stagger flex flex-col gap-8">
        <div>
          <p className="mb-3 font-display text-xs font-bold uppercase tracking-wide text-inkMuted">Core Reports</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {core.map((c) => (
              <ReportCard key={c.id} config={c} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 font-display text-xs font-bold uppercase tracking-wide text-inkMuted">Additional Reports</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {additional.map((c) => (
              <ReportCard key={c.id} config={c} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
