"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { useAuthStore } from "@/lib/stores/authStore";
import { useNotificationStore } from "@/lib/stores/notificationStore";
import NotificationItem from "./NotificationItem";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";

const POLL_MS = 60_000;
const PREVIEW_COUNT = 6;

export default function NotificationBell() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const { items, unreadCount, fetch, markAllRead } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    function load() {
      if (active) fetch(user!.id);
    }
    load();
    const interval = setInterval(load, POLL_MS);
    window.addEventListener("focus", load);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", load);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Shake only on a genuine increase (new notification arrived) — never on a poll
  // refresh that returns the same count, and never on the very first load.
  useEffect(() => {
    const prev = prevUnreadRef.current;
    if (prev !== null && unreadCount > prev) {
      setShake(true);
      const timer = setTimeout(() => setShake(false), 600);
      prevUnreadRef.current = unreadCount;
      return () => clearTimeout(timer);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const preview = items.slice(0, PREVIEW_COUNT);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-inkSoft hover:bg-subtle hover:text-ink"
      >
        <Bell className={cn("h-4 w-4", shake && "animate-bell-shake")} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger-500 px-1 text-[9px] font-bold text-white ring-2 ring-surface">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="card absolute right-0 top-full z-30 mt-2 w-[360px] max-w-[90vw] overflow-hidden p-0"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="font-display text-sm font-bold text-ink">Notifications</p>
              {unreadCount > 0 && user && (
                <button
                  type="button"
                  onClick={() =>
                    markAllRead(user.id).catch((err) =>
                      toast.error("Could not mark all as read", err instanceof Error ? err.message : "Please try again.")
                    )
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
            </div>

            <div className={cn("flex flex-col gap-1 p-2", preview.length === 0 && "p-0")}>
              {preview.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Inbox className="h-6 w-6 text-inkMuted" />
                  <p className="text-sm text-inkMuted">You&apos;re all caught up.</p>
                </div>
              ) : (
                preview.map((n) => <NotificationItem key={n.id} notification={n} compact onNavigate={() => setOpen(false)} />)
              )}
            </div>

            <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-2.5 text-center text-xs font-semibold text-primary-600 hover:bg-subtle">
              View all
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
