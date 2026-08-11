"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface ToggleProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export default function Toggle({ checked = false, onChange, label, disabled = false, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "inline-flex min-h-[40px] items-center gap-2.5 rounded-xl px-1",
        disabled ? "pointer-events-none opacity-55" : "cursor-pointer",
        className
      )}
    >
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-primary-600" : "bg-lineStrong"
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
          style={{ left: checked ? "calc(100% - 22px)" : "2px" }}
        />
      </span>
      {label && <span className="text-sm text-ink">{label}</span>}
    </button>
  );
}
