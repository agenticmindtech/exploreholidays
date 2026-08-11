"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, FileText, Lock, Pencil, RotateCcw, Send } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatusPill from "@/components/ui/StatusPill";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import SaleDetailCard from "@/components/sales/SaleDetailCard";
import SaleStatusTimeline from "@/components/sales/SaleStatusTimeline";
import SaleForm from "@/components/sales/SaleForm";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/stores/authStore";
import { salesApi } from "@/lib/api/salesApi";
import { servicesApi } from "@/lib/api/servicesApi";
import { suppliersApi } from "@/lib/api/suppliersApi";
import { customersApi } from "@/lib/api/customersApi";
import { branchesApi } from "@/lib/api/branchesApi";
import { usersApi } from "@/lib/api/usersApi";
import type { AuditLog, Payment, Sale } from "@/lib/types";
import { formatDate, formatMoney, relativeTime } from "@/lib/utils/format";

function ReturnedBanner({ sale, returnedByName }: { sale: Sale; returnedByName?: string }) {
  return (
    <Card className="mb-6 border-warning-300 bg-warning-50">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-100 text-warning-600">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-bold text-warning-700">Returned by Accounts</p>
          <p className="mt-1 text-sm text-inkSoft">{sale.returnReason}</p>
          <p className="mt-1 text-xs text-inkMuted">
            {returnedByName ?? sale.returnedById} · {sale.returnedAt && relativeTime(sale.returnedAt)}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [names, setNames] = useState<{ service?: string; supplier?: string; customer?: string; branch?: string; staff?: string; returnedBy?: string }>({});
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [editMode, setEditMode] = useState(() => searchParams.get("edit") === "1");
  const [submitting, setSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    salesApi.get(id).then(
      (result) => {
        if (cancelled) return;
        setSale(result);
        if (reloadKey > 0) setEditMode(false);
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
          usersApi
            .get(result.staffId)
            .then((u) => u.name)
            .catch(() => undefined),
          result.returnedById
            ? usersApi
                .get(result.returnedById)
                .then((u) => u.name)
                .catch(() => undefined)
            : Promise.resolve(undefined),
        ]).then(([service, supplier, customer, branch, staff, returnedBy]) => {
          if (cancelled) return;
          setNames({ service, supplier, customer, branch, staff, returnedBy });
        });

        salesApi.getAuditTrail(result.id).then((logs) => {
          if (!cancelled) setAuditLogs(logs);
        });
        salesApi.getPayments(result.id).then((p) => {
          if (!cancelled) setPayments(p);
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
  }, [id, reloadKey]);

  async function handleQuickSubmit() {
    if (!sale || !user) return;
    setSubmitting(true);
    try {
      await salesApi.submit(sale.id, user.id);
      toast.success("Sale submitted", "Sent to Accounts for verification.");
      router.push("/staff/sales?tab=submitted");
    } catch (err) {
      toast.error("Could not submit", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (notFound || !sale) {
    return (
      <div className="mx-auto max-w-5xl">
        <EmptyState title="Sale not found" hint="This booking may have been removed." action={{ label: "Back to My Sales", onClick: () => router.push("/staff/sales") }} />
      </div>
    );
  }

  // Only the sale's own staff member (or admin) may edit/submit it — accounts and
  // manager can now open this page (linked from the audit log / their review work) but
  // strictly to view, never to change someone else's booking.
  const isOwnerOrAdmin = !!user && (user.role === "admin" || (user.role === "staff" && sale.staffId === user.id));
  const canEdit = isOwnerOrAdmin && (sale.status === "draft" || sale.status === "returned");

  if (editMode && canEdit) {
    return (
      <div className="mx-auto max-w-5xl animate-fade-up">
        <PageHeader title={`Editing ${sale.bookingNo}`} breadcrumb="My Sales / Edit" />
        {sale.status === "returned" && <ReturnedBanner sale={sale} returnedByName={names.returnedBy} />}
        <SaleForm
          mode="edit"
          sale={sale}
          onDraftSaved={() => {
            setEditMode(false);
            setReloadKey((k) => k + 1);
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-up">
      <PageHeader
        title={sale.bookingNo}
        subtitle={`Created ${relativeTime(sale.createdAt)} by ${names.staff ?? sale.staffId}`}
        breadcrumb="My Sales / Detail"
        actions={
          <div className="flex items-center gap-2">
            <StatusPill status={sale.status} />
            {(sale.status === "verified" || sale.status === "posted") && (
              <Link href={`/staff/sales/${sale.id}/invoice`}>
                <Button variant="secondary" icon={FileText}>
                  Invoice
                </Button>
              </Link>
            )}
            {isOwnerOrAdmin && sale.status === "draft" && (
              <>
                <Button variant="secondary" icon={Pencil} onClick={() => setEditMode(true)}>
                  Edit
                </Button>
                <Button variant="primary" icon={Send} loading={submitting} onClick={handleQuickSubmit}>
                  Submit
                </Button>
              </>
            )}
            {isOwnerOrAdmin && sale.status === "returned" && (
              <Button variant="primary" icon={RotateCcw} onClick={() => setEditMode(true)}>
                Fix &amp; Resubmit
              </Button>
            )}
          </div>
        }
      />

      {sale.status === "returned" && <ReturnedBanner sale={sale} returnedByName={names.returnedBy} />}

      {sale.status === "posted" && (
        <Card className="mb-6 flex items-center gap-3 border-line bg-subtle">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-inkMuted">
            <Lock className="h-5 w-5" />
          </span>
          <p className="text-sm text-inkSoft">
            This sale is posted and locked. Posted on {sale.postedAt && formatDate(sale.postedAt)} — no further edits are possible.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SaleDetailCard
            sale={sale}
            serviceTypeName={names.service}
            supplierName={names.supplier}
            customerName={names.customer}
            branchName={names.branch}
          />

          {payments.length > 0 && (
            <Card className="mt-5">
              <p className="mb-4 font-display text-xs font-bold uppercase tracking-wide text-inkMuted">Payments</p>
              <div className="flex flex-col divide-y divide-line">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <p className="font-medium text-ink">{formatDate(p.date)}</p>
                      <p className="text-xs text-inkMuted">{p.method.replace(/_/g, " ")}</p>
                    </div>
                    <p className="font-money font-semibold text-ink">{formatMoney(p.amount)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <p className="mb-4 font-display text-xs font-bold uppercase tracking-wide text-inkMuted">Activity</p>
            <SaleStatusTimeline auditLogs={auditLogs} />
          </Card>
        </div>
      </div>
    </div>
  );
}
