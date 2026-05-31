/**
 * АУДИТ ЦЕН (read-only): поточечная сверка сайт ↔ «PT Прайс.xlsx».
 * Ничего не меняет. Печатает таблицу по iPhone и пишет полный CSV (iPhone/Mac/iPad).
 *
 * Открытие: прайс = наша формула. Наличные(C)=база; картой(B)=round(нал×1.15);
 * кредит=round(нал×1.23/1.28/1.37); округление 1000. Совпадает идеально.
 * Значит расхождение только в БАЗЕ (наличные) = cost_usd × курс × (1+наценка).
 * Поэтому для каждой позиции считаем нужную закупку (target cost_usd), чтобы
 * формула дала цену прайса — менять закупку, а не ломать формулу.
 * Запуск: npx tsx scripts/price-audit.ts [xlsx]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
}
const XLSX_PATH = process.argv[2] || "/Users/admin/Library/Containers/ru.keepcoder.Telegram/Data/tmp/PT Прайс.xlsx";
const num = (v: unknown): number | null => { const n = Number(String(v ?? "").replace(/\s/g, "").replace(",", ".")); return isFinite(n) && n > 0 ? Math.round(n) : null; };

// Настройки формулы (pricing_settings, 31.05.2026) + наценки категорий.
const RATE = 71.02, CARD_MK = 15, MK = { iphone: 10, ipad: 20, mac: 15 };
const markupFor = (cat: string) => cat.startsWith("ipad") ? MK.ipad : cat === "mac" ? MK.mac : MK.iphone;
// Какая закупка в USD нужна, чтобы формула дала это «наличные».
const targetCostUsd = (listCash: number, cat: string) => listCash / (RATE * (1 + markupFor(cat) / 100));

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
  else if (["16", "15", "14", "13"].includes(base)) cat = isMax || isPro || isPlus ? null : `iphone-${base}`; // у нас в новом каталоге только базовые 13–16
  if (!cat) return null;
  return `${cat}|${mem}|${simOf(s, base, isAir)}`;
}
function macKey(raw: string): string | null {
  const s = raw.toLowerCase(); if (!/macbook|air\s*1[35]|\bair\b/.test(s) && !/pro\s*1[46]/.test(s)) return null;
  const kind = /pro/.test(s) ? "pro" : "air"; const size = s.match(/\b(13|14|15|16)\b/)?.[1]; const chip = s.match(/m([1-4])/)?.[1]; const mem = memOf(s);
  if (!size || !chip || !mem) return null; return `mac|${kind}-${size}-m${chip}|${mem}`;
}
function ipadKey(raw: string): string | null {
  const s = raw.toLowerCase(); const mem = memOf(s); if (!mem) return null;
  const conn = /lte|cell|sim/.test(s) ? "cell" : "wifi";
  let sub: string | null = null;
  if (/pro\s*13/.test(s)) sub = "ipad-pro-13-m5";
  else if (/pro\s*11/.test(s)) sub = "ipad-pro-11-m5";
  else if (/air\s*1?1?\s*m4|air\s*11\s*м4/.test(s)) sub = "ipad-air-m4"; // нет у нас
  else if (/air.*m3|air\s*11/.test(s)) sub = "ipad-air-11-m3";
  else if (/air.*m1|air\s*5/.test(s)) sub = "ipad-air-5-m1";
  else if (/mini/.test(s)) sub = "ipad-mini-7";
  else if (/ipad\s*11|11\s*2025|a16/.test(s)) sub = "ipad-11";
  else if (/10\.2|10,2/.test(s)) sub = "ipad-10-2";
  if (!sub) return null; return `${sub}|${mem}|${conn}`;
}

type LP = { cash: number | null; card: number | null; raw: string };

async function main() {
  loadEnv();
  const wb = XLSX.readFile(XLSX_PATH);
  const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets["Новые"], { header: 1, defval: "" });
  const list = new Map<string, LP>();
  for (let i = 1; i < rows.length; i++) {
    const a = String(rows[i][0] ?? "").trim(); const card = num(rows[i][1]); if (!a || !card) continue;
    const k = iphoneKey(a) || macKey(a) || ipadKey(a); if (!k) continue;
    if (!list.has(k)) list.set(k, { card, cash: num(rows[i][2]), raw: a });
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await db.from("products")
    .select("id,title,category_slug,memory,color,sim,price_cash,price_card,cost_rub,cost_rate,cost_usd,price_override")
    .or("category_slug.like.iphone%,category_slug.like.ipad%,category_slug.eq.mac")
    .neq("type", "used").is("deleted_at", null).limit(5000);
  if (error) throw error;

  const macModel = (t: string) => macKey(t)?.split("|")[1] ?? null;
  const rowsOut: string[] = ["группа;позиция;нал_сайт;нал_прайс;Δнал;карта_сайт;карта_прайс;Δкарта;cost_usd_сейчас;cost_usd_нужно;статус"];
  let cmp = 0, diff = 0, noList = 0, sumAbs = 0;
  const tableI: string[] = [];
  for (const p of (data ?? []) as any[]) {
    const cat = p.category_slug as string;
    let key: string | null = null, grp = "";
    if (cat.startsWith("iphone")) { key = `${cat}|${p.memory}|${p.sim ?? "eSIM + SIM"}`; grp = "iPhone"; }
    else if (cat === "mac") { const mk = macModel(p.title); key = mk ? `mac|${mk}|${p.memory}` : null; grp = "Mac"; }
    else if (cat.startsWith("ipad")) { const conn = /lte|cell|cellular|sim/i.test(p.title) ? "cell" : "wifi"; key = `${cat}|${p.memory}|${conn}`; grp = "iPad"; }
    const L = key ? list.get(key) : undefined;
    const ourCash = p.price_cash ? Math.round(Number(p.price_cash)) : null;
    const ourCard = p.price_card ? Math.round(Number(p.price_card)) : null;
    const curUsd = p.cost_usd ? Number(p.cost_usd) : null;
    if (!L) { noList++; rowsOut.push(`${grp};${p.title};${ourCash ?? ""};;;${ourCard ?? ""};;;${curUsd?.toFixed(0) ?? ""};;нет в прайсе`); continue; }
    cmp++;
    const dCash = ourCash != null && L.cash != null ? ourCash - L.cash : null;
    const dCard = ourCard != null && L.card != null ? ourCard - L.card : null;
    if (dCash) { diff++; sumAbs += Math.abs(dCash); }
    const needUsd = L.cash != null ? targetCostUsd(L.cash, cat) : null;
    rowsOut.push(`${grp};${p.title};${ourCash ?? ""};${L.cash ?? ""};${dCash ?? ""};${ourCard ?? ""};${L.card ?? ""};${dCard ?? ""};${curUsd?.toFixed(0) ?? ""};${needUsd?.toFixed(0) ?? ""};${dCash === 0 ? "OK" : "расхождение"}`);
    if (grp === "iPhone") tableI.push(`${(p.title as string).slice(0, 34).padEnd(34)} нал ${String(ourCash).padStart(7)}→${String(L.cash).padStart(7)} ${dCash ? (dCash > 0 ? "+" : "") + dCash : "✓"}  | карта ${String(ourCard).padStart(7)}→${String(L.card).padStart(7)} ${dCard ? (dCard > 0 ? "+" : "") + dCard : "✓"}`);
  }
  const csv = "/tmp/price-audit.csv";
  writeFileSync(csv, "﻿" + rowsOut.join("\n"), "utf8");

  console.log("=== iPhone — поточечно (нал сайт→прайс | карта сайт→прайс) ===");
  tableI.sort().forEach((l) => console.log(l));
  console.log(`\nСверено позиций (есть в прайсе): ${cmp}; с расхождением по налу: ${diff}; нет в прайсе: ${noList}; средн. |Δнал| по расхождениям: ${diff ? Math.round(sumAbs / diff).toLocaleString("ru-RU") : 0} ₽`);
  console.log(`Полная таблица (iPhone+Mac+iPad, со столбцом «нужная закупка cost_usd»): ${csv}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
