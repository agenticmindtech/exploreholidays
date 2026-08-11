"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "framer-motion";
import { useTheme } from "@/components/providers/ThemeProvider";
import type { NamedAmount } from "@/lib/types";
import { formatMoney } from "@/lib/utils/format";
import { CHART_ANIMATION_MS, CHART_PALETTE, axisTickStyle, compactMoney, getChartSurface, tooltipContentStyle, tooltipLabelStyle } from "./chartTheme";

interface BranchBarProps {
  data: NamedAmount[];
}

export default function BranchBar({ data }: BranchBarProps) {
  const { theme } = useTheme();
  const surface = getChartSurface(theme);
  const reduceMotion = useReducedMotion();
  const color = CHART_PALETTE[0];

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={220}>
      <BarChart data={data} margin={{ top: 20, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="branch-bar-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={1} />
            <stop offset="100%" stopColor={color} stopOpacity={0.65} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={surface.grid} vertical={false} />
        <XAxis dataKey="name" tick={axisTickStyle(theme)} axisLine={{ stroke: surface.grid }} tickLine={false} interval={0} />
        <YAxis tickFormatter={(v: number) => compactMoney(v)} tick={axisTickStyle(theme)} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          contentStyle={tooltipContentStyle(theme)}
          labelStyle={tooltipLabelStyle(theme)}
          formatter={(value) => [<span className="font-money" key="v">{formatMoney(Number(value))}</span>, "Revenue"]}
          cursor={{ fill: surface.grid }}
        />
        <Bar dataKey="revenue" fill="url(#branch-bar-fill)" radius={[6, 6, 0, 0]} isAnimationActive={!reduceMotion} animationDuration={CHART_ANIMATION_MS} maxBarSize={44}>
          <LabelList
            dataKey="revenue"
            position="top"
            formatter={(v) => compactMoney(Number(v))}
            style={{ fill: surface.text, fontFamily: "Sora, sans-serif", fontSize: 11, fontWeight: 700 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
