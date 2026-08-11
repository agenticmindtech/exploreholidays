import Link from "next/link";
import {
  Banknote,
  CheckCircle2,
  FileEdit,
  HandCoins,
  Inbox,
  LogIn,
  Pencil,
  RotateCcw,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  Undo2,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import type { AuditAction, AuditLog } from "@/lib/types";
import { relativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const ACTION_META: Record<AuditAction, { icon: LucideIcon; tone: string; verb: string }> = {
  create: { icon: FileEdit, tone: "bg-subtle text-inkMuted", verb: "created" },
  update: { icon: Pencil, tone: "bg-info-50 text-info-600", verb: "updated" },
  submit: { icon: Send, tone: "bg-primary-50 text-primary-600", verb: "submitted" },
  verify: { icon: ShieldCheck, tone: "bg-accent-50 text-accent-600", verb: "verified" },
  return: { icon: Undo2, tone: "bg-warning-50 text-warning-600", verb: "returned" },
  post: { icon: CheckCircle2, tone: "bg-success-50 text-success-600", verb: "posted" },
  cancel: { icon: XCircle, tone: "bg-danger-50 text-danger-600", verb: "cancelled" },
  delete: { icon: Trash2, tone: "bg-danger-50 text-danger-600", verb: "deleted" },
  payment: { icon: Banknote, tone: "bg-success-50 text-success-600", verb: "recorded a payment on" },
  refund_advance: { icon: RotateCcw, tone: "bg-accent-50 text-accent-600", verb: "advanced the refund for" },
  topup: { icon: Wallet, tone: "bg-success-50 text-success-600", verb: "topped up" },
  settlement: { icon: Wallet, tone: "bg-primary-50 text-primary-600", verb: "settled" },
  loan: { icon: HandCoins, tone: "bg-accent-50 text-accent-600", verb: "issued a loan for" },
  installment: { icon: HandCoins, tone: "bg-info-50 text-info-600", verb: "recorded an installment on" },
  login: { icon: LogIn, tone: "bg-subtle text-inkMuted", verb: "logged in" },
  settings: { icon: Settings, tone: "bg-subtle text-inkMuted", verb: "updated settings" },
};

interface ActivityFeedProps {
  logs: AuditLog[];
  loading?: boolean;
  emptyHint?: string;
  linkFor?: (log: AuditLog) => string | undefined;
}

export default function ActivityFeed({ logs, loading = false, emptyHint = "Activity will show up here.", linkFor }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return <EmptyState icon={Inbox} title="No recent activity" hint={emptyHint} />;
  }

  return (
    <div className="flex flex-col divide-y divide-line">
      {logs.map((log) => {
        const meta = ACTION_META[log.action];
        const Icon = meta.icon;
        const href = linkFor?.(log);
        const row = (
          <div className="flex items-center gap-3 py-2.5">
            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", meta.tone)}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink">
                <span className="font-semibold">{log.userName}</span> {meta.verb}{" "}
                <span className="font-money text-inkSoft">{log.entityId}</span>
              </p>
              <p className="text-xs text-inkMuted">{relativeTime(log.timestamp)}</p>
            </div>
          </div>
        );
        return href ? (
          <Link key={log.id} href={href} className="-mx-2 rounded-lg px-2 hover:bg-subtle">
            {row}
          </Link>
        ) : (
          <div key={log.id}>{row}</div>
        );
      })}
    </div>
  );
}
