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

/**
 * Data access layer — components MUST consume these getters, not the mock
 * arrays directly. Switching to Supabase later will only touch this file.
 */

export async function getCategories(): Promise<Category[]> {
  return CATEGORIES;
}

export async function getFeaturedIphones(): Promise<Product[]> {
  return FEATURED_IPHONES;
}

export async function getFeaturedCatalog(): Promise<Product[]> {
  return FEATURED_CATALOG;
}

export async function getUsedProducts(): Promise<Product[]> {
  return USED_IPHONES;
}

export async function getHeroProduct(): Promise<Product> {
  return FEATURED_IPHONES[3];
}

export async function getProductsByCategory(
  slug: CategorySlug
): Promise<Product[]> {
  if (slug === "used") {
    return ALL_PRODUCTS.filter((p) => p.isUsed);
  }
  return ALL_PRODUCTS.filter((p) => p.categorySlug === slug);
}

export async function getProductById(id: string): Promise<Product | undefined> {
  return ALL_PRODUCTS.find((p) => p.id === id);
}

export async function getRelatedProducts(
  product: Product,
  limit = 8
): Promise<Product[]> {
  return ALL_PRODUCTS.filter(
    (p) => p.id !== product.id && p.categorySlug === product.categorySlug
  ).slice(0, limit);
}

export async function getVariantsForProduct(product: Product): Promise<{
  colors: Product[];
  memories: Product[];
}> {
  const siblings = ALL_PRODUCTS.filter(
    (p) => p.model === product.model && p.id !== product.id
  );
  // Same memory, different colors
  const colors = ALL_PRODUCTS.filter(
    (p) => p.model === product.model && p.memory === product.memory
  );
  // Same color, different memory
  const memories = ALL_PRODUCTS.filter(
    (p) => p.model === product.model && p.color === product.color
  );
  void siblings;
  return { colors, memories };
}
