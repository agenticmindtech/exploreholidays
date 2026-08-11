"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Plane } from "lucide-react";
import { useAuthStore } from "@/lib/stores/authStore";
import { can } from "@/lib/auth/permissions";

export function BrandSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-grad-navy">
      <motion.span
        animate={{ scale: [1, 1.12, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-grad-brand text-white shadow-lg"
      >
        <Plane className="h-6 w-6" />
      </motion.span>
    </div>
  );
}

export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthed, isRestoring, restore } = useAuthStore();

  useEffect(() => {
    restore();
  }, [restore]);

  useEffect(() => {
    if (isRestoring) return;
    if (!isAuthed) {
      router.replace("/login");
      return;
    }
    if (user && pathname !== "/403" && !can(user.role, pathname)) {
      router.replace("/403");
    }
  }, [isRestoring, isAuthed, user, pathname, router]);

  if (isRestoring) return <BrandSpinner />;
  if (!isAuthed) return <BrandSpinner />;
  if (user && pathname !== "/403" && !can(user.role, pathname)) return <BrandSpinner />;

  return <>{children}</>;
}
