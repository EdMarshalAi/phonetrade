import nodemailer from "nodemailer";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Отправка письма по SMTP-конфигу из integrations (key='smtp',
 * config={ host, port, user, pass, from }). Best-effort: не бросает.
 * Возвращает число успешно отправленных адресов.
 */
export async function sendEmail(to: string[], subject: string, text: string): Promise<number> {
  const recipients = to.filter(Boolean);
  if (recipients.length === 0) return 0;
  try {
    const db = createSupabaseAdminClient();
    const { data } = await db.from("integrations").select("config,is_enabled").eq("key", "smtp").maybeSingle();
    if (!data || data.is_enabled === false) return 0;
    const c = (data.config ?? {}) as { host?: string; port?: string | number; user?: string; pass?: string; from?: string };
    if (!c.host || !c.user || !c.pass) return 0;
    const port = Number(c.port) || 465;
    const transporter = nodemailer.createTransport({
      host: c.host,
      port,
      secure: port === 465,
      auth: { user: c.user, pass: c.pass },
    });
    const info = await transporter.sendMail({
      from: c.from || c.user,
      to: recipients.join(", "),
      subject,
      text,
    });
    return Array.isArray(info.accepted) ? info.accepted.length : recipients.length;
  } catch (err) {
    console.error("[mailer] send failed:", err);
    return 0;
  }
}
