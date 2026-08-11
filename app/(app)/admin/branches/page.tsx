"use client";

import { useEffect, useState } from "react";
import CrudPage from "@/components/admin/CrudPage";
import { branchesCrudConfig } from "@/components/admin/crudConfigs";
import Skeleton from "@/components/ui/Skeleton";
import { usersApi } from "@/lib/api/usersApi";
import type { SessionUser } from "@/lib/types";

export default function AdminBranchesPage() {
  const [managers, setManagers] = useState<SessionUser[] | null>(null);

  useEffect(() => {
    usersApi.list({ pageSize: 200 }).then((e) => setManagers(e.rows.filter((u) => u.role === "manager" || u.role === "admin")));
  }, []);

  if (!managers) {
    return (
      <div className="mx-auto max-w-7xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-6 h-96 w-full" />
      </div>
    );
  }

  return <CrudPage config={branchesCrudConfig(managers)} subtitle="Every branch office and who manages it." />;
}
