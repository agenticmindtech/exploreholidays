"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Building2, Calendar, Mail, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import Card from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Toggle from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { useAuthStore } from "@/lib/stores/authStore";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useUiStore } from "@/lib/stores/uiStore";
import { branchesApi } from "@/lib/api/branchesApi";
import { ROLE_META } from "@/lib/constants/display";
import { formatDate } from "@/lib/utils/format";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();
  const setUiTheme = useUiStore((s) => s.setTheme);

  const [branchName, setBranchName] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    branchesApi.get(user.branchId).then((branch) => {
      if (active) setBranchName(branch.name);
    });
    return () => {
      active = false;
    };
  }, [user]);

  if (!user) return null;

  function handleThemeToggle() {
    toggleTheme();
    setUiTheme(theme === "dark" ? "light" : "dark");
  }

  function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!currentPassword) nextErrors.current = "Enter your current password.";
    if (newPassword.length < 6) nextErrors.next = "New password must be at least 6 characters.";
    if (newPassword !== confirmPassword) nextErrors.confirm = "Passwords do not match.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated", "Your password has been changed.");
    }, 500);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profile" subtitle="Your account details and preferences." breadcrumb="Home / Profile" />

      <div className="stagger flex flex-col gap-6">
        <Card className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar name={user.name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold text-ink">{user.name}</p>
            <p className="text-sm text-inkMuted">{user.designation}</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <p className="flex items-center gap-2 text-xs text-inkSoft">
                <Mail className="h-3.5 w-3.5 text-inkMuted" /> {user.email}
              </p>
              <p className="flex items-center gap-2 text-xs text-inkSoft">
                <ShieldCheck className="h-3.5 w-3.5 text-inkMuted" /> {ROLE_META[user.role].label}
              </p>
              <p className="flex items-center gap-2 text-xs text-inkSoft">
                <Building2 className="h-3.5 w-3.5 text-inkMuted" /> {branchName ?? "—"}
              </p>
              <p className="flex items-center gap-2 text-xs text-inkSoft">
                <Calendar className="h-3.5 w-3.5 text-inkMuted" /> Joined {formatDate(user.joinDate)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-1 font-display text-base font-bold text-ink">Appearance</h2>
          <p className="mb-4 text-xs text-inkMuted">Choose how TravelDesk Pro looks on this device.</p>
          <Toggle checked={theme === "dark"} onChange={handleThemeToggle} label="Dark mode" />
        </Card>

        <Card>
          <h2 className="mb-1 font-display text-base font-bold text-ink">Change Password</h2>
          <p className="mb-4 text-xs text-inkMuted">This is a demo — no password is actually stored.</p>
          <form onSubmit={handleChangePassword} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              error={errors.current}
              className="sm:col-span-2"
            />
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              error={errors.next}
              hint="At least 6 characters."
            />
            <Input
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirm}
            />
            <div className="sm:col-span-2">
              <Button type="submit" variant="primary" loading={saving}>
                Update password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
