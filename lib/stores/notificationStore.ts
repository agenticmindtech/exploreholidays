import { create } from "zustand";
import type { AppNotification } from "@/lib/types";
import { notificationsApi } from "@/lib/api/notificationsApi";

interface NotificationState {
  items: AppNotification[];
  unreadCount: number;
  loading: boolean;
  fetch: (userId: string) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  unreadCount: 0,
  loading: false,

  fetch: async (userId) => {
    set({ loading: true });
    const [items, unreadCount] = await Promise.all([notificationsApi.list(userId), notificationsApi.unreadCount(userId)]);
    set({ items, unreadCount, loading: false });
  },

  markRead: async (id) => {
    await notificationsApi.markRead(id);
    set((state) => ({
      items: state.items.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllRead: async (userId) => {
    await notificationsApi.markAllRead(userId);
    set((state) => ({ items: state.items.map((n) => ({ ...n, isRead: true })), unreadCount: 0 }));
  },
}));
