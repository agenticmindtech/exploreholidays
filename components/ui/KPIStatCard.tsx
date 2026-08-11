"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useCountUp } from "@/lib/hooks/useCountUp";
import Skeleton from "./Skeleton";
import TiltCard from "./TiltCard";

type Tone = "brand" | "accent" | "success" | "danger";

interface KPIStatCardProps {
  icon?: LucideIcon;
  label: string;
  value?: number;
  prefix?: string;
  suffix?: string;
  trend?: number;
  tone?: Tone;
  loading?: boolean;
  className?: string;
}

// Brand/accent KPIs get the gradient-text treatment; success/danger keep a solid signal
// color so "this number is good/bad" stays unambiguous at a glance.
const VALUE_CLASS: Record<Tone, string> = {
  brand: "text-grad-brand",
  accent: "text-grad-sunset",
  success: "text-success-600",
  danger: "text-danger-600",
};

export default function KPIStatCard({
  icon: Icon,
  label,
  value = 0,
  prefix = "",
  suffix = "",
  trend,
  tone = "brand",
  loading = false,
  className,
}: KPIStatCardProps) {
  const animated = useCountUp(loading ? 0 : value);

  if (loading) {
    return (
      <div className={cn("kpi-card", tone !== "brand" && `kpi-${tone}`, className)}>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-8 w-32" />
        <Skeleton className="mt-3 h-4 w-16" />
      </div>
    );
  }

  const trendDirection = trend === undefined || trend === 0 ? "flat" : trend > 0 ? "up" : "down";

  return (
    <TiltCard intensity={4} className={cn("kpi-card", tone !== "brand" && `kpi-${tone}`, className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-inkMuted">{label}</span>
        {Icon && (
          <span className="rounded-xl bg-subtle p-2 text-primary-600">
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className={cn("mt-3 font-money text-2xl font-bold", VALUE_CLASS[tone])}>
        {prefix}
        {Math.round(animated).toLocaleString("en-US")}
        {suffix}
      </p>
      {trend !== undefined && (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
            trendDirection === "up" && "bg-success-50 text-success-600",
            trendDirection === "down" && "bg-danger-50 text-danger-600",
            trendDirection === "flat" && "bg-subtle text-inkMuted"
          )}
        >
          {trendDirection === "up" && <ArrowUpRight className="h-3 w-3" />}
          {trendDirection === "down" && <ArrowDownRight className="h-3 w-3" />}
          {trendDirection === "flat" && <Minus className="h-3 w-3" />}
          {Math.abs(trend)}%
        </div>
      )}
    </TiltCard>
  );
}
