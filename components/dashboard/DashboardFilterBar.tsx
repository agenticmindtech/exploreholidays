"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Branch, DatePreset, Filters, SessionUser } from "@/lib/types";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import { cn } from "@/lib/utils/cn";

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
];

interface DashboardFilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  branches?: Branch[];
  staffUsers?: SessionUser[];
}

export default function DashboardFilterBar({ filters, onChange, branches, staffUsers }: DashboardFilterBarProps) {
  const [customOpen, setCustomOpen] = useState(false);

  function setPreset(preset: DatePreset) {
    onChange({ ...filters, preset, dateFrom: undefined, dateTo: undefined });
    setCustomOpen(false);
  }

  function clearDate() {
    onChange({ ...filters, preset: undefined, dateFrom: undefined, dateTo: undefined });
  }

  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.dateFrom || filters.dateTo) {
    activeChips.push({ key: "range", label: `${filters.dateFrom ?? "…"} → ${filters.dateTo ?? "…"}`, clear: clearDate });
  }
  if (filters.branchId) {
    activeChips.push({
      key: "branch",
      label: branches?.find((b) => b.id === filters.branchId)?.name ?? "Branch",
      clear: () => onChange({ ...filters, branchId: undefined }),
    });
  }
  if (filters.staffId) {
    activeChips.push({
      key: "staff",
      label: staffUsers?.find((s) => s.id === filters.staffId)?.name ?? "Staff",
      clear: () => onChange({ ...filters, staffId: undefined }),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPreset(p.value)}
            className={cn(
              "pill min-h-[40px] cursor-pointer border px-3",
              filters.preset === p.value ? "border-primary-500 bg-primary-50 text-primary-700" : "border-line text-inkSoft hover:border-primary-300"
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen((o) => !o)}
          className={cn(
            "pill min-h-[40px] cursor-pointer border px-3",
            filters.dateFrom || filters.dateTo ? "border-primary-500 bg-primary-50 text-primary-700" : "border-line text-inkSoft hover:border-primary-300"
          )}
        >
          Custom range
        </button>

        {branches && branches.length > 0 && (
          <div className="w-44">
            <Select value={filters.branchId ?? ""} onChange={(e) => onChange({ ...filters, branchId: e.target.value || undefined })}>
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {staffUsers && staffUsers.length > 0 && (
          <div className="w-44">
            <Select value={filters.staffId ?? ""} onChange={(e) => onChange({ ...filters, staffId: e.target.value || undefined })}>
              <option value="">All staff</option>
              {staffUsers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {customOpen && (
        <div className="card flex flex-wrap items-end gap-3 p-4">
          <DatePicker
            label="From"
            value={filters.dateFrom ?? ""}
            onChange={(v) => onChange({ ...filters, preset: undefined, dateFrom: v })}
            max={filters.dateTo}
          />
          <DatePicker
            label="To"
            value={filters.dateTo ?? ""}
            onChange={(v) => onChange({ ...filters, preset: undefined, dateTo: v })}
            min={filters.dateFrom}
          />
        </div>
      )}

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <span key={chip.key} className="inline-flex items-center gap-1.5 rounded-full bg-subtle px-3 py-1 text-xs font-medium text-inkSoft">
              {chip.label}
              <button type="button" onClick={chip.clear} aria-label={`Clear ${chip.label}`} className="text-inkMuted hover:text-danger-600">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
