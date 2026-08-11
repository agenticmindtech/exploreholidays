"use client";

import CrudPage from "@/components/admin/CrudPage";
import { customersCrudConfig } from "@/components/admin/crudConfigs";

export default function AdminCustomersPage() {
  return <CrudPage config={customersCrudConfig()} subtitle="Every customer on file, with lifetime purchases and outstanding balance." />;
}
