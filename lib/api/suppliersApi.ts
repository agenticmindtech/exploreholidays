import type { ApiEnvelope, Filters, Supplier, SupplierTransaction } from "@/lib/types";
import { applyFilters } from "@/lib/logic/filters";
import { round3 } from "@/lib/logic/money";
import { delay, getStore, nextId, persist } from "./client";
import { appendAudit, diffChanges } from "./_shared";

export interface CreateSupplierInput {
  name: string;
  code: string;
  type: Supplier["type"];
  contactPerson: string;
  phone: string;
  email: string;
  creditLimit: number;
  settlementCycle: Supplier["settlementCycle"];
  currency?: string;
}

function findOrThrow(id: string): Supplier {
  const supplier = getStore().suppliers.find((s) => s.id === id);
  if (!supplier) throw new Error(`Supplier not found: ${id}`);
  return supplier;
}

export const suppliersApi = {
  async list(filters: Filters = {}): Promise<ApiEnvelope<Supplier>> {
    await delay();
    return applyFilters(getStore().suppliers, filters, (row) => row.name);
  },

  async get(id: string): Promise<Supplier> {
    await delay();
    return findOrThrow(id);
  },

  async create(data: CreateSupplierInput, byUserId: string): Promise<Supplier> {
    await delay();
    const store = getStore();
    const supplier: Supplier = {
      id: nextId("SUP", store.suppliers, 3),
      name: data.name,
      code: data.code,
      type: data.type,
      contactPerson: data.contactPerson,
      phone: data.phone,
      email: data.email,
      creditLimit: data.creditLimit,
      walletBalance: 0,
      usedCredit: 0,
      toSettle: 0,
      settlementCycle: data.settlementCycle,
      currency: data.currency ?? "BHD",
      isActive: true,
    };
    store.suppliers.push(supplier);
    appendAudit({ userId: byUserId, module: "suppliers", entityId: supplier.id, action: "create" });
    persist();
    return supplier;
  },

  async update(id: string, data: Partial<CreateSupplierInput> & { isActive?: boolean }, byUserId: string): Promise<Supplier> {
    await delay();
    const supplier = findOrThrow(id);
    const before = { ...supplier };
    Object.assign(supplier, data);
    appendAudit({
      userId: byUserId,
      module: "suppliers",
      entityId: supplier.id,
      action: "update",
      changes: diffChanges(before, supplier, Object.keys(data) as (keyof Supplier)[]),
    });
    persist();
    return supplier;
  },

  async topUp(id: string, amount: number, byUserId: string, reference?: string, date?: string): Promise<Supplier> {
    await delay();
    const store = getStore();
    const supplier = findOrThrow(id);
    supplier.walletBalance = round3(supplier.walletBalance + amount);
    store.supplierTransactions.push({
      id: nextId("STX", store.supplierTransactions),
      supplierId: supplier.id,
      date: date ?? new Date().toISOString().slice(0, 10),
      type: "topup",
      amount: round3(amount),
      saleId: null,
      balanceAfterWallet: supplier.walletBalance,
      balanceAfterCredit: supplier.toSettle,
      reference: reference ?? null,
      byUserId,
    });
    appendAudit({ userId: byUserId, module: "suppliers", entityId: supplier.id, action: "topup" });
    persist();
    return supplier;
  },

  async settle(id: string, amount: number, byUserId: string, reference?: string, date?: string): Promise<Supplier> {
    await delay();
    const store = getStore();
    const supplier = findOrThrow(id);
    if (amount > supplier.toSettle) {
      throw new Error(`Settlement amount exceeds outstanding balance of ${supplier.toSettle}.`);
    }
    supplier.toSettle = round3(supplier.toSettle - amount);
    supplier.usedCredit = supplier.toSettle;
    store.supplierTransactions.push({
      id: nextId("STX", store.supplierTransactions),
      supplierId: supplier.id,
      date: date ?? new Date().toISOString().slice(0, 10),
      type: "settlement",
      amount: round3(amount),
      saleId: null,
      balanceAfterWallet: supplier.walletBalance,
      balanceAfterCredit: supplier.toSettle,
      reference: reference ?? null,
      byUserId,
    });
    appendAudit({ userId: byUserId, module: "suppliers", entityId: supplier.id, action: "settlement" });
    persist();
    return supplier;
  },

  async delete(id: string, byUserId: string): Promise<void> {
    await delay();
    const store = getStore();
    findOrThrow(id);
    store.suppliers = store.suppliers.filter((s) => s.id !== id);
    appendAudit({ userId: byUserId, module: "suppliers", entityId: id, action: "delete" });
    persist();
  },

  /** Ledger for one supplier, chronological, each row already carrying its running balances. */
  async listTransactions(supplierId: string, filters: { dateFrom?: string; dateTo?: string } = {}): Promise<SupplierTransaction[]> {
    await delay();
    let rows = getStore().supplierTransactions.filter((t) => t.supplierId === supplierId);
    if (filters.dateFrom) rows = rows.filter((t) => t.date >= filters.dateFrom!);
    if (filters.dateTo) rows = rows.filter((t) => t.date <= filters.dateTo!);
    return [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  },
};
