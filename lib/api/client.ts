import type {
  AppNotification,
  AuditLog,
  Branch,
  Customer,
  Mistake,
  Payment,
  Receivable,
  Refund,
  Sale,
  ServiceType,
  Settings,
  SessionUser,
  StaffLoan,
  Supplier,
  SupplierTransaction,
  Target,
  User,
} from "@/lib/types";

import usersSeed from "@/data/users.json";
import branchesSeed from "@/data/branches.json";
import suppliersSeed from "@/data/suppliers.json";
import serviceTypesSeed from "@/data/serviceTypes.json";
import customersSeed from "@/data/customers.json";
import salesSeed from "@/data/sales.json";
import paymentsSeed from "@/data/payments.json";
import refundsSeed from "@/data/refunds.json";
import receivablesSeed from "@/data/receivables.json";
import staffLoansSeed from "@/data/staffLoans.json";
import supplierTransactionsSeed from "@/data/supplierTransactions.json";
import mistakesSeed from "@/data/mistakes.json";
import auditLogsSeed from "@/data/auditLogs.json";
import notificationsSeed from "@/data/notifications.json";
import targetsSeed from "@/data/targets.json";
import settingsSeed from "@/data/settings.json";

export interface Store {
  users: User[];
  branches: Branch[];
  suppliers: Supplier[];
  serviceTypes: ServiceType[];
  customers: Customer[];
  sales: Sale[];
  payments: Payment[];
  refunds: Refund[];
  receivables: Receivable[];
  staffLoans: StaffLoan[];
  supplierTransactions: SupplierTransaction[];
  mistakes: Mistake[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
  targets: Target[];
  settings: Settings;
}

const DB_KEY = "td-db";

function seedStore(): Store {
  return structuredClone({
    users: usersSeed,
    branches: branchesSeed,
    suppliers: suppliersSeed,
    serviceTypes: serviceTypesSeed,
    customers: customersSeed,
    sales: salesSeed,
    payments: paymentsSeed,
    refunds: refundsSeed,
    receivables: receivablesSeed,
    staffLoans: staffLoansSeed,
    supplierTransactions: supplierTransactionsSeed,
    mistakes: mistakesSeed,
    auditLogs: auditLogsSeed,
    notifications: notificationsSeed,
    targets: targetsSeed,
    settings: settingsSeed,
  }) as Store;
}

function loadStore(): Store {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(DB_KEY);
      if (raw) return JSON.parse(raw) as Store;
    } catch {
      // corrupted/unavailable storage — fall back to seed
    }
  }
  return seedStore();
}

let storeInstance: Store | null = null;

export function getStore(): Store {
  if (!storeInstance) {
    storeInstance = loadStore();
  }
  return storeInstance;
}

export function persist(): void {
  if (typeof window === "undefined" || !storeInstance) return;
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(storeInstance));
  } catch {
    // storage unavailable (private mode / quota) — in-memory state still works this session
  }
}

export function resetDemoData(): void {
  storeInstance = seedStore();
  persist();
}

export function delay(): Promise<void> {
  const ms = 300 + Math.random() * 300;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function nextId(prefix: string, rows: { id: string }[], width = 4): string {
  const numbers = rows
    .map((r) => r.id)
    .filter((id) => id.startsWith(`${prefix}-`))
    .map((id) => parseInt(id.split("-").pop() ?? "0", 10))
    .filter((n) => !Number.isNaN(n));
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `${prefix}-${String(next).padStart(width, "0")}`;
}

export function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branchId: user.branchId,
    phone: user.phone,
    avatar: user.avatar,
    designation: user.designation,
    joinDate: user.joinDate,
    isActive: user.isActive,
    commissionPercent: user.commissionPercent,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export function nowIso(): string {
  return new Date().toISOString();
}
