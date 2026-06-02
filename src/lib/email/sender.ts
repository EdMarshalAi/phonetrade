import nodemailer from "nodemailer";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Абстракция отправки писем (см. docs/email-marketing.md §3). Реализация —
 * SMTP через nodemailer; конфиг берётся из таблицы `integrations` (key='smtp'),
 * НЕ из env (у нас SMTP централизован в БД). На будущее — заглушка под
 * транзакционный провайдер (UniSender Go и т.п.), переключение через фабрику.
 */
export type SendOptions = {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  metadata?: { sendId?: number; templateSlug?: string };
};

export type SendResult = { success: boolean; messageId?: string; error?: string };

export interface EmailSender {
  send(options: SendOptions): Promise<SendResult>;
  /** Пакетная отправка с ограничением скорости (по умолчанию 30 писем/мин). */
  sendBatch(batch: SendOptions[], opts?: { perMinute?: number }): Promise<SendResult[]>;
}

class SmtpEmailSender implements EmailSender {
  constructor(private cfg: { host: string; port: number; user: string; pass: string; from: string }) {}

  private transporter() {
    return nodemailer.createTransport({
      host: this.cfg.host,
      port: this.cfg.port,
      secure: this.cfg.port === 465,
      auth: { user: this.cfg.user, pass: this.cfg.pass },
    });
  }

  async send(o: SendOptions): Promise<SendResult> {
    try {
      const info = await this.transporter().sendMail({
        from: o.from || this.cfg.from || this.cfg.user,
        to: o.toName ? `${o.toName} <${o.to}>` : o.to,
        replyTo: o.replyTo,
        subject: o.subject,
        html: o.html,
        text: o.text,
      });
      return { success: true, messageId: info.messageId };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Ошибка отправки" };
    }
  }

  async sendBatch(batch: SendOptions[], opts?: { perMinute?: number }): Promise<SendResult[]> {
    const perMinute = Math.max(1, opts?.perMinute ?? 30);
    const gapMs = Math.ceil(60_000 / perMinute);
    const results: SendResult[] = [];
    for (let i = 0; i < batch.length; i++) {
      results.push(await this.send(batch[i]));
      if (i < batch.length - 1) await new Promise((r) => setTimeout(r, gapMs));
    }
    return results;
  }
}

/** Заглушка под будущий транзакционный провайдер (включается EMAIL_PROVIDER). */
class UnisenderGoEmailSender implements EmailSender {
  async send(): Promise<SendResult> {
    return { success: false, error: "UniSender Go не реализован" };
  }
  async sendBatch(batch: SendOptions[]): Promise<SendResult[]> {
    return batch.map(() => ({ success: false, error: "UniSender Go не реализован" }));
  }
}

/**
 * Фабрика отправителя. Сейчас всегда SMTP из `integrations`. Когда понадобится
 * провайдер — EMAIL_PROVIDER=unisender_go и заполнить класс выше.
 */
export async function getEmailSender(): Promise<EmailSender> {
  const provider = process.env.EMAIL_PROVIDER ?? "smtp";
  if (provider === "unisender_go") return new UnisenderGoEmailSender();

  const db = createSupabaseAdminClient();
  const { data } = await db.from("integrations").select("config,is_enabled").eq("key", "smtp").maybeSingle();
  const c = (data?.config ?? {}) as { host?: string; port?: string | number; user?: string; pass?: string; from?: string };
  if (data?.is_enabled === false || !c.host || !c.user || !c.pass) {
    throw new Error("SMTP не настроен или выключен (Настройки → Интеграции → SMTP)");
  }
  return new SmtpEmailSender({
    host: c.host,
    port: Number(c.port) || 465,
    user: c.user,
    pass: c.pass,
    from: c.from || c.user,
  });
}
