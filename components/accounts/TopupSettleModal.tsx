"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import DatePicker from "@/components/ui/DatePicker";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/stores/authStore";
import { suppliersApi } from "@/lib/api/suppliersApi";
import type { Supplier } from "@/lib/types";
import { formatMoney } from "@/lib/utils/format";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

interface TopupSettleModalProps {
  open: boolean;
  mode: "topup" | "settle";
  supplier: Supplier | null;
  onClose: () => void;
  onDone: (supplier: Supplier) => void;
}

export default function TopupSettleModal({ open, mode, supplier, onClose, onDone }: TopupSettleModalProps) {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const [amount, setAmount] = useState("0.000");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(todayIso());
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.resolve().then(() => {
      setAmount("0.000");
      setReference("");
      setDate(todayIso());
      setError(undefined);
    });
  }, [open]);

  function handleClose() {
    onClose();
  }

  async function handleSubmit() {
    if (!supplier || !user) return;
    const numeric = Number(amount.replace(/,/g, "")) || 0;
    if (numeric <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (mode === "settle" && numeric > supplier.toSettle) {
      setError(`Settlement cannot exceed the outstanding balance of ${formatMoney(supplier.toSettle)}.`);
      return;
    }
    setSubmitting(true);
    try {
      const updated =
        mode === "topup"
          ? await suppliersApi.topUp(supplier.id, numeric, user.id, reference.trim() || undefined, date)
          : await suppliersApi.settle(supplier.id, numeric, user.id, reference.trim() || undefined, date);
      toast.success(mode === "topup" ? "Wallet topped up" : "Supplier settled", `${supplier.name} · ${formatMoney(numeric)}`);
      onDone(updated);
    } catch (err) {
      toast.error(mode === "topup" ? "Could not top up" : "Could not settle", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={`${mode === "topup" ? "Top-up" : "Settle"}${supplier ? ` · ${supplier.name}` : ""}`} size="sm">
      {supplier && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-subtle px-3 py-2 text-xs text-inkSoft">
            {mode === "topup" ? (
              <>
                Current wallet balance: <span className="font-money font-bold text-ink">{formatMoney(supplier.walletBalance)}</span>
              </>
            ) : (
              <>
                Outstanding to settle: <span className="font-money font-bold text-ink">{formatMoney(supplier.toSettle)}</span>
              </>
            )}
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

          <Input label="Reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transfer / cheque ref." />

          <DatePicker label="Date" required value={date} onChange={setDate} max={todayIso()} />

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" loading={submitting} onClick={handleSubmit}>
              {mode === "topup" ? "Top up" : "Settle"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
