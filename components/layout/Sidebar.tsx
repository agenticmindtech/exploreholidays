"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  Building,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  Contact,
  HandCoins,
  History,
  Hourglass,
  LayoutDashboard,
  Package,
  Plane,
  PlusCircle,
  Receipt,
  RotateCcw,
  Send,
  Settings,
  Target,
  TrendingUp,
  User,
  Users,
  ListChecks,
  Wallet,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/lib/stores/authStore";
import { SIDEBAR_MENUS } from "@/lib/constants/menus";
import { ROLE_META } from "@/lib/constants/display";
import { salesApi } from "@/lib/api/salesApi";
import type { Role } from "@/lib/types";
import Avatar from "@/components/ui/Avatar";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Receipt,
  PlusCircle,
  TrendingUp,
  Bell,
  User,
  ListChecks,
  Send,
  Hourglass,
  RotateCcw,
  Wallet,
  Building2,
  HandCoins,
  AlertTriangle,
  BarChart3,
  Users,
  Building,
  Package,
  Contact,
  Target,
  History,
  Settings,
};

const ROLE_PILL_CLASS: Record<Role, string> = {
  admin: "bg-secondary-100 text-secondary-700",
  manager: "bg-primary-100 text-primary-700",
  accounts: "bg-accent-100 text-accent-700",
  staff: "bg-info-100 text-info-700",
};

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const [queueCount, setQueueCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function loadQueueCount() {
      const envelope = await salesApi.list({ status: "submitted", page: 1, pageSize: 1 });
      if (active) setQueueCount(envelope.total);
    }
    loadQueueCount();
    window.addEventListener("focus", loadQueueCount);
    window.addEventListener("queue-count-refresh", loadQueueCount);
    return () => {
      active = false;
      window.removeEventListener("focus", loadQueueCount);
      window.removeEventListener("queue-count-refresh", loadQueueCount);
    };
  }, []);

  const sections = user ? SIDEBAR_MENUS[user.role] : [];

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 264 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden bg-grad-navy md:flex"
    >
      <div className="flex h-topbar items-center gap-3 px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-grad-brand text-white">
          <Plane className="h-4 w-4" />
        </span>
        {!collapsed && (
          <span className="whitespace-nowrap font-display text-base font-bold text-white">
            TravelDesk Pro
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="mb-2 px-3.5 text-[10px] font-bold uppercase tracking-wider text-secondary-300">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                const Icon = ICONS[item.icon] ?? LayoutDashboard;
                const showBadge = item.href === "/accounts/queue" && !!queueCount;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn("nav-item", isActive && "active", collapsed && "justify-center px-0")}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span className="truncate">{item.label}</span>
                        {showBadge && (
                          <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-accent-500 px-1.5 text-[10px] font-bold text-white">
                            {queueCount}
                          </span>
                        )}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {user && (
        <div className={cn("border-t border-white/10 px-3 py-3", collapsed && "flex justify-center")}>
          {collapsed ? (
            <Avatar name={user.name} size="sm" />
          ) : (
            <div className="flex items-center gap-2.5 rounded-xl px-1">
              <Avatar name={user.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                <span className={cn("mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold", ROLE_PILL_CLASS[user.role])}>
                  {ROLE_META[user.role].label}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={onToggle}
          className="nav-item w-full justify-center"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>
    </motion.aside>
  );
}
