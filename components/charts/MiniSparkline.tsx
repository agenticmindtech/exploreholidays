"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { useReducedMotion } from "framer-motion";
import { useTheme } from "@/components/providers/ThemeProvider";
import type { TrendPoint } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { CHART_ANIMATION_MS, CHART_PALETTE, tooltipContentStyle, tooltipLabelStyle } from "./chartTheme";

interface MiniSparklineProps {
  data: TrendPoint[];
  height?: number;
}

export default function MiniSparkline({ data, height = 64 }: MiniSparklineProps) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
        <defs>
          <linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_PALETTE[0]} stopOpacity={0.4} />
            <stop offset="95%" stopColor={CHART_PALETTE[0]} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <Tooltip
          contentStyle={tooltipContentStyle(theme)}
          labelStyle={tooltipLabelStyle(theme)}
          labelFormatter={(label) => formatDate(String(label))}
          formatter={(value) => [
            <span className="font-money" key="v">
              {formatMoney(Number(value))}
            </span>,
            "Revenue",
          ]}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={CHART_PALETTE[0]}
          strokeWidth={2}
          fill="url(#sparkline-fill)"
          dot={false}
          activeDot={{ r: 4, fill: CHART_PALETTE[0], stroke: "#fff", strokeWidth: 2 }}
          isAnimationActive={!reduceMotion}
          animationDuration={CHART_ANIMATION_MS}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
