import {
  BedDouble,
  Car,
  MoreHorizontal,
  Moon,
  Package,
  Plane,
  ShieldCheck,
  Ship,
  Stamp,
  type LucideIcon,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { usersApi } from "@/lib/api/usersApi";
import { branchesApi } from "@/lib/api/branchesApi";
import { suppliersApi } from "@/lib/api/suppliersApi";
import { servicesApi } from "@/lib/api/servicesApi";
import { customersApi } from "@/lib/api/customersApi";
import { salesApi } from "@/lib/api/salesApi";
import { ROLE_META } from "@/lib/constants/display";
import { ROLES, SERVICE_KIND, SETTLEMENT_CYCLES, SUPPLIER_TYPES, CUSTOMER_TYPES } from "@/lib/constants/enums";
import { targetsApi } from "@/lib/api/targetsApi";
import type { Branch, CrudConfig, Customer, Role, ServiceType, SessionUser, Supplier, Target } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatMoney } from "@/lib/utils/format";

// Tailwind's JIT scanner needs literal class strings — interpolating
// `bg-${token.replace(...)}` from data would never be picked up at build time.
const ROLE_PILL_CLASS: Record<Role, string> = {
  admin: "bg-secondary-100 text-secondary-700",
  manager: "bg-primary-100 text-primary-700",
  accounts: "bg-accent-100 text-accent-700",
  staff: "bg-info-100 text-info-700",
};

const SERVICE_ICON_MAP: Record<string, LucideIcon> = {
  Plane,
  BedDouble,
  Stamp,
  Package,
  Ship,
  Moon,
  ShieldCheck,
  Car,
  MoreHorizontal,
};

async function relatedSalesGuard(entityLabel: string, filterKey: "staffId" | "branchId" | "serviceTypeId" | "customerId", id: string): Promise<string | null> {
  const envelope = await salesApi.list({ [filterKey]: id, page: 1, pageSize: 1 });
  if (envelope.total === 0) return null;
  return `This ${entityLabel} has ${envelope.total} sale${envelope.total === 1 ? "" : "s"} — deactivate instead of delete.`;
}

/* ---------- 1. Users ---------- */

export function usersCrudConfig(branches: Branch[]): CrudConfig<SessionUser> {
  return {
    entity: "users",
    title: "Users",
    icon: "Users",
    searchKeys: ["name", "email"],
    columns: [
      {
        key: "name",
        label: "Name",
        render: (row) => (
          <span className="inline-flex items-center gap-2">
            <Avatar name={row.name} src={row.avatar ?? undefined} size="sm" />
            <span className="truncate text-sm font-semibold text-ink">{row.name}</span>
          </span>
        ),
      },
      { key: "email", label: "Email" },
      {
        key: "role",
        label: "Role",
        render: (row) => <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", ROLE_PILL_CLASS[row.role])}>{ROLE_META[row.role].label}</span>,
      },
      { key: "branchId", label: "Branch", render: (row) => branches.find((b) => b.id === row.branchId)?.name ?? "—" },
      { key: "lastLoginAt", label: "Last Login", render: (row) => (row.lastLoginAt ? formatDate(row.lastLoginAt) : "Never") },
    ],
    form: [
      { name: "name", label: "Full name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "role", label: "Role", type: "select", required: true, options: ROLES.map((r) => ({ value: r, label: ROLE_META[r].label })) },
      { name: "branchId", label: "Branch", type: "select", required: true, options: branches.map((b) => ({ value: b.id, label: b.name })) },
      { name: "phone", label: "Phone", type: "text", required: true },
      { name: "designation", label: "Designation", type: "text", required: true },
      { name: "commissionPercent", label: "Commission %", type: "number", hint: "Percentage of profit paid as commission." },
      { name: "isActive", label: "Active", type: "toggle" },
    ],
    rules: {
      uniqueKeys: ["email"],
      deleteGuard: (row) => relatedSalesGuard("user", "staffId", row.id),
    },
    hasActiveToggle: true,
    editOnlyActions: [
      {
        label: "Reset password",
        confirm: "This immediately resets the user's password to a temporary default. They'll need it to sign in next.",
        onClick: (row) => usersApi.resetPassword(row.id, "demo123", row.id),
      },
    ],
    api: {
      list: (filters) => usersApi.list(filters),
      create: (data, byUserId) =>
        usersApi.create(
          {
            name: String(data.name),
            email: String(data.email),
            password: "demo123",
            role: data.role as SessionUser["role"],
            branchId: String(data.branchId),
            phone: String(data.phone),
            designation: String(data.designation),
            commissionPercent: Number(data.commissionPercent) || 0,
          },
          byUserId
        ),
      update: (id, data, byUserId) => usersApi.update(id, data, byUserId),
      delete: (id, byUserId) => usersApi.delete(id, byUserId),
    },
  };
}

/* ---------- 2. Branches ---------- */

export function branchesCrudConfig(managers: SessionUser[]): CrudConfig<Branch> {
  return {
    entity: "branches",
    title: "Branches",
    icon: "Building",
    searchKeys: ["name", "code"],
    columns: [
      {
        key: "name",
        label: "Name",
        render: (row) => (
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: row.color }} />
            <span className="font-semibold text-ink">{row.name}</span>
          </span>
        ),
      },
      { key: "code", label: "Code", render: (row) => <span className="font-money font-semibold">{row.code}</span> },
      { key: "address", label: "Address" },
      { key: "phone", label: "Phone" },
      { key: "managerId", label: "Manager", render: (row) => managers.find((m) => m.id === row.managerId)?.name ?? "—" },
    ],
    form: [
      { name: "name", label: "Branch name", type: "text", required: true },
      { name: "code", label: "Code", type: "text", required: true, hint: "Up to 4 characters, uppercase (e.g. MNM)." },
      { name: "address", label: "Address", type: "text", required: true },
      { name: "phone", label: "Phone", type: "text", required: true },
      { name: "managerId", label: "Manager", type: "select", options: managers.map((m) => ({ value: m.id, label: m.name })) },
      { name: "color", label: "Color", type: "color", required: true },
      { name: "isActive", label: "Active", type: "toggle" },
    ],
    rules: {
      uniqueKeys: ["code"],
      deleteGuard: (row) => relatedSalesGuard("branch", "branchId", row.id),
    },
    hasActiveToggle: true,
    api: {
      list: (filters) => branchesApi.list(filters),
      create: (data, byUserId) =>
        branchesApi.create(
          {
            name: String(data.name),
            code: String(data.code).toUpperCase().slice(0, 4),
            address: String(data.address),
            phone: String(data.phone),
            managerId: data.managerId ? String(data.managerId) : null,
            color: String(data.color || "#0E7C86"),
          },
          byUserId
        ),
      update: (id, data, byUserId) => {
        const patch = { ...data };
        if (patch.code) patch.code = String(patch.code).toUpperCase().slice(0, 4);
        return branchesApi.update(id, patch, byUserId);
      },
      delete: (id, byUserId) => branchesApi.delete(id, byUserId),
    },
  };
}

/* ---------- 3. Suppliers ---------- */

export function suppliersCrudConfig(): CrudConfig<Supplier> {
  return {
    entity: "suppliers",
    title: "Suppliers",
    icon: "Building2",
    searchKeys: ["name", "code"],
    columns: [
      { key: "name", label: "Name", render: (row) => <span className="font-semibold text-ink">{row.name}</span> },
      { key: "code", label: "Code" },
      { key: "type", label: "Type", render: (row) => <span className="capitalize">{row.type.replace(/_/g, " ")}</span> },
      { key: "creditLimit", label: "Credit Limit", render: (row) => formatMoney(row.creditLimit) },
      { key: "toSettle", label: "To Settle", render: (row) => <span className="font-money text-accent-600">{formatMoney(row.toSettle)}</span> },
      { key: "phone", label: "Phone" },
    ],
    form: [
      { name: "name", label: "Supplier name", type: "text", required: true },
      { name: "code", label: "Code", type: "text", required: true },
      { name: "type", label: "Type", type: "select", required: true, options: SUPPLIER_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, " ") })) },
      { name: "contactPerson", label: "Contact person", type: "text", required: true },
      { name: "phone", label: "Phone", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "creditLimit", label: "Credit limit", type: "money", required: true },
      { name: "settlementCycle", label: "Settlement cycle", type: "select", required: true, options: SETTLEMENT_CYCLES.map((c) => ({ value: c, label: c })) },
      { name: "currency", label: "Currency", type: "text", hint: "Defaults to BHD." },
      { name: "isActive", label: "Active", type: "toggle" },
    ],
    rules: {
      deleteGuard: async (row) => {
        const txns = await suppliersApi.listTransactions(row.id);
        if (txns.length === 0) return null;
        return `This supplier has ${txns.length} transaction${txns.length === 1 ? "" : "s"} — deactivate instead of delete.`;
      },
    },
    hasActiveToggle: true,
    readOnlyStats: (row) => [
      { label: "Wallet Balance", value: formatMoney(row.walletBalance) },
      { label: "Used Credit", value: formatMoney(row.usedCredit) },
      { label: "To Settle", value: formatMoney(row.toSettle) },
    ],
    api: {
      list: (filters) => suppliersApi.list(filters),
      create: (data, byUserId) =>
        suppliersApi.create(
          {
            name: String(data.name),
            code: String(data.code),
            type: data.type as Supplier["type"],
            contactPerson: String(data.contactPerson),
            phone: String(data.phone),
            email: String(data.email),
            creditLimit: Number(data.creditLimit) || 0,
            settlementCycle: data.settlementCycle as Supplier["settlementCycle"],
            currency: data.currency ? String(data.currency) : "BHD",
          },
          byUserId
        ),
      update: (id, data, byUserId) => suppliersApi.update(id, data, byUserId),
      delete: (id, byUserId) => suppliersApi.delete(id, byUserId),
    },
  };
}

/* ---------- 4. Services ---------- */

export function servicesCrudConfig(): CrudConfig<ServiceType> {
  return {
    entity: "services",
    title: "Services",
    icon: "Package",
    searchKeys: ["name"],
    columns: [
      {
        key: "name",
        label: "Name",
        render: (row) => {
          const Icon = SERVICE_ICON_MAP[row.icon] ?? MoreHorizontal;
          return (
            <span className="inline-flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${row.color}22`, color: row.color }}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="font-semibold text-ink">{row.name}</span>
            </span>
          );
        },
      },
      { key: "kind", label: "Kind", render: (row) => <span className="capitalize">{row.kind}</span> },
      { key: "requiresPnr", label: "Requires PNR", render: (row) => (row.requiresPnr ? "Yes" : "No") },
    ],
    form: [
      { name: "name", label: "Service name", type: "text", required: true },
      { name: "kind", label: "Kind", type: "select", required: true, options: SERVICE_KIND.map((k) => ({ value: k, label: k })) },
      { name: "icon", label: "Icon", type: "icon", required: true },
      { name: "color", label: "Color", type: "color", required: true },
      { name: "requiresPnr", label: "Requires PNR", type: "toggle" },
      { name: "isActive", label: "Active", type: "toggle" },
    ],
    rules: {
      deleteGuard: (row) => relatedSalesGuard("service", "serviceTypeId", row.id),
    },
    hasActiveToggle: true,
    api: {
      list: (filters) => servicesApi.list(filters),
      create: (data, byUserId) =>
        servicesApi.create(
          {
            name: String(data.name),
            kind: data.kind as ServiceType["kind"],
            icon: String(data.icon || "MoreHorizontal"),
            color: String(data.color || "#0E7C86"),
            requiresPnr: !!data.requiresPnr,
          },
          byUserId
        ),
      update: (id, data, byUserId) => servicesApi.update(id, data, byUserId),
      delete: (id, byUserId) => servicesApi.delete(id, byUserId),
    },
  };
}

/* ---------- 5. Customers ---------- */

export function customersCrudConfig(): CrudConfig<Customer> {
  return {
    entity: "customers",
    title: "Customers",
    icon: "Contact",
    searchKeys: ["name", "phone", "email"],
    columns: [
      { key: "name", label: "Name", render: (row) => <span className="font-semibold text-ink">{row.name}</span> },
      { key: "phone", label: "Phone" },
      { key: "type", label: "Type", render: (row) => <span className="capitalize">{row.type}</span> },
      { key: "totalPurchases", label: "Total Purchases", render: (row) => formatMoney(row.totalPurchases) },
      { key: "outstanding", label: "Outstanding", render: (row) => <span className="font-money text-danger-600">{formatMoney(row.outstanding)}</span> },
    ],
    form: [
      { name: "name", label: "Full name", type: "text", required: true },
      { name: "phone", label: "Phone", type: "text", required: true },
      { name: "email", label: "Email", type: "email" },
      { name: "nationality", label: "Nationality", type: "text" },
      { name: "passportNo", label: "Passport No.", type: "text" },
      { name: "type", label: "Type", type: "select", required: true, options: CUSTOMER_TYPES.map((t) => ({ value: t, label: t })) },
      { name: "companyName", label: "Company name", type: "text", showWhen: { field: "type", equals: "corporate" } },
    ],
    rules: {
      uniqueKeys: ["phone"],
      deleteGuard: (row) => relatedSalesGuard("customer", "customerId", row.id),
    },
    api: {
      list: (filters) => customersApi.list(filters),
      create: (data, byUserId) =>
        customersApi.create(
          {
            name: String(data.name),
            phone: String(data.phone),
            email: data.email ? String(data.email) : null,
            nationality: data.nationality ? String(data.nationality) : null,
            passportNo: data.passportNo ? String(data.passportNo) : null,
            type: data.type as Customer["type"],
            companyName: data.companyName ? String(data.companyName) : null,
          },
          byUserId
        ),
      update: (id, data, byUserId) => customersApi.update(id, data, byUserId),
      delete: (id, byUserId) => customersApi.delete(id, byUserId),
    },
  };
}

/* ---------- 6. Targets (grid mode — see components/admin/TargetsGridMode.tsx) ----------
 * CrudPage's mode:'grid' branch renders TargetsGridMode instead of the standard table +
 * drawer flow, using only title/icon from this config — the rest is filled in structurally
 * so every admin page stays a uniform <CrudPage config={...} /> call, but is otherwise
 * unused (Targets has no create/edit/delete drawer or delete guard; it's inline-editable
 * per spec §5.6).
 */

export function targetsCrudConfig(): CrudConfig<Target> {
  return {
    entity: "targets",
    title: "Targets",
    icon: "Target",
    mode: "grid",
    searchKeys: ["month"],
    columns: [],
    form: [],
    rules: {},
    api: {
      list: (filters) => targetsApi.list(filters),
      create: () => {
        throw new Error("Targets are managed inline — use the grid, not a create form.");
      },
      update: () => {
        throw new Error("Targets are managed inline — use the grid, not an edit form.");
      },
      delete: () => {
        throw new Error("Targets cannot be deleted from this screen.");
      },
    },
  };
}
