"use client";

import { useEffect, useState } from "react";
import { Copy, Save, Target as TargetIcon } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Avatar from "@/components/ui/Avatar";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/stores/authStore";
import { usersApi } from "@/lib/api/usersApi";
import { targetsApi } from "@/lib/api/targetsApi";
import type { SessionUser, Target } from "@/lib/types";
import { formatMoney } from "@/lib/utils/format";

function currentMonthStr() {
  return new Date().toISOString().slice(0, 7);
}

function prevMonthStr(month: string) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 7);
}

interface RowState {
  salesCountTarget: string;
  revenueTarget: string;
  profitTarget: string;
  dirty: boolean;
}

interface TargetsGridModeProps {
  title: string;
  icon: string;
  subtitle?: string;
}

export default function TargetsGridMode({ title, subtitle }: TargetsGridModeProps) {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const [month, setMonth] = useState(currentMonthStr());
  const [staffUsers, setStaffUsers] = useState<SessionUser[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    usersApi.list({ pageSize: 200 }).then((e) => setStaffUsers(e.rows.filter((u) => u.role === "staff")));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });
    targetsApi.list({ search: month, pageSize: 500 }).then((envelope) => {
      if (cancelled) return;
      setTargets(envelope.rows);
      const next: Record<string, RowState> = {};
      for (const t of envelope.rows) {
        next[t.staffId] = {
          salesCountTarget: String(t.salesCountTarget),
          revenueTarget: t.revenueTarget.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
          profitTarget: t.profitTarget.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
          dirty: false,
        };
      }
      setRowState(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [month]);

  function fieldFor(staffId: string): RowState {
    return rowState[staffId] ?? { salesCountTarget: "0", revenueTarget: "0.000", profitTarget: "0.000", dirty: false };
  }

  function updateField(staffId: string, key: keyof Omit<RowState, "dirty">, raw: string) {
    if (!/^\d*\.?\d*$/.test(raw)) return;
    setRowState((prev) => ({ ...prev, [staffId]: { ...fieldFor(staffId), [key]: raw, dirty: true } }));
  }

  async function handleSave(staffId: string) {
    if (!user) return;
    const state = fieldFor(staffId);
    setSavingId(staffId);
    try {
      await targetsApi.upsert(
        {
          staffId,
          month,
          salesCountTarget: Number(state.salesCountTarget) || 0,
          revenueTarget: Number(state.revenueTarget.replace(/,/g, "")) || 0,
          profitTarget: Number(state.profitTarget.replace(/,/g, "")) || 0,
        },
        user.id
      );
      toast.success("Target saved", staffUsers.find((s) => s.id === staffId)?.name);
      setRowState((prev) => ({ ...prev, [staffId]: { ...fieldFor(staffId), dirty: false } }));
      const envelope = await targetsApi.list({ search: month, pageSize: 500 });
      setTargets(envelope.rows);
    } catch (err) {
      toast.error("Could not save target", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleCopyFromLastMonth() {
    setCopying(true);
    try {
      const prevMonth = prevMonthStr(month);
      const envelope = await targetsApi.list({ search: prevMonth, pageSize: 500 });
      if (envelope.rows.length === 0) {
        toast.info("Nothing to copy", `No targets found for ${prevMonth}.`);
        return;
      }
      setRowState((prev) => {
        const next = { ...prev };
        for (const t of envelope.rows) {
          next[t.staffId] = {
            salesCountTarget: String(t.salesCountTarget),
            revenueTarget: t.revenueTarget.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
            profitTarget: t.profitTarget.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
            dirty: true,
          };
        }
        return next;
      });
      toast.success("Copied from last month", `${envelope.rows.length} target(s) prefilled — review and Save each row.`);
    } catch (err) {
      toast.error("Could not copy last month's targets", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumb="Admin / Targets"
        actions={
          <div className="flex items-center gap-2">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input w-auto min-h-[40px] py-1.5 text-sm" aria-label="Select month" />
            <Button variant="secondary" icon={Copy} loading={copying} onClick={handleCopyFromLastMonth}>
              Copy from last month
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : staffUsers.length === 0 ? (
        <EmptyState icon={TargetIcon} title="No staff yet" hint="Add staff members before setting targets." />
      ) : (
        <div className="stagger flex flex-col gap-3">
          {staffUsers.map((staff) => {
            const target = targets.find((t) => t.staffId === staff.id);
            const state = fieldFor(staff.id);
            return (
              <Card key={staff.id} className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Avatar name={staff.name} size="sm" />
                  <p className="text-sm font-semibold text-ink">{staff.name}</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Input
                    label="Sales count target"
                    value={state.salesCountTarget}
                    onChange={(e) => updateField(staff.id, "salesCountTarget", e.target.value)}
                    hint={target ? `Achieved: ${target.achievedCount}` : undefined}
                  />
                  <Input
                    label="Revenue target"
                    className="font-money"
                    value={state.revenueTarget}
                    onChange={(e) => updateField(staff.id, "revenueTarget", e.target.value)}
                    hint={target ? `Achieved: ${formatMoney(target.achievedRevenue)}` : undefined}
                  />
                  <Input
                    label="Profit target"
                    className="font-money"
                    value={state.profitTarget}
                    onChange={(e) => updateField(staff.id, "profitTarget", e.target.value)}
                    hint={target ? `Achieved: ${formatMoney(target.achievedProfit)}` : undefined}
                  />
                </div>
                <div className="flex justify-end">
                  <Button variant="primary" size="sm" icon={Save} loading={savingId === staff.id} disabled={!state.dirty} onClick={() => handleSave(staff.id)}>
                    Save
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
