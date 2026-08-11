# TravelDesk Pro — Demo Script

A 5-minute, start-to-finish walkthrough that proves the full sales → verification → posting →
collections lifecycle, plus the requirement-coverage matrix mapping every bullet from the three
original requirement documents (business flow, entry fields & controls, dashboards & reports —
condensed in `masterplan.md` §1.4–1.6 and Part 2) to the exact screen that proves it.

Reset between run-throughs with **Reset demo data** (Admin avatar menu, or Admin → Settings →
Danger Zone) so the script executes cleanly twice in a row.

## The 5-minute walkthrough

1. **Login as Staff** (`/login`, demo account button) → **New Sale** (`/staff/sales/new`).
   Fill Booking, Supplier & Money (watch the live profit/margin preview update as you type),
   Payment. Enter a **duplicate** booking no + supplier + date to trigger the duplicate warning
   modal, dismiss it, fix the booking no, then **Submit for Verification**. Land on
   `/staff/sales?tab=submitted`.
2. **Login as Accounts** (`/dashboard/accounts`) → queue badge in the sidebar shows the new
   sale → `/accounts/queue` → open the review drawer → **Return** with a reason.
3. **Back to Staff** → sale detail shows the **Returned banner** with the reason → **Fix &
   Resubmit**. **Back to Accounts** → `/accounts/queue` → **Verify** → `/accounts/posting` →
   **Post** (watch `/accounts/receivables` gain a row if there's a balance, and the supplier's
   `toSettle` change on `/accounts/suppliers`).
4. **Accounts**: `/accounts/receivables` → record a payment against the new receivable.
   `/accounts/refunds` → advance an existing refund one pipeline stage.
5. **Admin** (`/dashboard/admin`) → flip a filter, watch KPIs cascade and charts re-draw →
   `/reports/daily-sales` → **Export Excel** + **Export PDF** → `/admin/audit-log` → expand the
   sale's `AUD-*` rows to show its full status history → press **Ctrl/Cmd-K**, jump to the sale
   via the palette → toggle theme (`ThemeToggle` in Topbar) → resize to mobile width and confirm
   the bottom nav, condensed tables, and full-width drawers.

## Requirement-coverage matrix

### Staff entry fields (masterplan §1.4)

| Requirement | Proven at |
|---|---|
| Booking No / R.No + transaction date | `/staff/sales/new` (Section A) |
| Branch + destination/city | `/staff/sales/new` (Section A) |
| Description of booking/service | `/staff/sales/new` (Section A) |
| Supplier / service provider | `/staff/sales/new` (Section B) |
| Net cost + selling price | `/staff/sales/new` (Section B) |
| Profit calculated automatically (never typed) | `/staff/sales/new` live `ProfitPreview`; `lib/logic/money.ts:calcProfit` |
| Payment method (Benefit Pay / Credit Card–Online / Cash / Fawri–Cheque / Not Paid–Refund) | `/staff/sales/new` (Section C) |
| Remarks | `/staff/sales/new` (Section C) |

### Control & approval requirements (masterplan §1.5)

| Requirement | Proven at |
|---|---|
| Staff profile/responsibility auto-recorded | `Sale.staffId` set from session, never editable — `lib/api/salesApi.ts:create` |
| Approval status Draft → Submitted → Verified → Posted | `SaleStatusTimeline`, `StatusPill` on `/staff/sales/[id]` |
| Accounts can return for correction | `/accounts/queue` review drawer → Return; `ReturnedAlertCard` on staff dashboard |
| Pending / refund / receivable transactions separately visible | `/accounts/pending`, `/accounts/refunds`, `/accounts/receivables` |
| Duplicate / incomplete submissions prevented | `lib/logic/duplicate.ts:detectDuplicate` + `DuplicateWarningModal`; `lib/logic/validate.ts` |
| Every action shows user/date/time | `/admin/audit-log`, `SaleStatusTimeline`, `AuditDiff` |
| Role-based access (Staff/Accounts/Manager/Admin) | `lib/auth/permissions.ts:ROUTE_ACCESS` + `AuthGuard`, role-filtered `SIDEBAR_MENUS` |

### 4 KPI areas (masterplan §1.6)

| KPI area | Proven at |
|---|---|
| Daily Sales (by date/branch/staff) | `/dashboard/admin`, `/dashboard/manager`, `/reports/daily-sales` |
| Profit (cost vs selling) | KPI cards on all 4 dashboards; `/reports/profit-summary` |
| Supplier Balances (credit, wallet, settlement) | `/accounts/suppliers`; Supplier Balances KPI on manager/admin dashboards |
| Receivables (customer/staff outstanding) | `/accounts/receivables`; Receivables KPI on manager/admin dashboards |

### All 12 reports (masterplan §1.6)

| # | Report | Route |
|---|---|---|
| 1 | Daily sales by staff/branch/date | `/reports/daily-sales` |
| 2 | Sales–cost–price–profit summary | `/reports/profit-summary` |
| 3 | Payment collection by method | `/reports/payment-collection` |
| 4 | Supplier credit/wallet usage & settlements | `/reports/supplier-usage` |
| 5 | Staff mistakes/charges | `/reports/staff-mistakes` |
| 6 | Supplier/airline refunds | `/reports/supplier-refunds` |
| 7 | Customer receivables & outstanding | `/reports/customer-receivables` |
| 8 | Staff loans/advances & installments | `/reports/staff-loans` |
| 9 | Pending transactions (cruise/visa/ticket) | `/reports/pending-transactions` |
| 10 | Refund tracking with expected status | `/reports/refund-tracking` |
| 11 | Staff performance & monthly progress | `/reports/staff-performance` |
| 12 | Management export dashboard | `/reports/management-summary` (+ Excel/PDF `ExportBar` on every report) |

*(Exact report IDs are defined in `lib/reports/configs.tsx` — the hub at `/reports` lists all 12
as cards, grouped Core/Additional per `masterplan.md` §1.6.)*

### Role-based access (Part 2 — Roles & Permissions Matrix)

| Capability | Proven at |
|---|---|
| Staff create/edit own sale (Draft/Returned only) | `/staff/sales/[id]` edit mode gated on `status === draft \| returned` |
| Staff sees own sales only | `/staff/sales` list scoped to `staffId` (admin sees all) |
| Accounts verification queue, all branches | `/accounts/queue` |
| Verify / Return / Post restricted to Accounts+Admin | `ROUTE_ACCESS["/accounts"]`, `salesApi.verify/returnSale/post` guards |
| Manager sees dashboards/reports, view-only on finance | `SIDEBAR_MENUS.manager` has no `/accounts/**` entries; `ROUTE_ACCESS` blocks manager from `/accounts` |
| Admin manages users/branches/suppliers/services/customers/targets | `/admin/users`, `/admin/branches`, `/admin/suppliers`, `/admin/services`, `/admin/customers`, `/admin/targets` |
| System settings (currency, VAT, targets) admin-only | `/admin/settings` |
| Audit log viewer (Admin/Manager full, Accounts own module) | `/admin/audit-log` (`ROUTE_ACCESS["/admin"]`) |

### Audit trail

| Requirement | Proven at |
|---|---|
| Every mutation logs `{user, action, from, to, timestamp}` | `lib/api/_shared.ts:appendAudit`, called from every `*Api` mutation |
| Full per-sale history, expandable diff | `/admin/audit-log` (expand a row → `AuditDiff`) |
| Sale-scoped timeline | `SaleStatusTimeline` on `/staff/sales/[id]` and the queue review drawer |

### Duplicate prevention

| Requirement | Proven at |
|---|---|
| Same bookingNo + supplier + date flags a warning before submit | `lib/logic/duplicate.ts:detectDuplicate`, `DuplicateWarningModal`, force-override on resubmit |

### Pending / refund / receivable visibility

| Requirement | Proven at |
|---|---|
| Pending cruise/visa/ticket items with expected completion | `/accounts/pending` |
| Refund pipeline (Requested → Sent → Received → Paid) | `/accounts/refunds`, `RefundPipeline`, dashboard `RefundFunnel` |
| Customer + staff receivables, aging buckets, installments | `/accounts/receivables`, `AgingChips`, `InstallmentModal` |

### Phase 9 additions (this pass)

| Deliverable | Proven at |
|---|---|
| Motion system (page transitions, hero cascade, micro-interactions) | `components/system/PageTransition.tsx`, `RouteProgress.tsx`, dashboard `.chart-hero`/`.stagger-kpi` |
| ⌘K command palette, role-safe | `components/system/CommandPalette.tsx`, Topbar search trigger |
| Printable branded invoice | `/staff/sales/[id]/invoice`, `components/sales/InvoiceDoc.tsx` |
| Empty/error/confirm coverage audit | see git history for this phase's fixes (notification error toasts, CRUD delete-guard error toast, targets copy error toast, confirm before password reset, responsive table columns) |
| Reset demo data surfaced in Topbar | Admin avatar menu → Reset demo data (typed `RESET` to confirm) |
