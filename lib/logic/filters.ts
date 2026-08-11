import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
} from "date-fns";
import type { ApiEnvelope, Filters } from "@/lib/types";
import { round3 } from "./money";

export interface FilterableRow {
  id: string;
  transactionDate?: string;
  branchId?: string;
  staffId?: string;
  supplierId?: string;
  serviceTypeId?: string;
  customerId?: string | null;
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  bookingNo?: string;
  destination?: string;
  description?: string;
  /** Customer/supplier rows carry this — folded into the same `search` haystack as bookingNo/destination/name. */
  phone?: string;
  sellingPrice?: number;
  netCost?: number;
  profit?: number;
}

export function resolveDateRange(filters: Pick<Filters, "preset" | "dateFrom" | "dateTo">, asOf: Date = new Date()): {
  from: Date | null;
  to: Date | null;
} {
  if (filters.preset) {
    switch (filters.preset) {
      case "today":
        return { from: startOfDay(asOf), to: endOfDay(asOf) };
      case "week":
        return { from: startOfWeek(asOf, { weekStartsOn: 1 }), to: endOfWeek(asOf, { weekStartsOn: 1 }) };
      case "month":
        return { from: startOfMonth(asOf), to: endOfMonth(asOf) };
      case "quarter":
        return { from: startOfQuarter(asOf), to: endOfQuarter(asOf) };
      case "year":
        return { from: startOfYear(asOf), to: endOfYear(asOf) };
      default:
        break;
    }
  }

  const from = filters.dateFrom ? startOfDay(new Date(filters.dateFrom)) : null;
  const to = filters.dateTo ? endOfDay(new Date(filters.dateTo)) : null;
  return { from, to };
}

export function applyFilters<T extends FilterableRow>(
  rows: T[],
  filters: Filters,
  getCustomerName?: (row: T) => string | undefined
): ApiEnvelope<T> {
  const { from, to } = resolveDateRange(filters);
  const search = filters.search?.trim().toLowerCase();

  const matched = rows.filter((row) => {
    if (from || to) {
      if (!row.transactionDate) return false;
      const rowDate = new Date(row.transactionDate);
      if (from && rowDate < from) return false;
      if (to && rowDate > to) return false;
    }
    if (filters.branchId && row.branchId !== filters.branchId) return false;
    if (filters.staffId && row.staffId !== filters.staffId) return false;
    if (filters.supplierId && row.supplierId !== filters.supplierId) return false;
    if (filters.serviceTypeId && row.serviceTypeId !== filters.serviceTypeId) return false;
    if (filters.customerId && row.customerId !== filters.customerId) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (filters.paymentMethod && row.paymentMethod !== filters.paymentMethod) return false;
    if (filters.paymentStatus && row.paymentStatus !== filters.paymentStatus) return false;

    if (search) {
      const customerName = getCustomerName?.(row)?.toLowerCase() ?? "";
      const haystacks = [row.bookingNo, row.destination, row.description, row.phone, customerName]
        .filter((v): v is string => Boolean(v))
        .map((v) => v.toLowerCase());
      if (!haystacks.some((h) => h.includes(search))) return false;
    }

    return true;
  });

  const summary = matched.reduce(
    (acc, row) => {
      acc.count += 1;
      acc.revenue += row.sellingPrice ?? 0;
      acc.cost += row.netCost ?? 0;
      acc.profit += row.profit ?? 0;
      return acc;
    },
    { count: 0, revenue: 0, cost: 0, profit: 0 }
  );
  summary.revenue = round3(summary.revenue);
  summary.cost = round3(summary.cost);
  summary.profit = round3(summary.profit);

  let sorted = matched;
  if (filters.sortBy) {
    const dir = filters.sortDir === "desc" ? -1 : 1;
    const key = filters.sortBy as keyof T;
    sorted = [...matched].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av == null && bv == null) return 0;
      if (av == null) return dir;
      if (bv == null) return -dir;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 10;
  const total = sorted.length;
  const start = (page - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);

  return { rows: pageRows, total, page, pageSize, summary };
}
