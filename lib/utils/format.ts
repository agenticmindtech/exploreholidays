import {
  format as formatDateFns,
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
} from "date-fns";
import { getStore } from "@/lib/api/client";

/**
 * Currency and decimal places default to the live Settings (getStore().settings is
 * synchronous/in-memory, so this always reflects the latest save — no stale "once per
 * session" cache to invalidate). Pass explicit args to override for a specific case.
 */
export function formatMoney(n: number | string | null | undefined, currency?: string, decimals?: number): string {
  const settings = getStore().settings;
  const value = Number(n) || 0;
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: decimals ?? settings.currencyDecimals,
    maximumFractionDigits: decimals ?? settings.currencyDecimals,
  });
  return `${currency ?? settings.currency} ${formatted}`;
}

export function formatDate(iso: string | Date | null | undefined, pattern = "dd MMM yyyy"): string {
  if (!iso) return "";
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return formatDateFns(date, pattern);
}

export function relativeTime(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const now = new Date();

  const seconds = differenceInSeconds(now, date);
  if (seconds < 45) return "just now";

  const minutes = differenceInMinutes(now, date);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = differenceInHours(now, date);
  if (hours < 24) return `${hours} h ago`;

  const days = differenceInDays(now, date);
  return `${days} d ago`;
}
