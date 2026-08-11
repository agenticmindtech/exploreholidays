import { CheckCircle2, FileEdit, Pencil, Send, ShieldCheck, Undo2, XCircle, type LucideIcon } from "lucide-react";
import type { AuditAction, AuditLog } from "@/lib/types";
import { relativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const ACTION_ICON: Partial<Record<AuditAction, LucideIcon>> = {
  create: FileEdit,
  update: Pencil,
  submit: Send,
  verify: ShieldCheck,
  post: CheckCircle2,
  return: Undo2,
  cancel: XCircle,
};

const ACTION_TONE: Partial<Record<AuditAction, string>> = {
  create: "bg-subtle text-inkMuted",
  update: "bg-info-50 text-info-600",
  submit: "bg-primary-50 text-primary-600",
  verify: "bg-accent-50 text-accent-600",
  post: "bg-success-50 text-success-600",
  return: "bg-warning-50 text-warning-600",
  cancel: "bg-danger-50 text-danger-600",
};

const ACTION_LABEL: Partial<Record<AuditAction, string>> = {
  create: "Created",
  update: "Updated",
  submit: "Submitted",
  verify: "Verified",
  post: "Posted",
  return: "Returned",
  cancel: "Cancelled",
};

export default function SaleStatusTimeline({ auditLogs }: { auditLogs: AuditLog[] }) {
  const sorted = [...auditLogs].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  if (sorted.length === 0) {
    return <p className="text-sm text-inkMuted">No activity yet.</p>;
  }

  return (
    <div className="flex flex-col">
      {sorted.map((log, i) => {
        const Icon = ACTION_ICON[log.action] ?? FileEdit;
        const reasonChange = log.changes?.returnReason;
        return (
          <div key={log.id} className="relative flex gap-3 pb-6 last:pb-0">
            {i < sorted.length - 1 && <span className="absolute left-4 top-9 h-full w-px bg-line" />}
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                ACTION_TONE[log.action] ?? "bg-subtle text-inkMuted"
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm font-semibold text-ink">
                {ACTION_LABEL[log.action] ?? log.action} <span className="font-normal text-inkMuted">by {log.userName}</span>
              </p>
              <p className="text-xs text-inkMuted">{relativeTime(log.timestamp)}</p>
              {reasonChange && <p className="mt-1 text-xs text-danger-600">Reason: {String(reasonChange.to)}</p>}
              {log.note && <p className="mt-1 text-xs text-inkSoft">{log.note}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
