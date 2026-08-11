"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

type Tone = "brand" | "accent" | "success" | "warning" | "danger";

const FILL: Record<Tone, string> = {
  brand: "bg-grad-brand",
  accent: "bg-grad-sunset",
  success: "bg-grad-success",
  warning: "bg-grad-warning",
  danger: "bg-grad-danger",
};

interface ProgressBarProps {
  value?: number;
  max?: number;
  tone?: Tone;
  className?: string;
}

export default function ProgressBar({ value = 0, max = 100, tone = "brand", className }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-subtle", className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={cn("h-full rounded-full", FILL[tone] ?? FILL.brand)}
      />
    </div>
  );
}
