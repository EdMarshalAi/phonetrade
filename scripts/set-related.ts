/**
 * Проставляет сопутствующие товары (related_product_ids):
 * - iPhone: зарядка 20W + 2 случайных AirPods + 2 случайных Apple Watch
 * - iPad:   Magic Keyboard + 3 Apple Pencil
 * - MacBook: 2 Magic Mouse + 70W адаптер
 * Запуск: npx tsx scripts/set-related.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() { const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8"); for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; } }
const pick = <T>(arr: T[], n: number): T[] => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

const CHARGER = "AAC-WHI-01";
const IPAD_RELATED = ["MAC-BLA-01", "PEN-WHI-03", "PEN-WHI-02", "PEN-WHI-01"];
const MAC_RELATED = ["MAC-WHI-01", "MAC-BLA-02", "macbook-apple-70w-usb-c-power-adapter"];

async function main() {
  loadEnv();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: prods } = await db.from("products").select("id,category_slug,title").is("deleted_at", null).limit(5000);
  const all = (prods ?? []) as any[];
  const idsIn = (pred: (p: any) => boolean) => all.filter(pred).map((p) => p.id as string);

  const airpods = idsIn((p) => p.category_slug === "airpods");
  const watches = idsIn((p) => p.category_slug === "watch");
  const iphones = all.filter((p) => (String(p.category_slug).startsWith("iphone") || /iphone/i.test(p.title)) && !String(p.category_slug).startsWith("samsung"));
  const ipads = idsIn((p) => p.category_slug === "ipad");
  const macs = idsIn((p) => p.category_slug === "mac");
  console.log(`iPhone: ${iphones.length}, iPad: ${ipads.length}, Mac: ${macs.length} | airpods:${airpods.length} watch:${watches.length}`);

  let n = 0;
  // iPhone — зарядка + 2 рандомных AirPods + 2 рандомных Watch
  for (const p of iphones) {
    const rel = Array.from(new Set([CHARGER, ...pick(airpods, 2), ...pick(watches, 2)])).filter((id) => id !== p.id);
    await db.from("products").update({ related_product_ids: rel, updated_at: new Date().toISOString() }).eq("id", p.id);
    n++;
  }
  // iPad
  for (const id of ipads) {
    const rel = IPAD_RELATED.filter((x) => x !== id);
    await db.from("products").update({ related_product_ids: rel, updated_at: new Date().toISOString() }).eq("id", id);
    n++;
  }
  // MacBook
  for (const id of macs) {
    const rel = MAC_RELATED.filter((x) => x !== id);
    await db.from("products").update({ related_product_ids: rel, updated_at: new Date().toISOString() }).eq("id", id);
    n++;
  }
  console.log(`Сопутствующие проставлены: ${n} товаров`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
