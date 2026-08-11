"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Building,
  Building2,
  Contact,
  HandCoins,
  History,
  Hourglass,
  LayoutDashboard,
  Package,
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

const MAX_ITEMS = 5;

export default function MobileBottomNav() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  const items = SIDEBAR_MENUS[user.role]
    .flatMap((section) => section.items)
    .filter((item) => item.href !== "/notifications" && item.href !== "/profile")
    .slice(0, MAX_ITEMS);

  return (
    <nav className="card-glass no-print fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t md:hidden">
      {items.map((item) => {
        const isActive = pathname?.startsWith(item.href);
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium"
          >
            <Icon className={cn("h-5 w-5", isActive ? "text-primary-600" : "text-inkMuted")} />
            <span className={cn("truncate px-0.5", isActive ? "text-primary-600" : "text-inkMuted")}>{item.label}</span>
            {isActive && <span className="absolute top-1.5 h-1 w-1 rounded-full bg-primary-600" />}
          </Link>
        );
      })}
    </nav>
  );
}
