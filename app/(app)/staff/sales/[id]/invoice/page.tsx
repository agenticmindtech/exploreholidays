"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import InvoiceDoc from "@/components/sales/InvoiceDoc";
import { useAuthStore } from "@/lib/stores/authStore";
import { salesApi } from "@/lib/api/salesApi";
import { servicesApi } from "@/lib/api/servicesApi";
import { customersApi } from "@/lib/api/customersApi";
import { branchesApi } from "@/lib/api/branchesApi";
import { usersApi } from "@/lib/api/usersApi";
import { settingsApi } from "@/lib/api/settingsApi";
import type { Sale, Settings } from "@/lib/types";

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [sale, setSale] = useState<Sale | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [names, setNames] = useState<{ service: string; customer: string; branch: string; staff: string }>({
    service: "",
    customer: "Walk-in",
    branch: "",
    staff: "",
  });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    salesApi.get(id).then(
      (result) => {
        if (cancelled) return;
        Promise.all([
          servicesApi.get(result.serviceTypeId).then((s) => s.name).catch(() => result.serviceTypeId),
          result.customerId ? customersApi.get(result.customerId).then((c) => c.name).catch(() => "Walk-in") : Promise.resolve("Walk-in"),
          branchesApi.get(result.branchId).then((b) => b.name).catch(() => result.branchId),
          usersApi.get(result.staffId).then((u) => u.name).catch(() => result.staffId),
          settingsApi.get(),
        ]).then(([service, customer, branch, staff, settingsResult]) => {
          if (cancelled) return;
          setSale(result);
          setNames({ service, customer, branch, staff });
          setSettings(settingsResult);
          setLoading(false);
        });
      },
      () => {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="h-[900px] w-full" />
      </div>
    );
  }

  if (notFound || !sale || !settings) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState title="Sale not found" hint="This booking may have been removed." action={{ label: "Back to My Sales", onClick: () => router.push("/staff/sales") }} />
      </div>
    );
  }

  const allowed = user && (user.role !== "staff" || sale.staffId === user.id);
  if (!allowed) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState title="Not your booking" hint="Only the staff who created this sale (or accounts/manager/admin) can view its invoice." action={{ label: "Back to My Sales", onClick: () => router.push("/staff/sales") }} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-6 flex items-center justify-between gap-3">
        <Button variant="secondary" icon={ArrowLeft} onClick={() => router.back()}>
          Back
        </Button>
        <Button variant="primary" icon={Printer} onClick={() => window.print()}>
          Print
        </Button>
      </div>

      <InvoiceDoc sale={sale} settings={settings} customerName={names.customer} branchName={names.branch} staffName={names.staff} serviceTypeName={names.service} />
    </div>
  );
}
