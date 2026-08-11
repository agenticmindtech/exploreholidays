"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, Package } from "lucide-react";
import type { Branch, PaymentMethod, PaymentStatus, PendingState, Sale, ServiceType, Supplier } from "@/lib/types";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import ProfitPreview from "./ProfitPreview";
import CustomerPicker from "./CustomerPicker";
import PaymentSection from "./PaymentSection";
import DuplicateWarningModal from "./DuplicateWarningModal";
import { useAuthStore } from "@/lib/stores/authStore";
import { salesApi, type CreateSaleInput } from "@/lib/api/salesApi";
import { branchesApi } from "@/lib/api/branchesApi";
import { servicesApi } from "@/lib/api/servicesApi";
import { suppliersApi } from "@/lib/api/suppliersApi";
import { usersApi } from "@/lib/api/usersApi";
import { validateSale } from "@/lib/logic/validate";
import { detectDuplicate } from "@/lib/logic/duplicate";
import { calcProfit, round3 } from "@/lib/logic/money";
import { formatMoney } from "@/lib/utils/format";

interface SaleFormProps {
  mode: "create" | "edit";
  sale?: Sale;
  /** When provided, called instead of the default redirect after Save Draft (e.g. to stay on a detail page and swap out of edit mode in place). */
  onDraftSaved?: (sale: Sale) => void;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

const FIELD_ORDER = [
  "bookingNo",
  "transactionDate",
  "branchId",
  "serviceTypeId",
  "supplierId",
  "destination",
  "description",
  "netCost",
  "sellingPrice",
  "paymentMethod",
  "paymentStatus",
  "amountReceived",
];

function scrollToFirstError(errs: Record<string, string>) {
  const firstKey = FIELD_ORDER.find((k) => errs[k]);
  if (!firstKey) return;
  const el = document.getElementById(firstKey);
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
  el?.focus();
}

function sanitizeMoneyInput(value: string): string {
  // Commas may appear after a blur-triggered thousand-separator format; strip
  // them back out so the stored value always stays a clean parseable number.
  const stripped = value.replace(/,/g, "");
  return /^\d*\.?\d*$/.test(stripped) ? stripped : stripped.replace(/[^\d.]/g, "");
}

function formatMoneyInputValue(n: number): string {
  return Math.max(0, n).toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

export default function SaleForm({ mode, sale, onDraftSaved }: SaleFormProps) {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const isStaffLocked = user?.role === "staff";

  const [branches, setBranches] = useState<Branch[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [bookingNo, setBookingNo] = useState(sale?.bookingNo ?? "");
  const [pnr, setPnr] = useState(sale?.pnr ?? "");
  const [transactionDate, setTransactionDate] = useState(sale?.transactionDate ?? todayIso());
  const [branchId, setBranchId] = useState(sale?.branchId ?? user?.branchId ?? "");
  const [customerId, setCustomerId] = useState<string | null>(sale?.customerId ?? null);
  const [serviceTypeId, setServiceTypeId] = useState(sale?.serviceTypeId ?? "");
  const [destination, setDestination] = useState(sale?.destination ?? "");
  const [description, setDescription] = useState(sale?.description ?? "");
  const [supplierId, setSupplierId] = useState(sale?.supplierId ?? "");
  const [netCost, setNetCost] = useState(sale ? String(sale.netCost) : "");
  const [sellingPrice, setSellingPrice] = useState(sale ? String(sale.sellingPrice) : "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(sale?.paymentMethod ?? "cash");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(sale?.paymentStatus ?? "pending");
  const [amountReceived, setAmountReceived] = useState(sale ? String(sale.amountReceived) : "0");
  const [isPendingService, setIsPendingService] = useState(sale?.isPendingService ?? false);
  const [pendingState, setPendingState] = useState<PendingState | null>(sale?.pendingState ?? null);
  const [expectedCompletionDate, setExpectedCompletionDate] = useState<string | null>(sale?.expectedCompletionDate ?? null);
  const [remarks, setRemarks] = useState(sale?.remarks ?? "");
  const [attachments, setAttachments] = useState<string[]>(sale?.attachments ?? []);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateSale, setDuplicateSale] = useState<Sale | null>(null);
  const [duplicateStaffName, setDuplicateStaffName] = useState<string | undefined>();

  useEffect(() => {
    branchesApi.list().then((e) => setBranches(e.rows));
    servicesApi.list().then((e) => setServiceTypes(e.rows));
    suppliersApi.list().then((e) => setSuppliers(e.rows));
  }, []);

  useEffect(() => {
    if (mode === "create") {
      salesApi.nextBookingNo().then(setBookingNo);
    }
  }, [mode]);

  const suppliersByType = useMemo(() => {
    const groups = new Map<string, Supplier[]>();
    for (const supplier of suppliers) {
      const list = groups.get(supplier.type) ?? [];
      list.push(supplier);
      groups.set(supplier.type, list);
    }
    return groups;
  }, [suppliers]);

  const netCostNumber = round3(Number(netCost.replace(/,/g, "")) || 0);
  const sellingPriceNumber = round3(Number(sellingPrice.replace(/,/g, "")) || 0);
  const footerProfit = calcProfit(netCostNumber, sellingPriceNumber);

  function buildPayload(): CreateSaleInput {
    return {
      bookingNo: bookingNo.trim(),
      pnr: pnr.trim() || null,
      transactionDate,
      branchId: isStaffLocked ? user?.branchId ?? "" : branchId,
      staffId: user?.id ?? "",
      customerId,
      serviceTypeId,
      destination: destination.trim(),
      description: description.trim(),
      supplierId,
      netCost: netCostNumber,
      sellingPrice: sellingPriceNumber,
      paymentMethod,
      paymentStatus,
      amountReceived: round3(Number(amountReceived.replace(/,/g, "")) || 0),
      isPendingService,
      pendingState: isPendingService ? pendingState : null,
      expectedCompletionDate: isPendingService ? expectedCompletionDate : null,
      remarks: remarks.trim() || null,
      attachments,
    };
  }

  async function handleSaveDraft() {
    const draftErrors: Record<string, string> = {};
    if (!bookingNo.trim()) draftErrors.bookingNo = "Booking number is required.";
    if (!transactionDate) draftErrors.transactionDate = "Transaction date is required.";
    setErrors(draftErrors);
    if (Object.keys(draftErrors).length > 0) {
      scrollToFirstError(draftErrors);
      return;
    }

    setSavingDraft(true);
    try {
      const payload = buildPayload();
      const result = mode === "edit" && sale ? await salesApi.update(sale.id, payload) : await salesApi.create(payload);
      toast.success("Draft saved", result.bookingNo);
      if (onDraftSaved) {
        onDraftSaved(result);
      } else {
        router.push(`/staff/sales/${result.id}`);
      }
    } catch (err) {
      toast.error("Could not save draft", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSavingDraft(false);
    }
  }

  async function runSubmitFlow(force: boolean) {
    setSubmitting(true);
    try {
      const payload = buildPayload();
      const result = mode === "edit" && sale ? await salesApi.update(sale.id, payload) : await salesApi.create(payload);
      await salesApi.submit(result.id, user?.id ?? "", { force });
      toast.success("Sale submitted", "Sent to Accounts for verification.");
      router.push("/staff/sales?tab=submitted");
    } catch (err) {
      toast.error("Could not submit", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
      setDuplicateSale(null);
    }
  }

  async function handleSubmit() {
    const payload = buildPayload();
    const validation = validateSale(payload);
    if (!validation.valid) {
      setErrors(validation.errors);
      scrollToFirstError(validation.errors);
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      const allSales = (await salesApi.list({ page: 1, pageSize: 100000 })).rows;
      const duplicate = detectDuplicate({ ...payload, id: sale?.id }, allSales);
      if (duplicate) {
        setDuplicateSale(duplicate);
        const staffUser = await usersApi.get(duplicate.staffId).catch(() => null);
        setDuplicateStaffName(staffUser?.name);
        setSubmitting(false);
        return;
      }
    } catch {
      setSubmitting(false);
      toast.error("Could not check for duplicates", "Please try again.");
      return;
    }

    await runSubmitFlow(false);
  }

  function handleMoneyChange(setter: (v: string) => void) {
    return (e: ChangeEvent<HTMLInputElement>) => setter(sanitizeMoneyInput(e.target.value));
  }
  function handleMoneyBlur(value: string, setter: (v: string) => void) {
    return () => setter(formatMoneyInputValue(Number(value.replace(/,/g, "")) || 0));
  }

  return (
    <div className="flex flex-col gap-6 pb-28">
      {/* ---------------- Section A: Booking ---------------- */}
      <Card>
        <p className="mb-4 font-display text-xs font-bold uppercase tracking-wide text-inkMuted">A. Booking</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="bookingNo"
            label="Booking No"
            required
            value={bookingNo}
            onChange={(e) => setBookingNo(e.target.value)}
            error={errors.bookingNo}
            hint="Must be unique — auto-suggested, but editable."
            className="font-money"
          />
          <DatePicker
            label="Transaction Date"
            value={transactionDate}
            onChange={setTransactionDate}
            max={todayIso()}
            required
            error={errors.transactionDate}
          />
          {isStaffLocked ? (
            <Select label="Branch" icon={Lock} value={branchId} disabled required>
              <option value={branchId}>{branches.find((b) => b.id === branchId)?.name ?? "Your branch"}</option>
            </Select>
          ) : (
            <Select label="Branch" value={branchId} onChange={(e) => setBranchId(e.target.value)} required error={errors.branchId}>
              <option value="" disabled>
                Select branch
              </option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          )}
          <Select
            id="serviceTypeId"
            label="Service Type"
            icon={Package}
            value={serviceTypeId}
            onChange={(e) => setServiceTypeId(e.target.value)}
            required
            error={errors.serviceTypeId}
          >
            <option value="" disabled>
              Select service
            </option>
            {serviceTypes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Input
            id="destination"
            label="Destination / City"
            required
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            error={errors.destination}
          />
          <Input label="PNR" value={pnr} onChange={(e) => setPnr(e.target.value)} hint="Optional" className="font-money" />
          <div className="sm:col-span-2">
            <CustomerPicker value={customerId} onChange={setCustomerId} />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              id="description"
              label="Description"
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              error={errors.description}
            />
            <p className="mt-1 text-right text-xs text-inkMuted">{description.length} characters (min 5)</p>
          </div>
        </div>
      </Card>

      {/* ---------------- Section B: Supplier & Money ---------------- */}
      <Card>
        <p className="mb-4 font-display text-xs font-bold uppercase tracking-wide text-inkMuted">B. Supplier &amp; Money</p>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
            <div className="sm:col-span-2">
              <Select
                id="supplierId"
                label="Supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                error={errors.supplierId}
              >
                <option value="" disabled>
                  Select supplier
                </option>
                {[...suppliersByType.entries()].map(([type, group]) => (
                  <optgroup key={type} label={type.replace(/_/g, " ")}>
                    {group.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </div>
            <Input
              id="netCost"
              label="Net Cost (BHD)"
              required
              inputMode="decimal"
              value={netCost}
              onChange={handleMoneyChange(setNetCost)}
              onBlur={handleMoneyBlur(netCost, setNetCost)}
              error={errors.netCost}
              className="font-money"
            />
            <Input
              id="sellingPrice"
              label="Selling Price (BHD)"
              required
              inputMode="decimal"
              value={sellingPrice}
              onChange={handleMoneyChange(setSellingPrice)}
              onBlur={handleMoneyBlur(sellingPrice, setSellingPrice)}
              error={errors.sellingPrice}
              className="font-money"
            />
          </div>
          <div className="lg:col-span-1">
            <ProfitPreview netCost={netCostNumber} sellingPrice={sellingPriceNumber} className="lg:sticky lg:top-24" />
          </div>
        </div>
      </Card>

      {/* ---------------- Section C: Payment ---------------- */}
      <Card>
        <p className="mb-4 font-display text-xs font-bold uppercase tracking-wide text-inkMuted">C. Payment</p>
        <PaymentSection
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          paymentStatus={paymentStatus}
          onPaymentStatusChange={setPaymentStatus}
          sellingPrice={sellingPriceNumber}
          amountReceived={amountReceived}
          onAmountReceivedChange={setAmountReceived}
          isPendingService={isPendingService}
          onPendingServiceChange={setIsPendingService}
          pendingState={pendingState}
          onPendingStateChange={setPendingState}
          expectedCompletionDate={expectedCompletionDate}
          onExpectedCompletionDateChange={setExpectedCompletionDate}
          remarks={remarks}
          onRemarksChange={setRemarks}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
        />
      </Card>

      {/* ---------------- Sticky footer ---------------- */}
      <div className="card-glass sticky bottom-0 z-10 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-money text-xs text-inkSoft">
          <span>
            Cost: <strong className="text-ink">{formatMoney(netCostNumber)}</strong>
          </span>
          <span>
            Selling: <strong className="text-ink">{formatMoney(sellingPriceNumber)}</strong>
          </span>
          <span>
            Profit:{" "}
            <strong className={netCostNumber || sellingPriceNumber ? (footerProfit >= 0 ? "money-pos" : "money-neg") : "text-ink"}>
              {formatMoney(footerProfit)}
            </strong>
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" loading={savingDraft} onClick={handleSaveDraft}>
            Save Draft
          </Button>
          <Button variant="primary" loading={submitting} onClick={handleSubmit}>
            Submit for Verification
          </Button>
        </div>
      </div>

      <DuplicateWarningModal
        open={!!duplicateSale}
        matchingSale={duplicateSale}
        matchingStaffName={duplicateStaffName}
        onEditEntry={() => setDuplicateSale(null)}
        onSubmitAnyway={() => runSubmitFlow(true)}
      />
    </div>
  );
}
