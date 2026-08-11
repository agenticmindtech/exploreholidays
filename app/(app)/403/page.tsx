"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/lib/stores/authStore";
import { landingFor } from "@/lib/auth/permissions";

export default function ForbiddenPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="text-grad-sunset font-display text-7xl font-extrabold">403</p>
      <p className="mt-4 text-base text-inkSoft">This area belongs to another team.</p>
      <Button className="mt-6" variant="primary" onClick={() => router.push(user ? landingFor(user.role) : "/login")}>
        Back to my dashboard
      </Button>
    </div>
  );
}
