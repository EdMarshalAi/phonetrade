"use client";

import * as React from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Session } from "@supabase/supabase-js";
import { registerStorefront, phoneToEmail } from "@/lib/auth/auth-actions";

export type AuthUser = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  createdAt: number;
};

export type RegisterInput = {
  name: string;
  phone: string;
  email?: string;
  password: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  /** false до загрузки сессии (избегаем мигания UI) */
  ready: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (
    patch: Partial<Pick<AuthUser, "name" | "email" | "phone" | "address">>
  ) => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Реальная авторизация покупателя через Supabase Auth (cookie-сессия, без
 * localStorage). Вход по телефону + паролю: телефон маппится в синтетический
 * email. Профиль хранится в таблице profiles.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = React.useMemo(
    () => createBrowserClient(SUPA_URL, SUPA_ANON),
    []
  );
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [ready, setReady] = React.useState(false);

  const loadFromSession = React.useCallback(
    async (session: Session | null) => {
      const su = session?.user;
      if (!su) {
        setUser(null);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, phone, email, address")
        .eq("id", su.id)
        .maybeSingle();
      const meta = (su.user_metadata ?? {}) as { name?: string; phone?: string };
      setUser({
        id: su.id,
        name: profile?.name || meta.name || "",
        phone: profile?.phone || meta.phone || "",
        email: profile?.email || su.email || undefined,
        address: profile?.address || undefined,
        createdAt: su.created_at ? new Date(su.created_at).getTime() : Date.now(),
      });
    },
    [supabase]
  );

  React.useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      loadFromSession(data.session).finally(() => active && setReady(true));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      loadFromSession(session);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, loadFromSession]);

  const login = React.useCallback(
    async (phone: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(phone),
        password,
      });
      if (error) throw new Error("Неверный телефон или пароль");
    },
    [supabase]
  );

  const register = React.useCallback(
    async (input: RegisterInput) => {
      const res = await registerStorefront(input);
      if (res.error) throw new Error(res.error);
      const { error } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(input.phone),
        password: input.password,
      });
      if (error) throw new Error("Аккаунт создан, но войти не удалось. Попробуйте войти вручную.");
    },
    [supabase]
  );

  const logout = React.useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  const updateProfile = React.useCallback(
    async (patch: Partial<Pick<AuthUser, "name" | "email" | "phone" | "address">>) => {
      const { data: au } = await supabase.auth.getUser();
      if (!au.user) return;
      const row: Record<string, string | null> = {};
      if (patch.name !== undefined) row.name = patch.name.trim();
      if (patch.phone !== undefined) row.phone = patch.phone.trim();
      if (patch.email !== undefined) row.email = patch.email.trim() || null;
      if (patch.address !== undefined) row.address = patch.address.trim() || null;
      await supabase.from("profiles").update(row).eq("id", au.user.id);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              name: patch.name?.trim() ?? prev.name,
              phone: patch.phone?.trim() ?? prev.phone,
              email: patch.email !== undefined ? patch.email.trim() || undefined : prev.email,
              address: patch.address !== undefined ? patch.address.trim() || undefined : prev.address,
            }
          : prev
      );
    },
    [supabase]
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
