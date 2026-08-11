"use client";

import CrudPage from "@/components/admin/CrudPage";
import { targetsCrudConfig } from "@/components/admin/crudConfigs";

export default function AdminTargetsPage() {
  return <CrudPage config={targetsCrudConfig()} subtitle="Monthly sales, revenue and profit targets per staff member." />;
}
