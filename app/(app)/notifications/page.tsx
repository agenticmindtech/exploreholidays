"use client";

import { useEffect, useMemo, useState } from "react";
import { isToday, isYesterday } from "date-fns";
import { CheckCheck, Inbox } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Tabs from "@/components/ui/Tabs";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import NotificationItem from "@/components/notifications/NotificationItem";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/stores/authStore";
import { useNotificationStore } from "@/lib/stores/notificationStore";
import { formatDate } from "@/lib/utils/format";

type TabKey = "all" | "unread";

function dayLabel(iso: string): string {
  const date = new Date(iso);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return formatDate(date);
}

export default function NotificationsPage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const { items, unreadCount, loading, fetch, markAllRead } = useNotificationStore();
  const [tab, setTab] = useState<TabKey>("all");

  useEffect(() => {
    if (user) fetch(user.id);
  }, [user, fetch]);

  const filtered = tab === "unread" ? items.filter((n) => !n.isRead) : items;

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const n of filtered) {
      const label = dayLabel(n.createdAt);
      const bucket = map.get(label) ?? [];
      bucket.push(n);
      map.set(label, bucket);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        subtitle="Everything that's happened, in one place."
        breadcrumb="Home / Notifications"
        actions={
          unreadCount > 0 && user ? (
            <Button
              variant="secondary"
              icon={CheckCheck}
              onClick={() =>
                markAllRead(user.id).catch((err) =>
                  toast.error("Could not mark all as read", err instanceof Error ? err.message : "Please try again.")
                )
              }
            >
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="stagger flex flex-col gap-4">
        <Tabs
          tabs={[
            { id: "all", label: "All", count: items.length },
            { id: "unread", label: "Unread", count: unreadCount },
          ]}
          active={tab}
          onChange={(id) => setTab(id as TabKey)}
        />

        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Inbox} title={tab === "unread" ? "No unread notifications" : "No notifications yet"} hint="Activity across the app will show up here." />
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map(([label, group]) => (
              <div key={label}>
                <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-inkMuted">{label}</p>
                <div className="card flex flex-col gap-1 p-2">
                  {group.map((n) => (
                    <NotificationItem key={n.id} notification={n} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
