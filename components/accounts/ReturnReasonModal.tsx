"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/stores/authStore";
import { salesApi } from "@/lib/api/salesApi";
import type { Sale } from "@/lib/types";

interface ReturnReasonModalProps {
  open: boolean;
  saleId: string | null;
  bookingNo?: string;
  onClose: () => void;
  onReturned: (sale: Sale) => void;
}

export default function ReturnReasonModal({ open, saleId, bookingNo, onClose, onReturned }: ReturnReasonModalProps) {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    setReason("");
    setError(undefined);
    onClose();
  }

  async function handleSubmit() {
    if (reason.trim().length < 10) {
      setError("Reason must be at least 10 characters.");
      return;
    }
    if (!saleId || !user) return;
    setSubmitting(true);
    try {
      const sale = await salesApi.returnSale(saleId, user.id, reason.trim());
      toast.success("Sale returned", bookingNo ?? sale.bookingNo);
      onReturned(sale);
      handleClose();
    } catch (err) {
      toast.error("Could not return sale", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Return ${bookingNo ?? "sale"}`} size="sm">
      <Textarea
        label="Reason for return"
        required
        rows={4}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        error={error}
        hint="At least 10 characters — this is shown to the staff member."
      />
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="danger" loading={submitting} onClick={handleSubmit}>
          Return sale
        </Button>
      </div>
    </Modal>
  );
}
