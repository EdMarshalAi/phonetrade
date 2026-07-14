/** Единственный публичный URL для категорий и виртуальных коллекций. */
export function categoryPath(slug: string): string {
  return slug === "iphone-used" ? "/used" : `/category/${slug}`;
}
