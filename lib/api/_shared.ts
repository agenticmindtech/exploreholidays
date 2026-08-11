import type { AuditAction, AuditModule, FieldChange, NotificationType, Role, SaleStatus } from "@/lib/types";
import { getStore, nextId, nowIso } from "./client";

export function getUser(userId: string) {
  const user = getStore().users.find((u) => u.id === userId);
  if (!user) throw new Error(`Unknown user: ${userId}`);
  return user;
}

export function usersByRole(role: Role) {
  return getStore().users.filter((u) => u.role === role).map((u) => u.id);
}

export function appendAudit(params: {
  userId: string;
  module: AuditModule;
  entityId: string;
  action: AuditAction;
  fromStatus?: SaleStatus | string | null;
  toStatus?: SaleStatus | string | null;
  changes?: Record<string, FieldChange> | null;
  note?: string | null;
}) {
  const store = getStore();
  const user = getUser(params.userId);
  store.auditLogs.push({
    id: nextId("AUD", store.auditLogs),
    timestamp: nowIso(),
    userId: user.id,
    userName: user.name,
    role: user.role,
    module: params.module,
    entityId: params.entityId,
    action: params.action,
    fromStatus: params.fromStatus ?? null,
    toStatus: params.toStatus ?? null,
    changes: params.changes ?? null,
    ip: null,
    note: params.note ?? null,
  });
}

export function notifyUsers(userIds: string[], type: NotificationType, title: string, body: string, entityId: string | null) {
  const store = getStore();
  for (const toUserId of userIds) {
    store.notifications.push({
      id: nextId("NTF", store.notifications),
      toUserId,
      type,
      title,
      body,
      entityId,
      isRead: false,
      createdAt: nowIso(),
    });
  }
}

export function diffChanges<T extends object>(before: T, after: T, keys: (keyof T)[]): Record<string, FieldChange> | null {
  const changes: Record<string, FieldChange> = {};
  for (const key of keys) {
    if (before[key] !== after[key]) {
      changes[key as string] = { from: before[key], to: after[key] };
    }
  }
  return Object.keys(changes).length ? changes : null;
}
