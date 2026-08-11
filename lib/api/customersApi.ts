import type { ApiEnvelope, Customer, Filters } from "@/lib/types";
import { applyFilters } from "@/lib/logic/filters";
import { delay, getStore, nextId, nowIso, persist } from "./client";
import { appendAudit, diffChanges } from "./_shared";

export interface CreateCustomerInput {
  name: string;
  phone: string;
  email?: string | null;
  nationality?: string | null;
  passportNo?: string | null;
  type: Customer["type"];
  companyName?: string | null;
}

function findOrThrow(id: string): Customer {
  const customer = getStore().customers.find((c) => c.id === id);
  if (!customer) throw new Error(`Customer not found: ${id}`);
  return customer;
}

export const customersApi = {
  async list(filters: Filters = {}): Promise<ApiEnvelope<Customer>> {
    await delay();
    return applyFilters(getStore().customers, filters, (row) => row.name);
  },

  async get(id: string): Promise<Customer> {
    await delay();
    return findOrThrow(id);
  },

  async create(data: CreateCustomerInput, byUserId: string): Promise<Customer> {
    await delay();
    const store = getStore();
    const customer: Customer = {
      id: nextId("CUS", store.customers, 3),
      name: data.name,
      phone: data.phone,
      email: data.email ?? null,
      nationality: data.nationality ?? null,
      passportNo: data.passportNo ?? null,
      type: data.type,
      companyName: data.companyName ?? null,
      totalPurchases: 0,
      outstanding: 0,
      createdAt: nowIso(),
    };
    store.customers.push(customer);
    appendAudit({ userId: byUserId, module: "customers", entityId: customer.id, action: "create" });
    persist();
    return customer;
  },

  async update(id: string, data: Partial<CreateCustomerInput>, byUserId: string): Promise<Customer> {
    await delay();
    const customer = findOrThrow(id);
    const before = { ...customer };
    Object.assign(customer, data);
    appendAudit({
      userId: byUserId,
      module: "customers",
      entityId: customer.id,
      action: "update",
      changes: diffChanges(before, customer, Object.keys(data) as (keyof Customer)[]),
    });
    persist();
    return customer;
  },

  async delete(id: string, byUserId: string): Promise<void> {
    await delay();
    const store = getStore();
    findOrThrow(id);
    store.customers = store.customers.filter((c) => c.id !== id);
    appendAudit({ userId: byUserId, module: "customers", entityId: id, action: "delete" });
    persist();
  },
};
