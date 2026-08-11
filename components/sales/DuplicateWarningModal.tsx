"use client";

import { AlertTriangle } from "lucide-react";
import type { Sale } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import StatusPill from "@/components/ui/StatusPill";
import { formatDate, formatMoney } from "@/lib/utils/format";

interface DuplicateWarningModalProps {
  open: boolean;
  matchingSale: Sale | null;
  matchingStaffName?: string;
  onEditEntry: () => void;
  onSubmitAnyway: () => void;
}

export default function DuplicateWarningModal({
  open,
  matchingSale,
  matchingStaffName,
  onEditEntry,
  onSubmitAnyway,
}: DuplicateWarningModalProps) {
  return (
    <Modal open={open} onClose={onEditEntry} title="Possible duplicate booking">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-50 text-warning-600">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <p className="text-sm text-inkSoft">
          A sale that looks like this one already exists. Review it below before continuing.
        </p>
      </div>

      {matchingSale && (
        <div className="mt-4 rounded-xl border border-line p-4">
          <div className="flex items-center justify-between">
            <p className="font-money text-sm font-bold text-ink">{matchingSale.bookingNo}</p>
            <StatusPill status={matchingSale.status} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-inkMuted">Date</p>
              <p className="font-medium text-ink">{formatDate(matchingSale.transactionDate)}</p>
            </div>
            <div>
              <p className="text-inkMuted">Staff</p>
              <p className="font-medium text-ink">{matchingStaffName ?? matchingSale.staffId}</p>
            </div>
            <div>
              <p className="text-inkMuted">Amount</p>
              <p className="font-money font-medium text-ink">{formatMoney(matchingSale.sellingPrice)}</p>
            </div>
            <div>
              <p className="text-inkMuted">Destination</p>
              <p className="font-medium text-ink">{matchingSale.destination}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onEditEntry}>
          Edit entry
        </Button>
        <Button variant="danger" onClick={onSubmitAnyway}>
          Submit anyway
        </Button>
      </div>
    </Modal>
  );
}
