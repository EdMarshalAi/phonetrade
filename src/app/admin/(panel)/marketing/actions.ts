"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/admin/mailer";
import { renderTemplate, addUtm } from "@/lib/email/render";

const STAFF = ["admin", "manager"] as const;
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Демо-данные для тест-отправки и превью шаблонов. */
const SAMPLE: Record<string, unknown> = {
  customer: { first_name: "Денис", name: "Денис Астахов", email: "demo@phonetrade31.ru" },
  order: { number: "PT-2026-0042", total: "96 000 ₽", payment: "Картой", delivery: "Самовывоз (ул. Попова, 36)", status: "В пути", tracking_number: "CDEK-1234567", tracking_url: SITE, items: '<div style="padding:8px 0;border-bottom:1px solid #e5e5ea;font-size:14px;">iPhone 17 256GB Black × 1 — 72 000 ₽</div>' },
  cart: { total: "72 000 ₽", url: `${SITE}/cart`, items: '<div style="padding:8px 0;border-bottom:1px solid #e5e5ea;font-size:14px;">iPhone 17 256GB Black × 1 — 72 000 ₽</div>' },
  promo: { code: "DEMO1000" },
  campaign: { subject: "iPhone 17 в наличии", preview: "Только привезли", hero_image: `${SITE}/opengraph-image`, title: "iPhone 17 Pro Max в новом цвете", body: "Cosmic Orange уже на витрине.", cta_text: "Смотреть", cta_url: `${SITE}/category/iphone` },
  unsubscribe_url: `${SITE}/unsubscribe?token=demo`,
};

/** Вкл/выкл триггер. */
export async function toggleTrigger(slug: string, active: boolean): Promise<{ error?: string }> {
  await requireAdmin([...STAFF]);
  try {
    const db = createSupabaseAdminClient();
    const { error } = await db.from("email_triggers").update({ is_active: active, updated_at: new Date().toISOString() }).eq("slug", slug);
    if (error) return { error: error.message };
    revalidatePath("/admin/marketing/triggers");
    revalidatePath("/admin/marketing/overview");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка" };
  }
}

/** Тест-отправка шаблона на указанный email (с демо-данными). */
export async function testSendTemplate(slug: string, email: string): Promise<{ ok?: boolean; error?: string }> {
  await requireAdmin([...STAFF]);
  const to = (email || "").trim();
  if (!EMAIL_RE.test(to)) return { error: "Укажите корректный e-mail" };
  try {
    const db = createSupabaseAdminClient();
    const { data: tpl } = await db.from("email_templates").select("subject,html_content,text_content").eq("slug", slug).maybeSingle();
    if (!tpl) return { error: "Шаблон не найден" };
    const subject = `[ТЕСТ] ${renderTemplate(tpl.subject, SAMPLE)}`;
    const html = addUtm(renderTemplate(tpl.html_content, SAMPLE), slug);
    const text = tpl.text_content ? renderTemplate(tpl.text_content, SAMPLE) : undefined;
    const res = await sendMail({ to, subject, html, text });
    if (!res.ok) return { error: res.error || "Не удалось отправить" };
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка отправки" };
  }
}

/** Сохранить редактируемые поля шаблона. */
export async function updateTemplate(
  slug: string,
  patch: { subject?: string; preview_text?: string; html_content?: string; is_active?: boolean }
): Promise<{ error?: string }> {
  const admin = await requireAdmin([...STAFF]);
  try {
    const db = createSupabaseAdminClient();
    const row: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: admin.id };
    if (patch.subject !== undefined) row.subject = patch.subject.trim();
    if (patch.preview_text !== undefined) row.preview_text = patch.preview_text.trim() || null;
    if (patch.html_content !== undefined) row.html_content = patch.html_content;
    if (patch.is_active !== undefined) row.is_active = patch.is_active;
    const { error } = await db.from("email_templates").update(row).eq("slug", slug);
    if (error) return { error: error.message };
    revalidatePath("/admin/marketing/templates");
    revalidatePath(`/admin/marketing/templates/${slug}`);
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
}
