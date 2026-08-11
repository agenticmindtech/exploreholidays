import type { ApiEnvelope, Filters, Refund, RefundStatus } from "@/lib/types";
import { applyFilters } from "@/lib/logic/filters";
import { round3 } from "@/lib/logic/money";
import { delay, getStore, nextId, nowIso, persist } from "./client";
import { appendAudit, notifyUsers } from "./_shared";

const PIPELINE: RefundStatus[] = ["requested", "sent_to_supplier", "received_from_supplier", "paid_to_customer"];

export interface CreateRefundInput {
  saleId: string;
  requestDate: string;
  reason: string;
  supplierRefundAmount: number;
  customerRefundAmount: number;
  responsibleStaffId: string;
  expectedRefundDate?: string | null;
}

function findOrThrow(id: string): Refund {
  const refund = getStore().refunds.find((r) => r.id === id);
  if (!refund) throw new Error(`Refund not found: ${id}`);
  return refund;
}

export const refundsApi = {
  async list(filters: Filters = {}): Promise<ApiEnvelope<Refund>> {
    await delay();
    return applyFilters(getStore().refunds, filters);
  },

  async get(id: string): Promise<Refund> {
    await delay();
    return findOrThrow(id);
  },

  async create(data: CreateRefundInput, byUserId: string): Promise<Refund> {
    await delay();
    const store = getStore();
    const charge = round3(data.customerRefundAmount - data.supplierRefundAmount);
    const refund: Refund = {
      id: nextId("REF", store.refunds),
      saleId: data.saleId,
      requestDate: data.requestDate,
      reason: data.reason,
      status: "requested",
      expectedRefundDate: data.expectedRefundDate ?? null,
      supplierRefundAmount: round3(data.supplierRefundAmount),
      customerRefundAmount: round3(data.customerRefundAmount),
      charge,
      chargeToStaffId: charge > 0 ? data.responsibleStaffId : null,
      responsibleStaffId: data.responsibleStaffId,
      handledById: null,
      notes: null,
      updatedAt: nowIso(),
    };
    store.refunds.push(refund);
    appendAudit({ userId: byUserId, module: "refunds", entityId: refund.id, action: "create" });
    persist();
    return refund;
  },

  /** Moves the refund one stage forward through the pipeline. */
  async advance(id: string, byUserId: string): Promise<Refund> {
    await delay();
    const store = getStore();
    const refund = findOrThrow(id);

    const currentIndex = PIPELINE.indexOf(refund.status);
    if (currentIndex === -1 || currentIndex === PIPELINE.length - 1) {
      throw new Error(`Cannot advance a refund that is already ${refund.status}.`);
    }

    const fromStatus = refund.status;
    const toStatus = PIPELINE[currentIndex + 1];
    refund.status = toStatus;
    refund.handledById = byUserId;
    refund.updatedAt = nowIso();

    if (toStatus === "received_from_supplier") {
      const sale = store.sales.find((s) => s.id === refund.saleId);
      const supplier = sale ? store.suppliers.find((s) => s.id === sale.supplierId) : undefined;
      if (supplier) {
        supplier.walletBalance = round3(supplier.walletBalance + refund.supplierRefundAmount);
        store.supplierTransactions.push({
          id: nextId("STX", store.supplierTransactions),
          supplierId: supplier.id,
          date: refund.updatedAt.slice(0, 10),
          type: "refund_credit",
          amount: refund.supplierRefundAmount,
          saleId: refund.saleId,
          balanceAfterWallet: supplier.walletBalance,
          balanceAfterCredit: supplier.toSettle,
          reference: refund.id,
          byUserId,
        });
      }
    }

    appendAudit({
      userId: byUserId,
      module: "refunds",
      entityId: refund.id,
      action: "refund_advance",
      fromStatus,
      toStatus,
      changes: { status: { from: fromStatus, to: toStatus } },
    });
    notifyUsers(
      [refund.responsibleStaffId],
      "refund_update",
      "Refund status updated",
      `Refund ${refund.id} moved to ${toStatus.replace(/_/g, " ")}.`,
      refund.id
    );
    persist();
    return refund;
  },

  async reject(id: string, byUserId: string, notes: string): Promise<Refund> {
    await delay();
    const refund = findOrThrow(id);
    if (refund.status === "paid_to_customer" || refund.status === "rejected") {
      throw new Error(`Cannot reject a refund that is already ${refund.status}.`);
    }
    const fromStatus = refund.status;
    refund.status = "rejected";
    refund.handledById = byUserId;
    refund.notes = notes;
    refund.updatedAt = nowIso();
    appendAudit({
      userId: byUserId,
      module: "refunds",
      entityId: refund.id,
      action: "refund_advance",
      fromStatus,
      toStatus: "rejected",
      changes: { status: { from: fromStatus, to: "rejected" } },
    });
    persist();
    return refund;
  },

  /** Assigns (or clears) which staff member a positive refund charge is billed to. */
  async setChargeToStaff(id: string, staffId: string | null, byUserId: string): Promise<Refund> {
    await delay();
    const refund = findOrThrow(id);
    if (refund.charge <= 0) {
      throw new Error("Only refunds with a positive charge can be assigned to a staff member.");
    }
    const from = refund.chargeToStaffId;
    refund.chargeToStaffId = staffId;
    refund.updatedAt = nowIso();
    appendAudit({
      userId: byUserId,
      module: "refunds",
      entityId: refund.id,
      action: "update",
      changes: { chargeToStaffId: { from, to: staffId } },
    });
    persist();
    return refund;
  },
};
