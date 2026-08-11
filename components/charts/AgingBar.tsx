"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "framer-motion";
import { useTheme } from "@/components/providers/ThemeProvider";
import type { AgingSummaryRow } from "@/lib/types";
import { formatMoney } from "@/lib/utils/format";
import { AGING_CHART_COLORS, CHART_ANIMATION_MS, axisTickStyle, compactMoney, getChartSurface, tooltipContentStyle, tooltipLabelStyle } from "./chartTheme";

interface AgingBarProps {
  data: AgingSummaryRow[];
}

export default function AgingBar({ data }: AgingBarProps) {
  const { theme } = useTheme();
  const surface = getChartSurface(theme);
  const reduceMotion = useReducedMotion();

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={220}>
      <BarChart data={data} margin={{ top: 20, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={surface.grid} vertical={false} />
        <XAxis dataKey="bucket" tick={axisTickStyle(theme)} axisLine={{ stroke: surface.grid }} tickLine={false} />
        <YAxis tickFormatter={(v: number) => compactMoney(v)} tick={axisTickStyle(theme)} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          contentStyle={tooltipContentStyle(theme)}
          labelStyle={tooltipLabelStyle(theme)}
          formatter={(value, _name, item) => [
            <span className="font-money" key="v">
              {formatMoney(Number(value))}
            </span>,
            `${(item?.payload as AgingSummaryRow | undefined)?.count ?? 0} receivable(s)`,
          ]}
        />
        <Bar dataKey="balance" radius={[6, 6, 0, 0]} isAnimationActive={!reduceMotion} animationDuration={CHART_ANIMATION_MS} maxBarSize={56}>
          {data.map((row, i) => (
            <Cell key={row.bucket} fill={AGING_CHART_COLORS[i % AGING_CHART_COLORS.length]} />
          ))}
          <LabelList
            dataKey="balance"
            position="top"
            formatter={(v) => compactMoney(Number(v))}
            style={{ fill: surface.text, fontFamily: "Sora, sans-serif", fontSize: 11, fontWeight: 700 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
