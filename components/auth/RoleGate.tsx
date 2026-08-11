"use client";

import type { ReactNode } from "react";
import type { Role } from "@/lib/types";
import { useAuthStore } from "@/lib/stores/authStore";

interface RoleGateProps {
  allow: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

export default function RoleGate({ allow, children, fallback = null }: RoleGateProps) {
  const user = useAuthStore((state) => state.user);
  if (!user || !allow.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
}
