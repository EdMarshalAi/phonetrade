import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Серверный Supabase-клиент с cookie-сессией (@supabase/ssr) для админки.
 * Используется в Server Components / Server Actions: читает сессию из cookies
 * (в Next 16 `cookies()` асинхронна). Запись cookie из Server Component молча
 * игнорируется — обновление сессии делает proxy.ts.
 */
export async function createSupabaseServerClient() {
  if (!url || !anonKey) {
    throw new Error("Supabase env (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY) не заданы");
  }
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Вызов из Server Component — игнорируем, сессию освежает proxy.ts.
        }
      },
    },
  });
}
