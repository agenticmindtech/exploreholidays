"use client";

import CrudPage from "@/components/admin/CrudPage";
import { suppliersCrudConfig } from "@/components/admin/crudConfigs";

export default function AdminSuppliersPage() {
  return <CrudPage config={suppliersCrudConfig()} subtitle="Supplier directory and credit terms — balances live in Accounts." />;
}
