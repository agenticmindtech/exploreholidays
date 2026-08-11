"use client";

import { useEffect, useState } from "react";
import CrudPage from "@/components/admin/CrudPage";
import { usersCrudConfig } from "@/components/admin/crudConfigs";
import Skeleton from "@/components/ui/Skeleton";
import { branchesApi } from "@/lib/api/branchesApi";
import type { Branch } from "@/lib/types";

export default function AdminUsersPage() {
  const [branches, setBranches] = useState<Branch[] | null>(null);

  useEffect(() => {
    branchesApi.list({ pageSize: 200 }).then((e) => setBranches(e.rows));
  }, []);

  if (!branches) {
    return (
      <div className="mx-auto max-w-7xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-6 h-96 w-full" />
      </div>
    );
  }

  return <CrudPage config={usersCrudConfig(branches)} subtitle="Everyone with a login — roles, branches, and access." />;
}
