import type { Category, CategorySlug, Product, Sim } from "@/lib/data/products";

/** Строка таблицы public.products (snake_case). */
export type ProductRow = {
  id: string;
  title: string;
  category_slug: string;
  model: string;
  color: string;
  memory: string | null;
  sim: string | null;
  image: string;
  gallery: string[] | null;
  specs: Product["specs"] | null;
  description: Product["description"] | null;
  highlights: string[] | null;
  price_cash: number;
  price_card: number;
  badge: string | null;
  badges: string[] | null;
  options: Record<string, string> | null;
  condition: string | null;
  battery: number | null;
  is_used: boolean;
  is_new: boolean;
  rating: number | null;
  in_stock: boolean;
};

export type CategoryRow = {
  slug: string;
  id: string;
  title: string;
  image: string;
  subtitle: string | null;
};

export function rowToProduct(r: ProductRow): Product {
  return {
    id: r.id,
    title: r.title,
    categorySlug: r.category_slug as CategorySlug,
    model: r.model,
    color: r.color,
    memory: r.memory ?? undefined,
    sim: (r.sim as Sim | null) ?? undefined,
    image: r.image,
    gallery: r.gallery ?? undefined,
    specs: r.specs ?? undefined,
    description: r.description ?? undefined,
    highlights: r.highlights ?? undefined,
    priceCash: r.price_cash,
    priceCard: r.price_card,
    badge: r.badge ?? undefined,
    badges: Array.isArray(r.badges) ? r.badges : undefined,
    options: r.options ?? undefined,
    condition: r.condition ?? undefined,
    battery: r.battery ?? undefined,
    isUsed: r.is_used,
    isNew: r.is_new,
    rating: r.rating ?? undefined,
    inStock: r.in_stock,
  };
}

export function rowToCategory(r: CategoryRow): Category {
  return {
    id: r.id,
    slug: r.slug as CategorySlug,
    title: r.title,
    image: r.image,
    subtitle: r.subtitle ?? undefined,
  };
}

/** Бейджи: явные ключи или вывод из устаревших isNew/badge (для идемпотентного сида). */
function deriveBadges(p: Product): string[] {
  if (Array.isArray(p.badges)) return p.badges;
  const out: string[] = [];
  if (p.isNew) out.push("new");
  if (p.badge === "Без RuStore") out.push("no-rustore");
  else if (p.badge === "В наличии") out.push("in-stock");
  else if (p.badge === "Уточняйте наличие") out.push("check-availability");
  return out;
}

export function productToRow(p: Product, sort = 0): ProductRow & { sort: number } {
  return {
    id: p.id,
    title: p.title,
    category_slug: p.categorySlug,
    model: p.model,
    color: p.color,
    memory: p.memory ?? null,
    sim: p.sim ?? null,
    image: p.image,
    gallery: p.gallery ?? null,
    specs: p.specs ?? null,
    description: p.description ?? null,
    highlights: p.highlights ?? null,
    price_cash: p.priceCash,
    price_card: p.priceCard,
    badge: p.badge ?? null,
    badges: deriveBadges(p),
    options: p.options ?? {},
    condition: p.condition ?? null,
    battery: p.battery ?? null,
    is_used: p.isUsed ?? false,
    is_new: p.isNew ?? false,
    rating: p.rating ?? null,
    in_stock: p.inStock ?? true,
    sort,
  };
}

export function categoryToRow(c: Category, sort = 0): CategoryRow & { sort: number } {
  return {
    slug: c.slug,
    id: c.id,
    title: c.title,
    image: c.image,
    subtitle: c.subtitle ?? null,
    sort,
  };
}
