import { differenceInCalendarDays } from "date-fns";
import type { AgingBucket, AgingSummaryRow, Receivable } from "@/lib/types";
import { round3 } from "./money";
import { AGING_BUCKETS } from "@/lib/constants/enums";

export function agingDays(dueDate: string, asOf: Date = new Date()): number {
  return Math.max(0, differenceInCalendarDays(asOf, new Date(dueDate)));
}

export function agingBucket(days: number): AgingBucket {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export function agingSummary(receivables: Receivable[]): AgingSummaryRow[] {
  return AGING_BUCKETS.map((bucket) => {
    const open = receivables.filter(
      (r) => r.agingBucket === bucket && r.state !== "settled" && r.state !== "written_off"
    );
    return {
      bucket,
      count: open.length,
      balance: round3(open.reduce((sum, r) => sum + r.balance, 0)),
    };
  });
}
