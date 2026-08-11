import type { SessionUser } from "@/lib/types";
import { delay, getStore, nowIso, persist, toSessionUser } from "./client";
import { appendAudit } from "./_shared";

export const authApi = {
  async login(email: string, password: string): Promise<SessionUser> {
    await delay();
    const store = getStore();
    const user = store.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || user.password !== password) {
      throw new Error("Invalid email or password.");
    }
    if (!user.isActive) {
      throw new Error("This account has been deactivated. Contact your administrator.");
    }
    user.lastLoginAt = nowIso();
    appendAudit({ userId: user.id, module: "auth", entityId: user.id, action: "login" });
    persist();
    return toSessionUser(user);
  },

  async logout(): Promise<void> {
    await delay();
  },

  async getSession(): Promise<SessionUser | null> {
    await delay();
    return null;
  },
};
