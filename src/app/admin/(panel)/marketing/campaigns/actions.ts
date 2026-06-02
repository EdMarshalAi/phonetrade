"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/admin/mailer";
import { renderTemplate, addUtm } from "@/lib/email/render";
import { applyContent, type TemplateContent } from "@/lib/email/content";
import { getFeaturedCardsHtml } from "@/lib/email/featured";
import { getSegmentSize } from "@/lib/email/queue";
import { sendCampaignNow } from "@/lib/email/send-campaign";

const STAFF = ["admin", "manager"] as const;
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type CampaignInput = {
  name: string;
  segmentSlug: string;
  templateSlug: string;
  subjectOverride?: string;
  previewOverride?: string;
  overrides?: Record<string, string>;
  mode: "now" | "schedule";
  scheduledAt?: string | null;
};

/** Размер сегмента — для живого счётчика «будет отправлено N» в визарде. */
export async function getSegmentSizeAction(slug: string): Promise<number> {
  await requireAdmin([...STAFF]);
  return getSegmentSize(slug);
}

function mergeContent(base: TemplateContent, overrides?: Record<string, string>): TemplateContent {
  const o: Record<string, string> = {};
  for (const k of ["heading", "body", "cta_text", "cta_url", "header_image"]) {
    const v = overrides?.[k];
    if (typeof v === "string" && v.trim()) o[k] = v;
  }
  return { ...base, ...o };
}

/** Тест-отправка кампании (с текущими настройками) на email. */
export async function testCampaign(input: CampaignInput & { email: string }): Promise<{ ok?: boolean; error?: string }> {
  await requireAdmin([...STAFF]);
  const to = (input.email || "").trim();
  if (!EMAIL_RE.test(to)) return { error: "Укажите корректный e-mail" };
  try {
    const db = createSupabaseAdminClient();
    const { data: tpl } = await db.from("email_templates").select("subject,html_content,text_content,content").eq("slug", input.templateSlug).maybeSingle();
    if (!tpl) return { error: "Шаблон не найден" };
    const content = mergeContent((tpl.content ?? {}) as TemplateContent, input.overrides);
    const contentHtml = applyContent(tpl.html_content, content);
    const vars: Record<string, unknown> = {
      customer: { first_name: "Денис", name: "Денис Астахов" },
      products: contentHtml.includes("{{products}}") ? await getFeaturedCardsHtml({ categoryPrefix: "iphone", limit: 4 }) : "",
      unsubscribe_url: `${SITE}/unsubscribe?token=demo`,
    };
    const subjectRaw = input.subjectOverride || tpl.subject;
    const subject = `[ТЕСТ] ${renderTemplate(applyContent(subjectRaw, content), vars)}`;
    const html = addUtm(renderTemplate(contentHtml, vars), `campaign:${input.templateSlug}`);
    const text = tpl.text_content ? renderTemplate(tpl.text_content, vars) : undefined;
    const res = await sendMail({ to, subject, html, text });
    if (!res.ok) return { error: res.error || "Не удалось отправить" };
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка отправки" };
  }
}

/** Создать кампанию и (для mode='now') сразу отправить, иначе запланировать. */
export async function createCampaign(input: CampaignInput): Promise<{ id?: string; sent?: number; failed?: number; error?: string }> {
  const admin = await requireAdmin([...STAFF]);
  if (!input.name.trim()) return { error: "Укажите название кампании" };
  try {
    const db = createSupabaseAdminClient();
    const { data: tpl } = await db.from("email_templates").select("id").eq("slug", input.templateSlug).maybeSingle();
    if (!tpl) return { error: "Шаблон не найден" };

    const scheduled = input.mode === "schedule";
    const { data: created, error } = await db
      .from("email_campaigns")
      .insert({
        name: input.name.trim(),
        template_id: tpl.id,
        segment_slug: input.segmentSlug,
        subject_override: input.subjectOverride?.trim() || null,
        preview_text_override: input.previewOverride?.trim() || null,
        content_overrides: input.overrides ?? {},
        status: scheduled ? "scheduled" : "draft",
        scheduled_at: scheduled ? input.scheduledAt ?? null : null,
        created_by: admin.id,
      })
      .select("id")
      .maybeSingle();
    if (error || !created) return { error: error?.message || "Не удалось создать кампанию" };

    revalidatePath("/admin/marketing/campaigns");
    if (scheduled) return { id: created.id };

    // Отправляем сразу.
    const res = await sendCampaignNow(created.id);
    revalidatePath("/admin/marketing/campaigns");
    revalidatePath("/admin/marketing/overview");
    if (res.error) return { id: created.id, error: res.error };
    return { id: created.id, sent: res.sent, failed: res.failed };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка" };
  }
}
