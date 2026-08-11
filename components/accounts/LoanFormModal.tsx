"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import Toggle from "@/components/ui/Toggle";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/stores/authStore";
import { loansApi } from "@/lib/api/loansApi";
import { usersApi } from "@/lib/api/usersApi";
import type { SessionUser } from "@/lib/types";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function moneyChange(setter: (v: string) => void) {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const stripped = e.target.value.replace(/,/g, "");
    if (/^\d*\.?\d*$/.test(stripped)) setter(stripped);
  };
}

function moneyBlur(value: string, setter: (v: string) => void) {
  return () => {
    const n = Math.max(0, Number(value.replace(/,/g, "")) || 0);
    setter(n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }));
  };
}

interface LoanFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function LoanFormModal({ open, onClose, onCreated }: LoanFormModalProps) {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const [staffUsers, setStaffUsers] = useState<SessionUser[]>([]);
  const [staffId, setStaffId] = useState("");
  const [amount, setAmount] = useState("0.000");
  const [reason, setReason] = useState("");
  const [issueDate, setIssueDate] = useState(todayIso());
  const [installmentAmount, setInstallmentAmount] = useState("0.000");
  const [deductFromSalary, setDeductFromSalary] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) usersApi.list({ pageSize: 200 }).then((e) => setStaffUsers(e.rows.filter((u) => u.role === "staff")));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    Promise.resolve().then(() => {
      setStaffId("");
      setAmount("0.000");
      setReason("");
      setIssueDate(todayIso());
      setInstallmentAmount("0.000");
      setDeductFromSalary(true);
      setError(undefined);
    });
  }, [open]);

  const amountNumeric = Number(amount.replace(/,/g, "")) || 0;
  const installmentNumeric = Number(installmentAmount.replace(/,/g, "")) || 0;
  const installmentsTotal = installmentNumeric > 0 ? Math.ceil(amountNumeric / installmentNumeric) : 0;

  function handleClose() {
    onClose();
  }

  async function handleSubmit() {
    if (!staffId) {
      setError("Select the staff member receiving the loan.");
      return;
    }
    if (amountNumeric <= 0) {
      setError("Enter a loan amount greater than 0.");
      return;
    }
    if (installmentNumeric <= 0) {
      setError("Enter an installment amount greater than 0.");
      return;
    }
    if (!reason.trim()) {
      setError("Enter a reason for the loan.");
      return;
    }
    if (!user) return;

    setSubmitting(true);
    try {
      await loansApi.create(
        {
          staffId,
          amount: amountNumeric,
          reason: reason.trim(),
          issueDate,
          installmentAmount: installmentNumeric,
          installmentsTotal,
          deductFromSalary,
        },
        user.id
      );
      toast.success("Loan issued", `${staffUsers.find((s) => s.id === staffId)?.name ?? staffId}`);
      onCreated();
    } catch (err) {
      toast.error("Could not issue loan", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Issue staff loan" size="sm">
      <div className="flex flex-col gap-4">
        <Select label="Staff member" required value={staffId} onChange={(e) => setStaffId(e.target.value)}>
          <option value="">Select staff</option>
          {staffUsers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>

        <Input label="Loan amount" required value={amount} className="font-money" onChange={moneyChange(setAmount)} onBlur={moneyBlur(amount, setAmount)} />

        <Textarea label="Reason" required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />

        <DatePicker label="Issue date" required value={issueDate} onChange={setIssueDate} max={todayIso()} />

        <Input
          label="Installment amount"
          required
          value={installmentAmount}
          className="font-money"
          onChange={moneyChange(setInstallmentAmount)}
          onBlur={moneyBlur(installmentAmount, setInstallmentAmount)}
          hint={installmentsTotal > 0 ? `${installmentsTotal} installment(s) to fully repay.` : undefined}
        />

        <Toggle checked={deductFromSalary} onChange={setDeductFromSalary} label="Deduct installments from salary" />

        {error && <p className="text-xs text-danger-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={submitting} onClick={handleSubmit}>
            Issue loan
          </Button>
        </div>
      </div>
    </Modal>
  );
}
