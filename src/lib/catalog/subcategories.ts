import { ALL_PRODUCTS, type CategorySlug } from "@/lib/data/products";

export type SubcategoryEntry = { label: string; count: number };

/**
 * Precomputed { category → list of (model, count) } map, derived from the
 * product catalog. Adding a new product with a new model immediately makes
 * that model available as a subcategory.
 */
export const CATEGORY_SUBCATEGORIES: Partial<
  Record<CategorySlug, SubcategoryEntry[]>
> = (() => {
  const buckets = new Map<CategorySlug, Map<string, number>>();
  for (const p of ALL_PRODUCTS) {
    let m = buckets.get(p.categorySlug);
    if (!m) {
      m = new Map();
      buckets.set(p.categorySlug, m);
    }
    m.set(p.model, (m.get(p.model) ?? 0) + 1);
  }
  const result: Partial<Record<CategorySlug, SubcategoryEntry[]>> = {};
  for (const [slug, m] of buckets) {
    result[slug] = [...m.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }
  return result;
})();

export function getSubcategoriesFor(slug: CategorySlug): SubcategoryEntry[] {
  return CATEGORY_SUBCATEGORIES[slug] ?? [];
}

export function subcategoryHref(
  slug: CategorySlug,
  label: string
): string {
  return `/category/${slug}?model=${encodeURIComponent(label)}`;
}
