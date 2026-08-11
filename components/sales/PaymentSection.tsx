"use client";

import { Banknote, CreditCard, FileText, Paperclip, Smartphone, CircleSlash, X, type LucideIcon } from "lucide-react";
import type { PaymentMethod, PaymentStatus, PendingState } from "@/lib/types";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import DatePicker from "@/components/ui/DatePicker";
import Toggle from "@/components/ui/Toggle";
import Button from "@/components/ui/Button";
import { METHOD_META } from "@/lib/constants/display";
import { calcBalanceDue } from "@/lib/logic/money";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const METHOD_ICONS: Record<PaymentMethod, LucideIcon> = {
  benefit_pay: Smartphone,
  credit_card_online: CreditCard,
  cash: Banknote,
  fawri_cheque: FileText,
  not_paid_refund: CircleSlash,
};
const METHOD_ORDER: PaymentMethod[] = ["benefit_pay", "credit_card_online", "cash", "fawri_cheque", "not_paid_refund"];

const STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "paid", label: "Paid" },
  { value: "partial", label: "Partial" },
  { value: "pending", label: "Pending" },
];

const PENDING_STATE_OPTIONS: { value: PendingState; label: string }[] = [
  { value: "in_process", label: "In process" },
  { value: "awaiting_supplier", label: "Awaiting supplier" },
  { value: "awaiting_customer", label: "Awaiting customer" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

interface PaymentSectionProps {
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  paymentStatus: PaymentStatus;
  onPaymentStatusChange: (status: PaymentStatus) => void;
  sellingPrice: number;
  amountReceived: string;
  onAmountReceivedChange: (value: string) => void;
  isPendingService: boolean;
  onPendingServiceChange: (value: boolean) => void;
  pendingState: PendingState | null;
  onPendingStateChange: (value: PendingState) => void;
  expectedCompletionDate: string | null;
  onExpectedCompletionDateChange: (value: string) => void;
  remarks: string;
  onRemarksChange: (value: string) => void;
  attachments: string[];
  onAttachmentsChange: (value: string[]) => void;
}

export default function PaymentSection({
  paymentMethod,
  onPaymentMethodChange,
  paymentStatus,
  onPaymentStatusChange,
  sellingPrice,
  amountReceived,
  onAmountReceivedChange,
  isPendingService,
  onPendingServiceChange,
  pendingState,
  onPendingStateChange,
  expectedCompletionDate,
  onExpectedCompletionDateChange,
  remarks,
  onRemarksChange,
  attachments,
  onAttachmentsChange,
}: PaymentSectionProps) {
  const received = Number(amountReceived.replace(/,/g, "")) || 0;
  const balanceDue = calcBalanceDue(sellingPrice, received);

  function handleStatusSelect(status: PaymentStatus) {
    onPaymentStatusChange(status);
    if (status === "paid") onAmountReceivedChange(String(sellingPrice));
    else if (status === "pending") onAmountReceivedChange("0");
  }

  function addMockAttachment() {
    onAttachmentsChange([...attachments, `document-${attachments.length + 1}.pdf`]);
  }

  function removeAttachment(index: number) {
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="label mb-2">Payment Method</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {METHOD_ORDER.map((method) => {
            const Icon = METHOD_ICONS[method];
            const active = paymentMethod === method;
            return (
              <button
                key={method}
                type="button"
                onClick={() => onPaymentMethodChange(method)}
                className={cn(
                  "flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-center text-xs font-semibold transition-colors",
                  active ? "border-primary-500 bg-primary-50 text-primary-700" : "border-line text-inkSoft hover:border-primary-300 hover:bg-subtle"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="leading-tight">{METHOD_META[method].label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="label mb-2">Payment Status</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleStatusSelect(opt.value)}
              className={cn(
                "pill min-h-[40px] cursor-pointer border px-4",
                paymentStatus === opt.value ? "border-primary-500 bg-primary-50 text-primary-700" : "border-line text-inkSoft hover:border-primary-300"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {paymentStatus === "partial" && (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="amountReceived" className="label">
                Amount received
              </label>
              <input
                id="amountReceived"
                type="text"
                inputMode="decimal"
                value={amountReceived}
                onChange={(e) => {
                  const stripped = e.target.value.replace(/,/g, "");
                  if (/^\d*\.?\d*$/.test(stripped)) onAmountReceivedChange(stripped);
                }}
                onBlur={() => {
                  const n = Math.max(0, Number(amountReceived.replace(/,/g, "")) || 0);
                  onAmountReceivedChange(n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }));
                }}
                className="input font-money"
                placeholder="0.000"
              />
            </div>
            <div>
              <p className="label">Balance due</p>
              <p className={cn("input flex items-center font-money font-semibold", balanceDue > 0 ? "money-neg" : "money-pos")}>
                {formatMoney(balanceDue)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-line p-4">
        <Toggle checked={isPendingService} onChange={onPendingServiceChange} label="Service still in process" />
        {isPendingService && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Pending state"
              value={pendingState ?? ""}
              onChange={(e) => onPendingStateChange(e.target.value as PendingState)}
            >
              <option value="" disabled>
                Select status
              </option>
              {PENDING_STATE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <DatePicker
              label="Expected completion date"
              value={expectedCompletionDate ?? ""}
              onChange={onExpectedCompletionDateChange}
            />
          </div>
        )}
      </div>

      <Textarea label="Remarks" value={remarks} onChange={(e) => onRemarksChange(e.target.value)} hint="Optional" rows={3} />

      <div>
        <p className="label mb-2">Attachments</p>
        <div className="flex flex-wrap items-center gap-2">
          {attachments.map((file, i) => (
            <span key={`${file}-${i}`} className="inline-flex items-center gap-1.5 rounded-full bg-subtle px-3 py-1.5 text-xs font-medium text-inkSoft">
              <Paperclip className="h-3 w-3" />
              {file}
              <button type="button" onClick={() => removeAttachment(i)} aria-label={`Remove ${file}`} className="text-inkMuted hover:text-danger-600">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <Button type="button" variant="ghost" size="sm" icon={Paperclip} onClick={addMockAttachment}>
            Add mock attachment
          </Button>
        </div>
      </div>
    </div>
  );
}
