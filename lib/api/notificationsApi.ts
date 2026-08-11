import type { AppNotification } from "@/lib/types";
import { delay, getStore, persist } from "./client";

export const notificationsApi = {
  async list(userId: string): Promise<AppNotification[]> {
    await delay();
    return getStore()
      .notifications.filter((n) => n.toUserId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async unreadCount(userId: string): Promise<number> {
    await delay();
    return getStore().notifications.filter((n) => n.toUserId === userId && !n.isRead).length;
  },

  async markRead(id: string): Promise<AppNotification> {
    await delay();
    const notification = getStore().notifications.find((n) => n.id === id);
    if (!notification) throw new Error(`Notification not found: ${id}`);
    notification.isRead = true;
    persist();
    return notification;
  },

  async markAllRead(userId: string): Promise<void> {
    await delay();
    for (const n of getStore().notifications) {
      if (n.toUserId === userId) n.isRead = true;
    }
    persist();
  },
};
