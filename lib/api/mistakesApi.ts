import type { ApiEnvelope, Filters, Mistake, MistakeStatus } from "@/lib/types";
import { applyFilters } from "@/lib/logic/filters";
import { round3 } from "@/lib/logic/money";
import { delay, getStore, nextId, persist } from "./client";
import { appendAudit } from "./_shared";

export interface CreateMistakeInput {
  staffId: string;
  saleId?: string | null;
  date: string;
  description: string;
  amount: number;
}

function findOrThrow(id: string): Mistake {
  const mistake = getStore().mistakes.find((m) => m.id === id);
  if (!mistake) throw new Error(`Mistake not found: ${id}`);
  return mistake;
}

export const mistakesApi = {
  async list(filters: Filters = {}): Promise<ApiEnvelope<Mistake>> {
    await delay();
    return applyFilters(getStore().mistakes, filters);
  },

  async get(id: string): Promise<Mistake> {
    await delay();
    return findOrThrow(id);
  },

  async create(data: CreateMistakeInput, byUserId: string): Promise<Mistake> {
    await delay();
    const store = getStore();
    const mistake: Mistake = {
      id: nextId("MST", store.mistakes),
      staffId: data.staffId,
      saleId: data.saleId ?? null,
      date: data.date,
      description: data.description,
      amount: round3(data.amount),
      status: "reported",
      recoveredAmount: 0,
      reportedById: byUserId,
      notes: null,
    };
    store.mistakes.push(mistake);
    appendAudit({ userId: byUserId, module: "mistakes", entityId: mistake.id, action: "create" });
    persist();
    return mistake;
  },

  async updateStatus(id: string, status: MistakeStatus, byUserId: string, recoveredAmount?: number): Promise<Mistake> {
    await delay();
    const mistake = findOrThrow(id);
    const fromStatus = mistake.status;
    mistake.status = status;
    if (typeof recoveredAmount === "number") {
      if (recoveredAmount > mistake.amount) throw new Error("Recovered amount cannot exceed the mistake amount.");
      mistake.recoveredAmount = round3(recoveredAmount);
    }
    appendAudit({
      userId: byUserId,
      module: "mistakes",
      entityId: mistake.id,
      action: "update",
      fromStatus,
      toStatus: status,
      changes: { status: { from: fromStatus, to: status } },
    });
    persist();
    return mistake;
  },
};
