import type { ApiEnvelope, Filters, Role, SessionUser } from "@/lib/types";
import { applyFilters } from "@/lib/logic/filters";
import { delay, getStore, nextId, nowIso, persist, toSessionUser } from "./client";
import { appendAudit, diffChanges } from "./_shared";

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  branchId: string;
  phone: string;
  designation: string;
  commissionPercent?: number;
}

function findOrThrow(id: string) {
  const user = getStore().users.find((u) => u.id === id);
  if (!user) throw new Error(`User not found: ${id}`);
  return user;
}

export const usersApi = {
  async list(filters: Filters = {}): Promise<ApiEnvelope<SessionUser>> {
    await delay();
    return applyFilters(getStore().users.map(toSessionUser), filters, (row) => row.name);
  },

  async get(id: string): Promise<SessionUser> {
    await delay();
    return toSessionUser(findOrThrow(id));
  },

  async create(data: CreateUserInput, byUserId: string): Promise<SessionUser> {
    await delay();
    const store = getStore();
    if (store.users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
      throw new Error(`A user with email ${data.email} already exists.`);
    }
    const user = {
      id: nextId("USR", store.users, 3),
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      branchId: data.branchId,
      phone: data.phone,
      avatar: null,
      designation: data.designation,
      joinDate: nowIso().slice(0, 10),
      isActive: true,
      commissionPercent: data.commissionPercent ?? 0,
      lastLoginAt: null,
      createdAt: nowIso(),
    };
    store.users.push(user);
    appendAudit({ userId: byUserId, module: "users", entityId: user.id, action: "create" });
    persist();
    return toSessionUser(user);
  },

  async update(id: string, data: Partial<Omit<CreateUserInput, "password">> & { isActive?: boolean }, byUserId: string): Promise<SessionUser> {
    await delay();
    const user = findOrThrow(id);
    const before = { ...user };
    Object.assign(user, data);
    appendAudit({
      userId: byUserId,
      module: "users",
      entityId: user.id,
      action: "update",
      changes: diffChanges(before, user, Object.keys(data) as (keyof typeof user)[]),
    });
    persist();
    return toSessionUser(user);
  },

  async resetPassword(id: string, newPassword: string, byUserId: string): Promise<void> {
    await delay();
    const user = findOrThrow(id);
    user.password = newPassword;
    appendAudit({ userId: byUserId, module: "users", entityId: user.id, action: "update", note: "Password reset" });
    persist();
  },

  async delete(id: string, byUserId: string): Promise<void> {
    await delay();
    const store = getStore();
    findOrThrow(id);
    store.users = store.users.filter((u) => u.id !== id);
    appendAudit({ userId: byUserId, module: "users", entityId: id, action: "delete" });
    persist();
  },

  async toggleActive(id: string, byUserId: string): Promise<SessionUser> {
    await delay();
    const user = findOrThrow(id);
    user.isActive = !user.isActive;
    appendAudit({
      userId: byUserId,
      module: "users",
      entityId: user.id,
      action: "update",
      changes: { isActive: { from: !user.isActive, to: user.isActive } },
    });
    persist();
    return toSessionUser(user);
  },
};
