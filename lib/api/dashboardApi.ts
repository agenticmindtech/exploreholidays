import type { DashboardAggregate, Filters, Role } from "@/lib/types";
import { aggregateDashboard } from "@/lib/logic/aggregate";
import { delay, getStore } from "./client";

export const dashboardApi = {
  async aggregate(filters: Filters, role: Role, userId: string): Promise<DashboardAggregate> {
    await delay();
    const store = getStore();
    const scopedFilters: Filters = role === "staff" ? { ...filters, staffId: userId } : filters;
    const targetMonth = filters.month ?? new Date().toISOString().slice(0, 7);

    const result = aggregateDashboard(store.sales, scopedFilters, {
      users: store.users,
      branches: store.branches,
      serviceTypes: store.serviceTypes,
      receivables: store.receivables,
      suppliers: store.suppliers,
      refunds: store.refunds,
      targets: store.targets.filter((t) => t.month === targetMonth),
      auditLogs: store.auditLogs,
      mistakes: store.mistakes,
      payments: store.payments,
    });

    // aggregateDashboard's receivables/suppliers/refunds/mistakes inputs are always
    // company-wide (those entities have no per-staff owner to scope by), so a staff-role
    // call must have these fields stripped here rather than relying on `sales` scoping —
    // per the permissions matrix, receivables/supplier balances/refunds/mistakes are not
    // staff-visible at all.
    if (role === "staff") {
      result.agingSummary = [];
      result.settlementsDue = [];
      result.totalToSettle = 0;
      result.refundStageCounts = { requested: 0, sent_to_supplier: 0, received_from_supplier: 0, paid_to_customer: 0, rejected: 0 };
      result.refundsAwaitedFromSuppliers = 0;
      result.mistakesSummary = { openCount: 0, openAmount: 0 };
    }

    return result;
  },
};
