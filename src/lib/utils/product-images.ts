import type { Product } from "@/lib/data/products";

/**
 * Единый список фотографий товара для витрины: главное фото + галерея,
 * без дублей и пустых значений, порядок сохраняется (главное всегда первым).
 *
 * Галерея в БД хранится как «доп. фото» (без главного), но функция устойчива
 * и к старым данным, где главное продублировано в gallery[0] — дубли убираются.
 */
export function productImages(product: Pick<Product, "image" | "gallery">): string[] {
  const all = [product.image, ...(product.gallery ?? [])].filter(
    (s): s is string => typeof s === "string" && s.length > 0
  );
  const seen = new Set<string>();
  const unique = all.filter((s) => (seen.has(s) ? false : (seen.add(s), true)));
  return unique.length > 0 ? unique : product.image ? [product.image] : [];
}
