"use client";

import PageHeader from "@/components/layout/PageHeader";
import SaleForm from "@/components/sales/SaleForm";

export default function NewSalePage() {
  return (
    <div className="mx-auto max-w-5xl animate-fade-up">
      <PageHeader title="New Sale" subtitle="Enter booking, supplier, and payment details." breadcrumb="My Sales / New Sale" />
      <SaleForm mode="create" />
    </div>
  );
}
