/**
 * Готовит группы для генерации HTML-описаний: iPhone/Samsung — по категории
 * (одна модель = одна категория), остальное — по товару. Пишет /tmp/seo-models.json.
 * Запуск: npx tsx scripts/seo-build-groups.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() { const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8"); for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; } }

async function main() {
  loadEnv();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: cats } = await db.from("categories").select("slug,title");
  const catTitle = new Map((cats ?? []).map((c: any) => [c.slug, c.title]));
  const { data: prods } = await db.from("products").select("id,title,category_slug,type,color,memory,specs,battery,condition_text").is("deleted_at", null).limit(5000);

  const COLORS = ["space","grey","gray","graphite","black","balck","white","silver","gold","blue","cobalt","sapphire","green","emerald","teal","ultramarine","red","garnet","purple","violet","lavender","sage","sierra","cloud","jet","midnight","starlight","titanium","natural","desert","neon","indigo","olive","rose","rosegold","pink","yellow","orange","antracite","beige",
    "чёрный","черный","белый","серебристый","серебро","золотой","золотистый","серый","графит","графитовый","синий","кобальт","сапфир","зелёный","зеленый","изумрудный","красный","гранат","фиолетовый","сиреневый","лавандовый","розовый","жёлтый","желтый","оранжевый","титан","титановый","песочный","бежевый","бирюзовая","бирюзовый","малиновый","опал","оникс","антрацит","аметист","космос"];
  const NOISE = ["wi-fi","wifi","cell","cellular","lte","gps","aluminum","aluminium","case","sport","band","ocean","alpine","trail","loop","with","m/l","s/m","medium","large","bl","2nd","3nd","generation","usb-c","usb-s","magsafe","anc","с","алисой","зигби","zigbee","часами","дисководом","dvd","для","и","без","шумоподавлением","шумополавлением"];
  function modelKey(title: string): string {
    let t = " " + title.toLowerCase() + " ";
    t = t.replace(/\([^)]*\)/g, " ");                    // (...) — цвет/доп
    t = t.replace(/\b\d+\s*\/\s*\d+(\s*\/\s*\d+)?\b/g, " "); // 8/256, 12/256/...
    t = t.replace(/\b\d+\s?(gb|tb|гб|тб)\b/g, " ");
    t = t.replace(/\b\d+\s?(mm|вт|w)\b/g, " ");
    for (const w of [...COLORS, ...NOISE]) t = t.replace(new RegExp(`\\s${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s`, "g"), " ");
    return t.replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
  }
  const groups = new Map<string, any>();
  for (const p of (prods ?? []) as any[]) {
    const cat = p.category_slug as string;
    const byCategory = /^iphone/.test(cat) || /^samsung/.test(cat);
    const key = byCategory ? `cat:${cat}` : `m:${cat}:${modelKey(p.title)}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        kind: byCategory ? "category" : "product",
        model: byCategory ? (catTitle.get(cat) ?? cat) : p.title,
        category: cat,
        type: p.type,
        ids: [],
        sample: { title: p.title, specs: p.specs ?? null, memory: p.memory, color: p.color },
      });
    }
    groups.get(key).ids.push(p.id);
  }
  const list = [...groups.values()];
  writeFileSync("/tmp/seo-models.json", JSON.stringify(list, null, 1));
  console.log("Групп всего:", list.length);
  console.log("по категории (iPhone/Samsung):", list.filter((g) => g.kind === "category").length);
  console.log("по товару (техника/аксессуары):", list.filter((g) => g.kind === "product").length);
  console.log("товаров покрыто:", list.reduce((s, g) => s + g.ids.length, 0));
  console.log("модели:", list.map((g) => g.model).slice(0, 200).join(" | "));
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
