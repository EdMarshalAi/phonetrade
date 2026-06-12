/**
 * SEO-зашивка ключей в КАТЕГОРИИ: идемпотентный гео+ключевой блок в seo_text
 * (маркер <!--seo-kw-->) с областью (Старый Оскол, Губкин, Шебекино) и
 * кластерными ключами по категории; заполнение пустых Dyson. Конкурентов нет.
 * Запуск: npx tsx scripts/seo-embed-categories.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
function loadEnv(){const raw=readFileSync(resolve(process.cwd(),".env.local"),"utf8");for(const l of raw.split("\n")){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2];}}
loadEnv();
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});

// Ключевые фразы по родительской категории (естественно, без переспама)
const KW: Record<string,string> = {
  iphone: "айфон (iPhone) любой модели — 11, 12, 13, 14, 15, 16, 17, Pro, Pro Max, Plus, Air — на 128, 256, 512 ГБ и 1 ТБ, во всех цветах",
  "iphone-used": "Б/У айфоны с гарантией — проверенные восстановленные iPhone, выгодная цена",
  airpods: "наушники для айфона — AirPods, AirPods Pro и AirPods Max, оригинальные беспроводные наушники Apple",
  ipad: "iPad (Айпад, планшет Apple) — Pro, Air, mini на чипах M3/M4/M5",
  mac: "MacBook (макбук, ноутбук Apple), iMac и Mac mini на Apple Silicon M4/M5",
  watch: "Apple Watch (умные часы, смарт-часы) — Ultra, Series и SE, размеры 40/44/46/49 мм",
  samsung: "смартфоны Samsung Galaxy (самсунг, галакси) — S26, S25, S24 Ultra, Z Fold и Z Flip",
  dyson: "техника Dyson (Дайсон) — фен Supersonic, стайлер Airwrap, выпрямитель Corrale и пылесосы",
  "gaming-consoles": "игровые приставки и консоли — PlayStation 5, Xbox и Nintendo Switch",
  "smart-speakers": "умные колонки с голосовым помощником",
  accessories: "аксессуары для iPhone и техники Apple — чехлы, зарядки, защитные стёкла, кабели, MagSafe",
};
const titleRU: Record<string,string> = {
  iphone:"айфон", "iphone-used":"Б/У айфон", airpods:"наушники AirPods", ipad:"iPad", mac:"MacBook",
  watch:"Apple Watch", samsung:"смартфон Samsung", dyson:"технику Dyson", "gaming-consoles":"приставку",
  "smart-speakers":"умную колонку", accessories:"аксессуары Apple",
};

function blockFor(slug:string,parent:string|null,title:string):string{
  const key=parent||slug;
  const kw=KW[key]||`${title} в Белгороде`;
  const what=titleRU[key]||title;
  return `\n<!--seo-kw-->\n<p>Купить ${what} в Белгороде выгодно: ${kw}. Оригинальная техника с гарантией, рассрочка и Trade-in. Доставка по Белгороду и Белгородской области — Старый Оскол, Губкин, Шебекино, Алексеевка, Валуйки — и самовывоз в магазине на ул. Попова, 36. Уточняйте наличие и цену — поможем с выбором.</p>\n<!--/seo-kw-->`;
}
const strip=(s:string)=> (s||"").replace(/\n?<!--seo-kw-->[\s\S]*?<!--\/seo-kw-->/g,"").trimEnd();

// Полный seo_text для пустых Dyson
const DYSON: Record<string,string> = {
  dyson: "<p>Купить технику Dyson (Дайсон) в Белгороде — фены Supersonic, стайлеры Airwrap, выпрямители Corrale и Airstrait, беспроводные пылесосы. Оригинал с гарантией, рассрочка, доставка по городу и области, самовывоз.</p>",
  "dyson-hair-dryers": "<p>Фены Dyson Supersonic в Белгороде — оригинальные, с гарантией. Быстрая сушка без перегрева, разные комплектации и цвета. Рассрочка, доставка, самовывоз — ул. Попова, 36.</p>",
  "dyson-straighteners": "<p>Выпрямители Dyson Corrale и Airstrait в Белгороде — оригинальные, с гарантией. Бережное выпрямление волос. Рассрочка, доставка по области, самовывоз.</p>",
  "dyson-stylers": "<p>Стайлеры Dyson Airwrap в Белгороде — оригинальные мультистайлеры с гарантией. Укладка без экстремального нагрева. Рассрочка, доставка, самовывоз — ул. Попова, 36.</p>",
};
const DYSON_META: Record<string,[string,string]> = {
  "dyson-hair-dryers":["Купить фен Dyson Supersonic в Белгороде — цена","Фены Dyson Supersonic в Белгороде: оригинал, гарантия, рассрочка, доставка по области и самовывоз (ул. Попова, 36). Уточняйте цену и наличие."],
  "dyson-straighteners":["Купить выпрямитель Dyson в Белгороде — Corrale, Airstrait","Выпрямители Dyson Corrale и Airstrait в Белгороде: оригинал, гарантия, рассрочка, доставка, самовывоз. Узнать цену."],
  "dyson-stylers":["Купить стайлер Dyson Airwrap в Белгороде — цена","Стайлеры Dyson Airwrap в Белгороде: оригинал, гарантия, рассрочка, доставка по области, самовывоз — ул. Попова, 36."],
};

async function main(){
  const {data,error}=await db.from("categories").select("slug,parent_slug,title,meta_title,meta_description,seo_text").eq("is_published",true);
  if(error)throw error;
  let done=0;
  for(const c of data as any[]){
    const patch:Record<string,unknown>={};
    let base = strip(c.seo_text||"");
    // Dyson — заполнить полностью, если пусто
    if(!base && DYSON[c.slug]) base = DYSON[c.slug];
    patch.seo_text = base + blockFor(c.slug,c.parent_slug,c.title);
    if(DYSON_META[c.slug]){ if(!c.meta_title||c.meta_title.length<10) patch.meta_title=DYSON_META[c.slug][0]; if(!c.meta_description) patch.meta_description=DYSON_META[c.slug][1]; }
    if(c.slug==="dyson" && (!c.meta_description)) patch.meta_description="Купить технику Dyson в Белгороде: фены Supersonic, стайлеры Airwrap, выпрямители, пылесосы. Оригинал, гарантия, рассрочка, доставка по области.";
    const {error:e2}=await db.from("categories").update(patch).eq("slug",c.slug);
    if(e2){console.error(c.slug,e2.message);continue;}
    done++;
  }
  console.log(`Готово: обновлено категорий ${done}`);
}
main().catch((e)=>{console.error(e);process.exit(1);});
