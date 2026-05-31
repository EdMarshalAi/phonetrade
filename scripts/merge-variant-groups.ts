/**
 * Объединение товаров в группы вариантов (variant_group_id) по модели —
 * цвет/память становятся переключателями на витрине (getVariantsForProduct).
 * Витрина дедупит переключатели по имени цвета/памяти, поэтому несколько
 * единиц одной конфигурации (Single/Dual SIM у новых, разные единицы Б/У)
 * схлопываются в один чип — переключатель остаётся чистым.
 *
 * Группируем (по модели):
 *  - новые iPhone           → по category_slug (каждая категория = модель);
 *  - Б/У iPhone             → по category_slug;
 *  - Samsung                → по category_slug (+ чиним память из названия);
 *  - MacBook (mac)          → по «Air/Pro + размер + чип» из названия;
 *  - Apple Watch (watch)    → по «модель + размер корпуса» из названия.
 * Группа создаётся только при ≥2 участниках. id групп детерминированы (vg-…),
 * повторный запуск идемпотентен.
 * Запуск: npx tsx scripts/merge-variant-groups.ts        (применить)
 *         npx tsx scripts/merge-variant-groups.ts --dry   (только показать план)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
}

const DRY = process.argv.includes("--dry");

type Row = { id: string; title: string; category_slug: string; type: string | null; memory: string | null; color: string | null; variant_group_id: string | null };

// MacBook: «Air|Pro + размер + чип» → ключ air-13-m4 / pro-16-m4pro …
function macKey(title: string): string | null {
  const line = title.replace(/apple\s+/i, "");
  const kind = /macbook\s+pro/i.test(line) ? "pro" : /macbook\s+air/i.test(line) ? "air" : null;
  if (!kind) return null;
  const size = line.match(/\b(13|14|15|16)\b/)?.[1];
  const chipM = line.match(/\bM([1-4])\s*(pro|max)?\b/i);
  if (!size || !chipM) return null;
  const chip = `m${chipM[1]}${chipM[2] ? chipM[2].toLowerCase() : ""}`;
  return `${kind}-${size}-${chip}`;
}

// Apple Watch: «модель + размер» → s11-42mm / se2023-40mm / se3-2025-44mm / ultra-2 / ultra-3
function watchKey(title: string): string | null {
  const t = title;
  const size = t.match(/(\d{2})mm/)?.[1];
  if (/ultra\s*3/i.test(t)) return "ultra-3"; // 49mm всегда
  if (/ultra\s*2/i.test(t)) return "ultra-2";
  if (/3nd/i.test(t)) return size ? `se3-2025-${size}mm` : null;     // SE 3-го поколения (2025)
  if (/\bse\b/i.test(t) && /2023/.test(t)) return size ? `se2023-${size}mm` : null;
  if (/\bs11\b/i.test(t)) return size ? `s11-${size}mm` : null;
  return null;
}

// Samsung: вытащить накопитель из «12/512» → 512GB (чиним перепутанную память).
function samsungMemory(title: string): string | null {
  const m = title.match(/\b\d{1,2}\/(\d{2,4})\b/);
  return m ? `${m[1]}GB` : null;
}

async function main() {
  loadEnv();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await db
    .from("products")
    .select("id,title,category_slug,type,memory,color,variant_group_id")
    .is("deleted_at", null)
    .or("category_slug.like.iphone%,category_slug.like.samsung%,category_slug.eq.mac,category_slug.eq.watch")
    .limit(5000);
  if (error) throw error;
  const rows = (data ?? []) as Row[];

  // 1) Фикс памяти Samsung из названия (до группировки).
  const memFixes: { id: string; memory: string }[] = [];
  for (const p of rows) {
    if (p.category_slug.startsWith("samsung")) {
      const fixed = samsungMemory(p.title);
      if (fixed && fixed !== p.memory) { memFixes.push({ id: p.id, memory: fixed }); p.memory = fixed; }
    }
  }

  // 2) Ключ группы для каждого товара.
  const keyOf = (p: Row): string | null => {
    if (p.category_slug.startsWith("iphone")) return `vg-${p.category_slug}`;     // new + used
    if (p.category_slug.startsWith("samsung")) return `vg-${p.category_slug}`;
    if (p.category_slug === "mac") { const k = macKey(p.title); return k ? `vg-mac-${k}` : null; }
    if (p.category_slug === "watch") { const k = watchKey(p.title); return k ? `vg-watch-${k}` : null; }
    return null;
  };

  const groups = new Map<string, Row[]>();
  for (const p of rows) {
    const k = keyOf(p);
    if (!k) continue;
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }

  // Только группы ≥2.
  const final = [...groups.entries()].filter(([, m]) => m.length >= 2);
  const skippedSingles = [...groups.entries()].filter(([, m]) => m.length < 2).map(([k, m]) => `${k} (${m[0].title})`);
  const ungrouped = rows.filter((p) => !keyOf(p));

  // ── Отчёт ──
  console.log(`\n=== ПЛАН ОБЪЕДИНЕНИЯ ${DRY ? "(dry-run)" : ""} ===`);
  console.log(`Товаров в выборке: ${rows.length}, групп ≥2: ${final.length}, одиночек (без группы): ${skippedSingles.length}, не распознано: ${ungrouped.length}`);
  if (memFixes.length) console.log(`\nФикс памяти Samsung (${memFixes.length}): ${memFixes.map((f) => `${f.id}→${f.memory}`).join(", ")}`);
  const section = (title: string, pred: (k: string, m: Row[]) => boolean) => {
    const items = final.filter(([k, m]) => pred(k, m));
    if (!items.length) return;
    console.log(`\n── ${title} (${items.length} групп) ──`);
    for (const [k, m] of items.sort((a, b) => a[0].localeCompare(b[0]))) {
      const colors = [...new Set(m.map((p) => p.color).filter(Boolean))];
      const mems = [...new Set(m.map((p) => p.memory).filter(Boolean))];
      console.log(`  ${k}: ${m.length} шт. — цвета [${colors.join(", ")}], память [${mems.join(", ") || "—"}]`);
    }
  };
  const isUsed = (m: Row[]) => m.some((p) => p.type === "used");
  section("Новые iPhone", (k, m) => k.startsWith("vg-iphone") && !isUsed(m));
  section("Б/У iPhone", (k, m) => k.startsWith("vg-iphone") && isUsed(m));
  section("Samsung", (k) => k.startsWith("vg-samsung"));
  section("MacBook", (k) => k.startsWith("vg-mac-"));
  section("Apple Watch", (k) => k.startsWith("vg-watch-"));
  if (skippedSingles.length) console.log(`\nОдиночки (группа не создаётся): ${skippedSingles.join("; ")}`);

  if (DRY) { console.log("\n(dry-run: изменения НЕ применены)"); return; }

  // ── Применение ──
  const now = new Date().toISOString();
  // Сначала фикс памяти Samsung.
  for (const f of memFixes) {
    const { error: e } = await db.from("products").update({ memory: f.memory, updated_at: now }).eq("id", f.id);
    if (e) throw e;
  }
  // Затем группы. Снимаем variant_group_id у всех целевых строк, потом проставляем заново.
  const allTargetIds = rows.map((p) => p.id);
  const { error: clr } = await db.from("products").update({ variant_group_id: null, updated_at: now }).in("id", allTargetIds);
  if (clr) throw clr;
  let applied = 0, members = 0;
  for (const [vg, m] of final) {
    const ids = m.map((p) => p.id);
    const { error: e } = await db.from("products").update({ variant_group_id: vg, updated_at: now }).in("id", ids);
    if (e) throw e;
    applied++; members += ids.length;
  }
  console.log(`\n✅ Применено: групп=${applied}, товаров в группах=${members}, памятей исправлено=${memFixes.length}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
