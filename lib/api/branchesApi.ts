import type { ApiEnvelope, Branch, Filters } from "@/lib/types";
import { applyFilters } from "@/lib/logic/filters";
import { delay, getStore, nextId, persist } from "./client";
import { appendAudit, diffChanges } from "./_shared";

export interface CreateBranchInput {
  name: string;
  code: string;
  address: string;
  phone: string;
  managerId?: string | null;
  color: string;
}

function findOrThrow(id: string): Branch {
  const branch = getStore().branches.find((b) => b.id === id);
  if (!branch) throw new Error(`Branch not found: ${id}`);
  return branch;
}

export const branchesApi = {
  async list(filters: Filters = {}): Promise<ApiEnvelope<Branch>> {
    await delay();
    return applyFilters(getStore().branches, filters, (row) => row.name);
  },

  async get(id: string): Promise<Branch> {
    await delay();
    return findOrThrow(id);
  },

  async create(data: CreateBranchInput, byUserId: string): Promise<Branch> {
    await delay();
    const store = getStore();
    const branch: Branch = {
      id: nextId("BR", store.branches, 3),
      name: data.name,
      code: data.code,
      address: data.address,
      phone: data.phone,
      managerId: data.managerId ?? null,
      isActive: true,
      color: data.color,
    };
    store.branches.push(branch);
    appendAudit({ userId: byUserId, module: "branches", entityId: branch.id, action: "create" });
    persist();
    return branch;
  },

  async update(id: string, data: Partial<CreateBranchInput> & { isActive?: boolean }, byUserId: string): Promise<Branch> {
    await delay();
    const branch = findOrThrow(id);
    const before = { ...branch };
    Object.assign(branch, data);
    appendAudit({
      userId: byUserId,
      module: "branches",
      entityId: branch.id,
      action: "update",
      changes: diffChanges(before, branch, Object.keys(data) as (keyof Branch)[]),
    });
    persist();
    return branch;
  },

  async delete(id: string, byUserId: string): Promise<void> {
    await delay();
    const store = getStore();
    findOrThrow(id);
    store.branches = store.branches.filter((b) => b.id !== id);
    appendAudit({ userId: byUserId, module: "branches", entityId: id, action: "delete" });
    persist();
  },
};
