"use client";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Toggle from "@/components/ui/Toggle";
import type { Settings } from "@/lib/types";

const MONTH_OPTIONS = [
  { value: "01-01", label: "January" },
  { value: "04-01", label: "April" },
  { value: "07-01", label: "July" },
  { value: "10-01", label: "October" },
];

interface SettingsFormProps {
  value: Settings;
  onChange: (next: Settings) => void;
}

export default function SettingsForm({ value, onChange }: SettingsFormProps) {
  function set<K extends keyof Settings>(key: K, v: Settings[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4">
        <p className="font-display text-sm font-bold text-ink">Agency Profile</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Agency name" required value={value.agencyName} onChange={(e) => set("agencyName", e.target.value)} />
          <Input label="Logo URL" value={value.logo} onChange={(e) => set("logo", e.target.value)} hint="Shown on exports and invoice headers." />
        </div>
        {value.logo && (
          <div className="flex items-center gap-3 rounded-xl bg-subtle p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.logo}
              alt="Logo preview"
              className="h-12 w-12 rounded-lg object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
              }}
            />
            <span className="text-xs text-inkMuted">Live preview</span>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Address" value={value.address} onChange={(e) => set("address", e.target.value)} />
          <Input label="Phone" value={value.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <p className="font-display text-sm font-bold text-ink">Finance</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Currency code" required value={value.currency} onChange={(e) => set("currency", e.target.value.toUpperCase().slice(0, 3))} hint="e.g. BHD" />
          <Select label="Decimal places" value={String(value.currencyDecimals)} onChange={(e) => set("currencyDecimals", Number(e.target.value) as 2 | 3)}>
            <option value="2">2 decimals</option>
            <option value="3">3 decimals</option>
          </Select>
          <Input
            label="VAT %"
            type="number"
            value={String(value.vatPercent)}
            onChange={(e) => set("vatPercent", Number(e.target.value) || 0)}
          />
          <Select label="Fiscal year start" value={value.fiscalYearStart} onChange={(e) => set("fiscalYearStart", e.target.value)}>
            {MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
          <Input
            label="Receivable due days"
            type="number"
            value={String(value.receivableDueDays)}
            onChange={(e) => set("receivableDueDays", Number(e.target.value) || 0)}
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <p className="font-display text-sm font-bold text-ink">Behavior</p>
        <Toggle checked={value.duplicateCheckEnabled} onChange={(v) => set("duplicateCheckEnabled", v)} label="Warn on possible duplicate bookings" />
        <Select label="Default theme" value={value.defaultTheme} onChange={(e) => set("defaultTheme", e.target.value as Settings["defaultTheme"])}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </Select>
      </Card>
    </div>
  );
}
