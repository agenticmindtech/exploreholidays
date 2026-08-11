"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  Compass,
  DollarSign,
  Download,
  Inbox,
  Lock,
  Mail,
  Plus,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";

import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import KPIStatCard from "@/components/ui/KPIStatCard";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import DatePicker from "@/components/ui/DatePicker";
import Toggle from "@/components/ui/Toggle";
import SearchInput from "@/components/ui/SearchInput";
import StatusPill, { type SaleStatus } from "@/components/ui/StatusPill";
import Table from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import Drawer from "@/components/ui/Drawer";
import Tabs from "@/components/ui/Tabs";
import Dropdown from "@/components/ui/Dropdown";
import Tooltip from "@/components/ui/Tooltip";
import Avatar from "@/components/ui/Avatar";
import ProgressBar from "@/components/ui/ProgressBar";
import ProgressRing from "@/components/ui/ProgressRing";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { formatMoney, formatDate, relativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const STATUSES: SaleStatus[] = [
  "draft",
  "submitted",
  "verified",
  "posted",
  "returned",
  "refunded",
  "pending",
  "cancelled",
];

// Full literal class names on purpose — Tailwind's build-time scanner reads
// raw source text and cannot resolve template-literal class interpolation.
const COLOR_GROUPS: { name: string; swatches: { shade: number; className: string }[] }[] = [
  {
    name: "Primary",
    swatches: [
      { shade: 50, className: "bg-primary-50" },
      { shade: 100, className: "bg-primary-100" },
      { shade: 200, className: "bg-primary-200" },
      { shade: 300, className: "bg-primary-300" },
      { shade: 400, className: "bg-primary-400" },
      { shade: 500, className: "bg-primary-500" },
      { shade: 600, className: "bg-primary-600" },
      { shade: 700, className: "bg-primary-700" },
      { shade: 800, className: "bg-primary-800" },
      { shade: 900, className: "bg-primary-900" },
      { shade: 950, className: "bg-primary-950" },
    ],
  },
  {
    name: "Secondary",
    swatches: [
      { shade: 50, className: "bg-secondary-50" },
      { shade: 100, className: "bg-secondary-100" },
      { shade: 200, className: "bg-secondary-200" },
      { shade: 300, className: "bg-secondary-300" },
      { shade: 400, className: "bg-secondary-400" },
      { shade: 500, className: "bg-secondary-500" },
      { shade: 600, className: "bg-secondary-600" },
      { shade: 700, className: "bg-secondary-700" },
      { shade: 800, className: "bg-secondary-800" },
      { shade: 900, className: "bg-secondary-900" },
      { shade: 950, className: "bg-secondary-950" },
    ],
  },
  {
    name: "Accent",
    swatches: [
      { shade: 50, className: "bg-accent-50" },
      { shade: 100, className: "bg-accent-100" },
      { shade: 200, className: "bg-accent-200" },
      { shade: 300, className: "bg-accent-300" },
      { shade: 400, className: "bg-accent-400" },
      { shade: 500, className: "bg-accent-500" },
      { shade: 600, className: "bg-accent-600" },
      { shade: 700, className: "bg-accent-700" },
      { shade: 800, className: "bg-accent-800" },
      { shade: 900, className: "bg-accent-900" },
    ],
  },
  {
    name: "Success",
    swatches: [
      { shade: 50, className: "bg-success-50" },
      { shade: 100, className: "bg-success-100" },
      { shade: 500, className: "bg-success-500" },
      { shade: 600, className: "bg-success-600" },
      { shade: 700, className: "bg-success-700" },
    ],
  },
  {
    name: "Warning",
    swatches: [
      { shade: 50, className: "bg-warning-50" },
      { shade: 100, className: "bg-warning-100" },
      { shade: 500, className: "bg-warning-500" },
      { shade: 600, className: "bg-warning-600" },
      { shade: 700, className: "bg-warning-700" },
    ],
  },
  {
    name: "Danger",
    swatches: [
      { shade: 50, className: "bg-danger-50" },
      { shade: 100, className: "bg-danger-100" },
      { shade: 500, className: "bg-danger-500" },
      { shade: 600, className: "bg-danger-600" },
      { shade: 700, className: "bg-danger-700" },
    ],
  },
  {
    name: "Info",
    swatches: [
      { shade: 50, className: "bg-info-50" },
      { shade: 100, className: "bg-info-100" },
      { shade: 500, className: "bg-info-500" },
      { shade: 600, className: "bg-info-600" },
      { shade: 700, className: "bg-info-700" },
    ],
  },
];

interface FakeRow {
  id: string;
  customer: string;
  status: SaleStatus;
  amount: number;
  date: string;
}

const FAKE_ROWS: FakeRow[] = [
  { id: "INV-1042", customer: "Layla Haddad", status: "posted", amount: 1245.5, date: "2026-08-04" },
  { id: "INV-1041", customer: "Omar Nasser", status: "verified", amount: 640, date: "2026-08-03" },
  { id: "INV-1040", customer: "Sara Al-Amin", status: "submitted", amount: 980.25, date: "2026-08-02" },
  { id: "INV-1039", customer: "Yusuf Rahman", status: "draft", amount: 320, date: "2026-08-01" },
  { id: "INV-1038", customer: "Mona Rezk", status: "returned", amount: 455.75, date: "2026-07-30" },
  { id: "INV-1037", customer: "Khalid Saleh", status: "refunded", amount: 210, date: "2026-07-28" },
  { id: "INV-1036", customer: "Huda Farouk", status: "pending", amount: 1580, date: "2026-07-27" },
  { id: "INV-1035", customer: "Tariq Aziz", status: "cancelled", amount: 90, date: "2026-07-25" },
];

interface SectionProps {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}

function Section({ id, title, description, children }: SectionProps) {
  return (
    <section id={id} className="animate-fade-up scroll-mt-24">
      <div className="mb-4">
        <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
        {description && <p className="mt-1 text-sm text-inkMuted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  const toast = useToast();

  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [sortedRows, setSortedRows] = useState<FakeRow[]>(FAKE_ROWS);

  const [activeTab, setActiveTab] = useState("all");
  const [toggleOn, setToggleOn] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pagedRows = useMemo(
    () => sortedRows.slice((page - 1) * pageSize, page * pageSize),
    [sortedRows, page]
  );

  function handleSort(key: string, dir: "asc" | "desc") {
    const sorted = [...FAKE_ROWS].sort((a, b) => {
      const av = a[key as keyof FakeRow];
      const bv = b[key as keyof FakeRow];
      if (typeof av === "number" && typeof bv === "number") return dir === "asc" ? av - bv : bv - av;
      return dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    setSortedRows(sorted);
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Style Guide"
        subtitle="Every component in the TravelDesk Pro design system, light &amp; dark."
        breadcrumb="System / Style Guide"
        actions={
          <Button variant="primary" icon={Download}>
            Export tokens
          </Button>
        }
      />

      <div className="stagger flex flex-col gap-12 pb-24">
        {/* ---------------- Colors ---------------- */}
        <Section id="colors" title="Colors" description="Design tokens sourced from tailwind.config.js — never hardcoded.">
          <div className="flex flex-col gap-6">
            {COLOR_GROUPS.map((group) => (
              <div key={group.name}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-inkMuted">{group.name}</p>
                <div className="flex flex-wrap gap-2">
                  {group.swatches.map((swatch) => (
                    <div key={swatch.shade} className="flex flex-col items-center gap-1">
                      <div className={cn("h-12 w-12 rounded-xl border border-line", swatch.className)} />
                      <span className="font-money text-[10px] text-inkMuted">{swatch.shade}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-inkMuted">Gradients</p>
              <div className="flex flex-wrap gap-3">
                <div className="h-16 w-32 rounded-xl bg-grad-brand" />
                <div className="h-16 w-32 rounded-xl bg-grad-navy" />
                <div className="h-16 w-32 rounded-xl bg-grad-sunset" />
                <div className="h-16 w-32 rounded-xl bg-grad-horizon" />
              </div>
            </div>
          </div>
        </Section>

        {/* ---------------- Typography ---------------- */}
        <Section id="typography" title="Typography" description="Sora for display, Inter for body, JetBrains Mono for money.">
          <Card className="flex flex-col gap-4">
            <h1 className="font-display text-4xl font-bold text-ink">Heading / Sora 4xl Bold</h1>
            <h2 className="font-display text-2xl font-bold text-ink">Heading / Sora 2xl Bold</h2>
            <h3 className="font-display text-lg font-semibold text-ink">Heading / Sora lg Semibold</h3>
            <p className="text-sm text-inkSoft">
              Body copy uses Inter at various weights — the workhorse font for tables, forms, and descriptions.
            </p>
            <p className="font-money text-xl font-bold text-ink">{formatMoney(44582.4)}</p>
            <p className="text-xs text-inkMuted">
              {formatDate("2026-08-11")} · {relativeTime("2026-08-11T08:00:00")}
            </p>
          </Card>
        </Section>

        {/* ---------------- Buttons ---------------- */}
        <Section id="buttons" title="Buttons">
          <Card className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="accent">Accent</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" icon={Plus}>Small</Button>
              <Button size="md" icon={Plus}>Medium</Button>
              <Button size="lg" icon={Plus}>Large</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
          </Card>
        </Section>

        {/* ---------------- Forms ---------------- */}
        <Section id="forms" title="Forms">
          <Card className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input label="Email" icon={Mail} placeholder="you@traveldesk.com" required />
            <Input label="Password" type="password" icon={Lock} placeholder="••••••••" error="Password is too short" />
            <Select label="Branch" required defaultValue="manama">
              <option value="manama">Manama</option>
              <option value="dubai">Dubai</option>
              <option value="doha">Doha</option>
            </Select>
            <DatePicker label="Travel date" value="2026-08-20" onChange={() => {}} hint="Departure date" />
            <Textarea label="Notes" placeholder="Internal remarks..." className="sm:col-span-2" />
            <div className="flex flex-col gap-3 sm:col-span-2">
              <Toggle checked={toggleOn} onChange={setToggleOn} label="Auto-send invoice receipts" />
              <SearchInput placeholder="Search customers, invoices..." onSearch={() => {}} className="max-w-sm" />
            </div>
          </Card>
        </Section>

        {/* ---------------- Pills ---------------- */}
        <Section id="pills" title="Status Pills" description="All 8 sale-lifecycle statuses.">
          <Card className="flex flex-wrap gap-2">
            {STATUSES.map((status) => (
              <StatusPill key={status} status={status} />
            ))}
          </Card>
        </Section>

        {/* ---------------- Cards & KPIs ---------------- */}
        <Section id="cards" title="Cards &amp; KPIs">
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPIStatCard icon={DollarSign} label="Revenue (MTD)" value={128450} prefix="BHD " trend={12.4} tone="brand" />
            <KPIStatCard icon={Receipt} label="Invoices" value={342} trend={-3.1} tone="accent" />
            <KPIStatCard icon={Users} label="Active Customers" value={1204} trend={5.8} tone="success" />
            <KPIStatCard icon={TrendingUp} label="Refund Rate" value={4} suffix="%" loading tone="danger" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>Default card</Card>
            <Card hover>Hover card — lift on hover</Card>
            <Card glass>Glass card — blurred surface</Card>
          </div>
        </Section>

        {/* ---------------- Table ---------------- */}
        <Section id="table" title="Table" description="Sticky header, sortable columns, skeleton rows, pagination.">
          <Tabs
            className="mb-4"
            tabs={[
              { id: "all", label: "All invoices", count: FAKE_ROWS.length },
              { id: "loading", label: "Loading state" },
              { id: "empty", label: "Empty state" },
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />

          {activeTab === "all" && (
            <Table<FakeRow>
              columns={[
                { key: "id", label: "Invoice", sortable: true },
                { key: "customer", label: "Customer", sortable: true },
                {
                  key: "status",
                  label: "Status",
                  render: (row) => <StatusPill status={row.status} />,
                },
                {
                  key: "amount",
                  label: "Amount",
                  align: "right",
                  sortable: true,
                  money: true,
                  render: (row) => formatMoney(row.amount),
                },
                {
                  key: "date",
                  label: "Date",
                  sortable: true,
                  render: (row) => formatDate(row.date),
                },
              ]}
              rows={pagedRows}
              page={page}
              pageSize={pageSize}
              total={sortedRows.length}
              onSort={handleSort}
              onPage={setPage}
            />
          )}

          {activeTab === "loading" && (
            <Table<FakeRow>
              columns={[
                { key: "id", label: "Invoice" },
                { key: "customer", label: "Customer" },
                { key: "status", label: "Status" },
                { key: "amount", label: "Amount", align: "right" },
              ]}
              rows={[]}
              loading
            />
          )}

          {activeTab === "empty" && (
            <Table<FakeRow>
              columns={[
                { key: "id", label: "Invoice" },
                { key: "customer", label: "Customer" },
                { key: "status", label: "Status" },
                { key: "amount", label: "Amount", align: "right" },
              ]}
              rows={[]}
              emptyState={{
                icon: Inbox,
                title: "No invoices yet",
                hint: "Invoices you create will show up here.",
                action: { label: "Create invoice", onClick: () => toast.info("Not wired up", "This is a styleguide demo") },
              }}
            />
          )}
        </Section>

        {/* ---------------- Overlays ---------------- */}
        <Section id="overlays" title="Overlays" description="Modal, Drawer, ConfirmDialog, Dropdown, Tooltip.">
          <Card className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={() => setModalOpen(true)}>Open modal</Button>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Open drawer</Button>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>Delete item…</Button>
            <Dropdown
              trigger={<Button variant="ghost">Dropdown menu</Button>}
              items={[
                { label: "Edit", onClick: () => toast.info("Edit clicked") },
                { label: "Duplicate", onClick: () => toast.info("Duplicate clicked") },
                { divider: true },
                { label: "Delete", danger: true, onClick: () => toast.error("Delete clicked") },
              ]}
            />
            <Tooltip content="This is a helpful tooltip">
              <Button variant="ghost" icon={Bell}>Hover me</Button>
            </Tooltip>
          </Card>

          <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create sale">
            <p className="text-sm text-inkSoft">This is a demo modal — scale-in with backdrop blur, ESC + backdrop to close, and a focus trap.</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setModalOpen(false)}>Save</Button>
            </div>
          </Modal>

          <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Invoice details">
            <div className="flex flex-col gap-4">
              <p className="text-sm text-inkSoft">A 480px right-side drawer with spring physics.</p>
              <Input label="Customer" defaultValue="Layla Haddad" />
              <Input label="Amount" defaultValue="1,245.500" className="font-money" />
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Close</Button>
                <Button variant="primary" onClick={() => setDrawerOpen(false)}>Update</Button>
              </div>
            </div>
          </Drawer>

          <ConfirmDialog
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            title="Delete this sale?"
            body="This action cannot be undone. The record will be permanently removed."
            confirmLabel="Delete"
            danger
            onConfirm={() => toast.success("Deleted", "The record was removed")}
          />
        </Section>

        {/* ---------------- Feedback ---------------- */}
        <Section id="feedback" title="Feedback" description="Toasts, skeletons, progress, empty state.">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <p className="label mb-3">Toasts</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => toast.success("Saved", "Your changes were saved")}>Success</Button>
                <Button variant="secondary" onClick={() => toast.error("Failed", "Something went wrong")}>Error</Button>
                <Button variant="secondary" onClick={() => toast.info("Heads up", "Just an FYI")}>Info</Button>
              </div>
            </Card>

            <Card>
              <p className="label mb-3">Skeletons</p>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </Card>

            <Card>
              <p className="label mb-3">Progress</p>
              <div className="flex flex-col gap-4">
                <ProgressBar value={68} tone="brand" />
                <ProgressBar value={34} tone="accent" />
                <div className="flex gap-4">
                  <ProgressRing value={72} />
                  <ProgressRing value={40} size={56} strokeWidth={6} />
                </div>
              </div>
            </Card>

            <Card>
              <p className="label mb-3">Empty state</p>
              <EmptyState
                icon={Compass}
                title="Nothing here yet"
                hint="Create your first record to get started."
                action={{ label: "Get started", onClick: () => toast.info("Not wired up") }}
              />
            </Card>
          </div>
        </Section>

        {/* ---------------- Avatars ---------------- */}
        <Section id="avatars" title="Avatars">
          <Card className="flex items-center gap-3">
            <Avatar name="Layla Haddad" size="sm" />
            <Avatar name="Omar Nasser" size="md" />
            <Avatar name="Sara Al-Amin" size="lg" />
          </Card>
        </Section>
      </div>
    </div>
  );
}
