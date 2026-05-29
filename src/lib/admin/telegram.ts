import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Отправляет сообщение в Telegram по конфигу из таблицы integrations
 * (key='telegram', config={ bot_token, chat_ids: string[] }). Best-effort:
 * никогда не бросает — уведомления не должны ронять основное действие.
 * Возвращает число успешных доставок.
 */
export async function sendTelegram(text: string, chatIdsOverride?: string[]): Promise<number> {
  try {
    const db = createSupabaseAdminClient();
    const { data } = await db.from("integrations").select("config,is_enabled").eq("key", "telegram").maybeSingle();
    if (!data || data.is_enabled === false) return 0;
    const config = (data.config ?? {}) as { bot_token?: string; chat_ids?: string[] };
    const token = config.bot_token;
    const chatIds = chatIdsOverride?.length ? chatIdsOverride : config.chat_ids ?? [];
    if (!token || chatIds.length === 0) return 0;

    let ok = 0;
    await Promise.all(
      chatIds.map(async (chatId) => {
        try {
          const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
          });
          if (res.ok) ok += 1;
        } catch {
          /* ignore single chat failure */
        }
      })
    );
    return ok;
  } catch (err) {
    console.error("[telegram] send failed:", err);
    return 0;
  }
}

/** Получатели Telegram для конкретного триггера из notifications_config. */
export async function telegramRecipientsFor(trigger: string): Promise<string[]> {
  try {
    const db = createSupabaseAdminClient();
    const { data } = await db
      .from("notifications_config")
      .select("telegram_chat_ids,is_enabled")
      .eq("trigger", trigger)
      .maybeSingle();
    if (!data || data.is_enabled === false) return [];
    return (data.telegram_chat_ids ?? []) as string[];
  } catch {
    return [];
  }
}
