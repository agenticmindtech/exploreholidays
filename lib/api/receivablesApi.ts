import type { ApiEnvelope, Filters, PaymentMethod, Receivable } from "@/lib/types";
import { applyFilters } from "@/lib/logic/filters";
import { agingBucket, agingDays } from "@/lib/logic/aging";
import { round3 } from "@/lib/logic/money";
import { delay, getStore, nextId, nowIso, persist } from "./client";
import { appendAudit, notifyUsers } from "./_shared";

function findOrThrow(id: string): Receivable {
  const receivable = getStore().receivables.find((r) => r.id === id);
  if (!receivable) throw new Error(`Receivable not found: ${id}`);
  return receivable;
}

export const receivablesApi = {
  async list(filters: Filters = {}): Promise<ApiEnvelope<Receivable>> {
    await delay();
    const store = getStore();
    // Refresh aging snapshot on every read so buckets stay accurate over time.
    for (const r of store.receivables) {
      if (r.state === "settled" || r.state === "written_off") continue;
      const days = agingDays(r.dueDate);
      r.agingDays = days;
      r.agingBucket = agingBucket(days);
    }
    return applyFilters(store.receivables, filters);
  },

  async get(id: string): Promise<Receivable> {
    await delay();
    return findOrThrow(id);
  },

  async recordPayment(id: string, amount: number, method: PaymentMethod, date: string, byUserId: string, reference: string | null = null): Promise<Receivable> {
    await delay();
    const store = getStore();
    const receivable = findOrThrow(id);

    if (amount <= 0) throw new Error("Payment amount must be greater than 0.");
    if (amount > receivable.balance) throw new Error(`Payment exceeds outstanding balance of ${receivable.balance}.`);

    store.payments.push({
      id: nextId("PAY", store.payments),
      saleId: receivable.saleId,
      date,
      method,
      amount: round3(amount),
      reference,
      receivedById: byUserId,
      note: `Receivable ${receivable.id} payment`,
      createdAt: nowIso(),
    });

    receivable.paidAmount = round3(receivable.paidAmount + amount);
    receivable.balance = round3(receivable.originalAmount - receivable.paidAmount);
    receivable.state = receivable.balance <= 0 ? "settled" : "partial";
    receivable.installments.push({
      no: receivable.installments.length + 1,
      dueDate: date,
      amount: round3(amount),
      paidOn: date,
    });

    if (receivable.type === "customer") {
      const customer = store.customers.find((c) => c.id === receivable.partyId);
      if (customer) {
        const openBalance = store.receivables
          .filter((r) => r.type === "customer" && r.partyId === customer.id && r.state !== "settled" && r.state !== "written_off")
          .reduce((sum, r) => sum + r.balance, 0);
        customer.outstanding = round3(openBalance);
      }
    }

    appendAudit({
      userId: byUserId,
      module: "receivables",
      entityId: receivable.id,
      action: "payment",
      changes: { balance: { from: round3(receivable.balance + amount), to: receivable.balance } },
    });
    // partyId is a real userId only for staff-type receivables (loans/advances) — customer-type
    // receivables carry a customerId there, and customers are never Users who could receive a
    // notification. For those, notify the sale's own staff instead so the update still reaches
    // someone who can act on it.
    const notifyTargetId =
      receivable.type === "staff"
        ? receivable.partyId
        : store.sales.find((s) => s.id === receivable.saleId)?.staffId;
    if (notifyTargetId) {
      notifyUsers([notifyTargetId], "payment_received", "Payment recorded", `A payment of ${amount} was recorded against ${receivable.id}.`, receivable.id);
    }
    persist();
    return receivable;
  },

  async writeOff(id: string, byUserId: string): Promise<Receivable> {
    await delay();
    const receivable = findOrThrow(id);
    receivable.state = "written_off";
    appendAudit({ userId: byUserId, module: "receivables", entityId: receivable.id, action: "update", changes: { state: { from: "open", to: "written_off" } } });
    persist();
    return receivable;
  },
};
