"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "framer-motion";
import { useTheme } from "@/components/providers/ThemeProvider";
import type { TrendPoint } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils/format";
import {
  CHART_ANIMATION_MS,
  CHART_PALETTE,
  axisTickStyle,
  compactMoney,
  getChartSurface,
  tooltipContentStyle,
  tooltipLabelStyle,
} from "./chartTheme";

const SERIES = [
  { key: "revenue", label: "Revenue", color: CHART_PALETTE[0] },
  { key: "cost", label: "Cost", color: CHART_PALETTE[3] },
  { key: "profit", label: "Profit", color: CHART_PALETTE[2] },
] as const;

interface RevenueTrendAreaProps {
  data: TrendPoint[];
}

export default function RevenueTrendArea({ data }: RevenueTrendAreaProps) {
  const { theme } = useTheme();
  const surface = getChartSurface(theme);
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-xs font-medium text-inkSoft">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height="100%" minHeight={220}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <defs>
            {SERIES.map((s) => (
              <linearGradient key={s.key} id={`trend-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={surface.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => formatDate(v, "d MMM")}
            tick={axisTickStyle(theme)}
            axisLine={{ stroke: surface.grid }}
            tickLine={false}
          />
          <YAxis tickFormatter={(v: number) => compactMoney(v)} tick={axisTickStyle(theme)} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            contentStyle={tooltipContentStyle(theme)}
            labelStyle={tooltipLabelStyle(theme)}
            labelFormatter={(label) => formatDate(String(label))}
            formatter={(value, name) => [
              <span key={String(name)} className="font-money">
                {formatMoney(Number(value))}
              </span>,
              SERIES.find((s) => s.key === name)?.label ?? String(name),
            ]}
          />
          {SERIES.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#trend-${s.key})`}
              dot={false}
              activeDot={{ r: 5, fill: s.color, stroke: surface.tooltipBg, strokeWidth: 2 }}
              isAnimationActive={!reduceMotion}
              animationDuration={CHART_ANIMATION_MS}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
