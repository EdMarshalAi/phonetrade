"use server";

import * as XLSX from "xlsx";
import Papa from "papaparse";
import { adminMutation } from "@/lib/admin/mutations";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyTelegram, sendTelegramDocument } from "@/lib/admin/telegram";
import { EXPORT_COLUMNS, DEFAULT_EXPORT_COLUMNS, type ExportColumnKey, type PricingExportPrefs, type YmlFeedPrefs } from "./export-columns";

const ROLES = ["admin", "manager"] as const;
const num = (v: unknown): number | null => (v == null || v === "" ? null : Number(v));

type ExportRow = Record<string, string | number | null>;

export interface ExportOptions {
  /** Выбранные категории (slug). null/пусто = все. Родитель раскрывается на детей. */
  categories: string[] | null;
  /** Ключи колонок из EXPORT_COLUMNS. */
  columns: ExportColumnKey[];
  format: "xlsx" | "csv";
  /** Явный список id (для «Экспорт выбранных») — приоритетнее категорий. */
  ids?: string[] | null;
}

const optionsStr = (v: unknown): string => {
  if (!v || typeof v !== "object") return "";
  return Object.entries(v as Record<string, unknown>)
    .filter(([, val]) => val != null && val !== "")
    .map(([k, val]) => `${k}: ${val}`)
    .join("; ");
};

/** Строит строку файла только из выбранных колонок (порядок — из EXPORT_COLUMNS). */
function rowFor(p: Record<string, unknown>, cols: ExportColumnKey[]): ExportRow {
  const set = new Set(cols);
  const row: ExportRow = {};
  for (const c of EXPORT_COLUMNS) {
    if (!set.has(c.key)) continue;
    switch (c.key) {
      case "title": row["Название"] = (p.title as string) ?? ""; break;
      case "price_cash": row["Цена наличными"] = num(p.price_cash); break;
      case "price_card": row["Цена картой"] = num(p.price_card); break;
      case "sku": row["Артикул"] = (p.sku as string) ?? (p.id as string); break;
      case "category": row["Категория"] = (p.category_slug as string) ?? ""; break;
      case "color": row["Цвет"] = (p.color as string) ?? ""; break;
      case "memory": row["Память"] = (p.memory as string) ?? ""; break;
      case "sim": row["SIM"] = (p.sim as string) ?? ""; break;
      case "options": row["Доп. характеристики"] = optionsStr(p.options); break;
      case "credit":
        row["Рассрочка 6 мес"] = num(p.credit_6m_total);
        row["Рассрочка 12 мес"] = num(p.credit_12m_total);
        row["Рассрочка 24 мес"] = num(p.credit_24m_total);
        break;
      case "cost_rub": row["Закупка ₽"] = num(p.cost_rub); break;
      case "cost_rate": row["Курс закупа"] = num(p.cost_rate); break;
      case "cost_usd": row["Закупка $"] = num(p.cost_usd) != null ? +Number(p.cost_usd).toFixed(2) : null; break;
      case "margin": {
        const cr = num(p.cost_rub), ca = num(p.price_cash);
        row["Маржа %"] = cr && ca ? +(((ca - cr) / cr) * 100).toFixed(1) : null;
        break;
      }
      case "override": row["Зафиксировано"] = p.price_override ? "да" : ""; break;
      case "updated": row["Обновлено"] = (p.prices_recalculated_at as string)?.slice(0, 19).replace("T", " ") ?? ""; break;
    }
  }
  return row;
}

/** Сборка файла прайса (XLSX/CSV) в Buffer — общая для скачивания и Telegram. */
async function buildPricingFile(
  opts: ExportOptions
): Promise<{ filename: string; buffer: Buffer; mime: string; count: number } | { error: string }> {
  const columns = (opts.columns?.length ? opts.columns : DEFAULT_EXPORT_COLUMNS).filter((k) =>
    EXPORT_COLUMNS.some((c) => c.key === k)
  );
  if (columns.length === 0) return { error: "Выберите хотя бы одну колонку для экспорта" };
  try {
    const db = createSupabaseAdminClient();

    // Раскрываем выбранные категории на их подкатегории.
    let catFilter: string[] | null = null;
    if (opts.categories && opts.categories.length) {
      const { data: allCats } = await db.from("categories").select("slug,parent_slug");
      const sel = new Set(opts.categories);
      const expanded = new Set(opts.categories);
      for (const c of (allCats ?? []) as { slug: string; parent_slug: string | null }[]) {
        if (c.parent_slug && sel.has(c.parent_slug)) expanded.add(c.slug);
      }
      catFilter = [...expanded];
    }

    let query = db
      .from("products")
      .select("id,sku,title,category_slug,color,memory,sim,options,cost_rub,cost_rate,cost_usd,price_cash,price_card,credit_6m_total,credit_12m_total,credit_24m_total,price_override,prices_recalculated_at")
      .is("deleted_at", null)
      .neq("type", "used")
      .order("category_slug")
      .order("title")
      .limit(5000);
    if (opts.ids && opts.ids.length) query = query.in("id", opts.ids);
    else if (catFilter) query = query.in("category_slug", catFilter);
    const { data: prods } = await query;

    if (!prods || prods.length === 0) {
      return { error: "Под выбранные категории нет товаров для экспорта" };
    }

    const rows: ExportRow[] = prods.map((p) => rowFor(p as Record<string, unknown>, columns));

    if (opts.format === "csv") {
      const csv = Papa.unparse(rows, { delimiter: ";" });
      const buffer = Buffer.from("﻿" + csv, "utf-8");
      return { filename: fileName("csv"), buffer, mime: "text/csv;charset=utf-8", count: rows.length };
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0] ?? {}).map((k) => ({ wch: Math.max(12, k.length + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, "Прайс");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return { filename: fileName("xlsx"), buffer, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", count: rows.length };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка экспорта" };
  }
}

/** Экспорт прайса в XLSX/CSV. Возвращает base64 для скачивания на клиенте. */
export async function exportPricing(
  opts: ExportOptions
): Promise<{ filename: string; base64: string; mime: string } | { error: string }> {
  await requireAdmin([...ROLES]);
  const r = await buildPricingFile(opts);
  if ("error" in r) return { error: r.error };
  return { filename: r.filename, base64: r.buffer.toString("base64"), mime: r.mime };
}

/** Отправка файла прайса прямо в Telegram-бот (приходит документом в чат). */
export async function exportPricingToTelegram(
  opts: ExportOptions
): Promise<{ ok?: number; error?: string }> {
  await requireAdmin([...ROLES]);
  const r = await buildPricingFile(opts);
  if ("error" in r) return { error: r.error };
  const scope = opts.categories && opts.categories.length ? `${opts.categories.length} катег. (${r.count})` : `все товары (${r.count})`;
  const caption = `📋 Прайс PhoneTrade · ${scope} · ${new Date().toLocaleDateString("ru-RU")}`;
  const ok = await sendTelegramDocument(r.buffer, r.filename, r.mime, caption);
  if (ok === 0) return { error: "Не доставлено. Проверьте Telegram-бот в Интеграциях (токен и chat_id)." };
  return { ok };
}

/** Сохранить настройки экспорта (колонки + категории) в shop_settings. */
export async function savePricingExportPrefs(prefs: PricingExportPrefs): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...ROLES],
      action: "update",
      entityType: "pricing_export_prefs",
      entityId: null,
      changes: prefs,
      revalidate: ["/admin/catalog/pricing"],
      run: async (db) => {
        const { error } = await db.from("shop_settings").upsert({ key: "pricing_export_prefs", value: prefs }, { onConflict: "key" });
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось сохранить настройки" };
  }
}

/** Сохранить настройки YML-фида (категории + Б/У) в shop_settings. Фид читает их при отдаче. */
export async function saveYmlFeedPrefs(prefs: YmlFeedPrefs): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...ROLES],
      action: "update",
      entityType: "yml_feed_prefs",
      entityId: null,
      changes: prefs,
      revalidate: ["/admin/catalog/pricing"],
      run: async (db) => {
        const { error } = await db.from("shop_settings").upsert({ key: "yml_feed_prefs", value: prefs }, { onConflict: "key" });
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось сохранить настройки" };
  }
}

function fileName(ext: string): string {
  const d = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
  return `pricing_phonetrade_${d}.${ext}`;
}

export type ImportPreviewRow = {
  id: string | null;
  sku: string;
  title: string | null;
  found: boolean;
  oldCostRub: number | null;
  newCostRub: number | null;
  oldRate: number | null;
  newRate: number | null;
  changed: boolean;
};

const COST_KEYS = ["Закупка ₽", "Закупка", "cost_rub", "Закупка руб"];
const RATE_KEYS = ["Курс закупа", "Курс", "cost_rate"];
const SKU_KEYS = ["SKU", "Артикул", "sku"];
const ID_KEYS = ["ID", "id"];

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (row[k] != null && row[k] !== "") return row[k];
  return null;
}

/** Парсит загруженный XLSX/CSV и строит предпросмотр изменений (идентификация по SKU или ID). */
export async function parsePricingFile(formData: FormData): Promise<{ preview?: ImportPreviewRow[]; idBy?: "sku" | "id"; error?: string }> {
  await requireAdmin([...ROLES]);
  const file = formData.get("file");
  const idBy = (formData.get("idBy") as "sku" | "id") || "sku";
  if (!(file instanceof File) || file.size === 0) return { error: "Файл не выбран" };
  if (file.size > 5 * 1024 * 1024) return { error: "Файл больше 5 МБ" };

  let records: Record<string, unknown>[] = [];
  try {
    const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type.includes("csv");
    if (isCsv) {
      const text = new TextDecoder("utf-8").decode(await file.arrayBuffer()).replace(/^﻿/, "");
      const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, delimiter: ";", skipEmptyLines: true });
      if (parsed.errors.length === 0 || (parsed.data?.length ?? 0) > 0) records = parsed.data;
      if (records.length === 0) {
        const p2 = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
        records = p2.data;
      }
    } else {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      records = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
    }
  } catch {
    return { error: "Не удалось прочитать файл" };
  }
  if (records.length === 0) return { error: "В файле нет строк" };
  if (records.length > 5000) return { error: "Слишком много строк (макс. 5000)" };

  const db = createSupabaseAdminClient();
  const { data: prods } = await db.from("products").select("id,sku,title,cost_rub,cost_rate").is("deleted_at", null).limit(5000);
  const bySku = new Map((prods ?? []).filter((p) => p.sku).map((p) => [String(p.sku).toLowerCase(), p]));
  const byId = new Map((prods ?? []).map((p) => [String(p.id).toLowerCase(), p]));

  const preview: ImportPreviewRow[] = records.map((rec) => {
    const key = String(pick(rec, idBy === "id" ? ID_KEYS : SKU_KEYS) ?? "").trim();
    const found = idBy === "id" ? byId.get(key.toLowerCase()) : bySku.get(key.toLowerCase());
    const newCostRub = num(pick(rec, COST_KEYS));
    const newRate = num(pick(rec, RATE_KEYS));
    const oldCostRub = found ? num(found.cost_rub) : null;
    const oldRate = found ? num(found.cost_rate) : null;
    const changed = !!found && ((newCostRub != null && newCostRub !== oldCostRub) || (newRate != null && newRate !== oldRate));
    return { id: found ? (found.id as string) : null, sku: key, title: found ? (found.title as string) : null, found: !!found, oldCostRub, newCostRub, oldRate, newRate, changed };
  });

  return { preview, idBy };
}

/** Применяет импорт: обновляет закупку, пересчитывает, пишет историю и лог. */
export async function applyPricingImport(items: { id: string; cost_rub: number | null; cost_rate: number | null }[]): Promise<{ updated?: number; error?: string }> {
  const admin = await requireAdmin([...ROLES]);
  const valid = items.filter((i) => i.id);
  if (valid.length === 0) return { error: "Нет строк для применения" };
  try {
    await adminMutation({
      roles: [...ROLES],
      action: "update",
      entityType: "pricing",
      entityId: "import",
      changes: { count: valid.length },
      revalidate: ["/", "/catalog"],
      run: async (db) => {
        for (const it of valid) {
          await db.from("products").update({ cost_rub: it.cost_rub, cost_rate: it.cost_rate, updated_at: new Date().toISOString() }).eq("id", it.id);
        }
        await db.rpc("recalculate_all_prices", { p_reason: "import", p_user_id: admin.id, p_ids: valid.map((i) => i.id) });
      },
    });
    try {
      await notifyTelegram("pricing_import_done", `📥 Импорт прайса: обновлено ${valid.length}. Сделал: ${admin.id}`);
    } catch {}
    return { updated: valid.length };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка импорта" };
  }
}

export type BulkOp =
  | { type: "markup_pct" | "discount_pct" | "markup_rub" | "discount_rub" | "round"; value: number }
  | { type: "set_rate"; value: number }
  | { type: "reset_formula" };

/** Массовая операция над закупкой выбранных товаров + пересчёт. */
export async function bulkUpdateCost(ids: string[], op: BulkOp): Promise<{ updated?: number; error?: string }> {
  const admin = await requireAdmin([...ROLES]);
  if (!ids.length) return { error: "Не выбраны товары" };
  try {
    await adminMutation({
      roles: [...ROLES],
      action: "update",
      entityType: "pricing",
      entityId: "bulk",
      changes: { count: ids.length, op },
      revalidate: ["/", "/catalog"],
      run: async (db) => {
        if (op.type === "reset_formula") {
          await db.from("products").update({ price_override: false, updated_at: new Date().toISOString() }).in("id", ids);
        } else {
          const { data: prods } = await db.from("products").select("id,cost_rub").in("id", ids);
          for (const p of prods ?? []) {
            const cur = num(p.cost_rub) ?? 0;
            let next = cur;
            if (op.type === "markup_pct") next = cur * (1 + op.value / 100);
            else if (op.type === "discount_pct") next = cur * (1 - op.value / 100);
            else if (op.type === "markup_rub") next = cur + op.value;
            else if (op.type === "discount_rub") next = cur - op.value;
            else if (op.type === "round") next = Math.round(cur / op.value) * op.value;
            else if (op.type === "set_rate") {
              await db.from("products").update({ cost_rate: op.value, updated_at: new Date().toISOString() }).eq("id", p.id);
              continue;
            }
            await db.from("products").update({ cost_rub: Math.max(0, Math.round(next)), updated_at: new Date().toISOString() }).eq("id", p.id);
          }
        }
        await db.rpc("recalculate_all_prices", { p_reason: op.type === "reset_formula" ? "fx_recalc" : "manual_edit", p_user_id: admin.id, p_ids: ids });
      },
    });
    return { updated: ids.length };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка массовой операции" };
  }
}
