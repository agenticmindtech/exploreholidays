"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandSpinner } from "@/components/auth/AuthGuard";
import { useAuthStore } from "@/lib/stores/authStore";
import { landingFor } from "@/lib/auth/permissions";

export default function RootPage() {
  const router = useRouter();
  const { user, isAuthed, isRestoring, restore } = useAuthStore();

  useEffect(() => {
    restore();
  }, [restore]);

  useEffect(() => {
    if (isRestoring) return;
    router.replace(isAuthed && user ? landingFor(user.role) : "/login");
  }, [isRestoring, isAuthed, user, router]);

  return <BrandSpinner />;
}
