"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/admin/audit";
import { loginSchema } from "@/lib/admin/schemas";

export interface SignInResult {
  error?: string;
  ok?: boolean;
}

/**
 * Вход в админку по email+паролю (Supabase Auth). После успешной
 * аутентификации проверяет, что пользователь — активный admin_users,
 * иначе выходит и отказывает. Возвращает результат (редирект делает клиент,
 * чтобы корректно учесть returnTo).
 */
export async function signInAction(input: {
  email: string;
  password: string;
}): Promise<SignInResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Проверьте корректность данных" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { error: "Неверный email или пароль" };
  }

  // Проверяем доступ к админке.
  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id, is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!adminRow || !adminRow.is_active) {
    await supabase.auth.signOut();
    return { error: "Доступ к админке запрещён для этого аккаунта" };
  }

  // last_login_at + аудит (service-role, мимо RLS).
  try {
    const svc = createSupabaseAdminClient();
    await svc
      .from("admin_users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", data.user.id);
  } catch {
    // не критично для входа
  }
  await writeAudit({ userId: data.user.id, action: "login" });

  return { ok: true };
}
