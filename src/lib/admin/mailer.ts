import nodemailer from "nodemailer";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SmtpConfig = { host?: string; port?: string | number; user?: string; pass?: string; from?: string };

/** Читает SMTP-конфиг из integrations (key='smtp'); null если выключено/не настроено. */
async function getSmtp(): Promise<SmtpConfig | null> {
  try {
    const db = createSupabaseAdminClient();
    const { data } = await db.from("integrations").select("config,is_enabled").eq("key", "smtp").maybeSingle();
    if (!data || data.is_enabled === false) return null;
    const c = (data.config ?? {}) as SmtpConfig;
    if (!c.host || !c.user || !c.pass) return null;
    return c;
  } catch {
    return null;
  }
}

/**
 * Базовая отправка письма по SMTP-конфигу из integrations. Поддерживает text и
 * html. Best-effort: не бросает, возвращает успех/ошибку. Используется и для
 * админских уведомлений, и для писем покупателю.
 */
export async function sendMail(opts: {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const recipients = (Array.isArray(opts.to) ? opts.to : [opts.to]).filter(Boolean);
  if (recipients.length === 0) return { ok: false, error: "Нет получателей" };
  const c = await getSmtp();
  if (!c) return { ok: false, error: "SMTP не настроен" };
  try {
    const port = Number(c.port) || 465;
    const transporter = nodemailer.createTransport({
      host: c.host,
      port,
      secure: port === 465,
      auth: { user: c.user!, pass: c.pass! },
    });
    await transporter.sendMail({
      from: c.from || c.user!,
      to: recipients.join(", "),
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return { ok: true };
  } catch (err) {
    console.error("[mailer] send failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Ошибка отправки" };
  }
}

/**
 * Отправка письма по SMTP — обёртка для админских уведомлений (text-only).
 * Возвращает число успешно отправленных адресов (0 или recipients.length).
 */
export async function sendEmail(to: string[], subject: string, text: string): Promise<number> {
  const recipients = to.filter(Boolean);
  if (recipients.length === 0) return 0;
  const res = await sendMail({ to: recipients, subject, text });
  return res.ok ? recipients.length : 0;
}
