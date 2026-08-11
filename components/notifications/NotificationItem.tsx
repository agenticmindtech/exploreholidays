"use client";

import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, RotateCcw, Send, ShieldCheck, Target, Wallet, type LucideIcon } from "lucide-react";
import { useAuthStore } from "@/lib/stores/authStore";
import { useNotificationStore } from "@/lib/stores/notificationStore";
import { useToast } from "@/components/ui/Toast";
import { can, landingFor } from "@/lib/auth/permissions";
import type { AppNotification, NotificationType, Role } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { relativeTime } from "@/lib/utils/format";

const TYPE_META: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
  sale_submitted: { icon: Send, tone: "bg-info-50 text-info-600" },
  sale_returned: { icon: RotateCcw, tone: "bg-warning-50 text-warning-700" },
  sale_verified: { icon: ShieldCheck, tone: "bg-status-verified/10 text-status-verified" },
  sale_posted: { icon: CheckCircle2, tone: "bg-success-50 text-success-600" },
  refund_update: { icon: RotateCcw, tone: "bg-accent-50 text-accent-700" },
  payment_received: { icon: Wallet, tone: "bg-success-50 text-success-600" },
  target_alert: { icon: Target, tone: "bg-accent-50 text-accent-700" },
  system: { icon: Bell, tone: "bg-subtle text-inkMuted" },
};

const SALE_TYPES = new Set<NotificationType>(["sale_submitted", "sale_returned", "sale_verified", "sale_posted"]);

/**
 * The single type→route map hard rule 8 requires. Resolves an intended target, then
 * falls back to the caller's own landing page if their role can't actually reach it —
 * spec calls this out for staff hitting a finance route, but the same rule applies to
 * any role (e.g. accounts/manager have no accessible sale-detail route at all).
 */
export function resolveNotificationRoute(notification: AppNotification, role: Role): string | null {
  let target: string | null = null;

  if (SALE_TYPES.has(notification.type)) {
    target = notification.entityId ? `/staff/sales/${notification.entityId}` : null;
  } else if (notification.type === "refund_update") {
    target = "/accounts/refunds";
  } else if (notification.type === "payment_received") {
    target = "/accounts/receivables";
  } else if (notification.type === "target_alert") {
    target = role === "staff" ? "/staff/performance" : landingFor(role);
  } else {
    target = null; // system
  }

  if (target && !can(role, target)) target = landingFor(role);
  return target;
}

interface NotificationItemProps {
  notification: AppNotification;
  compact?: boolean;
  onNavigate?: () => void;
}

export default function NotificationItem({ notification, compact = false, onNavigate }: NotificationItemProps) {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const markRead = useNotificationStore((s) => s.markRead);
  const meta = TYPE_META[notification.type];
  const Icon = meta.icon;

  async function handleClick() {
    if (!notification.isRead) {
      try {
        await markRead(notification.id);
      } catch (err) {
        toast.error("Could not mark as read", err instanceof Error ? err.message : "Please try again.");
      }
    }
    if (user) {
      const target = resolveNotificationRoute(notification, user.role);
      if (target) router.push(target);
    }
    onNavigate?.();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn("flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-subtle", !notification.isRead && "bg-primary-50/40")}
    >
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", meta.tone)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold text-ink", compact && "truncate")}>{notification.title}</p>
        <p className={cn("text-xs text-inkMuted", compact ? "line-clamp-1" : "line-clamp-2")}>{notification.body}</p>
        <p className="mt-0.5 text-[11px] text-inkMuted">{relativeTime(notification.createdAt)}</p>
      </div>
      {!notification.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500" />}
    </button>
  );
}
