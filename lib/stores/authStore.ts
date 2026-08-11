import { create } from "zustand";
import type { SessionUser } from "@/lib/types";
import { authApi } from "@/lib/api/authApi";

const SESSION_KEY = "td-session";

interface StoredSession {
  user: SessionUser;
  loginAt: string;
}

interface AuthState {
  user: SessionUser | null;
  isAuthed: boolean;
  isRestoring: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => void;
  restore: () => void;
  setUser: (user: SessionUser | null) => void;
}

function readSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function writeSession(session: StoredSession | null) {
  try {
    if (session) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // localStorage unavailable — session still works for this tab/session
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthed: false,
  isRestoring: true,

  login: async (email, password) => {
    const user = await authApi.login(email, password);
    writeSession({ user, loginAt: new Date().toISOString() });
    set({ user, isAuthed: true, isRestoring: false });
    return user;
  },

  logout: () => {
    writeSession(null);
    set({ user: null, isAuthed: false, isRestoring: false });
  },

  restore: () => {
    const session = readSession();
    if (session?.user) {
      set({ user: session.user, isAuthed: true, isRestoring: false });
    } else {
      set({ user: null, isAuthed: false, isRestoring: false });
    }
  },

  setUser: (user) => set({ user, isAuthed: !!user }),
}));
