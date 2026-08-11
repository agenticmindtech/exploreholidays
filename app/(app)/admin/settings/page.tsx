"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import SettingsForm from "@/components/admin/SettingsForm";
import DangerZone from "@/components/admin/DangerZone";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/stores/authStore";
import { settingsApi } from "@/lib/api/settingsApi";
import type { Settings } from "@/lib/types";

export default function AdminSettingsPage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const [saved, setSaved] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsApi.get().then((s) => {
      setSaved(s);
      setDraft(s);
    });
  }, []);

  const dirty = !!saved && !!draft && JSON.stringify(saved) !== JSON.stringify(draft);

  function handleDiscard() {
    setDraft(saved);
  }

  async function handleSave() {
    if (!draft || !user) return;
    setSaving(true);
    try {
      const updated = await settingsApi.update(draft, user.id);
      setSaved(updated);
      setDraft(updated);
      toast.success("Settings saved", "Changes are live across the app.");
    } catch (err) {
      toast.error("Could not save settings", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!draft) {
    return (
      <div className="mx-auto max-w-3xl">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-6 h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <PageHeader title="Settings" subtitle="Agency profile, finance defaults, and system behavior." breadcrumb="Admin / Settings" />

      <div className="stagger flex flex-col gap-6">
        <SettingsForm value={draft} onChange={setDraft} />
        <DangerZone />
      </div>

      {dirty && (
        <div className="card-glass fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-3xl items-center justify-between gap-4 rounded-t-2xl border p-4 shadow-lg md:left-[264px] md:right-4">
          <p className="text-sm font-semibold text-ink">You have unsaved changes.</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleDiscard} disabled={saving}>
              Discard
            </Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
