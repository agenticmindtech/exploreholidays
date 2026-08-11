"use client";

import { useEffect, useState } from "react";
import { Briefcase, Calculator, ShieldCheck, User, type LucideIcon } from "lucide-react";
import type { Role } from "@/lib/types";
import { usersApi } from "@/lib/api/usersApi";
import { ROLE_META } from "@/lib/constants/display";

const DEMO_PASSWORD = "demo123";
const ROLE_ORDER: Role[] = ["admin", "manager", "accounts", "staff"];
const ROLE_ICONS: Record<Role, LucideIcon> = {
  admin: ShieldCheck,
  manager: Briefcase,
  accounts: Calculator,
  staff: User,
};

interface DemoAccountButtonsProps {
  onSelect: (email: string, password: string) => void;
  disabled?: boolean;
}

export default function DemoAccountButtons({ onSelect, disabled = false }: DemoAccountButtonsProps) {
  const [emailByRole, setEmailByRole] = useState<Partial<Record<Role, string>>>({});

  useEffect(() => {
    let active = true;
    usersApi.list({ page: 1, pageSize: 100 }).then(({ rows }) => {
      if (!active) return;
      const map: Partial<Record<Role, string>> = {};
      for (const role of ROLE_ORDER) {
        const match = rows.find((u) => u.role === role);
        if (match) map[role] = match.email;
      }
      setEmailByRole(map);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="grid grid-cols-2 gap-2">
      {ROLE_ORDER.map((role) => {
        const Icon = ROLE_ICONS[role];
        const email = emailByRole[role];
        return (
          <button
            key={role}
            type="button"
            disabled={disabled || !email}
            onClick={() => email && onSelect(email, DEMO_PASSWORD)}
            className="flex min-h-[40px] items-center gap-2 rounded-xl border border-line px-3 py-2 text-left text-sm font-medium text-ink transition-colors hover:border-primary-400 hover:bg-subtle disabled:pointer-events-none disabled:opacity-50"
          >
            <Icon className="h-4 w-4 shrink-0 text-primary-600" />
            <span className="truncate">{ROLE_META[role].label}</span>
          </button>
        );
      })}
    </div>
  );
}
