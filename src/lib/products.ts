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
import { cache } from "react";

// Каталог передаётся в Client Component целиком ради локальных фильтров.
// Не сериализуем тяжёлые SEO-тексты, specs/highlights и служебные поля: карточке,
// фильтрам и добавлению в корзину достаточно этого набора.
const CATALOG_PRODUCT_SELECT = [
  "id", "title", "category_slug", "model", "color", "memory", "sim",
  "image", "gallery", "price_cash", "price_card", "price_old",
  "installment_from", "installment_partner", "badge", "badges", "options",
  "condition", "condition_text", "battery", "is_used", "is_new",
  "in_stock", "stock", "is_available", "sku", "brand",
].join(",");

/**
 * Data access layer — components MUST consume these getters, not the mock
 * arrays directly. Reads from Supabase when configured; on any error or when
 * env vars are missing, falls back to the mock data so the app always works.
 * The mock data (src/lib/data/products.ts) remains the source of truth for seeding.
 */

/**
 * Разрешена ли продажа/показ товаров с нулевым остатком (shop_settings.product_availability).
 * Без Supabase локальные mock-данные доступны. При ошибке production-чтения
 * действуем fail-closed и не разрешаем заказывать явный нулевой остаток.
 */
export const getAllowZeroStock = cache(async (): Promise<boolean> => {
  if (!supabase) return true;
  const { data, error } = await supabase.from("shop_settings").select("value").eq("key", "product_availability").maybeSingle();
  if (error || !data) return false;
  const v = data?.value as { allow_zero_stock?: boolean } | null;
  return v?.allow_zero_stock !== false;
});

/** Скрывает товары с явным нулевым остатком, если показ запрещён. null/undefined остаток = «уточняйте» → видим. */
function hideZeroStock(products: Product[], allow: boolean): Product[] {
  if (allow) return products;
  return products.filter((p) => p.stock == null || p.stock > 0);
}

export const getCategories = cache(async (): Promise<Category[]> => {
  if (!supabase) return CATEGORIES;
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_published", true)
    .order("sort", { ascending: true });
  if (error) throw error;
  if (!data) throw new Error("Не удалось загрузить категории");
  return (data as CategoryRow[]).map(rowToCategory);
});

export async function getFeaturedIphones(): Promise<Product[]> {
  if (!supabase) return FEATURED_IPHONES;
  const { data, error } = await supabase
    .from("products")
    .select(CATALOG_PRODUCT_SELECT)
    .eq("category_slug", "iphone")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("sort", { ascending: true })
    .limit(8);
  if (error) throw error;
  if (!data) throw new Error("Не удалось загрузить товары iPhone");
  return hideZeroStock((data as unknown as ProductRow[]).map(rowToProduct), await getAllowZeroStock());
}

export async function getFeaturedCatalog(): Promise<Product[]> {
  if (!supabase) return FEATURED_CATALOG;
  const { data, error } = await supabase
    .from("products")
    .select(CATALOG_PRODUCT_SELECT)
    .in("category_slug", ["ipad", "mac", "watch"])
    .eq("status", "published")
    .is("deleted_at", null)
    .order("sort", { ascending: true })
    .limit(8);
  if (error) throw error;
  if (!data) throw new Error("Не удалось загрузить каталог");
  return hideZeroStock((data as unknown as ProductRow[]).map(rowToProduct), await getAllowZeroStock());
}

export async function getUsedProducts(): Promise<Product[]> {
  if (!supabase) return USED_IPHONES;
  const { data, error } = await supabase
    .from("products")
    .select(CATALOG_PRODUCT_SELECT)
    .eq("is_used", true)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("sort", { ascending: true });
  if (error) throw error;
  if (!data) throw new Error("Не удалось загрузить Б/У товары");
  return hideZeroStock((data as unknown as ProductRow[]).map(rowToProduct), await getAllowZeroStock());
}

export async function getHeroProduct(): Promise<Product> {
  const iphones = await getFeaturedIphones();
  if (iphones[0]) return iphones[0];
  if (!supabase) return FEATURED_IPHONES[3];
  throw new Error("Нет опубликованного hero-товара");
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
  const { data: usedData, error: usedError } = await supabase
    .from("products")
    .select("category_slug")
    .eq("status", "published")
    .is("deleted_at", null)
    .eq("type", "used")
    .limit(10000);
  // Частичный результат опаснее отсутствующего: sitemap воспримет пропущенные
  // категории как пустые. При любой ошибке отдаём исключение, а вызывающий код
  // сохраняет текущую индексную политику.
  if (error) throw error;
  if (usedError) throw usedError;
  if (!data || !usedData) throw new Error("Не удалось получить полный счётчик категорий");
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
    base = supabase.from("products").select(CATALOG_PRODUCT_SELECT).eq("is_used", true);
  } else {
    // Двухуровневый каталог: для родительской категории собираем товары всех её серий.
    const { data: children, error: childrenError } = await supabase
      .from("categories")
      .select("slug")
      .eq("parent_slug", slug)
      .eq("is_published", true);
    if (childrenError) throw childrenError;
    if (!children) throw new Error(`Не удалось загрузить дочерние категории ${slug}`);
    const childSlugs = children.map((c) => c.slug as string);
    base = childSlugs.length > 0
      ? supabase.from("products").select(CATALOG_PRODUCT_SELECT).in("category_slug", [slug, ...childSlugs])
      : supabase.from("products").select(CATALOG_PRODUCT_SELECT).eq("category_slug", slug);
  }
  const { data, error } = await base
    .eq("status", "published")
    .is("deleted_at", null)
    .order("sort", { ascending: true });
  if (error) throw error;
  if (!data) throw new Error(`Не удалось загрузить категорию ${slug}`);
  return hideZeroStock((data as unknown as ProductRow[]).map(rowToProduct), await getAllowZeroStock());
}

export const getProductById = cache(async (id: string): Promise<Product | undefined> => {
  if (!supabase) return ALL_PRODUCTS.find((p) => p.id === id);
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();
  // Ошибка БД не должна превращаться в ложную карточку из mock-каталога или
  // SEO-404. Пусть Next вернёт временную серверную ошибку, а не неверный 200.
  if (error) throw error;
  return data ? rowToProduct(data as ProductRow) : undefined;
});

/**
 * Количество опубликованных товаров, доступных по маршруту категории.
 * `null` означает ошибку чтения: в этом случае нельзя автоматически ставить
 * noindex, чтобы временный сбой БД не изменил индексную политику страницы.
 */
export async function getCategoryProductCount(slug: string): Promise<number | null> {
  if (!supabase) return mockByCategory(slug as CategorySlug).length;

  if (slug === "used") {
    const { count, error } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_used", true)
      .eq("status", "published")
      .is("deleted_at", null);
    return error ? null : (count ?? 0);
  }

  const { data: children, error: childrenError } = await supabase
    .from("categories")
    .select("slug")
    .eq("parent_slug", slug)
    .eq("is_published", true);
  if (childrenError) return null;

  const slugs = [slug, ...(children ?? []).map((c) => c.slug as string)];
  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .in("category_slug", slugs)
    .eq("status", "published")
    .is("deleted_at", null);
  return error ? null : (count ?? 0);
}

export async function getRelatedProducts(
  product: Product,
  limit = 8
): Promise<Product[]> {
  if (!supabase) return mockRelated(product, limit);

  // Только явно выбранные в админке сопутствующие товары (без авто-подбора).
  const ids = product.relatedProductIds ?? [];
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("products")
    .select(CATALOG_PRODUCT_SELECT)
    .in("id", ids)
    .eq("status", "published")
    .is("deleted_at", null);
  if (error) throw error;
  if (!data) throw new Error("Не удалось загрузить сопутствующие товары");
  const byId = new Map((data as unknown as ProductRow[]).map((r) => [r.id, rowToProduct(r)]));
  const ordered = ids.map((id) => byId.get(id)).filter((p): p is Product => !!p);
  return hideZeroStock(ordered, await getAllowZeroStock()).slice(0, limit);
}

export async function getNewProducts(): Promise<Product[]> {
  if (!supabase) return ALL_PRODUCTS.filter((p) => p.isNew);
  const { data, error } = await supabase
    .from("products")
    .select(CATALOG_PRODUCT_SELECT)
    .eq("is_new", true)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("sort", { ascending: true });
  if (error) throw error;
  if (!data) throw new Error("Не удалось загрузить новинки");
  return hideZeroStock((data as unknown as ProductRow[]).map(rowToProduct), await getAllowZeroStock());
}

/** Лёгкий список опубликованных товаров для sitemap. */
export async function getSitemapProducts(): Promise<{ id: string; image: string | null }[]> {
  if (!supabase) return ALL_PRODUCTS.map((p) => ({ id: p.id, image: p.image ?? null }));
  const { data, error } = await supabase
    .from("products")
    .select("id,image,is_indexable")
    .eq("status", "published")
    .is("deleted_at", null)
    .limit(5000);
  if (error) throw error;
  if (!data) throw new Error("Не удалось загрузить товары для sitemap");
  // Не включаем в sitemap товары с robots:noindex (is_indexable=false) — иначе конфликт с карточкой.
  return (data as { id: string; image: string | null; is_indexable: boolean | null }[])
    .filter((r) => r.is_indexable !== false)
    .map((r) => ({ id: r.id, image: r.image ?? null }));
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
      .select(CATALOG_PRODUCT_SELECT)
      .eq("status", "published")
      .is("deleted_at", null)
      .limit(1000);
    if (error) throw error;
    if (!data) throw new Error("Не удалось выполнить поиск по каталогу");
    pool = (data as unknown as ProductRow[]).map(rowToProduct);
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
  sims: Product[];
}> {
  // Только явная группа «Связанные товары» (собирается вручную в админке).
  // Никакого авто-объединения по model — иначе товары без model слипаются.
  if (!product.variantGroupId) return { colors: [], memories: [], sims: [] };
  if (!supabase) return mockVariants(product);
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("variant_group_id", product.variantGroupId)
    .eq("status", "published")
    .is("deleted_at", null);
  if (error) throw error;
  if (!data || data.length === 0) return { colors: [], memories: [], sims: [] };
  const siblings = hideZeroStock((data as ProductRow[]).map(rowToProduct), await getAllowZeroStock());
  // Оси выбора независимы: фиксируем две координаты, варьируем третью —
  // переключение цвета сохраняет память и SIM и т.д. SIM-переключатель
  // на витрине скрыт, если в группе один вариант SIM (старые модели/Б/У).
  return {
    colors: siblings.filter((p) => p.memory === product.memory && p.sim === product.sim),
    memories: siblings.filter((p) => p.color === product.color && p.sim === product.sim),
    sims: siblings.filter((p) => p.color === product.color && p.memory === product.memory),
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
  sims: Product[];
} {
  return {
    colors: ALL_PRODUCTS.filter(
      (p) => p.model === product.model && p.memory === product.memory && p.sim === product.sim
    ),
    memories: ALL_PRODUCTS.filter(
      (p) => p.model === product.model && p.color === product.color && p.sim === product.sim
    ),
    sims: ALL_PRODUCTS.filter(
      (p) => p.model === product.model && p.color === product.color && p.memory === product.memory
    ),
  };
}
