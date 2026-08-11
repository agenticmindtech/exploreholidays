"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "framer-motion";
import { useTheme } from "@/components/providers/ThemeProvider";
import type { TrendPoint } from "@/lib/types";
import { formatMoney } from "@/lib/utils/format";
import { CHART_ANIMATION_MS, CHART_PALETTE, axisTickStyle, compactMoney, getChartSurface, tooltipContentStyle, tooltipLabelStyle } from "./chartTheme";

interface MonthlyProgressLineProps {
  current: TrendPoint[];
  previous: TrendPoint[];
}

interface DayRow {
  day: number;
  thisMonth?: number;
  lastMonth?: number;
}

function cumulativeByDay(points: TrendPoint[]): Map<number, number> {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const result = new Map<number, number>();
  let running = 0;
  for (const p of sorted) {
    const day = Number(p.date.slice(8, 10));
    running += p.revenue;
    result.set(day, Math.round(running * 1000) / 1000);
  }
  return result;
}

export default function MonthlyProgressLine({ current, previous }: MonthlyProgressLineProps) {
  const { theme } = useTheme();
  const surface = getChartSurface(theme);
  const reduceMotion = useReducedMotion();

  const currentByDay = cumulativeByDay(current);
  const previousByDay = cumulativeByDay(previous);
  const maxDay = Math.max(31, ...currentByDay.keys(), ...previousByDay.keys());

  const data: DayRow[] = [];
  let lastCurrent: number | undefined;
  let lastPrevious: number | undefined;
  for (let day = 1; day <= maxDay; day++) {
    if (currentByDay.has(day)) lastCurrent = currentByDay.get(day);
    if (previousByDay.has(day)) lastPrevious = previousByDay.get(day);
    if (lastCurrent === undefined && lastPrevious === undefined) continue;
    data.push({ day, thisMonth: lastCurrent, lastMonth: lastPrevious });
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-inkSoft">
          <span className="h-2 w-2 rounded-full" style={{ background: CHART_PALETTE[0] }} />
          This month
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-inkSoft">
          <span className="h-2 w-2 rounded-full" style={{ background: CHART_PALETTE[3] }} />
          Last month
        </span>
      </div>
      <ResponsiveContainer width="100%" height="100%" minHeight={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={surface.grid} vertical={false} />
          <XAxis dataKey="day" tick={axisTickStyle(theme)} axisLine={{ stroke: surface.grid }} tickLine={false} />
          <YAxis tickFormatter={(v: number) => compactMoney(v)} tick={axisTickStyle(theme)} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            contentStyle={tooltipContentStyle(theme)}
            labelStyle={tooltipLabelStyle(theme)}
            labelFormatter={(label) => `Day ${label}`}
            formatter={(value, name) => [
              <span className="font-money" key={String(name)}>
                {formatMoney(Number(value))}
              </span>,
              name === "thisMonth" ? "This month" : "Last month",
            ]}
          />
          <Line
            type="monotone"
            dataKey="thisMonth"
            stroke={CHART_PALETTE[0]}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: CHART_PALETTE[0], stroke: surface.tooltipBg, strokeWidth: 2 }}
            isAnimationActive={!reduceMotion}
            animationDuration={CHART_ANIMATION_MS}
          />
          <Line
            type="monotone"
            dataKey="lastMonth"
            stroke={CHART_PALETTE[3]}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 5, fill: CHART_PALETTE[3], stroke: surface.tooltipBg, strokeWidth: 2 }}
            isAnimationActive={!reduceMotion}
            animationDuration={CHART_ANIMATION_MS}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
