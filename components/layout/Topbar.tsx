"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronDown, LogOut, RotateCcw, Search, User } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Dropdown from "@/components/ui/Dropdown";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useAuthStore } from "@/lib/stores/authStore";
import { branchesApi } from "@/lib/api/branchesApi";
import { resetDemoData } from "@/lib/api/client";
import { ROLE_META } from "@/lib/constants/display";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const RESET_WORD = "RESET";

const ROLE_PILL_CLASS: Record<Role, string> = {
  admin: "bg-secondary-100 text-secondary-700",
  manager: "bg-primary-100 text-primary-700",
  accounts: "bg-accent-100 text-accent-700",
  staff: "bg-info-100 text-info-700",
};

interface TopbarProps {
  title?: string;
  breadcrumb?: string;
}

export default function Topbar({ title = "Dashboard", breadcrumb }: TopbarProps) {
  const router = useRouter();
  const toast = useToast();
  const { user, logout } = useAuthStore();
  const [branchName, setBranchName] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTyped, setResetTyped] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    branchesApi.get(user.branchId).then((branch) => {
      if (active) setBranchName(branch.name);
    });
    return () => {
      active = false;
    };
  }, [user]);

  function handleLogout() {
    logout();
    toast.success("Signed out", "Come back soon.");
    router.push("/login");
  }

  function handleCloseReset() {
    setResetOpen(false);
    setResetTyped("");
  }

  function handleReset() {
    setResetting(true);
    resetDemoData();
    toast.success("Demo data reset", "Reloading with fresh seed data…");
    setTimeout(() => window.location.reload(), 600);
  }

  return (
    <header className="card-glass no-print sticky top-0 z-30 flex h-topbar items-center justify-between gap-4 px-6">
      <div className="min-w-0">
        <h1 className="truncate font-display text-base font-bold text-ink">{title}</h1>
        {breadcrumb && <p className="truncate text-xs text-inkMuted">{breadcrumb}</p>}
      </div>

      <div className="flex flex-1 items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
          aria-label="Open command palette"
          className="input relative hidden w-full max-w-xs items-center py-2.5 pl-10 pr-3 text-left text-sm text-inkMuted hover:border-primary-400 sm:flex"
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-inkMuted" />
          <span className="truncate">Search anything...</span>
          <kbd className="ml-auto hidden shrink-0 rounded-md border border-line bg-subtle px-1.5 py-0.5 text-[10px] font-semibold text-inkMuted md:inline-block">
            Ctrl K
          </kbd>
        </button>

        <NotificationBell />

        <ThemeToggle />

        {user && (
          <Dropdown
            align="right"
            trigger={
              <button type="button" className="flex h-10 items-center gap-2.5 rounded-xl pl-1.5 pr-2 hover:bg-subtle">
                <Avatar name={user.name} size="sm" />
                <span className="hidden flex-col items-start leading-tight sm:flex">
                  <span className="text-xs font-semibold text-ink">{user.name}</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-inkMuted">
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", ROLE_PILL_CLASS[user.role])}>
                      {ROLE_META[user.role].label}
                    </span>
                    {branchName && <span className="truncate">{branchName}</span>}
                  </span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-inkMuted" />
              </button>
            }
            items={[
              { label: "Profile", icon: User, onClick: () => router.push("/profile") },
              ...(user.role === "admin"
                ? [{ label: "Reset demo data", icon: RotateCcw, danger: true, onClick: () => setResetOpen(true) }]
                : []),
              { divider: true },
              { label: "Logout", icon: LogOut, danger: true, onClick: handleLogout },
            ]}
          />
        )}
      </div>

      <Modal open={resetOpen} onClose={handleCloseReset} title="Reset demo data?" size="sm">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <p className="text-sm text-inkSoft">
            This permanently discards every sale, user, and setting you&apos;ve changed and restores the original seed data. This cannot be undone.
          </p>
        </div>
        <div className="mt-4">
          <Input
            label={`Type ${RESET_WORD} to confirm`}
            value={resetTyped}
            onChange={(e) => setResetTyped(e.target.value)}
            placeholder={RESET_WORD}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={handleCloseReset}>
            Cancel
          </Button>
          <Button variant="danger" loading={resetting} disabled={resetTyped !== RESET_WORD} onClick={handleReset}>
            Reset everything
          </Button>
        </div>
      </Modal>
    </header>
  );
}
