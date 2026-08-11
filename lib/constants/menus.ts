import type { Role } from "@/lib/types";

export interface MenuItem {
  label: string;
  href: string;
  icon: string;
}

export interface MenuSection {
  label: string;
  items: MenuItem[];
}

export const SIDEBAR_MENUS: Record<Role, MenuSection[]> = {
  staff: [
    {
      label: "MAIN",
      items: [
        { label: "Dashboard", href: "/dashboard/staff", icon: "LayoutDashboard" },
        { label: "New Sale", href: "/staff/sales/new", icon: "PlusCircle" },
        { label: "My Sales", href: "/staff/sales", icon: "Receipt" },
        { label: "My Performance", href: "/staff/performance", icon: "TrendingUp" },
        { label: "Reports", href: "/reports", icon: "BarChart3" },
        { label: "Notifications", href: "/notifications", icon: "Bell" },
        { label: "Profile", href: "/profile", icon: "User" },
      ],
    },
  ],
  accounts: [
    {
      label: "MAIN",
      items: [
        { label: "Dashboard", href: "/dashboard/accounts", icon: "LayoutDashboard" },
        { label: "Verification Queue", href: "/accounts/queue", icon: "ListChecks" },
        { label: "Posting", href: "/accounts/posting", icon: "Send" },
        { label: "Pending", href: "/accounts/pending", icon: "Hourglass" },
        { label: "Refunds", href: "/accounts/refunds", icon: "RotateCcw" },
        { label: "Receivables", href: "/accounts/receivables", icon: "Wallet" },
        { label: "Supplier Balances", href: "/accounts/suppliers", icon: "Building2" },
        { label: "Staff Loans", href: "/accounts/staff-loans", icon: "HandCoins" },
        { label: "Mistakes", href: "/accounts/mistakes", icon: "AlertTriangle" },
      ],
    },
    {
      label: "INSIGHT",
      items: [
        { label: "Reports", href: "/reports", icon: "BarChart3" },
        { label: "Audit Log", href: "/admin/audit-log", icon: "History" },
        { label: "Notifications", href: "/notifications", icon: "Bell" },
      ],
    },
  ],
  // Per the permissions matrix: manager gets read-only visibility into the queue,
  // pending items, refunds, receivables and supplier balances (not posting or mistakes,
  // which the matrix never grants them), full access to staff loans ("approve"), and a
  // full (unscoped) audit log — matching ROUTE_ACCESS's manager-specific route entries.
  manager: [
    {
      label: "MAIN",
      items: [{ label: "Dashboard", href: "/dashboard/manager", icon: "LayoutDashboard" }],
    },
    {
      label: "FINANCE (VIEW)",
      items: [
        { label: "Verification Queue", href: "/accounts/queue", icon: "ListChecks" },
        { label: "Pending", href: "/accounts/pending", icon: "Hourglass" },
        { label: "Refunds", href: "/accounts/refunds", icon: "RotateCcw" },
        { label: "Receivables", href: "/accounts/receivables", icon: "Wallet" },
        { label: "Supplier Balances", href: "/accounts/suppliers", icon: "Building2" },
        { label: "Staff Loans", href: "/accounts/staff-loans", icon: "HandCoins" },
      ],
    },
    {
      label: "INSIGHT",
      items: [
        { label: "Reports", href: "/reports", icon: "BarChart3" },
        { label: "Audit Log", href: "/admin/audit-log", icon: "History" },
        { label: "Notifications", href: "/notifications", icon: "Bell" },
        { label: "Profile", href: "/profile", icon: "User" },
      ],
    },
  ],
  admin: [
    {
      label: "MAIN",
      items: [{ label: "Dashboard", href: "/dashboard/admin", icon: "LayoutDashboard" }],
    },
    {
      label: "SALES",
      items: [
        { label: "New Sale", href: "/staff/sales/new", icon: "PlusCircle" },
        { label: "All Sales", href: "/staff/sales", icon: "Receipt" },
      ],
    },
    {
      label: "FINANCE",
      items: [
        { label: "Queue", href: "/accounts/queue", icon: "ListChecks" },
        { label: "Posting", href: "/accounts/posting", icon: "Send" },
        { label: "Pending", href: "/accounts/pending", icon: "Hourglass" },
        { label: "Refunds", href: "/accounts/refunds", icon: "RotateCcw" },
        { label: "Receivables", href: "/accounts/receivables", icon: "Wallet" },
        { label: "Suppliers", href: "/accounts/suppliers", icon: "Building2" },
        { label: "Loans", href: "/accounts/staff-loans", icon: "HandCoins" },
        { label: "Mistakes", href: "/accounts/mistakes", icon: "AlertTriangle" },
      ],
    },
    {
      label: "INSIGHT",
      items: [
        { label: "Reports", href: "/reports", icon: "BarChart3" },
        { label: "Audit Log", href: "/admin/audit-log", icon: "History" },
      ],
    },
    {
      label: "SYSTEM",
      items: [
        { label: "Users", href: "/admin/users", icon: "Users" },
        { label: "Branches", href: "/admin/branches", icon: "Building" },
        { label: "Suppliers", href: "/admin/suppliers", icon: "Building2" },
        { label: "Services", href: "/admin/services", icon: "Package" },
        { label: "Customers", href: "/admin/customers", icon: "Contact" },
        { label: "Targets", href: "/admin/targets", icon: "Target" },
        { label: "Settings", href: "/admin/settings", icon: "Settings" },
      ],
    },
  ],
};
