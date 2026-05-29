import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Service-role клиент Supabase — обходит RLS. ТОЛЬКО для серверного кода
 * (Server Actions / Route Handlers админки). Никогда не импортировать в
 * клиентские компоненты: ключ не должен попасть в браузерный бандл.
 *
 * Авторизацию/роль проверяй ДО вызова мутаций (см. lib/admin/auth.ts) —
 * этот клиент сам по себе не знает, кто его дёргает.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service-role env (NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY) не заданы"
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
