import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AuthUser } from "@/components/providers/AuthProvider";

/**
 * Текущий покупатель по cookie-сессии (server-side). Используется для SSR-страниц,
 * чтобы UI знал об авторизации сразу, без ожидания клиентского getSession()
 * (иначе квиз/страница входа могут считать гостя авторизованным с задержкой).
 * Возвращает null для гостя.
 */
type SupaUser = { id: string; email?: string | null; created_at?: string; user_metadata?: Record<string, unknown> };

export async function getStorefrontUser(): Promise<AuthUser | null> {
  let su: SupaUser | null = null;
  try {
    const supa = await createSupabaseServerClient();
    const { data } = await supa.auth.getUser();
    su = (data.user as SupaUser | null) ?? null;
  } catch {
    return null;
  }
  if (!su) return null;

  let profile: { name?: string; phone?: string; email?: string; address?: string } | null = null;
  try {
    const db = createSupabaseAdminClient();
    const { data } = await db
      .from("profiles")
      .select("name, phone, email, address")
      .eq("id", su.id)
      .maybeSingle();
    profile = data;
  } catch {
    /* профиль не критичен — берём из метаданных */
  }

  const meta = (su.user_metadata ?? {}) as { name?: string; phone?: string };
  return {
    id: su.id,
    name: profile?.name || meta.name || "",
    phone: profile?.phone || meta.phone || "",
    email: profile?.email || su.email || undefined,
    address: profile?.address || undefined,
    createdAt: su.created_at ? new Date(su.created_at).getTime() : Date.now(),
  };
}
