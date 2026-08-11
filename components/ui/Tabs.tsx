"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs?: TabItem[];
  active?: string;
  onChange?: (id: string) => void;
  className?: string;
}

export default function Tabs({ tabs = [], active, onChange, className }: TabsProps) {
  const uid = useId();

  return (
    <div className={cn("flex items-center gap-1 border-b border-line", className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange?.(tab.id)}
            className={cn(
              "relative flex min-h-[40px] items-center gap-2 px-4 text-sm font-semibold transition-colors",
              isActive ? "text-primary-600" : "text-inkSoft hover:text-ink"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="rounded-full bg-subtle px-1.5 py-0.5 text-[11px] font-bold text-inkMuted">
                {tab.count}
              </span>
            )}
            {isActive && (
              <motion.span
                layoutId={`tabs-underline-${uid}`}
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary-600"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
