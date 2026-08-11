import type { ApiEnvelope, Filters, StaffLoan } from "@/lib/types";
import { applyFilters } from "@/lib/logic/filters";
import { round3 } from "@/lib/logic/money";
import { delay, getStore, nextId, persist } from "./client";
import { appendAudit } from "./_shared";

export interface CreateLoanInput {
  staffId: string;
  amount: number;
  reason: string;
  issueDate: string;
  installmentAmount: number;
  installmentsTotal: number;
  deductFromSalary: boolean;
}

function findOrThrow(id: string): StaffLoan {
  const loan = getStore().staffLoans.find((l) => l.id === id);
  if (!loan) throw new Error(`Staff loan not found: ${id}`);
  return loan;
}

export const loansApi = {
  async list(filters: Filters = {}): Promise<ApiEnvelope<StaffLoan>> {
    await delay();
    return applyFilters(getStore().staffLoans, filters);
  },

  async get(id: string): Promise<StaffLoan> {
    await delay();
    return findOrThrow(id);
  },

  async create(data: CreateLoanInput, byUserId: string): Promise<StaffLoan> {
    await delay();
    const store = getStore();
    const loan: StaffLoan = {
      id: nextId("LON", store.staffLoans),
      staffId: data.staffId,
      amount: round3(data.amount),
      reason: data.reason,
      issueDate: data.issueDate,
      installmentAmount: round3(data.installmentAmount),
      installmentsTotal: data.installmentsTotal,
      installmentsPaid: 0,
      remaining: round3(data.amount),
      deductFromSalary: data.deductFromSalary,
      status: "active",
      approvedById: byUserId,
      history: [],
    };
    store.staffLoans.push(loan);
    appendAudit({ userId: byUserId, module: "loans", entityId: loan.id, action: "loan" });
    persist();
    return loan;
  },

  async recordInstallment(id: string, amount: number, date: string, byUserId: string): Promise<StaffLoan> {
    await delay();
    const loan = findOrThrow(id);
    if (loan.status !== "active") throw new Error(`Cannot record an installment on a ${loan.status} loan.`);
    if (amount > loan.remaining) throw new Error(`Installment exceeds remaining balance of ${loan.remaining}.`);

    loan.history.push({ date, amount: round3(amount) });
    loan.installmentsPaid += 1;
    loan.remaining = round3(loan.remaining - amount);
    if (loan.remaining <= 0) loan.status = "completed";

    appendAudit({ userId: byUserId, module: "loans", entityId: loan.id, action: "installment" });
    persist();
    return loan;
  },

  async markDefaulted(id: string, byUserId: string): Promise<StaffLoan> {
    await delay();
    const loan = findOrThrow(id);
    loan.status = "defaulted";
    appendAudit({ userId: byUserId, module: "loans", entityId: loan.id, action: "update", changes: { status: { from: "active", to: "defaulted" } } });
    persist();
    return loan;
  },
};
