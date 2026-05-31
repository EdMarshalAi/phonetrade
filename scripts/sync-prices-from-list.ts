/**
 * Синхронизация цен с прайсом через ЗАКУПКУ (формулу не трогаем).
 * Для новой техники (iPhone, MacBook, iPad), где позиция есть в прайсе:
 *   target_cost_usd = цена_наличными_прайса / (курс × (1 + наценка_категории/100))
 *   cost_rub = round(target_cost_usd × cost_rate)   (курс закупа cost_rate не меняем)
 * затем recalculate_all_prices(p_ids) пересчитывает price_cash/card/credit формулой.
 * НЕ трогаем: Б/У, аксессуары, позиции вне прайса, price_override.
 *
 * Запуск:  npx tsx scripts/sync-prices-from-list.ts --dry   (показать план)
 *          npx tsx scripts/sync-prices-from-list.ts         (применить + пересчёт + проверка)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
}
const DRY = process.argv.includes("--dry");
const XLSX_PATH = process.argv.find((a) => a.endsWith(".xlsx")) || "/Users/admin/Library/Containers/ru.keepcoder.Telegram/Data/tmp/PT Прайс.xlsx";
const num = (v: unknown): number | null => { const n = Number(String(v ?? "").replace(/\s/g, "").replace(",", ".")); return isFinite(n) && n > 0 ? Math.round(n) : null; };

const RATE = 71.02;
const MK = (cat: string) => cat.startsWith("ipad") ? 20 : cat === "mac" ? 15 : 10;

function memOf(s: string): string | null {
  s = s.toLowerCase();
  if (/(\d+)\s*(?:tb|тб)/.test(s) || /\b1024\b/.test(s)) return "1TB";
  const gb = s.match(/(\d{2,4})\s*(?:gb|гб)/) || s.match(/\b(64|128|256|512)\b/);
  return gb ? `${gb[1]}GB` : null;
}
function simOf(s: string, base: string, isAir: boolean): string {
  s = s.toLowerCase();
  if (/sim\s*\+|sim\+|\+\s*esim|2sim|dual/.test(s)) return "eSIM + SIM";
  if (/esim/.test(s)) return "eSIM";
  return base === "17" || isAir ? "eSIM" : "eSIM + SIM";
}
function iphoneKey(raw: string): string | null {
  const s = raw.toLowerCase();
  const b = s.match(/(?:^|\s)(1[3-7])(?:\s|pro|air|plus|\+|gb|гб|tb|\d|$)/); if (!b) return null;
  const base = b[1], mem = memOf(s); if (!mem) return null;
  const isMax = /pro\s*max|promax|pm/.test(s), isPro = !isMax && /pro/.test(s), isAir = /air/.test(s), isPlus = /plus|\d\+/.test(s);
  let cat: string | null = null;
  if (base === "17") cat = isMax ? "iphone-17-pro-max" : isPro ? "iphone-17-pro" : isAir ? "iphone-air" : "iphone-17";
  else if (["16", "15", "14", "13"].includes(base)) cat = isMax || isPro || isPlus ? null : `iphone-${base}`;
  if (!cat) return null;
  return `${cat}|${mem}|${simOf(s, base, isAir)}`;
}
function macLine(raw: string): string | null {
  const s = raw.toLowerCase();
  const kind = /pro/.test(s) ? "pro" : /air/.test(s) ? "air" : null;
  const size = s.match(/\b(13|14|15|16)\b/)?.[1]; const chip = s.match(/m([1-4])/)?.[1];
  if (!kind || !size || !chip) return null; return `${kind}-${size}-m${chip}`;
}
// Накопитель Mac: берём ПОСЛЕДНЕЕ число c GB (после ОЗУ), напр. «8gb 256gb»→256, «16/256gb»→256.
function macMem(raw: string): string | null {
  const all = [...raw.toLowerCase().matchAll(/(\d{3,4})\s*(?:gb|гб)/g)].map((m) => m[1]);
  if (all.length) return `${all[all.length - 1]}GB`;
  const slash = raw.toLowerCase().match(/\/\s*(\d{3,4})/); if (slash) return `${slash[1]}GB`;
  const tb = raw.toLowerCase().match(/(\d+)\s*tb/); return tb ? "1TB" : null;
}
function macKeyList(raw: string): string | null {
  const line = macLine(raw); const mem = macMem(raw);
  return line && mem ? `mac|${line}|${mem}` : null;
}
function ipadKeyList(raw: string): string | null {
  const s = raw.toLowerCase(); const mem = memOf(s); if (!mem) return null;
  const conn = /lte|cell|\bsim\b/.test(s) ? "cell" : "wifi";
  let sub: string | null = null;
  if (/pro\s*13/.test(s)) sub = "ipad-pro-13-m5";
  else if (/pro\s*11/.test(s)) sub = "ipad-pro-11-m5";
  else if (/air.*m4|air\s*11\s*м4/.test(s)) sub = null;            // Air M4 — у нас нет
  else if (/air.*m3|air\s*11/.test(s)) sub = "ipad-air-11-m3";
  else if (/air.*m1|air\s*5/.test(s)) sub = "ipad-air-5-m1";
  else if (/mini/.test(s)) sub = "ipad-mini-7";
  else if (/ipad\s*11|11\s*2025|a16/.test(s)) sub = "ipad-11";
  else if (/10\.2|10,2/.test(s)) sub = "ipad-10-2";
  if (!sub) return null; return `${sub}|${mem}|${conn}`;
}

async function main() {
  loadEnv();
  const wb = XLSX.readFile(XLSX_PATH);
  const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets["Новые"], { header: 1, defval: "" });
  const list = new Map<string, number>(); // key → cash
  let section: "iphone" | "ipad" | "mac" | "other" = "other";
  for (let i = 1; i < rows.length; i++) {
    const a = String(rows[i][0] ?? "").trim(); const card = num(rows[i][1]); const cash = num(rows[i][2]);
    if (!a) continue;
    if (!card) { // строка-заголовок секции
      if (/серия|iphone/i.test(a)) section = "iphone";
      else if (/ipad/i.test(a)) section = "ipad";
      else if (/macbook/i.test(a)) section = "mac";
      else section = "other";
      continue;
    }
    if (!cash) continue;
    const k = section === "iphone" ? iphoneKey(a) : section === "mac" ? macKeyList(a) : section === "ipad" ? ipadKeyList(a) : null;
    if (!k) continue;
    if (!list.has(k)) list.set(k, cash);
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await db.from("products")
    .select("id,title,category_slug,memory,sim,cost_rub,cost_rate,price_cash,price_override")
    .or("category_slug.like.iphone%,category_slug.like.ipad%,category_slug.eq.mac")
    .neq("type", "used").is("deleted_at", null).limit(5000);
  if (error) throw error;

  const keyFor = (p: any): string | null => {
    const cat = p.category_slug as string;
    if (cat.startsWith("iphone")) {
      // mis-sit: товар Plus/Pro/Max в базовой категории (напр. «16 plus» в iphone-16)
      // — его цена в прайсе отдельная, надёжно не сопоставить → не трогаем.
      if (["iphone-13", "iphone-14", "iphone-15", "iphone-16"].includes(cat) && /\b(plus|pro|max)\b/i.test(p.title)) return null;
      return `${cat}|${p.memory}|${p.sim ?? "eSIM + SIM"}`;
    }
    if (cat === "mac") { const line = macLine(p.title); return line ? `mac|${line}|${p.memory}` : null; }
    if (cat.startsWith("ipad")) { const conn = /lte|cell|cellular|sim/i.test(p.title) ? "cell" : "wifi"; return `${cat}|${p.memory}|${conn}`; }
    return null;
  };

  const changes: { id: string; title: string; oldCost: number | null; newCost: number; listCash: number; oldPrice: number | null }[] = [];
  let skipOverride = 0, noMatch = 0;
  for (const p of (data ?? []) as any[]) {
    const k = keyFor(p); const listCash = k ? list.get(k) : undefined;
    if (listCash == null) { noMatch++; continue; }
    if (p.price_override) { skipOverride++; continue; }
    const rate = Number(p.cost_rate) || 76.84;
    const targetUsd = listCash / (RATE * (1 + MK(p.category_slug) / 100));
    const newCost = Math.round(targetUsd * rate);
    const oldCost = p.cost_rub != null ? Math.round(Number(p.cost_rub)) : null;
    if (oldCost === newCost) continue;
    changes.push({ id: p.id, title: p.title, oldCost, newCost, listCash, oldPrice: p.price_cash != null ? Math.round(Number(p.price_cash)) : null });
  }

  console.log(`\nПозиций сопоставлено с прайсом и требует смены закупки: ${changes.length}`);
  console.log(`Пропущено: вне прайса=${noMatch}, с price_override=${skipOverride} (не трогаем).`);
  changes.slice(0, 200).forEach((c) => console.log(`  ${c.title.slice(0, 40).padEnd(40)} закупка ${String(c.oldCost).padStart(7)}→${String(c.newCost).padStart(7)}  (цена ${c.oldPrice}→прайс ${c.listCash})`));
  if (DRY) { console.log("\n(dry-run: НЕ применено)"); return; }

  // Применяем закупки
  const now = new Date().toISOString();
  for (const c of changes) {
    const { error: e } = await db.from("products").update({ cost_rub: c.newCost, updated_at: now }).eq("id", c.id);
    if (e) throw e;
  }
  // Пересчёт формулой по затронутым id
  const ids = changes.map((c) => c.id);
  const { error: rpcErr } = await db.rpc("recalculate_all_prices", { p_reason: "Синхронизация с прайсом (закупки)", p_ids: ids });
  if (rpcErr) throw rpcErr;

  // Проверка: цена нал теперь == прайс?
  const { data: after } = await db.from("products").select("id,title,category_slug,price_cash").in("id", ids);
  const cashOf = new Map((after ?? []).map((r: any) => [r.id, Math.round(Number(r.price_cash))]));
  let ok = 0, bad = 0;
  const mism: string[] = [];
  for (const c of changes) {
    const got = cashOf.get(c.id);
    if (got === c.listCash) ok++; else { bad++; mism.push(`${c.title.slice(0, 40)} → ${got} (ждали ${c.listCash})`); }
  }
  console.log(`\n✅ Применено закупок: ${changes.length}. Пересчёт выполнен.`);
  console.log(`Проверка цены наличными == прайс: совпало ${ok}, расхождений ${bad}.`);
  if (mism.length) { console.log("Расхождения после пересчёта:"); mism.slice(0, 40).forEach((m) => console.log("  •", m)); }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
