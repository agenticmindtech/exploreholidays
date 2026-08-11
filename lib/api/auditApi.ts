import type { AuditAction, AuditLog, AuditModule } from "@/lib/types";
import { delay, getStore } from "./client";

export interface AuditLogFilters {
  userId?: string;
  module?: AuditModule;
  action?: AuditAction;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  /** Restricts results to one of these modules — used to scope the Accounts role to its own module (per the permissions matrix), independent of the single `module` filter the UI dropdown drives. */
  modules?: AuditModule[];
}

export interface AuditLogEnvelope {
  rows: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

export const auditApi = {
  /** Read-only, newest first, 25/page by default. */
  async list(filters: AuditLogFilters = {}): Promise<AuditLogEnvelope> {
    await delay();
    const search = filters.search?.trim().toLowerCase();

    const matched = getStore()
      .auditLogs.filter((log) => {
        if (filters.userId && log.userId !== filters.userId) return false;
        if (filters.modules && !filters.modules.includes(log.module)) return false;
        if (filters.module && log.module !== filters.module) return false;
        if (filters.action && log.action !== filters.action) return false;
        if (filters.dateFrom && log.timestamp.slice(0, 10) < filters.dateFrom) return false;
        if (filters.dateTo && log.timestamp.slice(0, 10) > filters.dateTo) return false;
        if (search && !log.entityId.toLowerCase().includes(search)) return false;
        return true;
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 25;
    const start = (page - 1) * pageSize;

    return { rows: matched.slice(start, start + pageSize), total: matched.length, page, pageSize };
  },
};
