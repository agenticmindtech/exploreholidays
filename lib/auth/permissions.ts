import type { Role } from "@/lib/types";

interface RouteAccessEntry {
  prefix: string;
  roles: Role[];
}

const ALL_ROLES: Role[] = ["admin", "manager", "accounts", "staff"];

/**
 * Ordered by nothing in particular — can() picks the most specific (longest)
 * matching prefix, so overlapping entries don't need manual ordering.
 *
 * Manager entries below fill a gap that shipped as a deliberate TODO back in the
 * routing phase ("manager read-only pages come later") and was never actually built in
 * any later phase, despite the permissions matrix always specifying it:
 *   Verification queue / Refunds & pending / Receivables & supplier balances → manager: view
 *   Staff loans & advances                                                  → manager: approve (full)
 *   Posting / Mistakes                                                      → manager: still no access (not in the matrix)
 *   Audit log                                                               → manager: full; accounts: own modules only (scoped in the page/API, not the route)
 * These are more specific (longer) prefixes than the blanket "/accounts" and "/admin"
 * rules below, so they win for their own subtree without loosening anything else.
 */
export const ROUTE_ACCESS: RouteAccessEntry[] = [
  { prefix: "/staff", roles: ["staff", "admin"] },
  { prefix: "/accounts/queue", roles: ["accounts", "manager", "admin"] },
  { prefix: "/accounts/pending", roles: ["accounts", "manager", "admin"] },
  { prefix: "/accounts/refunds", roles: ["accounts", "manager", "admin"] },
  { prefix: "/accounts/receivables", roles: ["accounts", "manager", "admin"] },
  { prefix: "/accounts/suppliers", roles: ["accounts", "manager", "admin"] },
  { prefix: "/accounts/staff-loans", roles: ["accounts", "manager", "admin"] },
  { prefix: "/accounts", roles: ["accounts", "admin"] },
  { prefix: "/reports", roles: ALL_ROLES },
  { prefix: "/admin/audit-log", roles: ["admin", "manager", "accounts"] },
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/dashboard/admin", roles: ["admin"] },
  { prefix: "/dashboard/manager", roles: ["manager", "admin"] },
  { prefix: "/dashboard/accounts", roles: ["accounts", "admin"] },
  { prefix: "/dashboard/staff", roles: ["staff", "admin"] },
  { prefix: "/profile", roles: ALL_ROLES },
  { prefix: "/notifications", roles: ALL_ROLES },
];

/** Can this role perform finance mutations (verify/return/post/advance/settle/record payment/…), or only view? Manager gets read access to several accounts screens per the permissions matrix, but not the ability to act on them. */
export function canManageFinance(role: Role): boolean {
  return role === "accounts" || role === "admin";
}

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Two routes under /staff that must stay open beyond staff+admin — checked before the
 * ordinary prefix match so neither is shadowed by the broader `/staff` → staff+admin
 * entry below:
 *   - a sale's invoice is viewable by accounts/manager too (Phase 9 spec §6).
 *   - a sale's detail page (NOT the "/staff/sales" list, NOT "/staff/sales/new" —
 *     the negative lookahead excludes both) is viewable by accounts/manager too, since
 *     audit-log entries link straight into it and accounts/manager need to open what
 *     they're reviewing. The list itself stays staff-own-only per the permissions matrix.
 * Per-sale ownership ("the sale's own staff can edit it") is enforced by the page itself,
 * since that requires the actual Sale record, not just the URL shape.
 */
const INVOICE_ROUTE = /^\/staff\/sales\/[^/]+\/invoice\/?$/;
const SALE_DETAIL_ROUTE = /^\/staff\/sales\/(?!new\/?$)[^/]+\/?$/;

/**
 * Routes with no matching entry are unrestricted (open to any authenticated
 * user) — ROUTE_ACCESS only needs to list the routes that must be fenced.
 */
export function can(role: Role, pathname: string): boolean {
  if (INVOICE_ROUTE.test(pathname) || SALE_DETAIL_ROUTE.test(pathname)) return true;
  const candidates = ROUTE_ACCESS.filter((entry) => matches(pathname, entry.prefix));
  if (candidates.length === 0) return true;
  const mostSpecific = candidates.reduce((a, b) => (b.prefix.length > a.prefix.length ? b : a));
  return mostSpecific.roles.includes(role);
}

export function landingFor(role: Role): string {
  switch (role) {
    case "admin":
      return "/dashboard/admin";
    case "manager":
      return "/dashboard/manager";
    case "accounts":
      return "/dashboard/accounts";
    case "staff":
      return "/dashboard/staff";
    default:
      return "/login";
  }
}
