"use server";

import { z } from "zod";
import { adminMutation } from "@/lib/admin/mutations";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { refreshAndStoreCbr } from "@/lib/pricing/cbr";
import { calculatePrices, type PricingSettings } from "@/lib/pricing/calculate";
import { notifyTelegram } from "@/lib/admin/telegram";

const ROLES = ["admin", "manager"] as const;

const settingsSchema = z.object({
  working_usd_rate: z.coerce.number().min(0),
  use_cbr_auto: z.boolean().default(false),
  cbr_markup_percent: z.coerce.number().min(0).default(0),
  default_markup_percent: z.coerce.number().min(0).default(10),
  card_markup_percent: z.coerce.number().min(0).default(15),
  credit_6m_markup_percent: z.coerce.number().min(0).default(23),
  credit_12m_markup_percent: z.coerce.number().min(0).default(28),
  credit_24m_markup_percent: z.coerce.number().min(0).default(37),
  price_rounding: z.coerce.number().int().min(1).default(1000),
});
export type PricingSettingsInput = z.infer<typeof settingsSchema>;

async function notifyRecalc(count: number, rate: number) {
  try {
    await notifyTelegram("pricing_recalc_done", `♻️ Пересчёт прайса завершён. Курс: ${rate} ₽/$. Затронуто товаров: ${count}.`);
  } catch {}
}

/** Проверяет товары с маржой (₽) ниже минимума категории и шлёт алёрт в Telegram. */
async function checkLowMargin() {
  try {
    const db = createSupabaseAdminClient();
    const { data: cats } = await db.from("categories").select("slug, min_margin_rub");
    const minBySlug = new Map<string, number>((cats ?? []).map((c) => [c.slug as string, Number(c.min_margin_rub ?? 0)]));
    const { data: prods } = await db
      .from("products")
      .select("title, price_cash, cost_rub, category_slug")
      .is("deleted_at", null)
      .neq("type", "used")
      .gt("cost_rub", 0)
      .limit(5000);
    const low = (prods ?? [])
      .map((p) => {
        const min = minBySlug.get(p.category_slug as string) ?? 0;
        const rub = Number(p.price_cash) - Number(p.cost_rub);
        return { title: p.title as string, rub, min, below: Number.isFinite(rub) && rub < min };
      })
      .filter((x) => x.below)
      .sort((a, b) => a.rub - b.rub);
    if (low.length === 0) return;
    await notifyTelegram(
      "pricing_below_margin",
      `⚠️ ${low.length} товаров с маржой ниже минимума категории. Самый низкий: ${low[0].title} (${Math.round(low[0].rub)} ₽ при минимуме ${Math.round(low[0].min)} ₽).`
    );
  } catch {}
}

/** Сохранить формулу. Пересчёт цен НЕ запускается — отдельной кнопкой. */
export async function updatePricingSettings(input: PricingSettingsInput): Promise<{ error?: string }> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { error: "Проверьте значения формулы" };
  const admin = await requireAdmin([...ROLES]);
  try {
    await adminMutation({
      roles: [...ROLES],
      action: "settings_change",
      entityType: "settings",
      entityId: "pricing_settings",
      changes: parsed.data,
      revalidate: ["/admin/catalog/pricing"],
      run: async (db) => {
        const { error } = await db.from("pricing_settings").update({ ...parsed.data, updated_at: new Date().toISOString(), updated_by: admin.id }).eq("id", 1);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения формулы" };
  }
}

/** Пересчитать все товары по текущей формуле. */
export async function recalcAllPrices(): Promise<{ error?: string; recalculated?: number }> {
  const admin = await requireAdmin([...ROLES]);
  try {
    let count = 0;
    await adminMutation({
      roles: [...ROLES],
      action: "update",
      entityType: "pricing",
      entityId: "recalc_all",
      revalidate: ["/", "/catalog"],
      run: async (db) => {
        const { data, error } = await db.rpc("recalculate_all_prices", { p_reason: "fx_recalc", p_user_id: admin.id });
        if (error) throw error;
        count = typeof data === "number" ? data : 0;
      },
    });
    const { data: s } = await createSupabaseAdminClient().from("pricing_settings").select("working_usd_rate").eq("id", 1).maybeSingle();
    await notifyRecalc(count, Number(s?.working_usd_rate ?? 0));
    await checkLowMargin();
    return { recalculated: count };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка пересчёта" };
  }
}

/** Сохранить рабочий курс. Пересчёт НЕ запускается — отдельной кнопкой. */
export async function setWorkingRate(rate: number): Promise<{ error?: string }> {
  const admin = await requireAdmin([...ROLES]);
  if (!Number.isFinite(rate) || rate <= 0) return { error: "Некорректный курс" };
  try {
    await adminMutation({
      roles: [...ROLES],
      action: "settings_change",
      entityType: "settings",
      entityId: "pricing_settings",
      changes: { working_usd_rate: rate },
      revalidate: ["/admin/catalog/pricing"],
      run: async (db) => {
        const { error } = await db.from("pricing_settings").update({ working_usd_rate: rate, updated_at: new Date().toISOString(), updated_by: admin.id }).eq("id", 1);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения курса" };
  }
}

/** Пересчитать только выбранные товары. */
export async function recalcSelected(ids: string[]): Promise<{ error?: string; recalculated?: number }> {
  const admin = await requireAdmin([...ROLES]);
  if (!ids.length) return { error: "Не выбраны товары" };
  try {
    let count = 0;
    await adminMutation({
      roles: [...ROLES],
      action: "update",
      entityType: "pricing",
      entityId: "recalc_selected",
      changes: { count: ids.length },
      revalidate: ["/", "/catalog"],
      run: async (db) => {
        const { data } = await db.rpc("recalculate_all_prices", { p_reason: "fx_recalc", p_user_id: admin.id, p_ids: ids });
        count = typeof data === "number" ? data : 0;
      },
    });
    return { recalculated: count };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка пересчёта" };
  }
}

/** Подтянуть курс ЦБ вручную (кнопка «Из ЦБ» / «Обновить»). */
export async function refreshCbrRate(): Promise<{ error?: string; usd?: number; eur?: number; date?: string }> {
  await requireAdmin([...ROLES]);
  try {
    const r = await refreshAndStoreCbr();
    return { usd: r.usd, eur: r.eur, date: r.date };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось получить курс ЦБ" };
  }
}

/** Inline-правка закупки одного товара → пересчёт строки по формуле. */
export async function updateProductCost(id: string, cost_rub: number | null, cost_rate: number | null): Promise<{ error?: string }> {
  const admin = await requireAdmin([...ROLES]);
  try {
    await adminMutation({
      roles: [...ROLES],
      action: "update",
      entityType: "product",
      entityId: id,
      changes: { cost_rub, cost_rate },
      revalidate: ["/", `/product/${id}`],
      run: async (db) => {
        const { error } = await db.from("products").update({ cost_rub, cost_rate, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
        const { error: e2 } = await db.rpc("recalculate_all_prices", { p_reason: "manual_edit", p_user_id: admin.id, p_ids: [id] });
        if (e2) throw e2;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения" };
  }
}

/** Сохранить наценку (обычную + по карте)/мин.маржу категории и пересчитать её товары по формуле. */
export async function updateCategoryPricing(
  slug: string,
  markup_percent: number,
  min_margin_rub: number,
  card_markup_percent: number
): Promise<{ error?: string; recalculated?: number }> {
  const admin = await requireAdmin([...ROLES]);
  if (!slug || !Number.isFinite(markup_percent) || markup_percent < 0 || !Number.isFinite(min_margin_rub) || min_margin_rub < 0 || !Number.isFinite(card_markup_percent) || card_markup_percent < 0) {
    return { error: "Некорректные значения" };
  }
  try {
    let count = 0;
    await adminMutation({
      roles: [...ROLES],
      action: "settings_change",
      entityType: "category",
      entityId: slug,
      changes: { markup_percent, min_margin_rub, card_markup_percent },
      revalidate: ["/", "/catalog", `/category/${slug}`, "/admin/catalog/pricing"],
      run: async (db) => {
        // Наценка задаётся на общей категории и каскадом применяется к её
        // подкатегориям (единый источник — родитель).
        const { data: kids } = await db.from("categories").select("slug").eq("parent_slug", slug);
        const slugs = [slug, ...(kids ?? []).map((k) => k.slug as string)];
        const { error } = await db.from("categories").update({ markup_percent, min_margin_rub, card_markup_percent, updated_at: new Date().toISOString() }).in("slug", slugs);
        if (error) throw error;
        // товары категории и всех подкатегорий → точечный пересчёт
        const { data: prods } = await db.from("products").select("id").in("category_slug", slugs).is("deleted_at", null).neq("type", "used");
        const ids = (prods ?? []).map((p) => p.id as string);
        if (ids.length) {
          const { data, error: e2 } = await db.rpc("recalculate_all_prices", { p_reason: "category_markup_edit", p_user_id: admin.id, p_ids: ids });
          if (e2) throw e2;
          count = typeof data === "number" ? data : 0;
        }
      },
    });
    await checkLowMargin();
    return { recalculated: count };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения наценки категории" };
  }
}

/**
 * Inline-правка цены НАЛИЧНЫМИ у зафиксированного товара (price_override) прямо в прайсе.
 * Цена нал фиксируется как введено, а цена по КАРТЕ и кредиты считаются по формуле от неё:
 * карта = нал × (1 + наценка_карты_КАТЕГОРИИ / 100), кредиты — по общим credit-наценкам.
 * Так у Б/У (наценка карты категории = 30%) карта = нал × 1.30, у новых — своя.
 * recalculate_all_prices() override-товары не трогает, поэтому считаем здесь же.
 */
export async function updateOverrideCash(id: string, price_cash: number): Promise<{ error?: string }> {
  const admin = await requireAdmin([...ROLES]);
  if (!Number.isFinite(price_cash) || price_cash <= 0) return { error: "Некорректная цена" };
  try {
    await adminMutation({
      roles: [...ROLES],
      action: "update",
      entityType: "product",
      entityId: id,
      changes: { override_price_cash: price_cash },
      revalidate: ["/", `/product/${id}`],
      run: async (db) => {
        const { data: prod } = await db.from("products").select("category_slug").eq("id", id).maybeSingle();
        const { data: s } = await db.from("pricing_settings").select("*").eq("id", 1).maybeSingle();
        if (!s) throw new Error("Не найдены настройки прайса");
        const { data: cat } = prod?.category_slug
          ? await db.from("categories").select("card_markup_percent").eq("slug", prod.category_slug).maybeSingle()
          : { data: null };
        const cardMarkup = cat?.card_markup_percent != null ? Number(cat.card_markup_percent) : null;
        const calc = calculatePrices(
          { cost_usd: null, price_override: true, override_price_cash: price_cash, override_price_card: null },
          s as unknown as PricingSettings,
          null,
          cardMarkup,
        );
        if (!calc) throw new Error("Не удалось рассчитать цены");
        const { error } = await db.from("products").update({
          price_override: true,
          override_price_cash: price_cash,
          override_price_card: calc.price_card,
          price_cash: calc.price_cash,
          price_card: calc.price_card,
          credit_6m_total: calc.credit_6m_total, credit_6m_monthly: calc.credit_6m_monthly,
          credit_12m_total: calc.credit_12m_total, credit_12m_monthly: calc.credit_12m_monthly,
          credit_24m_total: calc.credit_24m_total, credit_24m_monthly: calc.credit_24m_monthly,
          installment_from: calc.credit_24m_monthly,
          prices_recalculated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", id);
        if (error) throw error;
        // история — best-effort, не должна ронять сохранение цены
        try {
          await db.from("product_price_history").insert({
            product_id: id, cost_usd: null,
            price_cash: calc.price_cash, price_card: calc.price_card,
            credit_6m_total: calc.credit_6m_total, credit_12m_total: calc.credit_12m_total, credit_24m_total: calc.credit_24m_total,
            reason: "manual_override_cash", changed_by: admin.id,
          });
        } catch {}
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения цены" };
  }
}

/** Снять/поставить ручную фиксацию цены. При снятии — пересчёт по формуле. */
export async function setProductOverride(id: string, on: boolean): Promise<{ error?: string }> {
  const admin = await requireAdmin([...ROLES]);
  try {
    await adminMutation({
      roles: [...ROLES],
      action: "update",
      entityType: "product",
      entityId: id,
      changes: { price_override: on },
      revalidate: ["/", `/product/${id}`],
      run: async (db) => {
        if (on) {
          const { data: p } = await db.from("products").select("price_cash, price_card").eq("id", id).maybeSingle();
          await db.from("products").update({ price_override: true, override_price_cash: p?.price_cash ?? null, override_price_card: p?.price_card ?? null, updated_at: new Date().toISOString() }).eq("id", id);
        } else {
          await db.from("products").update({ price_override: false, updated_at: new Date().toISOString() }).eq("id", id);
          await db.rpc("recalculate_all_prices", { p_reason: "fx_recalc", p_user_id: admin.id, p_ids: [id] });
        }
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка" };
  }
}
