import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface CodeSnippet {
  key: string;
  code: string;
  placement: "head" | "body_end";
}

/**
 * Включённые кастомные интеграции-код (`custom_*`, config.type === "code").
 * Читается service-role клиентом (таблица integrations под RLS только для админа),
 * поэтому ТОЛЬКО на сервере. Используется в `(site)/layout.tsx` для вставки
 * счётчиков/пикселей/виджетов на витрину.
 */
export async function getCodeSnippets(): Promise<CodeSnippet[]> {
  try {
    const db = createSupabaseAdminClient();
    const { data } = await db
      .from("integrations")
      .select("key, config, is_enabled")
      .like("key", "custom_%")
      .eq("is_enabled", true);
    return ((data ?? []) as { key: string; config: Record<string, unknown> }[])
      .filter((r) => r.config?.type === "code" && typeof r.config?.code === "string")
      .map((r) => ({
        key: r.key,
        code: String(r.config.code),
        placement: r.config.placement === "head" ? "head" : "body_end",
      }));
  } catch {
    return [];
  }
}
