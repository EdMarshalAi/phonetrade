import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getEmailSender, type SendOptions } from "./sender";
import { renderTemplate, addUtm } from "./render";
import { getSegmentRecipients } from "./queue";

/**
 * Отправка ручной кампании по сегменту (docs/email-marketing.md §7.3). Рендерит
 * шаблон на каждого получателя (с content_overrides + имя клиента + отписка),
 * шлёт батчем через EmailSender (rate-limit), пишет каждую отправку в
 * email_sends_log, обновляет статус кампании. Сегмент уже отфильтрован по
 * согласию на маркетинг (см. views). Недельный лимит к ручным кампаниям не
 * применяем — это осознанная отправка менеджером.
 */
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");
const MAX_RECIPIENTS = 5000;

export async function sendCampaignNow(campaignId: string): Promise<{ sent: number; failed: number; total: number; error?: string }> {
  const db = createSupabaseAdminClient();
  const { data: c } = await db
    .from("email_campaigns")
    .select("id,template_id,segment_slug,subject_override,preview_text_override,content_overrides,status")
    .eq("id", campaignId)
    .maybeSingle();
  if (!c) return { sent: 0, failed: 0, total: 0, error: "Кампания не найдена" };
  if (c.status === "sent" || c.status === "sending") return { sent: 0, failed: 0, total: 0, error: "Кампания уже отправляется/отправлена" };

  const { data: tpl } = await db.from("email_templates").select("slug,subject,html_content,text_content").eq("id", c.template_id).maybeSingle();
  if (!tpl) return { sent: 0, failed: 0, total: 0, error: "Шаблон не найден" };

  await db.from("email_campaigns").update({ status: "sending", updated_at: new Date().toISOString() }).eq("id", campaignId);

  const recipients = (await getSegmentRecipients(c.segment_slug ?? "all")).slice(0, MAX_RECIPIENTS);
  const overrides = (c.content_overrides ?? {}) as Record<string, unknown>;
  const subjectTpl = (c.subject_override as string) || tpl.subject;

  const options: SendOptions[] = [];
  const meta: { customerId: string; email: string; subject: string; html: string }[] = [];
  for (const r of recipients) {
    if (!r.email) continue;
    const firstName = (r.name ?? "").split(/\s+/)[0] || "";
    const vars = {
      campaign: { ...overrides, subject: subjectTpl, preview: (c.preview_text_override as string) || "" },
      customer: { first_name: firstName, name: r.name ?? "" },
      unsubscribe_url: `${SITE}/unsubscribe?c=${r.id}`,
    };
    const subject = renderTemplate(subjectTpl, vars);
    const html = addUtm(renderTemplate(tpl.html_content, vars), `campaign:${tpl.slug}`);
    options.push({ to: r.email, subject, html, text: tpl.text_content ? renderTemplate(tpl.text_content, vars) : undefined });
    meta.push({ customerId: r.id, email: r.email, subject, html });
  }

  if (options.length === 0) {
    await db.from("email_campaigns").update({ status: "sent", recipient_count: 0, sent_at: new Date().toISOString() }).eq("id", campaignId);
    return { sent: 0, failed: 0, total: 0 };
  }

  let sender;
  try { sender = await getEmailSender(); } catch (e) {
    await db.from("email_campaigns").update({ status: "failed" }).eq("id", campaignId);
    return { sent: 0, failed: 0, total: options.length, error: e instanceof Error ? e.message : "SMTP" };
  }

  const results = await sender.sendBatch(options, { perMinute: 30 });
  let sent = 0, failed = 0;
  const logs = results.map((res, i) => {
    if (res.success) sent++; else failed++;
    return {
      campaign_id: campaignId, template_id: c.template_id, customer_id: meta[i].customerId,
      recipient_email: meta[i].email, subject: meta[i].subject, body_html: meta[i].html,
      status: res.success ? "sent" : "failed", sent_at: res.success ? new Date().toISOString() : null,
      failure_reason: res.success ? null : res.error ?? null,
    };
  });
  // Пишем лог пачками (избегаем гигантского одиночного insert).
  for (let i = 0; i < logs.length; i += 200) {
    await db.from("email_sends_log").insert(logs.slice(i, i + 200));
  }

  await db.from("email_campaigns").update({ status: "sent", recipient_count: sent, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", campaignId);
  return { sent, failed, total: options.length };
}

/** Запланированные кампании, у которых наступило время — для cron. */
export async function processScheduledCampaigns(): Promise<{ processed: number }> {
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("email_campaigns")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .limit(5);
  let processed = 0;
  for (const c of (data ?? []) as { id: string }[]) {
    await sendCampaignNow(c.id);
    processed++;
  }
  return { processed };
}
