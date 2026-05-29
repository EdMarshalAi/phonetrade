"use client";

import * as React from "react";

export type AuthUser = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  createdAt: number;
};

export type RegisterInput = {
  name: string;
  phone: string;
  email?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  /** false until localStorage has been read on the client (avoids UI flash) */
  ready: boolean;
  login: (phone: string) => AuthUser;
  register: (input: RegisterInput) => AuthUser;
  logout: () => void;
  updateProfile: (
    patch: Partial<Pick<AuthUser, "name" | "email" | "phone">>
  ) => void;
};

const USERS_KEY = "pt:auth:users";
const SESSION_KEY = "pt:auth:session";

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function readUsers(): Record<string, AuthUser> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(USERS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeUsers(users: Record<string, AuthUser>) {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    try {
      const session = window.localStorage.getItem(SESSION_KEY);
      if (session) {
        const users = readUsers();
        if (users[session]) setUser(users[session]);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const login = React.useCallback((phone: string): AuthUser => {
    const key = normalizePhone(phone);
    const users = readUsers();
    const found = users[key];
    if (!found) {
      throw new Error("Аккаунт с таким номером не найден. Зарегистрируйтесь.");
    }
    window.localStorage.setItem(SESSION_KEY, key);
    setUser(found);
    return found;
  }, []);

  const register = React.useCallback((input: RegisterInput): AuthUser => {
    const key = normalizePhone(input.phone);
    const users = readUsers();
    if (users[key]) {
      throw new Error("Этот номер уже зарегистрирован. Войдите.");
    }
    const next: AuthUser = {
      id: `u_${key.slice(-6) || Date.now().toString().slice(-6)}`,
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || undefined,
      createdAt: Date.now(),
    };
    users[key] = next;
    writeUsers(users);
    window.localStorage.setItem(SESSION_KEY, key);
    setUser(next);
    return next;
  }, []);

  const logout = React.useCallback(() => {
    window.localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const updateProfile = React.useCallback(
    (patch: Partial<Pick<AuthUser, "name" | "email" | "phone">>) => {
      setUser((prev) => {
        if (!prev) return prev;
        const oldKey = normalizePhone(prev.phone);
        const updated: AuthUser = {
          ...prev,
          ...patch,
          name: (patch.name ?? prev.name).trim(),
          phone: (patch.phone ?? prev.phone).trim(),
          email:
            patch.email !== undefined
              ? patch.email.trim() || undefined
              : prev.email,
        };
        const newKey = normalizePhone(updated.phone);
        const users = readUsers();
        if (newKey !== oldKey) delete users[oldKey];
        users[newKey] = updated;
        writeUsers(users);
        window.localStorage.setItem(SESSION_KEY, newKey);
        return updated;
      });
    },
    []
  );

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, ready, login, register, logout, updateProfile }),
    [user, ready, login, register, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
