"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/admin/mailer";
import { renderTemplate, addUtm } from "@/lib/email/render";
import { applyContent, type TemplateContent } from "@/lib/email/content";
import { getFeaturedCardsHtml } from "@/lib/email/featured";
import { renderItemRows } from "@/lib/email/product-cards";

const STAFF = ["admin", "manager"] as const;
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Демо-переменные для тест-отправки/превью (товары — реальные карточки/строки). */
async function sampleVars(): Promise<Record<string, unknown>> {
  const items = renderItemRows([{ image: null, title: "iPhone 17 Pro Max 256GB Orange", qty: 1, price: 108000 }]);
  return {
    customer: { first_name: "Денис", name: "Денис Астахов" },
    order: { number: "PT-2026-0042", total: "108 000 ₽", payment: "Картой", delivery: "Самовывоз (ул. Попова, 36)", status: "В пути", tracking_number: "CDEK-1234567", tracking_url: SITE, items },
    cart: { total: "108 000 ₽", url: `${SITE}/cart`, items },
    promo: { code: "DEMO1000" },
    products: await getFeaturedCardsHtml({ categoryPrefix: "iphone", limit: 4 }),
    unsubscribe_url: `${SITE}/unsubscribe?token=demo`,
  };
}

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
    const { data: tpl } = await db.from("email_templates").select("subject,html_content,text_content,content").eq("slug", slug).maybeSingle();
    if (!tpl) return { error: "Шаблон не найден" };
    const content = (tpl.content ?? {}) as TemplateContent;
    const vars = await sampleVars();
    const subject = `[ТЕСТ] ${renderTemplate(applyContent(tpl.subject, content), vars)}`;
    const html = addUtm(renderTemplate(applyContent(tpl.html_content, content), vars), slug);
    const text = tpl.text_content ? renderTemplate(tpl.text_content, vars) : undefined;
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
  patch: { subject?: string; preview_text?: string; content?: Record<string, string>; is_active?: boolean }
): Promise<{ error?: string }> {
  const admin = await requireAdmin([...STAFF]);
  try {
    const db = createSupabaseAdminClient();
    const row: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: admin.id };
    if (patch.subject !== undefined) row.subject = patch.subject.trim();
    if (patch.preview_text !== undefined) row.preview_text = patch.preview_text.trim() || null;
    if (patch.content !== undefined) row.content = patch.content;
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
