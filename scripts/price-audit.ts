/**
 * АУДИТ ЦЕН (read-only): сверка цен на сайте с прайсом «PT Прайс.xlsx».
 * Ничего не меняет — только печатает отчёт.
 *
 * Прайс: лист «Новые» (колонки B=цена картой, C=цена за наличные,
 * E/G/I=рассрочка 6/12/24 итог). Сверка новых iPhone на уровне
 * «категория + память + SIM» (внутри комбинации цвета в прайсе равны).
 * Запуск: npx tsx scripts/price-audit.ts [путь_к_xlsx]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
}

const XLSX_PATH = process.argv[2] || "/Users/admin/Library/Containers/ru.keepcoder.Telegram/Data/tmp/PT Прайс.xlsx";
const num = (v: unknown): number | null => { const n = Number(String(v ?? "").replace(/\s/g, "").replace(",", ".")); return isFinite(n) && n > 0 ? Math.round(n) : null; };

// Парсинг строки прайса нового iPhone → {category_slug, memory, sim}
function parseNewIphone(raw: string): { cat: string; mem: string; sim: string } | null {
  const s = raw.toLowerCase();
  const baseM = s.match(/(?:^|\s)(1[3-7])(?:\s|pro|air|plus|\+|gb|гб|tb|\d|$)/);
  if (!baseM) return null;
  const base = baseM[1];
  // память (1TB == 1024GB → нормализуем к 1TB как на сайте)
  let mem: string | null = null;
  const tb = s.match(/(\d+)\s*(?:tb|тб)/);
  if (tb) mem = "1TB";
  else { const gb = s.match(/(\d{2,4})\s*(?:gb|гб)/) || s.match(/\b(64|128|256|512)\b/); if (gb) mem = gb[1] === "1024" ? "1TB" : `${gb[1]}GB`; }
  if (!mem) return null;
  // вариант (без \b — в прайсе «17pro», «17pm» пишутся слитно)
  const isMax = /pro\s*max|promax|pm/.test(s);
  const isPro = !isMax && /pro/.test(s);
  const isAir = /air/.test(s);
  const isPlus = /plus|\d\+/.test(s);
  // sim: явная пометка; без неё — 17/Air = eSIM, остальные = eSIM + SIM
  const sim = /sim\s*\+|sim\+|\+\s*esim|2sim|dual/.test(s) ? "eSIM + SIM"
    : /esim/.test(s) ? "eSIM"
    : (base === "17" || isAir) ? "eSIM" : "eSIM + SIM";
  let cat: string | null = null;
  if (base === "17") cat = isMax ? "iphone-17-pro-max" : isPro ? "iphone-17-pro" : isAir ? "iphone-air" : "iphone-17";
  else if (base === "16") cat = isMax || isPro || isPlus ? `iphone-16-x` : "iphone-16";
  else if (base === "15") cat = isMax || isPro || isPlus ? `iphone-15-x` : "iphone-15";
  else if (base === "14") cat = isMax || isPro || isPlus ? `iphone-14-x` : "iphone-14";
  else if (base === "13") cat = isMax || isPro ? `iphone-13-x` : "iphone-13";
  if (!cat) return null;
  return { cat, mem, sim };
}

type PriceRow = { card: number | null; cash: number | null; c6: number | null; c12: number | null; c24: number | null; raws: string[] };

async function main() {
  loadEnv();
  const wb = XLSX.readFile(XLSX_PATH);
  const sheet = wb.Sheets["Новые"];
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });

  // Список прайса: ключ cat|mem|sim → цена (берём первую встреченную; цвета равны)
  const list = new Map<string, PriceRow>();
  const listOnlyVariants = new Set<string>(); // pro/plus/max, которых нет в новом каталоге
  let listIphoneRows = 0;
  for (let i = 1; i < rows.length; i++) {
    const a = String(rows[i][0] ?? "").trim();
    const card = num(rows[i][1]);
    if (!a || !card) continue;
    const p = parseNewIphone(a);
    if (!p) continue;
    listIphoneRows++;
    if (p.cat.endsWith("-x")) { listOnlyVariants.add(`${p.cat.replace("-x", " (pro/plus/max)")} ${p.mem} ${p.sim}`); continue; }
    const key = `${p.cat}|${p.mem}|${p.sim}`;
    if (!list.has(key)) list.set(key, { card, cash: num(rows[i][2]), c6: num(rows[i][4]), c12: num(rows[i][6]), c24: num(rows[i][8]), raws: [a] });
    else list.get(key)!.raws.push(a);
  }

  // Сайт: новые iPhone, агрегируем по cat|mem|sim
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await db.from("products")
    .select("category_slug,memory,sim,price_cash,price_card,credit_6m_total,credit_12m_total,credit_24m_total,price_override")
    .like("category_slug", "iphone%").neq("type", "used").is("deleted_at", null).limit(5000);
  if (error) throw error;
  const site = new Map<string, { cash: Set<number>; card: Set<number>; n: number; override: number }>();
  for (const p of (data ?? []) as any[]) {
    const key = `${p.category_slug}|${p.memory}|${p.sim ?? "eSIM + SIM"}`;
    const e = site.get(key) ?? { cash: new Set(), card: new Set(), n: 0, override: 0 };
    if (p.price_cash) e.cash.add(Math.round(Number(p.price_cash)));
    if (p.price_card) e.card.add(Math.round(Number(p.price_card)));
    e.n++; if (p.price_override) e.override++;
    site.set(key, e);
  }

  // ── Сверка ──
  const fmt = (n: number | null) => (n == null ? "—" : n.toLocaleString("ru-RU"));
  const allKeys = Array.from(new Set([...list.keys(), ...site.keys()])).sort();
  console.log("\n================= АУДИТ НОВЫХ iPhone (категория · память · SIM) =================");
  console.log("комбинация | наличные(прайс→сайт) Δ | картой(прайс→сайт) Δ | прим.");
  let matched = 0, diffCash = 0, diffCard = 0, listOnly = 0, siteOnly = 0;
  for (const k of allKeys) {
    const L = list.get(k); const S = site.get(k);
    const sCash = S ? [...S.cash] : []; const sCard = S ? [...S.card] : [];
    const sCashStr = sCash.length > 1 ? `[${sCash.map(fmt).join("/")}]` : fmt(sCash[0] ?? null);
    const sCardStr = sCard.length > 1 ? `[${sCard.map(fmt).join("/")}]` : fmt(sCard[0] ?? null);
    if (L && S) {
      matched++;
      const dCash = sCash.length === 1 && L.cash != null ? sCash[0] - L.cash : null;
      const dCard = sCard.length === 1 && L.card != null ? sCard[0] - L.card : null;
      if (dCash) diffCash++; if (dCard) diffCard++;
      const note = [S.override ? `override:${S.override}/${S.n}` : "", sCash.length > 1 ? "разнобой наличных" : "", sCard.length > 1 ? "разнобой картой" : ""].filter(Boolean).join(" ");
      console.log(`${k} | ${fmt(L.cash)}→${sCashStr} ${dCash ? (dCash > 0 ? `(+${fmt(dCash)})` : `(${fmt(dCash)})`) : dCash === 0 ? "✓" : ""} | ${fmt(L.card)}→${sCardStr} ${dCard ? (dCard > 0 ? `(+${fmt(dCard)})` : `(${fmt(dCard)})`) : dCard === 0 ? "✓" : ""} | ${note}`);
    } else if (L && !S) { listOnly++; console.log(`${k} | ПРАЙС: налич ${fmt(L.cash)} / картой ${fmt(L.card)} | — | НЕТ НА САЙТЕ`); }
    else if (!L && S) { siteOnly++; console.log(`${k} | — | САЙТ: налич ${sCashStr} / картой ${sCardStr} | НЕТ В ПРАЙСЕ`); }
  }
  console.log(`\nИТОГО новых iPhone: совпадает комбинаций=${matched}, расхождений по наличным=${diffCash}, по картой=${diffCard}, только в прайсе=${listOnly}, только на сайте=${siteOnly}`);
  console.log(`Строк iPhone в прайсе (всего, с цветами): ${listIphoneRows}`);
  if (listOnlyVariants.size) {
    console.log(`\nВ прайсе есть НОВЫЕ Pro/Plus/Max, которых НЕТ в нашем новом каталоге (${listOnlyVariants.size}):`);
    [...listOnlyVariants].sort().forEach((v) => console.log("   •", v));
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
