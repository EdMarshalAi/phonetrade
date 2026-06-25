"use server";

import { redirect } from "next/navigation";
import { adminMutation } from "@/lib/admin/mutations";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { productSchema, type ProductInput } from "@/lib/admin/schemas";
import { slugify } from "@/lib/admin/slug";
import { calculatePrices, type PricingSettings } from "@/lib/pricing/calculate";

const STAFF = ["admin", "manager", "content"] as const;

/**
 * Применяет прайс к товару после сохранения: если задана закупка (cost) или
 * включён ручной override — считает цены формулой и пишет историю. Если ни
 * того ни другого — оставляет введённые вручную price_cash/price_card.
 */
async function applyPricing(
  db: ReturnType<typeof createSupabaseAdminClient>,
  id: string,
  input: ProductInput,
  userId: string | null,
  reason: string
): Promise<void> {
  if (input.type === "used") return; // Б/У — своя логика, формула не трогает
  const costUsd = input.cost_rub && input.cost_rate ? input.cost_rub / input.cost_rate : null;
  const overrideOn = !!input.price_override;
  if (!overrideOn && !costUsd) return; // нет источника — оставляем ручные цены

  const { data: s } = await db.from("pricing_settings").select("*").eq("id", 1).maybeSingle();
  if (!s) return;

  // наценка из категории товара (fallback на default_markup_percent); карта — своя per-category
  const { data: cat } = await db.from("categories").select("markup_percent, card_markup_percent").eq("slug", input.category_slug).maybeSingle();
  const markup = cat?.markup_percent != null ? Number(cat.markup_percent) : null;
  const cardMarkup = cat?.card_markup_percent != null ? Number(cat.card_markup_percent) : null;

  const calc = calculatePrices(
    {
      cost_usd: costUsd,
      price_override: overrideOn,
      override_price_cash: overrideOn ? input.price_cash ?? null : null,
      override_price_card: overrideOn ? input.price_card ?? null : null,
    },
    s as PricingSettings,
    markup,
    cardMarkup
  );
  if (!calc) return;

  await db
    .from("products")
    .update({
      price_cash: calc.price_cash,
      price_card: calc.price_card,
      override_price_cash: overrideOn ? calc.price_cash : null,
      override_price_card: overrideOn ? calc.price_card : null,
      credit_6m_total: calc.credit_6m_total,
      credit_6m_monthly: calc.credit_6m_monthly,
      credit_12m_total: calc.credit_12m_total,
      credit_12m_monthly: calc.credit_12m_monthly,
      credit_24m_total: calc.credit_24m_total,
      credit_24m_monthly: calc.credit_24m_monthly,
      installment_from: calc.credit_24m_monthly,
      prices_recalculated_at: new Date().toISOString(),
    })
    .eq("id", id);

  await db.from("product_price_history").insert({
    product_id: id,
    cost_rub: input.cost_rub ?? null,
    cost_rate: input.cost_rate ?? null,
    cost_usd: costUsd,
    price_cash: calc.price_cash,
    price_card: calc.price_card,
    credit_6m_total: calc.credit_6m_total,
    credit_12m_total: calc.credit_12m_total,
    credit_24m_total: calc.credit_24m_total,
    reason,
    changed_by: userId,
  });
}

function toRow(input: ProductInput) {
  const isUsed = input.type === "used";
  return {
    title: input.title.trim(),
    slug: input.slug || null,
    sku: input.sku || null,
    category_slug: input.category_slug,
    model: input.model || "",
    color: input.color || "",
    memory: input.memory || null,
    sim: input.sim || null,
    condition: input.condition || null,
    type: input.type,
    badge: input.badge || null,
    badges: input.badges ?? [],
    options: input.options ?? {},
    short_description: input.short_description || null,
    image: input.image || "",
    price_cash: input.price_cash ?? 0,
    price_card: input.price_card ?? 0,
    price_old: input.price_old ?? null,
    cost_rub: input.cost_rub ?? null,
    cost_rate: input.cost_rate ?? null,
    price_override: input.price_override ?? false,
    installment_from: input.installment_from ?? null,
    installment_partner: input.installment_partner || null,
    related_product_ids: input.related_product_ids ?? [],
    description_html: input.description_html || null,
    warranty_months: input.warranty_months ?? null,
    stock: input.stock ?? null,
    min_stock: input.min_stock ?? null,
    is_available: input.is_available ?? true,
    in_stock: input.in_stock ?? true,
    status: input.status,
    is_used: isUsed,
    condition_text: isUsed ? input.condition_text || null : null,
    condition_category: isUsed ? input.condition_category ?? null : null,
    battery: isUsed ? input.battery ?? null : null,
    meta_title: input.meta_title || null,
    meta_description: input.meta_description || null,
    is_indexable: input.is_indexable ?? true,
    updated_at: new Date().toISOString(),
  };
}

function friendly(message: string): string {
  if (message.includes("duplicate") || message.includes("unique") || message.includes("pkey")) {
    return "Товар с таким ID/slug/SKU уже существует";
  }
  return message;
}

export async function createProduct(input: ProductInput): Promise<{ error?: string }> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте корректность полей" };

  const slug = parsed.data.slug || slugify(parsed.data.title);
  const id = slug || `prod-${crypto.randomUUID().slice(0, 8)}`;
  const admin = await requireAdmin([...STAFF]);

  try {
    await adminMutation({
      roles: [...STAFF],
      action: "create",
      entityType: "product",
      entityId: id,
      changes: parsed.data,
      revalidate: ["/", "/catalog", `/category/${parsed.data.category_slug}`, `/product/${id}`],
      run: async (db) => {
        const row = toRow({ ...parsed.data, slug });
        // Галерея из формы: дедуп + без главного фото (правило: gallery БЕЗ главного).
        const gallery = Array.from(new Set(parsed.data.gallery ?? [])).filter((g) => g && g !== row.image);
        const { error } = await db.from("products").insert({
          id,
          ...row,
          gallery,
          published_at: row.status === "published" ? new Date().toISOString() : null,
        });
        if (error) throw error;
        await applyPricing(db, id, parsed.data, admin.id, "manual_edit");
      },
    });
  } catch (e) {
    return { error: friendly(e instanceof Error ? e.message : "Ошибка сохранения") };
  }
  redirect("/admin/catalog/products");
}

export async function updateProduct(id: string, input: ProductInput): Promise<{ error?: string }> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте корректность полей" };
  const admin = await requireAdmin([...STAFF]);
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "update",
      entityType: "product",
      entityId: id,
      changes: parsed.data,
      revalidate: ["/", "/catalog", `/category/${parsed.data.category_slug}`, `/product/${id}`],
      run: async (db) => {
        // Реконсиляция фото: главное фото товара редактируется в двух местах —
        // в форме (поле «Главное фото») и в табе «Галерея» («Сделать главным»).
        // Чтобы смена главного в одном месте не «осиротила» фото из другого,
        // прежнее главное уходит в галерею. Галерея дедупится и не содержит
        // текущее главное (правило: products.gallery — БЕЗ главного).
        const { data: cur } = await db
          .from("products")
          .select("image,gallery")
          .eq("id", id)
          .maybeSingle();
        const nextImage = parsed.data.image || "";
        const prevImage = (cur?.image as string | null) ?? null;
        const prevGallery = Array.isArray(cur?.gallery) ? (cur!.gallery as string[]) : [];
        const merged = [...prevGallery];
        if (prevImage && prevImage !== nextImage) merged.push(prevImage);
        const nextGallery = Array.from(new Set(merged)).filter((g) => g && g !== nextImage);

        const { error } = await db
          .from("products")
          .update({ ...toRow(parsed.data), gallery: nextGallery })
          .eq("id", id);
        if (error) throw error;
        await applyPricing(db, id, parsed.data, admin.id, "manual_edit");
      },
    });
  } catch (e) {
    return { error: friendly(e instanceof Error ? e.message : "Ошибка сохранения") };
  }
  redirect("/admin/catalog/products");
}

/** Сгенерировать уникальный SKU по категории (кнопка рядом с полем «Артикул»). */
export async function generateSku(categorySlug: string): Promise<{ sku?: string; error?: string }> {
  await requireAdmin([...STAFF]);
  const { buildSku } = await import("@/lib/admin/sku");
  try {
    const db = createSupabaseAdminClient();
    for (let attempt = 0; attempt < 30; attempt++) {
      const num = 1000 + Math.floor(Math.random() * 9000);
      const candidate = buildSku(categorySlug, num);
      const { data } = await db.from("products").select("id").eq("sku", candidate).maybeSingle();
      if (!data) return { sku: candidate };
    }
    return { error: "Не удалось подобрать уникальный SKU, попробуйте ещё раз" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка генерации SKU" };
  }
}

/** Пересчитать цены одного товара по текущей формуле (кнопка «Обновить из формулы»). */
export async function recalcProductPrices(id: string): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "update",
      entityType: "product",
      entityId: id,
      changes: { recalc: true },
      revalidate: ["/", `/product/${id}`],
      run: async (db) => {
        const { error } = await db.rpc("recalculate_all_prices", { p_reason: "fx_recalc", p_user_id: null, p_ids: [id] });
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка пересчёта" };
  }
}

/** Soft-delete: помечаем deleted_at + архивируем (товар исчезает с сайта, но восстановим). */
/** Сменить статус товара (опубликован/черновик/архив) — inline из списка и прайса. */
export async function updateProductStatus(id: string, status: string): Promise<{ error?: string }> {
  const allowed = ["published", "draft", "archived"];
  if (!allowed.includes(status)) return { error: "Неизвестный статус" };
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "update",
      entityType: "product",
      entityId: id,
      changes: { status },
      revalidate: ["/", "/catalog", `/product/${id}`],
      run: async (db) => {
        const { error } = await db.from("products").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка смены статуса" };
  }
}

export async function deleteProduct(id: string): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "delete",
      entityType: "product",
      entityId: id,
      revalidate: ["/"],
      run: async (db) => {
        const { error } = await db
          .from("products")
          .update({ deleted_at: new Date().toISOString(), status: "archived", updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка удаления" };
  }
}
