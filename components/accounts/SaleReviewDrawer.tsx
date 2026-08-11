"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Skeleton from "@/components/ui/Skeleton";
import SaleDetailCard from "@/components/sales/SaleDetailCard";
import SaleStatusTimeline from "@/components/sales/SaleStatusTimeline";
import ReturnReasonModal from "./ReturnReasonModal";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/stores/authStore";
import { canManageFinance } from "@/lib/auth/permissions";
import { salesApi } from "@/lib/api/salesApi";
import { servicesApi } from "@/lib/api/servicesApi";
import { suppliersApi } from "@/lib/api/suppliersApi";
import { customersApi } from "@/lib/api/customersApi";
import { branchesApi } from "@/lib/api/branchesApi";
import type { AuditLog, Sale } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const MIN_HEALTHY_MARGIN = 5;

interface SaleReviewDrawerProps {
  saleId: string | null;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

export default function SaleReviewDrawer({ saleId, open, onClose, onDone }: SaleReviewDrawerProps) {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState<{ service?: string; supplier?: string; customer?: string; branch?: string }>({});
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [confirmVerifyOpen, setConfirmVerifyOpen] = useState(false);

  useEffect(() => {
    if (!open || !saleId) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    salesApi.get(saleId).then((result) => {
      if (cancelled) return;
      setSale(result);
      setLoading(false);

      Promise.all([
        servicesApi
          .get(result.serviceTypeId)
          .then((s) => s.name)
          .catch(() => undefined),
        suppliersApi
          .get(result.supplierId)
          .then((s) => s.name)
          .catch(() => undefined),
        result.customerId
          ? customersApi
              .get(result.customerId)
              .then((c) => c.name)
              .catch(() => undefined)
          : Promise.resolve(undefined),
        branchesApi
          .get(result.branchId)
          .then((b) => b.name)
          .catch(() => undefined),
      ]).then(([service, supplier, customer, branch]) => {
        if (!cancelled) setNames({ service, supplier, customer, branch });
      });

      salesApi.getAuditTrail(result.id).then((logs) => {
        if (!cancelled) setAuditLogs(logs);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [open, saleId]);

  async function handleVerify() {
    if (!sale || !user) return;
    try {
      await salesApi.verify(sale.id, user.id);
      toast.success("Sale verified", sale.bookingNo);
      onDone();
      onClose();
    } catch (err) {
      toast.error("Could not verify", err instanceof Error ? err.message : "Please try again.");
    }
  }

  const marginHealthy = sale ? sale.marginPercent >= MIN_HEALTHY_MARGIN : true;
  const canAct = canManageFinance(user?.role ?? "staff");

  return (
    <>
      <Drawer open={open} onClose={onClose} title={sale ? sale.bookingNo : "Loading…"}>
        {loading || !sale ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <Card
              className={cn(
                "flex items-center gap-3 border",
                marginHealthy ? "border-success-300 bg-success-50" : "border-danger-300 bg-danger-50"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  marginHealthy ? "bg-success-100 text-success-600" : "bg-danger-100 text-danger-600"
                )}
              >
                {marginHealthy ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              </span>
              <div>
                <p className={cn("text-sm font-bold", marginHealthy ? "text-success-700" : "text-danger-700")}>
                  {marginHealthy ? "Margin within policy" : "Margin below policy minimum"}
                </p>
                <p className="font-money text-xs text-inkMuted">
                  {sale.marginPercent.toFixed(2)}% margin (min {MIN_HEALTHY_MARGIN}%)
                </p>
              </div>
            </Card>

            <SaleDetailCard
              sale={sale}
              serviceTypeName={names.service}
              supplierName={names.supplier}
              customerName={names.customer}
              branchName={names.branch}
            />

            <Card>
              <p className="mb-4 font-display text-xs font-bold uppercase tracking-wide text-inkMuted">Activity</p>
              <SaleStatusTimeline auditLogs={auditLogs} />
            </Card>
          </div>
        )}

        {sale && canAct && (
          <div className="card-glass sticky bottom-0 -mx-6 -mb-6 mt-5 flex gap-2 border-t p-4">
            <Button variant="secondary" className="flex-1 text-danger-600 hover:border-danger-400 hover:text-danger-700" onClick={() => setReturnModalOpen(true)}>
              Return
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => setConfirmVerifyOpen(true)}>
              Verify
            </Button>
          </div>
        )}
        {sale && !canAct && (
          <div className="card-glass sticky bottom-0 -mx-6 -mb-6 mt-5 border-t p-4 text-center text-xs text-inkMuted">
            View only — Accounts and Admin can verify or return this sale.
          </div>
        )}
      </Drawer>

      <ReturnReasonModal
        open={returnModalOpen}
        saleId={sale?.id ?? null}
        bookingNo={sale?.bookingNo}
        onClose={() => setReturnModalOpen(false)}
        onReturned={() => {
          onDone();
          onClose();
        }}
      />

      <ConfirmDialog
        open={confirmVerifyOpen}
        onClose={() => setConfirmVerifyOpen(false)}
        title="Verify this sale?"
        body={sale ? `${sale.bookingNo} will move to Verified and become postable.` : undefined}
        confirmLabel="Verify"
        onConfirm={handleVerify}
      />
    </>
  );
}
