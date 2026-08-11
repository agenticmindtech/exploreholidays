"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useReducedMotion } from "framer-motion";
import { useTheme } from "@/components/providers/ThemeProvider";
import type { NamedAmount } from "@/lib/types";
import { formatMoney } from "@/lib/utils/format";
import { CHART_ANIMATION_MS, CHART_PALETTE, getChartSurface, tooltipContentStyle, tooltipLabelStyle } from "./chartTheme";

interface ServiceDonutProps {
  data: NamedAmount[];
}

export default function ServiceDonut({ data }: ServiceDonutProps) {
  const { theme } = useTheme();
  const surface = getChartSurface(theme);
  const reduceMotion = useReducedMotion();
  const total = data.reduce((sum, d) => sum + d.revenue, 0);
  const top = data.slice(0, 6);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative flex-1">
        <ResponsiveContainer width="100%" height="100%" minHeight={180}>
          <PieChart>
            <Pie
              data={top}
              dataKey="revenue"
              nameKey="name"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              isAnimationActive={!reduceMotion}
              animationDuration={CHART_ANIMATION_MS}
            >
              {top.map((entry, i) => (
                <Cell key={entry.id} fill={CHART_PALETTE[i % CHART_PALETTE.length]} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipContentStyle(theme)}
              labelStyle={tooltipLabelStyle(theme)}
              formatter={(value, name) => [<span className="font-money" key={String(name)}>{formatMoney(Number(value))}</span>, String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-inkMuted">Total</span>
          <span className="font-money text-sm font-bold" style={{ color: surface.text }}>
            {formatMoney(total)}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {top.map((entry, i) => {
          const pct = total > 0 ? Math.round((entry.revenue / total) * 100) : 0;
          return (
            <div key={entry.id} className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} />
              <span className="min-w-0 flex-1 truncate text-inkSoft">{entry.name}</span>
              <span className="shrink-0 font-money font-semibold text-ink">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
