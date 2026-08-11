import type { ApiEnvelope, Filters, ServiceType } from "@/lib/types";
import { applyFilters } from "@/lib/logic/filters";
import { delay, getStore, nextId, persist } from "./client";
import { appendAudit, diffChanges } from "./_shared";

export interface CreateServiceTypeInput {
  name: string;
  kind: ServiceType["kind"];
  icon: string;
  color: string;
  requiresPnr: boolean;
}

function findOrThrow(id: string): ServiceType {
  const service = getStore().serviceTypes.find((s) => s.id === id);
  if (!service) throw new Error(`Service type not found: ${id}`);
  return service;
}

export const servicesApi = {
  async list(filters: Filters = {}): Promise<ApiEnvelope<ServiceType>> {
    await delay();
    return applyFilters(getStore().serviceTypes, filters, (row) => row.name);
  },

  async get(id: string): Promise<ServiceType> {
    await delay();
    return findOrThrow(id);
  },

  async create(data: CreateServiceTypeInput, byUserId: string): Promise<ServiceType> {
    await delay();
    const store = getStore();
    const service: ServiceType = {
      id: nextId("SRV", store.serviceTypes, 3),
      name: data.name,
      kind: data.kind,
      icon: data.icon,
      color: data.color,
      requiresPnr: data.requiresPnr,
      isActive: true,
    };
    store.serviceTypes.push(service);
    appendAudit({ userId: byUserId, module: "services", entityId: service.id, action: "create" });
    persist();
    return service;
  },

  async update(id: string, data: Partial<CreateServiceTypeInput> & { isActive?: boolean }, byUserId: string): Promise<ServiceType> {
    await delay();
    const service = findOrThrow(id);
    const before = { ...service };
    Object.assign(service, data);
    appendAudit({
      userId: byUserId,
      module: "services",
      entityId: service.id,
      action: "update",
      changes: diffChanges(before, service, Object.keys(data) as (keyof ServiceType)[]),
    });
    persist();
    return service;
  },

  async delete(id: string, byUserId: string): Promise<void> {
    await delay();
    const store = getStore();
    findOrThrow(id);
    store.serviceTypes = store.serviceTypes.filter((s) => s.id !== id);
    appendAudit({ userId: byUserId, module: "services", entityId: id, action: "delete" });
    persist();
  },
};
