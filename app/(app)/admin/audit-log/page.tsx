"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileEdit,
  History,
  HandCoins,
  LogIn,
  Pencil,
  RotateCcw,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  Undo2,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import Input from "@/components/ui/Input";
import Avatar from "@/components/ui/Avatar";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import AuditDiff from "@/components/admin/AuditDiff";
import { auditApi, type AuditLogFilters } from "@/lib/api/auditApi";
import { usersApi } from "@/lib/api/usersApi";
import { useAuthStore } from "@/lib/stores/authStore";
import { ROLE_META } from "@/lib/constants/display";
import { AUDIT_ACTIONS, AUDIT_MODULES } from "@/lib/constants/enums";
import type { AuditAction, AuditLog, AuditModule, Role, SessionUser } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";

const ROLE_PILL_CLASS: Record<Role, string> = {
  admin: "bg-secondary-100 text-secondary-700",
  manager: "bg-primary-100 text-primary-700",
  accounts: "bg-accent-100 text-accent-700",
  staff: "bg-info-100 text-info-700",
};

const ACTION_META: Record<AuditAction, { icon: LucideIcon; tone: string; label: string }> = {
  create: { icon: FileEdit, tone: "bg-info-50 text-info-600", label: "Created" },
  update: { icon: Pencil, tone: "bg-subtle text-inkSoft", label: "Updated" },
  submit: { icon: Send, tone: "bg-primary-50 text-primary-600", label: "Submitted" },
  verify: { icon: ShieldCheck, tone: "bg-status-verified/10 text-status-verified", label: "Verified" },
  return: { icon: Undo2, tone: "bg-warning-50 text-warning-700", label: "Returned" },
  post: { icon: ShieldCheck, tone: "bg-success-50 text-success-600", label: "Posted" },
  cancel: { icon: XCircle, tone: "bg-danger-50 text-danger-600", label: "Cancelled" },
  delete: { icon: Trash2, tone: "bg-danger-50 text-danger-600", label: "Deleted" },
  payment: { icon: Banknote, tone: "bg-success-50 text-success-600", label: "Payment" },
  refund_advance: { icon: RotateCcw, tone: "bg-accent-50 text-accent-700", label: "Refund advanced" },
  topup: { icon: Wallet, tone: "bg-success-50 text-success-600", label: "Top-up" },
  settlement: { icon: CreditCard, tone: "bg-primary-50 text-primary-600", label: "Settlement" },
  loan: { icon: HandCoins, tone: "bg-accent-50 text-accent-700", label: "Loan" },
  installment: { icon: HandCoins, tone: "bg-info-50 text-info-600", label: "Installment" },
  login: { icon: LogIn, tone: "bg-subtle text-inkSoft", label: "Login" },
  settings: { icon: Settings, tone: "bg-subtle text-inkSoft", label: "Settings" },
};

const MODULE_LABEL: Record<AuditModule, string> = {
  sales: "Sales",
  payments: "Payments",
  refunds: "Refunds",
  receivables: "Receivables",
  suppliers: "Suppliers",
  loans: "Loans",
  mistakes: "Mistakes",
  users: "Users",
  branches: "Branches",
  services: "Services",
  customers: "Customers",
  targets: "Targets",
  settings: "Settings",
  auth: "Auth",
};

const SALE_ID_PATTERN = /^SAL-/;
const PAGE_SIZE = 25;

// Accounts sees the finance story they actually work in (per the permissions matrix'
// "own module" grant) — everything except the admin-only master-data/settings modules.
const ACCOUNTS_MODULES: AuditModule[] = ["sales", "payments", "refunds", "receivables", "suppliers", "loans", "mistakes"];

export default function AuditLogPage() {
  const user = useAuthStore((s) => s.user);
  const isScopedToOwnModules = user?.role === "accounts";
  const visibleModules = isScopedToOwnModules ? ACCOUNTS_MODULES : AUDIT_MODULES;

  const [users, setUsers] = useState<SessionUser[]>([]);
  const [filters, setFilters] = useState<AuditLogFilters>({ page: 1, pageSize: PAGE_SIZE });
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    usersApi.list({ pageSize: 200 }).then((e) => setUsers(e.rows));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });
    const scoped: AuditLogFilters = isScopedToOwnModules ? { ...filters, modules: ACCOUNTS_MODULES } : filters;
    auditApi.list(scoped).then((envelope) => {
      if (cancelled) return;
      setLogs(envelope.rows);
      setTotal(envelope.total);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [filters, isScopedToOwnModules]);

  function updateFilters(patch: Partial<AuditLogFilters>) {
    setFilters((f) => ({ ...f, ...patch, page: 1 }));
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Audit Log"
        subtitle={isScopedToOwnModules ? "Every change in your finance modules, forever — read-only." : "Every change, forever — read-only."}
        breadcrumb={user?.role === "admin" ? "Admin / Audit Log" : "Insight / Audit Log"}
      />

      <div className="stagger flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Select value={filters.userId ?? ""} onChange={(e) => updateFilters({ userId: e.target.value || undefined })}>
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
          <Select value={filters.module ?? ""} onChange={(e) => updateFilters({ module: (e.target.value || undefined) as AuditModule | undefined })}>
            <option value="">All modules</option>
            {visibleModules.map((m) => (
              <option key={m} value={m}>
                {MODULE_LABEL[m]}
              </option>
            ))}
          </Select>
          <Select value={filters.action ?? ""} onChange={(e) => updateFilters({ action: (e.target.value || undefined) as AuditAction | undefined })}>
            <option value="">All actions</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {ACTION_META[a].label}
              </option>
            ))}
          </Select>
          <DatePicker label="" value={filters.dateFrom ?? ""} onChange={(v) => updateFilters({ dateFrom: v || undefined })} max={filters.dateTo} />
          <DatePicker label="" value={filters.dateTo ?? ""} onChange={(v) => updateFilters({ dateTo: v || undefined })} min={filters.dateFrom} />
          <Input placeholder="Search entity id..." value={filters.search ?? ""} onChange={(e) => updateFilters({ search: e.target.value || undefined })} />
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState icon={History} title="No matching activity" hint="Try widening the filters." />
        ) : (
          <div className="table-wrap overflow-x-auto">
            <table className="table w-full min-w-[900px]">
              <thead>
                <tr>
                  <th></th>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th className="hidden md:table-cell">Module</th>
                  <th className="hidden md:table-cell">Action</th>
                  <th>Entity</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const meta = ACTION_META[log.action];
                  const Icon = meta.icon;
                  const isExpanded = expandedId === log.id;
                  const isSale = SALE_ID_PATTERN.test(log.entityId);
                  return (
                    <Fragment key={log.id}>
                      <tr className="cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : log.id)}>
                        <td className="w-8">{isExpanded ? <ChevronDown className="h-4 w-4 text-inkMuted" /> : <ChevronRight className="h-4 w-4 text-inkMuted" />}</td>
                        <td className="text-xs">{formatDate(log.timestamp, "dd MMM yyyy, HH:mm")}</td>
                        <td>
                          <span className="inline-flex items-center gap-2">
                            <Avatar name={log.userName} size="sm" />
                            <span className="flex flex-col">
                              <span className="text-sm font-medium text-ink">{log.userName}</span>
                              <span className={cn("w-fit rounded-full px-1.5 py-0.5 text-[10px] font-bold", ROLE_PILL_CLASS[log.role])}>{ROLE_META[log.role].label}</span>
                            </span>
                          </span>
                        </td>
                        <td className="hidden md:table-cell">
                          <span className="rounded-full bg-subtle px-2 py-0.5 text-[10px] font-bold text-inkSoft">{MODULE_LABEL[log.module]}</span>
                        </td>
                        <td className="hidden md:table-cell">
                          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.tone)}>
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </span>
                        </td>
                        <td className="font-money text-xs">
                          {isSale ? (
                            <Link href={`/staff/sales/${log.entityId}`} className="text-primary-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                              {log.entityId}
                            </Link>
                          ) : (
                            log.entityId
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-subtle/60 p-0">
                            <AuditDiff log={log} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            <Pagination page={filters.page ?? 1} pageSize={PAGE_SIZE} total={total} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
          </div>
        )}
      </div>
    </div>
  );
}
