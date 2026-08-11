import type { Settings } from "@/lib/types";
import { delay, getStore, persist } from "./client";
import { appendAudit } from "./_shared";

export const settingsApi = {
  async get(): Promise<Settings> {
    await delay();
    return getStore().settings;
  },

  async update(data: Partial<Settings>, byUserId: string): Promise<Settings> {
    await delay();
    const store = getStore();
    Object.assign(store.settings, data);
    appendAudit({ userId: byUserId, module: "settings", entityId: "settings", action: "settings" });
    persist();
    return store.settings;
  },
};
