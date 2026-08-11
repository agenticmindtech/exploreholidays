import StatusPill, { type SaleStatus as PillStatus } from "@/components/ui/StatusPill";
import type { AuditLog } from "@/lib/types";

const STATUS_KEYS = new Set(["status", "pendingState"]);
const VALID_SALE_STATUSES = new Set(["draft", "submitted", "verified", "posted", "returned", "refunded", "pending", "cancelled"]);

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

interface AuditDiffProps {
  log: AuditLog;
}

export default function AuditDiff({ log }: AuditDiffProps) {
  const entries = Object.entries(log.changes ?? {});
  const showStatusTransition = log.fromStatus !== null && log.toStatus !== null && log.fromStatus !== log.toStatus;

  if (entries.length === 0 && !showStatusTransition && !log.note) {
    return <p className="px-4 py-3 text-xs text-inkMuted">No field-level changes recorded for this entry.</p>;
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {showStatusTransition && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-inkMuted">Status</span>
          {VALID_SALE_STATUSES.has(String(log.fromStatus)) ? (
            <StatusPill status={log.fromStatus as PillStatus} className="opacity-60" />
          ) : (
            <span className="text-inkMuted line-through">{formatValue(log.fromStatus)}</span>
          )}
          <span className="text-inkMuted">→</span>
          {VALID_SALE_STATUSES.has(String(log.toStatus)) ? (
            <StatusPill status={log.toStatus as PillStatus} />
          ) : (
            <span className="font-semibold text-ink">{formatValue(log.toStatus)}</span>
          )}
        </div>
      )}

      {entries.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-inkMuted">
              <th className="pb-1.5 pr-3 font-semibold">Field</th>
              <th className="pb-1.5 pr-3 font-semibold">Before</th>
              <th className="pb-1.5 font-semibold">After</th>
            </tr>
          </thead>
          <tbody>
            {entries
              .filter(([key]) => !STATUS_KEYS.has(key))
              .map(([key, change]) => (
                <tr key={key} className="border-t border-line">
                  <td className="py-1.5 pr-3 font-medium capitalize text-inkSoft">{key.replace(/([A-Z])/g, " $1").trim()}</td>
                  <td className="py-1.5 pr-3 text-danger-600 line-through">{formatValue(change.from)}</td>
                  <td className="py-1.5 font-semibold text-success-600">{formatValue(change.to)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      {log.note && (
        <p className="rounded-lg bg-subtle px-3 py-2 text-xs text-inkSoft">
          <span className="font-semibold text-ink">Note: </span>
          {log.note}
        </p>
      )}
    </div>
  );
}
