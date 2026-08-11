"use client";

import CrudPage from "@/components/admin/CrudPage";
import { servicesCrudConfig } from "@/components/admin/crudConfigs";

export default function AdminServicesPage() {
  return <CrudPage config={servicesCrudConfig()} subtitle="The service types staff can book a sale under." />;
}
