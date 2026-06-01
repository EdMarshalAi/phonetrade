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

/**
 * Отправляет ФАЙЛ (документ) в Telegram через sendDocument. Конфиг — тот же
 * integrations(key='telegram'). Best-effort, не бросает. Возвращает число
 * успешных доставок (по числу чатов).
 */
export async function sendTelegramDocument(
  buffer: Buffer | Uint8Array,
  filename: string,
  mime: string,
  caption?: string,
  chatIdsOverride?: string[]
): Promise<number> {
  try {
    const db = createSupabaseAdminClient();
    const { data } = await db.from("integrations").select("config,is_enabled").eq("key", "telegram").maybeSingle();
    if (!data || data.is_enabled === false) return 0;
    const config = (data.config ?? {}) as { bot_token?: string; chat_ids?: string[] };
    const token = config.bot_token;
    const chatIds = chatIdsOverride?.length ? chatIdsOverride : config.chat_ids ?? [];
    if (!token || chatIds.length === 0) return 0;

    let ok = 0;
    for (const chatId of chatIds) {
      try {
        const form = new FormData();
        form.set("chat_id", chatId);
        if (caption) form.set("caption", caption.slice(0, 1024));
        form.set("document", new Blob([Uint8Array.from(buffer)], { type: mime }), filename);
        const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: "POST", body: form });
        if (res.ok) ok += 1;
      } catch {
        /* ignore single chat failure */
      }
    }
    return ok;
  } catch (err) {
    console.error("[telegram] sendDocument failed:", err);
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

function stripHtml(s: string): string {
  return s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
}

async function logNotification(db: ReturnType<typeof createSupabaseAdminClient>, trigger: string, channel: string, recipient: string | null, ok: boolean, detail?: string) {
  try {
    await db.from("notification_logs").insert({ trigger, channel, recipient, status: ok ? "sent" : "failed", detail: detail ?? null });
  } catch { /* ignore */ }
}

/**
 * Диспетчер уведомления по триггеру: читает notifications_config (каналы,
 * получатели, вкл/выкл) и шлёт в выбранные каналы (Telegram и/или Email),
 * пишет лог в notification_logs. Имя историческое — теперь мультиканальное.
 * Best-effort, не бросает. Возвращает суммарное число доставок.
 */
export async function notifyTelegram(trigger: string, text: string): Promise<number> {
  try {
    const db = createSupabaseAdminClient();
    const { data } = await db
      .from("notifications_config")
      .select("telegram_chat_ids,email_recipients,channels,is_enabled")
      .eq("trigger", trigger)
      .maybeSingle();
    if (data && data.is_enabled === false) return 0;

    const channels = (data?.channels ?? { telegram: true, email: false }) as { telegram?: boolean; email?: boolean };
    let delivered = 0;

    if (channels.telegram !== false) {
      const chats = (data?.telegram_chat_ids ?? []) as string[];
      const n = await sendTelegram(text, chats.length ? chats : undefined);
      delivered += n;
      await logNotification(db, trigger, "telegram", chats.length ? chats.join(", ") : "default", n > 0, n > 0 ? undefined : "не доставлено / бот не настроен");
    }

    if (channels.email === true) {
      let recipients = (data?.email_recipients ?? []) as string[];
      if (recipients.length === 0) {
        const { data: admins } = await db.from("admin_users").select("email").eq("is_active", true);
        recipients = ((admins ?? []) as { email: string | null }[]).map((a) => a.email).filter((e): e is string => !!e);
      }
      const subject = stripHtml(text).split("\n")[0]?.slice(0, 120) || "Уведомление PhoneTrade";
      const { sendEmail } = await import("@/lib/admin/mailer");
      const n = await sendEmail(recipients, subject, stripHtml(text));
      delivered += n;
      await logNotification(db, trigger, "email", recipients.join(", ") || "—", n > 0, n > 0 ? undefined : "не доставлено / SMTP не настроен");
    }

    return delivered;
  } catch {
    return 0;
  }
}
