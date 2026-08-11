"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import DatePicker from "@/components/ui/DatePicker";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/stores/authStore";
import { loansApi } from "@/lib/api/loansApi";
import type { StaffLoan } from "@/lib/types";
import { formatMoney } from "@/lib/utils/format";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

interface InstallmentModalProps {
  open: boolean;
  loan: StaffLoan | null;
  staffName?: string;
  onClose: () => void;
  onRecorded: (loan: StaffLoan) => void;
}

export default function InstallmentModal({ open, loan, staffName, onClose, onRecorded }: InstallmentModalProps) {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const [amount, setAmount] = useState("0.000");
  const [date, setDate] = useState(todayIso());
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !loan) return;
    Promise.resolve().then(() => {
      const defaultAmount = Math.min(loan.installmentAmount, loan.remaining);
      setAmount(defaultAmount.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }));
      setDate(todayIso());
      setError(undefined);
    });
  }, [open, loan]);

  function handleClose() {
    onClose();
  }

  async function handleSubmit() {
    if (!loan || !user) return;
    const numeric = Number(amount.replace(/,/g, "")) || 0;
    if (numeric <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (numeric > loan.remaining) {
      setError(`Installment cannot exceed the remaining balance of ${formatMoney(loan.remaining)}.`);
      return;
    }
    setSubmitting(true);
    try {
      const updated = await loansApi.recordInstallment(loan.id, numeric, date, user.id);
      toast.success(
        updated.status === "completed" ? "Loan fully repaid" : "Installment recorded",
        `${staffName ?? loan.id} · remaining ${formatMoney(updated.remaining)}`
      );
      onRecorded(updated);
    } catch (err) {
      toast.error("Could not record installment", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Record installment${staffName ? ` · ${staffName}` : ""}`} size="sm">
      {loan && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-subtle px-3 py-2 text-xs text-inkSoft">
            Remaining balance: <span className="font-money font-bold text-ink">{formatMoney(loan.remaining)}</span>
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

          <DatePicker label="Date" required value={date} onChange={setDate} max={todayIso()} />

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" loading={submitting} onClick={handleSubmit}>
              Record installment
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
