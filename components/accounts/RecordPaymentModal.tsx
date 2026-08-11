"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/stores/authStore";
import { receivablesApi } from "@/lib/api/receivablesApi";
import { METHOD_META } from "@/lib/constants/display";
import { PAYMENT_METHODS } from "@/lib/constants/enums";
import type { PaymentMethod, Receivable } from "@/lib/types";
import { formatMoney } from "@/lib/utils/format";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

interface RecordPaymentModalProps {
  open: boolean;
  receivable: Receivable | null;
  partyName?: string;
  onClose: () => void;
  onRecorded: (receivable: Receivable) => void;
}

export default function RecordPaymentModal({ open, receivable, partyName, onClose, onRecorded }: RecordPaymentModalProps) {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const [amount, setAmount] = useState("0.000");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [date, setDate] = useState(todayIso());
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !receivable) return;
    Promise.resolve().then(() => {
      setAmount(receivable.balance.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }));
      setMethod("cash");
      setDate(todayIso());
      setReference("");
      setError(undefined);
    });
  }, [open, receivable]);

  function handleClose() {
    onClose();
  }

  async function handleSubmit() {
    if (!receivable || !user) return;
    const numeric = Number(amount.replace(/,/g, "")) || 0;
    if (numeric <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (numeric > receivable.balance) {
      setError(`Payment cannot exceed the outstanding balance of ${formatMoney(receivable.balance)}.`);
      return;
    }
    setSubmitting(true);
    try {
      const updated = await receivablesApi.recordPayment(receivable.id, numeric, method, date, user.id, reference.trim() || null);
      toast.success(
        updated.state === "settled" ? "Receivable settled" : "Payment recorded",
        `${partyName ?? receivable.id} · balance ${formatMoney(updated.balance)}`
      );
      onRecorded(updated);
    } catch (err) {
      toast.error("Could not record payment", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Record payment${partyName ? ` · ${partyName}` : ""}`} size="sm">
      {receivable && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-subtle px-3 py-2 text-xs text-inkSoft">
            Outstanding balance: <span className="font-money font-bold text-ink">{formatMoney(receivable.balance)}</span>
          </div>

          <Input
            label="Amount"
            required
            value={amount}
            className="font-money"
            onChange={(e) => {
              const stripped = e.target.value.replace(/,/g, "");
              if (/^\d*\.?\d*$/.test(stripped)) setAmount(stripped);
            }}
            onBlur={() => {
              const n = Math.max(0, Number(amount.replace(/,/g, "")) || 0);
              setAmount(n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }));
            }}
            error={error}
          />

          <Select label="Method" required value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {METHOD_META[m].label}
              </option>
            ))}
          </Select>

          <DatePicker label="Date" required value={date} onChange={setDate} max={todayIso()} />

          <Input label="Reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Cheque no. / transaction ref." />

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" loading={submitting} onClick={handleSubmit}>
              Record payment
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
