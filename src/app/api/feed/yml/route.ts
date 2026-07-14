import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { productImages } from "@/lib/utils/product-images";
import {
  resolveProductAvailability,
  resolveProductBrand,
  syncProductSeoContent,
} from "@/lib/product-commerce";

/**
 * YML-фид (Yandex Market Language) для выгрузки каталога во ВКонтакте/Яндекс.
 * Отдаёт ВСЕ опубликованные новые товары в наличии с актуальными ценами:
 * <price> — актуальная цена наличными, <oldprice> — только реальная старая
 * цена товара, картинки из Storage, бренд и характеристики.
 * Цены берём готовыми из БД (формула считает их server-side) — фид всегда свежий.
 * URL фида: {SITE}/api/feed/yml — её отдаём в рекламный кабинет ВК.
 * Спека: https://yandex.ru/support/direct/ru/feeds/requirements-yml
 */
export const dynamic = "force-dynamic";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");

const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const stripHtml = (s: unknown): string =>
  String(s ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|li|h\d)>/gi, ". ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

export async function GET() {
  const db = createSupabaseAdminClient();

  // Настройки фида из админки (категории + включать ли Б/У).
  const { data: prefRow, error: prefsError } = await db.from("shop_settings").select("value").eq("key", "yml_feed_prefs").maybeSingle();
  if (prefsError) {
    console.error("[yml] preferences:", prefsError);
    return new Response("YML feed temporarily unavailable", { status: 503 });
  }
  const prefs = (prefRow?.value ?? {}) as { categories?: string[] | null; includeUsed?: boolean };
  const includeUsed = prefs.includeUsed !== false; // по умолчанию Б/У включены

  const { data: cats, error: categoriesError } = await db.from("categories").select("slug,title,parent_slug").order("slug");
  if (categoriesError || !cats) {
    console.error("[yml] categories:", categoriesError);
    return new Response("YML feed temporarily unavailable", { status: 503 });
  }
  const catList = (cats ?? []) as { slug: string; title: string; parent_slug: string | null }[];

  // Раскрываем выбранные ГЛАВНЫЕ категории на их подкатегории.
  let catFilter: string[] | null = null;
  if (Array.isArray(prefs.categories) && prefs.categories.length) {
    const sel = new Set(prefs.categories);
    const expanded = new Set(prefs.categories);
    for (const c of catList) if (c.parent_slug && sel.has(c.parent_slug)) expanded.add(c.slug);
    catFilter = [...expanded];
  }

  let pq = db
    .from("products")
    .select(
      "id,sku,title,category_slug,brand,color,memory,sim,price_cash,price_old,image,gallery,short_description,description_html,warranty_months,stock,in_stock,is_available,options,type"
    )
    .eq("status", "published")
    .is("deleted_at", null)
    .or("is_available.is.null,is_available.eq.true")
    .gt("price_cash", 0)
    .order("category_slug")
    .limit(5000);
  if (!includeUsed) pq = pq.neq("type", "used");
  if (catFilter) pq = pq.in("category_slug", catFilter);
  const { data: prods, error: productsError } = await pq;
  if (productsError || !prods) {
    console.error("[yml] products:", productsError);
    return new Response("YML feed temporarily unavailable", { status: 503 });
  }

  // Категории → числовые id (требование YML). Стабильно по алфавиту slug.
  const catId = new Map<string, number>();
  catList.forEach((c, i) => catId.set(c.slug, i + 1));

  const categoriesXml = catList
    .map((c) => {
      const id = catId.get(c.slug)!;
      const parent = c.parent_slug ? catId.get(c.parent_slug) : undefined;
      const parentAttr = parent ? ` parentId="${parent}"` : "";
      return `      <category id="${id}"${parentAttr}>${esc(c.title)}</category>`;
    })
    .join("\n");

  const offersXml = ((prods ?? []) as Record<string, unknown>[])
    .map((p) => {
      const id = p.id as string;
      const cId = catId.get(p.category_slug as string);
      if (!cId) return null; // без категории offer невалиден

      const cash = Math.round(Number(p.price_cash));
      const priceOld = p.price_old != null ? Math.round(Number(p.price_old)) : null;
      const oldprice = priceOld && priceOld > cash ? priceOld : null;

      const pics = productImages({ image: (p.image as string) ?? "", gallery: (p.gallery as string[]) ?? undefined })
        .filter((u) => /^https?:\/\//.test(u))
        .slice(0, 5);

      const rawDescription =
        (p.short_description as string)?.trim() || stripHtml(p.description_html);
      const desc = syncProductSeoContent(rawDescription, cash, {
        brand: p.brand as string | null,
        title: p.title as string,
        categorySlug: p.category_slug as string,
      }).slice(0, 2900);
      const brand = resolveProductBrand({
        brand: p.brand as string | null,
        title: p.title as string,
        categorySlug: p.category_slug as string,
      });
      const availability = resolveProductAvailability(
        {
          stock: p.stock as number | null,
          inStock: p.in_stock as boolean | null,
          isAvailable: p.is_available as boolean | null,
        },
        false
      );

      const params: string[] = [];
      const addParam = (name: string, value: unknown) => {
        const v = String(value ?? "").trim();
        if (v) params.push(`      <param name="${esc(name)}">${esc(v)}</param>`);
      };
      addParam("Цвет", p.color);
      addParam("Память", p.memory);
      addParam("SIM", p.sim);
      if (p.warranty_months) addParam("Гарантия", `${p.warranty_months} мес.`);
      // Кастомные характеристики из options jsonb.
      const opts = (p.options ?? {}) as Record<string, unknown>;
      for (const [k, v] of Object.entries(opts)) {
        if (typeof v === "string" || typeof v === "number") addParam(k, v);
      }

      const lines = [
        `    <offer id="${esc(id)}" available="${availability.feedAvailable}">`,
        `      <url>${esc(`${SITE}/product/${id}`)}</url>`,
        `      <price>${cash}</price>`,
        oldprice ? `      <oldprice>${oldprice}</oldprice>` : "",
        `      <currencyId>RUB</currencyId>`,
        `      <categoryId>${cId}</categoryId>`,
        ...pics.map((u) => `      <picture>${esc(u)}</picture>`),
        brand ? `      <vendor>${esc(brand)}</vendor>` : "",
        p.sku ? `      <vendorCode>${esc(p.sku)}</vendorCode>` : "",
        `      <name>${esc(p.title)}</name>`,
        desc ? `      <description>${esc(desc)}</description>` : "",
        ...params,
        `    </offer>`,
      ].filter(Boolean);
      return lines.join("\n");
    })
    .filter(Boolean)
    .join("\n");

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${date}">
  <shop>
    <name>PhoneTrade</name>
    <company>PhoneTrade</company>
    <url>${SITE}</url>
    <currencies>
      <currency id="RUB" rate="1"/>
    </currencies>
    <categories>
${categoriesXml}
    </categories>
    <offers>
${offersXml}
    </offers>
  </shop>
</yml_catalog>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Кэш на стороне CDN/прокси: свежесть 30 мин, отдача устаревшего ещё час.
      "Cache-Control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=3600",
    },
  });
}
