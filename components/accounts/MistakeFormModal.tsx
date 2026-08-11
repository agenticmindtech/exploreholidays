"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import SearchInput from "@/components/ui/SearchInput";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/stores/authStore";
import { mistakesApi } from "@/lib/api/mistakesApi";
import { salesApi } from "@/lib/api/salesApi";
import { usersApi } from "@/lib/api/usersApi";
import type { Sale, SessionUser } from "@/lib/types";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

interface MistakeFormModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function MistakeFormModal({ open, onClose, onCreated }: MistakeFormModalProps) {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const [staffUsers, setStaffUsers] = useState<SessionUser[]>([]);
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("0.000");

  const [bookingQuery, setBookingQuery] = useState("");
  const [matches, setMatches] = useState<Sale[]>([]);
  const [linkedSale, setLinkedSale] = useState<Sale | null>(null);

  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) usersApi.list({ pageSize: 200 }).then((e) => setStaffUsers(e.rows.filter((u) => u.role === "staff")));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    Promise.resolve().then(() => {
      setStaffId("");
      setDate(todayIso());
      setDescription("");
      setAmount("0.000");
      setBookingQuery("");
      setMatches([]);
      setLinkedSale(null);
      setError(undefined);
    });
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    if (!bookingQuery.trim()) {
      Promise.resolve().then(() => {
        if (!cancelled) setMatches([]);
      });
      return () => {
        cancelled = true;
      };
    }
    salesApi.list({ search: bookingQuery, page: 1, pageSize: 5 }).then((envelope) => {
      if (!cancelled) setMatches(envelope.rows);
    });
    return () => {
      cancelled = true;
    };
  }, [bookingQuery]);

  function handleClose() {
    onClose();
  }

  async function handleSubmit() {
    if (!staffId) {
      setError("Select the staff member responsible.");
      return;
    }
    if (!description.trim()) {
      setError("Describe what went wrong.");
      return;
    }
    const numeric = Number(amount.replace(/,/g, "")) || 0;
    if (numeric <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (!user) return;

    setSubmitting(true);
    try {
      await mistakesApi.create(
        { staffId, saleId: linkedSale?.id ?? null, date, description: description.trim(), amount: numeric },
        user.id
      );
      toast.success("Mistake reported", staffUsers.find((s) => s.id === staffId)?.name);
      onCreated();
    } catch (err) {
      toast.error("Could not report mistake", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Report a mistake" size="sm">
      <div className="flex flex-col gap-4">
        <Select label="Staff member" required value={staffId} onChange={(e) => setStaffId(e.target.value)}>
          <option value="">Select staff</option>
          {staffUsers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>

        <DatePicker label="Date" required value={date} onChange={setDate} max={todayIso()} />

        <Textarea label="Description" required rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />

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
        />

        <div>
          {linkedSale ? (
            <div className="flex items-center justify-between rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-700">
              Linked to <span className="font-money font-semibold">{linkedSale.bookingNo}</span>
              <button type="button" onClick={() => setLinkedSale(null)} aria-label="Unlink booking" className="text-primary-600 hover:text-primary-800">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <SearchInput placeholder="Link a booking (optional)..." onSearch={setBookingQuery} />
              {matches.length > 0 && (
                <div className="mt-1 max-h-32 overflow-y-auto rounded-xl border border-line">
                  {matches.map((sale) => (
                    <button
                      key={sale.id}
                      type="button"
                      onClick={() => {
                        setLinkedSale(sale);
                        setMatches([]);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-subtle"
                    >
                      <span className="font-money font-semibold text-ink">{sale.bookingNo}</span>
                      <span className="text-xs text-inkMuted">{sale.destination}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {error && <p className="text-xs text-danger-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={submitting} onClick={handleSubmit}>
            Report mistake
          </Button>
        </div>
      </div>
    </Modal>
  );
}
