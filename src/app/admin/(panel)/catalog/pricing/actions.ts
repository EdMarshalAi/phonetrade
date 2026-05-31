"use server";

import { z } from "zod";
import { adminMutation } from "@/lib/admin/mutations";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { refreshAndStoreCbr } from "@/lib/pricing/cbr";
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

/** Сохранить наценку/мин.маржу категории и пересчитать её товары по формуле. */
export async function updateCategoryPricing(
  slug: string,
  markup_percent: number,
  min_margin_rub: number
): Promise<{ error?: string; recalculated?: number }> {
  const admin = await requireAdmin([...ROLES]);
  if (!slug || !Number.isFinite(markup_percent) || markup_percent < 0 || !Number.isFinite(min_margin_rub) || min_margin_rub < 0) {
    return { error: "Некорректные значения" };
  }
  try {
    let count = 0;
    await adminMutation({
      roles: [...ROLES],
      action: "settings_change",
      entityType: "category",
      entityId: slug,
      changes: { markup_percent, min_margin_rub },
      revalidate: ["/", "/catalog", `/category/${slug}`, "/admin/catalog/pricing"],
      run: async (db) => {
        const { error } = await db.from("categories").update({ markup_percent, min_margin_rub, updated_at: new Date().toISOString() }).eq("slug", slug);
        if (error) throw error;
        // id-шники товаров категории → точечный пересчёт
        const { data: prods } = await db.from("products").select("id").eq("category_slug", slug).is("deleted_at", null).neq("type", "used");
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
