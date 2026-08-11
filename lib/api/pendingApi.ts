import type { ApiEnvelope, Filters, PendingState, Sale } from "@/lib/types";
import { applyFilters } from "@/lib/logic/filters";
import { delay, getStore, nowIso, persist } from "./client";
import { appendAudit, notifyUsers } from "./_shared";

const PENDING_PIPELINE: PendingState[] = ["in_process", "awaiting_supplier", "awaiting_customer", "completed"];

function findOrThrow(id: string): Sale {
  const sale = getStore().sales.find((s) => s.id === id);
  if (!sale) throw new Error(`Sale not found: ${id}`);
  return sale;
}

function stampedNote(note: string): string {
  return `[${nowIso().slice(0, 16).replace("T", " ")}] ${note}`;
}

export const pendingApi = {
  async list(filters: Filters = {}): Promise<ApiEnvelope<Sale>> {
    await delay();
    const rows = getStore().sales.filter((s) => s.isPendingService);
    return applyFilters(rows, filters);
  },

  async updateState(id: string, pendingState: PendingState, expectedCompletionDate: string | null, byUserId: string): Promise<Sale> {
    await delay();
    const sale = findOrThrow(id);
    if (!sale.isPendingService) {
      throw new Error(`Sale ${sale.bookingNo} is not flagged as a pending service.`);
    }
    const from = sale.pendingState;
    sale.pendingState = pendingState;
    sale.expectedCompletionDate = expectedCompletionDate;
    sale.updatedAt = nowIso();

    appendAudit({
      userId: byUserId,
      module: "sales",
      entityId: sale.id,
      action: "update",
      changes: { pendingState: { from, to: pendingState } },
    });
    persist();
    return sale;
  },

  /** Moves in_process -> awaiting_supplier -> awaiting_customer -> completed, one step at a time. */
  async advance(id: string, byUserId: string): Promise<Sale> {
    await delay();
    const sale = findOrThrow(id);
    if (!sale.isPendingService) {
      throw new Error(`Sale ${sale.bookingNo} is not flagged as a pending service.`);
    }
    const current = sale.pendingState ?? "in_process";
    const idx = PENDING_PIPELINE.indexOf(current);
    if (idx === -1 || idx === PENDING_PIPELINE.length - 1) {
      throw new Error(`Cannot advance a pending service that is already ${current.replace(/_/g, " ")}.`);
    }
    const next = PENDING_PIPELINE[idx + 1];
    sale.pendingState = next;
    sale.updatedAt = nowIso();

    appendAudit({
      userId: byUserId,
      module: "sales",
      entityId: sale.id,
      action: "update",
      fromStatus: current,
      toStatus: next,
      changes: { pendingState: { from: current, to: next } },
    });
    persist();
    return sale;
  },

  async cancel(id: string, reason: string, byUserId: string): Promise<Sale> {
    await delay();
    const sale = findOrThrow(id);
    if (!reason?.trim()) {
      throw new Error("A reason is required to cancel a pending service.");
    }
    const from = sale.pendingState;
    sale.pendingState = "cancelled";
    sale.remarks = sale.remarks ? `${sale.remarks}\n${stampedNote(`Cancelled: ${reason}`)}` : stampedNote(`Cancelled: ${reason}`);
    sale.updatedAt = nowIso();

    appendAudit({
      userId: byUserId,
      module: "sales",
      entityId: sale.id,
      action: "update",
      fromStatus: from,
      toStatus: "cancelled",
      changes: { pendingState: { from, to: "cancelled" } },
    });
    persist();
    return sale;
  },

  async addFollowUpNote(id: string, note: string, byUserId: string): Promise<Sale> {
    await delay();
    const sale = findOrThrow(id);
    if (!note?.trim()) {
      throw new Error("Enter a note before saving.");
    }
    sale.remarks = sale.remarks ? `${sale.remarks}\n${stampedNote(note.trim())}` : stampedNote(note.trim());
    sale.updatedAt = nowIso();

    appendAudit({ userId: byUserId, module: "sales", entityId: sale.id, action: "update", note: "Follow-up note added" });
    persist();
    return sale;
  },

  async notifyStaff(id: string, byUserId: string): Promise<void> {
    await delay();
    const sale = findOrThrow(id);
    notifyUsers(
      [sale.staffId],
      "system",
      "Follow-up on a pending service",
      `Please follow up on ${sale.bookingNo} — currently ${(sale.pendingState ?? "in_process").replace(/_/g, " ")}.`,
      sale.id
    );
    appendAudit({ userId: byUserId, module: "sales", entityId: sale.id, action: "update", note: "Staff notified about pending service" });
    persist();
  },
};
