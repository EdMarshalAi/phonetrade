"use server";

import * as XLSX from "xlsx";
import Papa from "papaparse";
import { adminMutation } from "@/lib/admin/mutations";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyTelegram } from "@/lib/admin/telegram";

const ROLES = ["admin", "manager"] as const;
const num = (v: unknown): number | null => (v == null || v === "" ? null : Number(v));

type ExportRow = Record<string, string | number | null>;

/** Экспорт прайса в XLSX или CSV. Возвращает base64 для скачивания на клиенте. */
export async function exportPricing(
  ids: string[] | null,
  format: "xlsx" | "csv"
): Promise<{ filename: string; base64: string; mime: string } | { error: string }> {
  await requireAdmin([...ROLES]);
  try {
    const db = createSupabaseAdminClient();
    let query = db
      .from("products")
      .select("id,sku,title,category_slug,color,memory,cost_rub,cost_rate,cost_usd,price_cash,price_card,credit_6m_total,credit_6m_monthly,credit_12m_total,credit_12m_monthly,credit_24m_total,credit_24m_monthly,price_override,prices_recalculated_at")
      .is("deleted_at", null)
      .neq("type", "used")
      .order("category_slug")
      .order("title")
      .limit(5000);
    if (ids && ids.length) query = query.in("id", ids);
    const { data: prods } = await query;

    const rows: ExportRow[] = (prods ?? []).map((p) => {
      const costRub = num(p.cost_rub);
      const cash = num(p.price_cash);
      const marginPct = costRub && cash ? ((cash - costRub) / costRub) * 100 : null;
      return {
        SKU: (p.sku as string) ?? p.id,
        Название: p.title as string,
        Категория: (p.category_slug as string) ?? "",
        Цвет: (p.color as string) ?? "",
        Память: (p.memory as string) ?? "",
        "Закупка ₽": costRub,
        "Курс закупа": num(p.cost_rate),
        "Закупка $": num(p.cost_usd) != null ? +Number(p.cost_usd).toFixed(2) : null,
        "Цена нал": cash,
        "Цена карта": num(p.price_card),
        "Кредит 6м всего": num(p.credit_6m_total),
        "Кредит 6м/мес": num(p.credit_6m_monthly),
        "Кредит 12м всего": num(p.credit_12m_total),
        "Кредит 12м/мес": num(p.credit_12m_monthly),
        "Кредит 24м всего": num(p.credit_24m_total),
        "Кредит 24м/мес": num(p.credit_24m_monthly),
        "Маржа %": marginPct != null ? +marginPct.toFixed(1) : null,
        "Зафиксировано": p.price_override ? "да" : "",
        "Обновлено": (p.prices_recalculated_at as string)?.slice(0, 19).replace("T", " ") ?? "",
      };
    });

    if (format === "csv") {
      const csv = Papa.unparse(rows, { delimiter: ";" });
      const base64 = Buffer.from("﻿" + csv, "utf-8").toString("base64");
      return { filename: fileName("csv"), base64, mime: "text/csv;charset=utf-8" };
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0] ?? { SKU: "" }).map((k) => ({ wch: Math.max(12, k.length + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, "Прайс");

    const { data: s } = await db.from("pricing_settings").select("*").eq("id", 1).maybeSingle();
    if (s) {
      const settingsRows = [
        { Параметр: "Рабочий курс USD", Значение: num(s.working_usd_rate) },
        { Параметр: "Наценка по умолчанию, %", Значение: num(s.default_markup_percent) },
        { Параметр: "Наценка карта, %", Значение: num(s.card_markup_percent) },
        { Параметр: "Кредит 6м, %", Значение: num(s.credit_6m_markup_percent) },
        { Параметр: "Кредит 12м, %", Значение: num(s.credit_12m_markup_percent) },
        { Параметр: "Кредит 24м, %", Значение: num(s.credit_24m_markup_percent) },
        { Параметр: "Округление, ₽", Значение: num(s.price_rounding) },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(settingsRows), "Настройки");
    }

    const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    return { filename: fileName("xlsx"), base64, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка экспорта" };
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
