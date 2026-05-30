import {
  ALL_PRODUCTS,
  CATEGORIES,
  FEATURED_CATALOG,
  FEATURED_IPHONES,
  USED_IPHONES,
  type Category,
  type CategorySlug,
  type Product,
} from "@/lib/data/products";
import { supabase } from "@/lib/supabase/client";
import {
  rowToProduct,
  rowToCategory,
  type ProductRow,
  type CategoryRow,
} from "@/lib/supabase/types";

/**
 * Data access layer — components MUST consume these getters, not the mock
 * arrays directly. Reads from Supabase when configured; on any error or when
 * env vars are missing, falls back to the mock data so the app always works.
 * The mock data (src/lib/data/products.ts) remains the source of truth for seeding.
 */

/**
 * Разрешена ли продажа/показ товаров с нулевым остатком (shop_settings.product_availability).
 * По умолчанию true — ничего не скрываем, пока магазин не настроит.
 */
export async function getAllowZeroStock(): Promise<boolean> {
  if (!supabase) return true;
  const { data } = await supabase.from("shop_settings").select("value").eq("key", "product_availability").maybeSingle();
  const v = data?.value as { allow_zero_stock?: boolean } | null;
  return v?.allow_zero_stock !== false;
}

/** Скрывает товары с явным нулевым остатком, если показ запрещён. null/undefined остаток = «уточняйте» → видим. */
function hideZeroStock(products: Product[], allow: boolean): Product[] {
  if (allow) return products;
  return products.filter((p) => p.stock == null || p.stock > 0);
}

export async function getCategories(): Promise<Category[]> {
  if (!supabase) return CATEGORIES;
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_published", true)
    .order("sort", { ascending: true });
  if (error || !data || data.length === 0) return CATEGORIES;
  return (data as CategoryRow[]).map(rowToCategory);
}

export async function getFeaturedIphones(): Promise<Product[]> {
  if (!supabase) return FEATURED_IPHONES;
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category_slug", "iphone")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("sort", { ascending: true })
    .limit(8);
  if (error || !data || data.length === 0) return FEATURED_IPHONES;
  return hideZeroStock((data as ProductRow[]).map(rowToProduct), await getAllowZeroStock());
}

export async function getFeaturedCatalog(): Promise<Product[]> {
  if (!supabase) return FEATURED_CATALOG;
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("category_slug", ["ipad", "mac", "watch"])
    .eq("status", "published")
    .is("deleted_at", null)
    .order("sort", { ascending: true })
    .limit(8);
  if (error || !data || data.length === 0) return FEATURED_CATALOG;
  return hideZeroStock((data as ProductRow[]).map(rowToProduct), await getAllowZeroStock());
}

export async function getUsedProducts(): Promise<Product[]> {
  if (!supabase) return USED_IPHONES;
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_used", true)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("sort", { ascending: true });
  if (error || !data || data.length === 0) return USED_IPHONES;
  return hideZeroStock((data as ProductRow[]).map(rowToProduct), await getAllowZeroStock());
}

export async function getHeroProduct(): Promise<Product> {
  const iphones = await getFeaturedIphones();
  return iphones[0] ?? FEATURED_IPHONES[3];
}

/** Количество опубликованных товаров по каждому category_slug (для чипов подкатегорий). */
export async function getProductCountsByCategory(): Promise<Record<string, number>> {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("products")
    .select("category_slug")
    .eq("status", "published")
    .is("deleted_at", null)
    .neq("type", "used") // Б/У считаем отдельно (через is_used ниже не нужно — used имеют свои категории)
    .limit(10000);
  // используем обычный запрос и считаем на стороне приложения (надёжно для self-hosted)
  const counts: Record<string, number> = {};
  if (!error && data) {
    for (const r of data as { category_slug: string | null }[]) {
      if (r.category_slug) counts[r.category_slug] = (counts[r.category_slug] ?? 0) + 1;
    }
  }
  // Б/У товары (type='used') — у них свои категории (…-used), посчитаем тоже
  const { data: usedData } = await supabase
    .from("products")
    .select("category_slug")
    .eq("status", "published")
    .is("deleted_at", null)
    .eq("type", "used")
    .limit(10000);
  if (usedData) {
    for (const r of usedData as { category_slug: string | null }[]) {
      if (r.category_slug) counts[r.category_slug] = (counts[r.category_slug] ?? 0) + 1;
    }
  }
  return counts;
}

export async function getProductsByCategory(
  slug: CategorySlug
): Promise<Product[]> {
  if (!supabase) return mockByCategory(slug);

  let base;
  if (slug === "used") {
    base = supabase.from("products").select("*").eq("is_used", true);
  } else {
    // Двухуровневый каталог: для родительской категории собираем товары всех её серий.
    const { data: children } = await supabase.from("categories").select("slug").eq("parent_slug", slug);
    const childSlugs = (children ?? []).map((c) => c.slug as string);
    base = childSlugs.length > 0
      ? supabase.from("products").select("*").in("category_slug", [slug, ...childSlugs])
      : supabase.from("products").select("*").eq("category_slug", slug);
  }
  const { data, error } = await base
    .eq("status", "published")
    .is("deleted_at", null)
    .order("sort", { ascending: true });
  if (error || !data) return mockByCategory(slug);
  return hideZeroStock((data as ProductRow[]).map(rowToProduct), await getAllowZeroStock());
}

export async function getProductById(id: string): Promise<Product | undefined> {
  if (!supabase) return ALL_PRODUCTS.find((p) => p.id === id);
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return ALL_PRODUCTS.find((p) => p.id === id);
  return data ? rowToProduct(data as ProductRow) : undefined;
}

export async function getRelatedProducts(
  product: Product,
  limit = 8
): Promise<Product[]> {
  if (!supabase) return mockRelated(product, limit);

  // 1) Явно выбранные в админке сопутствующие товары (сохраняем порядок выбора).
  const ids = product.relatedProductIds ?? [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("products")
      .select("*")
      .in("id", ids)
      .eq("status", "published")
      .is("deleted_at", null);
    const byId = new Map((data as ProductRow[] | null ?? []).map((r) => [r.id, rowToProduct(r)]));
    const ordered = ids.map((id) => byId.get(id)).filter((p): p is Product => !!p);
    if (ordered.length > 0) return ordered.slice(0, limit);
  }

  // 2) Фолбэк — товары той же категории.
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category_slug", product.categorySlug)
    .neq("id", product.id)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("sort", { ascending: true })
    .limit(limit);
  if (error || !data) return mockRelated(product, limit);
  return (data as ProductRow[]).map(rowToProduct);
}

export async function getNewProducts(): Promise<Product[]> {
  if (!supabase) return ALL_PRODUCTS.filter((p) => p.isNew);
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_new", true)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("sort", { ascending: true });
  if (error || !data) return ALL_PRODUCTS.filter((p) => p.isNew);
  return hideZeroStock((data as ProductRow[]).map(rowToProduct), await getAllowZeroStock());
}

/** Лёгкий список опубликованных товаров для sitemap (id + дата изменения). */
export async function getSitemapProducts(): Promise<{ id: string; updatedAt: string | null }[]> {
  if (!supabase) return ALL_PRODUCTS.map((p) => ({ id: p.id, updatedAt: null }));
  const { data, error } = await supabase
    .from("products")
    .select("id,updated_at")
    .eq("status", "published")
    .is("deleted_at", null)
    .limit(5000);
  if (error || !data) return ALL_PRODUCTS.map((p) => ({ id: p.id, updatedAt: null }));
  return (data as { id: string; updated_at: string | null }[]).map((r) => ({ id: r.id, updatedAt: r.updated_at }));
}

const CATEGORY_SEARCH_LABEL: Record<string, string> = {
  iphone: "iphone айфон", ipad: "ipad айпад", mac: "mac macbook мак макбук",
  watch: "apple watch часы вотч", airpods: "airpods наушники эирподс",
  accessories: "аксессуары", used: "бу б/у",
};

/** Строка для матчинга товара по запросу (все значимые поля). */
function searchHaystack(p: Product): string {
  return [p.title, p.model, p.color, p.memory, p.sim, p.condition, CATEGORY_SEARCH_LABEL[p.categorySlug]]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * Поиск по каталогу. Каталог небольшой — тянем опубликованные товары и
 * фильтруем по вхождению ВСЕХ слов запроса (без зависимости от экранирования
 * пользовательского ввода в PostgREST). Сортировка: совпадение в начале title → выше.
 */
export async function searchProducts(query: string): Promise<Product[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);

  let pool: Product[];
  if (!supabase) {
    pool = ALL_PRODUCTS;
  } else {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("status", "published")
      .is("deleted_at", null)
      .limit(1000);
    pool = error || !data ? ALL_PRODUCTS : (data as ProductRow[]).map(rowToProduct);
  }

  const allow = supabase ? await getAllowZeroStock() : true;
  const matched = hideZeroStock(
    pool.filter((p) => {
      const hay = searchHaystack(p);
      return terms.every((t) => hay.includes(t));
    }),
    allow
  );

  return matched.sort((a, b) => {
    const at = a.title.toLowerCase();
    const bt = b.title.toLowerCase();
    const aStarts = at.startsWith(q) ? 0 : at.includes(q) ? 1 : 2;
    const bStarts = bt.startsWith(q) ? 0 : bt.includes(q) ? 1 : 2;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return b.priceCash - a.priceCash;
  });
}

export async function getVariantsForProduct(product: Product): Promise<{
  colors: Product[];
  memories: Product[];
}> {
  // Только явная группа «Связанные товары» (собирается вручную в админке).
  // Никакого авто-объединения по model — иначе товары без model слипаются.
  if (!product.variantGroupId) return { colors: [], memories: [] };
  if (!supabase) return mockVariants(product);
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("variant_group_id", product.variantGroupId);
  if (error || !data || data.length === 0) return { colors: [], memories: [] };
  const siblings = (data as ProductRow[]).map(rowToProduct);
  return {
    colors: siblings.filter((p) => p.memory === product.memory),
    memories: siblings.filter((p) => p.color === product.color),
  };
}

// --- mock fallbacks (mirror original behaviour) ---

function mockByCategory(slug: CategorySlug): Product[] {
  if (slug === "used") return ALL_PRODUCTS.filter((p) => p.isUsed);
  return ALL_PRODUCTS.filter((p) => p.categorySlug === slug);
}

function mockRelated(product: Product, limit: number): Product[] {
  return ALL_PRODUCTS.filter(
    (p) => p.id !== product.id && p.categorySlug === product.categorySlug
  ).slice(0, limit);
}

function mockVariants(product: Product): {
  colors: Product[];
  memories: Product[];
} {
  return {
    colors: ALL_PRODUCTS.filter(
      (p) => p.model === product.model && p.memory === product.memory
    ),
    memories: ALL_PRODUCTS.filter(
      (p) => p.model === product.model && p.color === product.color
    ),
  };
}
