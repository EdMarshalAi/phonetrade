import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Публичный (anon) клиент Supabase для геттеров каталога.
 * null, если переменные окружения не заданы — тогда слой данных
 * (src/lib/products.ts) откатывается на мок-данные и приложение
 * продолжает работать локально без Supabase.
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        // Свой storageKey + без сессии/автообновления: этот anon-клиент только
        // читает каталог и НЕ должен делить auth-хранилище с AuthProvider
        // (иначе в браузере «Multiple GoTrueClient instances»).
        auth: { persistSession: false, autoRefreshToken: false, storageKey: "sb-pt-data" },
      })
    : null;
