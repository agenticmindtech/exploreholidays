"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { STATUS_META } from "@/lib/constants/display";
import type { SaleStatus } from "@/lib/types";
import { STATUS_CHART_COLORS, CHART_ANIMATION_MS } from "./chartTheme";

const FUNNEL_STAGES: SaleStatus[] = ["draft", "submitted", "verified", "posted"];

interface StatusFunnelProps {
  statusCounts: Partial<Record<SaleStatus, number>>;
}

export default function StatusFunnel({ statusCounts }: StatusFunnelProps) {
  const counts = FUNNEL_STAGES.map((s) => statusCounts[s] ?? 0);
  const max = Math.max(...counts, 1);

  return (
    <div className="flex flex-col gap-1">
      {FUNNEL_STAGES.map((status, i) => {
        const count = counts[i];
        const widthPct = Math.max(8, (count / max) * 100);
        const conversion = i > 0 && counts[i - 1] > 0 ? Math.round((count / counts[i - 1]) * 100) : null;

        return (
          <div key={status} className="flex flex-col items-center gap-1">
            {i > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-inkMuted">
                <ArrowDown className="h-3 w-3" />
                {conversion !== null ? `${conversion}%` : "—"}
              </span>
            )}
            <div className="flex w-full items-center gap-3">
              <span className="w-20 shrink-0 text-right text-xs font-medium text-inkSoft">{STATUS_META[status].label}</span>
              <div className="flex-1 rounded-lg" style={{ background: `${STATUS_CHART_COLORS[status]}14` }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct}%` }}
                  transition={{ duration: CHART_ANIMATION_MS / 1000, ease: [0.16, 1, 0.3, 1] }}
                  className="flex h-8 items-center justify-end rounded-lg px-3"
                  style={{ background: `linear-gradient(90deg, ${STATUS_CHART_COLORS[status]}CC, ${STATUS_CHART_COLORS[status]})` }}
                >
                  <span className="font-money text-xs font-bold text-white">{count}</span>
                </motion.div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
