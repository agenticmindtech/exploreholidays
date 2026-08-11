"use client";

import { useEffect, useState } from "react";
import {
  BedDouble,
  Car,
  MoreHorizontal,
  Moon,
  Package,
  Pencil,
  Plane,
  Plus,
  Search,
  ShieldCheck,
  Ship,
  Stamp,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import SearchInput from "@/components/ui/SearchInput";
import Table, { type TableColumn } from "@/components/ui/Table";
import Drawer from "@/components/ui/Drawer";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Toggle from "@/components/ui/Toggle";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/stores/authStore";
import type { CrudConfig, CrudFormField } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import TargetsGridMode from "./TargetsGridMode";

const COLOR_SWATCHES = ["#0E7C86", "#17989F", "#38B6BC", "#3F6AB1", "#16244A", "#F5920B", "#FBB024", "#10B981", "#F59E0B", "#F43F5E", "#0EA5E9", "#8B5CF6"];

const ICON_PICKER_OPTIONS: { name: string; Icon: LucideIcon }[] = [
  { name: "Plane", Icon: Plane },
  { name: "BedDouble", Icon: BedDouble },
  { name: "Stamp", Icon: Stamp },
  { name: "Package", Icon: Package },
  { name: "Ship", Icon: Ship },
  { name: "Moon", Icon: Moon },
  { name: "ShieldCheck", Icon: ShieldCheck },
  { name: "Car", Icon: Car },
  { name: "MoreHorizontal", Icon: MoreHorizontal },
];

function moneyInputHandlers(value: string, setValue: (v: string) => void) {
  return {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const stripped = e.target.value.replace(/,/g, "");
      if (/^\d*\.?\d*$/.test(stripped)) setValue(stripped);
    },
    onBlur: () => {
      const n = Math.max(0, Number(value.replace(/,/g, "")) || 0);
      setValue(n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }));
    },
  };
}

interface CrudPageProps<T extends { id: string }> {
  config: CrudConfig<T>;
  subtitle?: string;
}

export default function CrudPage<T extends { id: string }>({ config, subtitle }: CrudPageProps<T>) {
  if (config.mode === "grid") {
    return <TargetsGridMode title={config.title} icon={config.icon} subtitle={subtitle} />;
  }
  return <StandardCrud config={config} subtitle={subtitle} />;
}

function StandardCrud<T extends { id: string }>({ config, subtitle }: CrudPageProps<T>) {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<T | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [deleteChecking, setDeleteChecking] = useState(false);
  const [editActionBusy, setEditActionBusy] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ action: NonNullable<CrudConfig<T>["editOnlyActions"]>[number]; row: T } | null>(null);

  const PAGE_SIZE = 10;

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });
    config.api.list({ pageSize: 1000 }).then((envelope) => {
      if (cancelled) return;
      setRows(envelope.rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  useEffect(() => {
    Promise.resolve().then(() => setPage(1));
  }, [query]);

  const filteredRows = query.trim()
    ? rows.filter((row) =>
        config.searchKeys.some((key) => String((row as Record<string, unknown>)[key] ?? "").toLowerCase().includes(query.trim().toLowerCase()))
      )
    : rows;
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openCreate() {
    setEditingRow(null);
    const defaults: Record<string, unknown> = {};
    for (const field of config.form) {
      if (field.type === "toggle") defaults[field.name] = false;
      else if (field.type === "money" || field.type === "number") defaults[field.name] = "0";
      else defaults[field.name] = "";
    }
    setFormData(defaults);
    setFormErrors({});
    setDrawerOpen(true);
  }

  function openEdit(row: T) {
    setEditingRow(row);
    const data: Record<string, unknown> = {};
    for (const field of config.form) {
      const raw = (row as Record<string, unknown>)[field.name];
      if (field.type === "money" && typeof raw === "number") {
        data[field.name] = raw.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
      } else {
        data[field.name] = raw ?? (field.type === "toggle" ? false : "");
      }
    }
    setFormData(data);
    setFormErrors({});
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingRow(null);
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    for (const field of config.form) {
      if (field.showWhen && String(formData[field.showWhen.field] ?? "") !== field.showWhen.equals) continue;
      if (field.required) {
        const v = formData[field.name];
        if (v === undefined || v === null || String(v).trim() === "") errors[field.name] = `${field.label} is required.`;
      }
    }
    for (const key of config.rules.uniqueKeys ?? []) {
      const value = String(formData[key as string] ?? "").trim().toLowerCase();
      if (!value) continue;
      const clash = rows.some((r) => {
        if (editingRow && (r as { id: string }).id === editingRow.id) return false;
        return String((r as Record<string, unknown>)[key as string] ?? "").trim().toLowerCase() === value;
      });
      if (clash) errors[key as string] = `This ${String(key)} is already in use.`;
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!user || !validate()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const field of config.form) {
        const raw = formData[field.name];
        if (field.type === "money" || field.type === "number") {
          payload[field.name] = Number(String(raw).replace(/,/g, "")) || 0;
        } else {
          payload[field.name] = raw;
        }
      }

      if (editingRow) {
        await config.api.update(editingRow.id, payload, user.id);
        toast.success(`${config.title.replace(/s$/, "")} updated`, String(payload.name ?? ""));
      } else {
        await config.api.create(payload, user.id);
        toast.success(`${config.title.replace(/s$/, "")} created`, String(payload.name ?? ""));
      }
      closeDrawer();
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error("Could not save", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditOnlyAction(action: NonNullable<CrudConfig<T>["editOnlyActions"]>[number], row: T) {
    setEditActionBusy(action.label);
    try {
      await action.onClick(row);
      toast.success(action.label);
    } catch (err) {
      toast.error(`Could not ${action.label.toLowerCase()}`, err instanceof Error ? err.message : "Please try again.");
    } finally {
      setEditActionBusy(null);
    }
  }

  function handleEditOnlyActionClick(action: NonNullable<CrudConfig<T>["editOnlyActions"]>[number], row: T) {
    if (action.confirm) {
      setPendingAction({ action, row });
    } else {
      handleEditOnlyAction(action, row);
    }
  }

  async function handleDeleteClick(row: T) {
    if (config.rules.deleteGuard) {
      setDeleteChecking(true);
      try {
        const reason = await config.rules.deleteGuard(row);
        if (reason) {
          toast.error(`Can't delete this ${config.title.toLowerCase().replace(/s$/, "")}`, reason);
          return;
        }
      } catch (err) {
        toast.error("Could not check delete eligibility", err instanceof Error ? err.message : "Please try again.");
        return;
      } finally {
        setDeleteChecking(false);
      }
    }
    setDeleteTarget(row);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget || !user) return;
    try {
      await config.api.delete(deleteTarget.id, user.id);
      toast.success(`${config.title.replace(/s$/, "")} deleted`);
      setDeleteTarget(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error("Could not delete", err instanceof Error ? err.message : "Please try again.");
    }
  }

  async function handleToggleActive(row: T) {
    if (!user) return;
    const isActive = (row as Record<string, unknown>).isActive as boolean;
    // Optimistic: flip immediately so the toggle feels instant (acceptance checklist),
    // then revert + surface an error toast if the API call actually fails.
    setRows((prev) => prev.map((r) => (r.id === row.id ? ({ ...r, isActive: !isActive } as T) : r)));
    try {
      await config.api.update(row.id, { isActive: !isActive }, user.id);
      toast.success(!isActive ? "Activated" : "Deactivated");
    } catch (err) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? ({ ...r, isActive } as T) : r)));
      toast.error("Could not update status", err instanceof Error ? err.message : "Please try again.");
    }
  }

  const tableColumns: TableColumn<T>[] = [
    ...config.columns.map((c) => ({ key: c.key, label: c.label, render: c.render })),
    ...(config.hasActiveToggle
      ? [
          {
            key: "isActive",
            label: "Active",
            render: (row: T) => (
              <Toggle checked={!!(row as Record<string, unknown>).isActive} onChange={() => handleToggleActive(row)} />
            ),
          },
        ]
      : []),
    {
      key: "actions",
      label: "",
      align: "right" as const,
      render: (row: T) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" icon={Pencil} onClick={() => openEdit(row)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" icon={Trash2} className="text-danger-600 hover:text-danger-700" onClick={() => handleDeleteClick(row)} disabled={deleteChecking}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={config.title}
        subtitle={subtitle}
        breadcrumb={`Admin / ${config.title}`}
        actions={
          <Button variant="primary" icon={Plus} onClick={openCreate}>
            Add {config.title.replace(/s$/, "")}
          </Button>
        }
      />

      <div className="stagger flex flex-col gap-4">
        <SearchInput className="w-full max-w-sm" placeholder={`Search ${config.title.toLowerCase()}...`} onSearch={setQuery} />

        <Table<T>
          columns={tableColumns}
          rows={pageRows}
          loading={loading}
          page={page}
          pageSize={PAGE_SIZE}
          total={filteredRows.length}
          onPage={setPage}
          emptyState={{ icon: Search, title: `No ${config.title.toLowerCase()} found`, hint: "Try a different search, or add a new one." }}
        />
      </div>

      <Drawer open={drawerOpen} onClose={closeDrawer} title={editingRow ? `Edit ${config.title.replace(/s$/, "")}` : `Add ${config.title.replace(/s$/, "")}`}>
        <div className="flex flex-col gap-4">
          {config.form
            .filter((field) => !field.showWhen || String(formData[field.showWhen.field] ?? "") === field.showWhen.equals)
            .map((field) => (
              <CrudFormFieldInput key={field.name} field={field} value={formData[field.name]} error={formErrors[field.name]} onChange={(v) => setFormData((d) => ({ ...d, [field.name]: v }))} />
            ))}

          {editingRow && config.readOnlyStats && (
            <div className="grid grid-cols-3 gap-2">
              {config.readOnlyStats(editingRow).map((stat) => (
                <div key={stat.label} className="rounded-xl bg-subtle p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-inkMuted">{stat.label}</p>
                  <p className="font-money text-sm font-bold text-inkSoft">{stat.value}</p>
                </div>
              ))}
            </div>
          )}

          {editingRow && config.editOnlyActions && config.editOnlyActions.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              {config.editOnlyActions.map((action) => (
                <Button
                  key={action.label}
                  variant="secondary"
                  size="sm"
                  loading={editActionBusy === action.label}
                  onClick={() => handleEditOnlyActionClick(action, editingRow)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}

          <div className="mt-2 flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="secondary" onClick={closeDrawer}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={handleSubmit}>
              {editingRow ? "Save changes" : `Create ${config.title.replace(/s$/, "")}`}
            </Button>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`Delete this ${config.title.toLowerCase().replace(/s$/, "")}?`}
        body="This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirm}
      />

      <ConfirmDialog
        open={!!pendingAction}
        onClose={() => setPendingAction(null)}
        title={`${pendingAction?.action.label}?`}
        body={pendingAction?.action.confirm}
        confirmLabel={pendingAction?.action.label}
        danger
        onConfirm={() => {
          if (pendingAction) handleEditOnlyAction(pendingAction.action, pendingAction.row);
        }}
      />
    </div>
  );
}

interface CrudFormFieldInputProps {
  field: CrudFormField;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}

function CrudFormFieldInput({ field, value, error, onChange }: CrudFormFieldInputProps) {
  switch (field.type) {
    case "toggle":
      return <Toggle checked={!!value} onChange={onChange} label={field.label} />;

    case "select":
      return (
        <Select label={field.label} required={field.required} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} hint={field.hint}>
          <option value="">Select {field.label.toLowerCase()}</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      );

    case "money": {
      const handlers = moneyInputHandlers(String(value ?? "0"), onChange);
      return <Input label={field.label} required={field.required} className="font-money" hint={field.hint} error={error} {...handlers} />;
    }

    case "number":
      return (
        <Input
          label={field.label}
          required={field.required}
          type="number"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          hint={field.hint}
          error={error}
        />
      );

    case "month":
      return (
        <div className="w-full">
          <label className="label">
            {field.label}
            {field.required && <span className="ml-0.5 text-danger-500">*</span>}
          </label>
          <input type="month" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={cn("input", error && "input-error")} />
          {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
        </div>
      );

    case "color":
      return (
        <div className="w-full">
          <label className="label">
            {field.label}
            {field.required && <span className="ml-0.5 text-danger-500">*</span>}
          </label>
          <div className="flex flex-wrap gap-2">
            {COLOR_SWATCHES.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => onChange(hex)}
                aria-label={hex}
                className={cn("h-8 w-8 rounded-lg border-2 transition-transform hover:scale-110", value === hex ? "border-ink" : "border-transparent")}
                style={{ background: hex }}
              />
            ))}
          </div>
          {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
        </div>
      );

    case "icon":
      return (
        <div className="w-full">
          <label className="label">
            {field.label}
            {field.required && <span className="ml-0.5 text-danger-500">*</span>}
          </label>
          <div className="flex flex-wrap gap-2">
            {ICON_PICKER_OPTIONS.map(({ name, Icon }) => (
              <button
                key={name}
                type="button"
                onClick={() => onChange(name)}
                aria-label={name}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
                  value === name ? "border-primary-500 bg-primary-50 text-primary-600" : "border-line text-inkMuted hover:border-primary-300"
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
        </div>
      );

    case "email":
      return (
        <Input
          label={field.label}
          required={field.required}
          type="email"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          hint={field.hint}
          error={error}
        />
      );

    case "text":
    default:
      return (
        <Input label={field.label} required={field.required} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} hint={field.hint} error={error} />
      );
  }
}
