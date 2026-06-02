import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getEmailSender, type EmailSender } from "./sender";
import { renderTemplate, addUtm } from "./render";
import { applyContent, type TemplateContent } from "./content";
import { getFeaturedCardsHtml } from "./featured";

/**
 * Обработчик очереди писем (docs/email-marketing.md §10.1). Дёргается cron-ом
 * (внешний сервис → /api/cron/process-email-queue). На каждый элемент:
 * проверка согласия (для marketing/trigger), лимита 3/нед, тихих часов (22-08
 * МSK), рендер шаблона из БД, отправка через EmailSender, запись в sends_log.
 */
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");
const QUIET_START = 22; // МSK
const QUIET_END = 8;

type QueueRow = {
  id: number; trigger_id: string | null; customer_id: string | null;
  recipient_email: string; template_id: string | null;
  variables: Record<string, unknown> | null; attempts: number; max_attempts: number;
};

const mskHour = (d: Date) => (d.getUTCHours() + 3) % 24;
const inQuietHours = (d: Date) => { const h = mskHour(d); return h >= QUIET_START || h < QUIET_END; };
/** Ближайшие 08:00 МSK = 05:00 UTC. */
function nextMorning(d: Date): Date {
  const r = new Date(d);
  r.setUTCMinutes(0, 0, 0);
  r.setUTCHours(5);
  if (r.getTime() <= d.getTime()) r.setUTCDate(r.getUTCDate() + 1);
  return r;
}
const addHours = (d: Date, h: number) => new Date(d.getTime() + h * 3_600_000);

async function hasMarketingConsent(db: ReturnType<typeof createSupabaseAdminClient>, customerId: string): Promise<boolean> {
  const { data } = await db.from("data_consents").select("id").eq("customer_id", customerId).eq("consent_type", "marketing").is("revoked_at", null).limit(1);
  return (data?.length ?? 0) > 0;
}

export async function processEmailQueue(limit = 25): Promise<{ processed: number; sent: number; errors: number }> {
  const db = createSupabaseAdminClient();
  const now = new Date();
  const { data: pending } = await db
    .from("email_queue")
    .select("id,trigger_id,customer_id,recipient_email,template_id,variables,attempts,max_attempts")
    .eq("status", "pending")
    .lte("scheduled_at", now.toISOString())
    .order("scheduled_at")
    .limit(limit);
  if (!pending?.length) return { processed: 0, sent: 0, errors: 0 };

  let sender: EmailSender | null = null;
  try { sender = await getEmailSender(); } catch { sender = null; }

  let sent = 0, errors = 0;
  for (const item of pending as QueueRow[]) {
    await db.from("email_queue").update({ status: "processing" }).eq("id", item.id);
    try {
      const { data: tpl } = await db.from("email_templates").select("slug,category,subject,html_content,text_content,content,is_active").eq("id", item.template_id).maybeSingle();
      if (!tpl || tpl.is_active === false) { await cancel(db, item.id, "Шаблон не найден/выключен"); continue; }

      const isMarketing = tpl.category === "marketing" || tpl.category === "trigger";

      // Тихие часы (для не-транзакционных, если триггер их не разрешает).
      let allowQuiet = false;
      if (item.trigger_id) {
        const { data: tr } = await db.from("email_triggers").select("send_in_quiet_hours").eq("id", item.trigger_id).maybeSingle();
        allowQuiet = !!tr?.send_in_quiet_hours;
      }
      if (isMarketing && !allowQuiet && inQuietHours(now)) { await reschedule(db, item.id, nextMorning(now)); continue; }

      // Согласие + недельный лимит (только marketing/trigger с известным клиентом).
      if (isMarketing && item.customer_id) {
        if (!(await hasMarketingConsent(db, item.customer_id))) { await cancel(db, item.id, "Нет согласия на маркетинг"); continue; }
        const { data: underCap } = await db.rpc("can_send_marketing_email", { p_customer_id: item.customer_id });
        if (underCap === false) { await reschedule(db, item.id, addHours(now, 24)); continue; }
      }

      // Слой контента ({{c.*}}) → витрина товаров ({{products}}) → рантайм-переменные.
      const contentHtml = applyContent(tpl.html_content, (tpl.content ?? {}) as TemplateContent);
      const vars: Record<string, unknown> = { ...(item.variables ?? {}), unsubscribe_url: `${SITE}/unsubscribe${item.customer_id ? `?c=${item.customer_id}` : ""}` };
      if (contentHtml.includes("{{products}}")) vars.products = await getFeaturedCardsHtml({ categoryPrefix: "iphone", limit: 4 });
      const subject = renderTemplate(applyContent(tpl.subject, (tpl.content ?? {}) as TemplateContent), vars);
      const html = addUtm(renderTemplate(contentHtml, vars), tpl.slug);
      const text = tpl.text_content ? renderTemplate(tpl.text_content, vars) : undefined;

      const { data: log } = await db.from("email_sends_log").insert({
        trigger_id: item.trigger_id, template_id: item.template_id, customer_id: item.customer_id,
        recipient_email: item.recipient_email, subject, body_html: html, status: "sending",
      }).select("id").maybeSingle();

      const res = sender ? await sender.send({ to: item.recipient_email, subject, html, text }) : { success: false, error: "SMTP не настроен" };
      if (res.success) {
        sent++;
        if (log?.id) await db.from("email_sends_log").update({ status: "sent", sent_at: now.toISOString() }).eq("id", log.id);
        await db.from("email_queue").update({ status: "sent", processed_at: now.toISOString() }).eq("id", item.id);
      } else {
        errors++;
        if (log?.id) await db.from("email_sends_log").update({ status: "failed", failure_reason: res.error ?? null }).eq("id", log.id);
        await bumpAttempts(db, item, res.error ?? "send failed");
      }
    } catch (e) {
      errors++;
      await bumpAttempts(db, item, e instanceof Error ? e.message : "error");
    }
  }
  return { processed: pending.length, sent, errors };
}

async function cancel(db: ReturnType<typeof createSupabaseAdminClient>, id: number, reason: string) {
  await db.from("email_queue").update({ status: "cancelled", failure_reason: reason, processed_at: new Date().toISOString() }).eq("id", id);
}
async function reschedule(db: ReturnType<typeof createSupabaseAdminClient>, id: number, at: Date) {
  await db.from("email_queue").update({ status: "pending", scheduled_at: at.toISOString() }).eq("id", id);
}
async function bumpAttempts(db: ReturnType<typeof createSupabaseAdminClient>, item: QueueRow, reason: string) {
  const attempts = (item.attempts ?? 0) + 1;
  if (attempts >= (item.max_attempts ?? 3)) {
    await db.from("email_queue").update({ status: "failed", attempts, failure_reason: reason, processed_at: new Date().toISOString() }).eq("id", item.id);
  } else {
    await db.from("email_queue").update({ status: "pending", attempts, failure_reason: reason, scheduled_at: addHours(new Date(), 1).toISOString() }).eq("id", item.id);
  }
}
