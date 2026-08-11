"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useReducedMotion } from "framer-motion";
import { useTheme } from "@/components/providers/ThemeProvider";
import { CHART_ANIMATION_MS, getChartSurface, tooltipContentStyle, tooltipLabelStyle } from "./chartTheme";

export interface CategorySlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface CategoryDonutProps {
  data: CategorySlice[];
  centerLabel?: string;
}

/** Generic count/amount-by-category donut — pair with CHART_PALETTE or a status color map for slice fills. */
export default function CategoryDonut({ data, centerLabel = "Total" }: CategoryDonutProps) {
  const { theme } = useTheme();
  const surface = getChartSurface(theme);
  const reduceMotion = useReducedMotion();
  const nonZero = data.filter((d) => d.value > 0);
  const total = nonZero.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative flex-1">
        <ResponsiveContainer width="100%" height="100%" minHeight={160}>
          <PieChart>
            <Pie
              data={nonZero}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              isAnimationActive={!reduceMotion}
              animationDuration={CHART_ANIMATION_MS}
            >
              {nonZero.map((entry) => (
                <Cell key={entry.key} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipContentStyle(theme)}
              labelStyle={tooltipLabelStyle(theme)}
              formatter={(value, name) => [String(value), String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-inkMuted">{centerLabel}</span>
          <span className="font-money text-sm font-bold" style={{ color: surface.text }}>
            {total}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {nonZero.map((entry) => {
          const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
          return (
            <div key={entry.key} className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: entry.color }} />
              <span className="min-w-0 flex-1 truncate text-inkSoft">{entry.label}</span>
              <span className="shrink-0 font-semibold text-ink">
                {entry.value} · {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
