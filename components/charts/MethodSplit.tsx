"use client";

import { motion } from "framer-motion";
import { Banknote, CircleSlash, CreditCard, FileText, Smartphone, type LucideIcon } from "lucide-react";
import type { MethodAmount, PaymentMethod } from "@/lib/types";
import { METHOD_META } from "@/lib/constants/display";
import { formatMoney } from "@/lib/utils/format";
import { CHART_ANIMATION_MS, METHOD_CHART_COLORS } from "./chartTheme";

const METHOD_ICONS: Record<PaymentMethod, LucideIcon> = {
  benefit_pay: Smartphone,
  credit_card_online: CreditCard,
  cash: Banknote,
  fawri_cheque: FileText,
  not_paid_refund: CircleSlash,
};

interface MethodSplitProps {
  data: MethodAmount[];
}

export default function MethodSplit({ data }: MethodSplitProps) {
  const max = Math.max(...data.map((d) => d.amount), 1);
  const sorted = [...data].sort((a, b) => b.amount - a.amount);

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((row) => {
        const Icon = METHOD_ICONS[row.method];
        const pct = Math.min(100, Math.max(0, (row.amount / max) * 100));
        return (
          <div key={row.method} className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-subtle text-inkMuted">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-medium text-inkSoft">{METHOD_META[row.method].label}</span>
                <span className="shrink-0 font-money font-semibold text-ink">{formatMoney(row.amount)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: `${METHOD_CHART_COLORS[row.method]}1F` }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: CHART_ANIMATION_MS / 1000, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${METHOD_CHART_COLORS[row.method]}CC, ${METHOD_CHART_COLORS[row.method]})` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
