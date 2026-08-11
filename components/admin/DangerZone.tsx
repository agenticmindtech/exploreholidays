"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { resetDemoData } from "@/lib/api/client";

const CONFIRM_WORD = "RESET";

export default function DangerZone() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [resetting, setResetting] = useState(false);

  function handleClose() {
    setOpen(false);
    setTyped("");
  }

  function handleReset() {
    setResetting(true);
    resetDemoData();
    toast.success("Demo data reset", "Reloading with fresh seed data…");
    setTimeout(() => window.location.reload(), 600);
  }

  return (
    <>
      <Card className="flex flex-col gap-4 border border-danger-300 bg-danger-50">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div>
            <p className="font-display text-sm font-bold text-danger-700">Danger Zone</p>
            <p className="text-xs text-danger-600">Irreversible actions — proceed with care.</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-danger-200 bg-surface p-4">
          <div>
            <p className="text-sm font-semibold text-ink">Reset demo data</p>
            <p className="text-xs text-inkMuted">Wipes every change and restores the original seed data for this environment.</p>
          </div>
          <Button variant="danger" onClick={() => setOpen(true)}>
            Reset demo data
          </Button>
        </div>
      </Card>

      <Modal open={open} onClose={handleClose} title="Reset demo data?" size="sm">
        <p className="text-sm text-inkSoft">
          This permanently discards every sale, user, and setting you&apos;ve changed and restores the original seed data. This cannot be undone.
        </p>
        <div className="mt-4">
          <Input
            label={`Type ${CONFIRM_WORD} to confirm`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={CONFIRM_WORD}
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="danger" loading={resetting} disabled={typed !== CONFIRM_WORD} onClick={handleReset}>
            Reset everything
          </Button>
        </div>
      </Modal>
    </>
  );
}
