import type { ApiEnvelope, Filters, Target } from "@/lib/types";
import { applyFilters } from "@/lib/logic/filters";
import { delay, getStore, persist } from "./client";
import { appendAudit } from "./_shared";

export interface UpsertTargetInput {
  staffId: string;
  month: string;
  salesCountTarget: number;
  revenueTarget: number;
  profitTarget: number;
}

export const targetsApi = {
  /** Accepts the universal Filters contract; narrow to a month via filters.search (e.g. "2026-08"). */
  async list(filters: Filters = {}): Promise<ApiEnvelope<Target>> {
    await delay();
    return applyFilters(getStore().targets, filters, (row) => row.month);
  },

  async get(id: string): Promise<Target> {
    await delay();
    const target = getStore().targets.find((t) => t.id === id);
    if (!target) throw new Error(`Target not found: ${id}`);
    return target;
  },

  async upsert(data: UpsertTargetInput, byUserId: string): Promise<Target> {
    await delay();
    const store = getStore();
    const existing = store.targets.find((t) => t.staffId === data.staffId && t.month === data.month);

    if (existing) {
      existing.salesCountTarget = data.salesCountTarget;
      existing.revenueTarget = data.revenueTarget;
      existing.profitTarget = data.profitTarget;
      appendAudit({ userId: byUserId, module: "targets", entityId: existing.id, action: "update" });
      persist();
      return existing;
    }

    const target: Target = {
      id: `TGT-${data.month}-${data.staffId}`,
      staffId: data.staffId,
      month: data.month,
      salesCountTarget: data.salesCountTarget,
      revenueTarget: data.revenueTarget,
      profitTarget: data.profitTarget,
      achievedCount: 0,
      achievedRevenue: 0,
      achievedProfit: 0,
    };
    store.targets.push(target);
    appendAudit({ userId: byUserId, module: "targets", entityId: target.id, action: "create" });
    persist();
    return target;
  },
};
