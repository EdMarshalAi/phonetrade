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

export async function getCategories(): Promise<Category[]> {
  if (!supabase) return CATEGORIES;
  const { data, error } = await supabase
    .from("categories")
    .select("*")
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
  return (data as ProductRow[]).map(rowToProduct);
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
  return (data as ProductRow[]).map(rowToProduct);
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
  return (data as ProductRow[]).map(rowToProduct);
}

export async function getHeroProduct(): Promise<Product> {
  const iphones = await getFeaturedIphones();
  return iphones[0] ?? FEATURED_IPHONES[3];
}

export async function getProductsByCategory(
  slug: CategorySlug
): Promise<Product[]> {
  if (!supabase) return mockByCategory(slug);
  const base =
    slug === "used"
      ? supabase.from("products").select("*").eq("is_used", true)
      : supabase.from("products").select("*").eq("category_slug", slug);
  const { data, error } = await base
    .eq("status", "published")
    .is("deleted_at", null)
    .order("sort", { ascending: true });
  if (error || !data) return mockByCategory(slug);
  return (data as ProductRow[]).map(rowToProduct);
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

export async function getVariantsForProduct(product: Product): Promise<{
  colors: Product[];
  memories: Product[];
}> {
  if (!supabase) return mockVariants(product);
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("model", product.model);
  if (error || !data || data.length === 0) return mockVariants(product);
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
