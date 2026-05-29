import type { Product } from "@/lib/data/products";
import type { FilterFacet, SortKey } from "./category-config";

export type FacetOption = {
  value: string;
  count: number;
};

export type FacetOptions = Partial<Record<FilterFacet, FacetOption[]>> & {
  priceMin: number;
  priceMax: number;
  batteryMin: number;
  batteryMax: number;
};

export type CatalogFilters = {
  model: string[];
  memory: string[];
  color: string[];
  sim: string[];
  condition: string[];
  priceMin?: number;
  priceMax?: number;
  batteryMin?: number;
};

const facetReader: Record<FilterFacet, (p: Product) => string | undefined> = {
  model: (p) => p.model,
  memory: (p) => p.memory,
  color: (p) => p.color,
  sim: (p) => p.sim,
  condition: (p) => p.condition,
  battery: (p) =>
    typeof p.battery === "number" ? String(p.battery) : undefined,
};

/**
 * Extract available filter options + count of products matching each value.
 * Drives the FilterDrawer UI dynamically — adding a new product with a new
 * color/model/memory/sim immediately makes that value selectable.
 */
export function extractFacetOptions(
  products: Product[],
  facets: FilterFacet[]
): FacetOptions {
  const result: Partial<Record<FilterFacet, FacetOption[]>> = {};

  for (const facet of facets) {
    if (facet === "battery") continue; // battery is a numeric range, not a list
    const counts = new Map<string, number>();
    const read = facetReader[facet];
    for (const p of products) {
      const v = read(p);
      if (!v) continue;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    result[facet] = [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }

  const prices = products.map((p) => p.priceCash).filter((n) => n > 0);
  const batteries = products
    .map((p) => p.battery)
    .filter((n): n is number => typeof n === "number");

  return {
    ...result,
    priceMin: prices.length ? Math.min(...prices) : 0,
    priceMax: prices.length ? Math.max(...prices) : 0,
    batteryMin: batteries.length ? Math.min(...batteries) : 0,
    batteryMax: batteries.length ? Math.max(...batteries) : 100,
  };
}

export function applyFilters(
  products: Product[],
  f: CatalogFilters
): Product[] {
  return products.filter((p) => {
    if (f.model.length && !f.model.includes(p.model)) return false;
    if (f.memory.length && (!p.memory || !f.memory.includes(p.memory)))
      return false;
    if (f.color.length && !f.color.includes(p.color)) return false;
    if (f.sim.length && (!p.sim || !f.sim.includes(p.sim))) return false;
    if (
      f.condition.length &&
      (!p.condition || !f.condition.includes(p.condition))
    )
      return false;
    if (typeof f.priceMin === "number" && p.priceCash < f.priceMin) return false;
    if (typeof f.priceMax === "number" && p.priceCash > f.priceMax) return false;
    if (
      typeof f.batteryMin === "number" &&
      (typeof p.battery !== "number" || p.battery < f.batteryMin)
    )
      return false;
    return true;
  });
}

export function applySort(products: Product[], sort: SortKey): Product[] {
  const arr = [...products];
  switch (sort) {
    case "price-asc":
      return arr.sort((a, b) => a.priceCash - b.priceCash);
    case "price-desc":
      return arr.sort((a, b) => b.priceCash - a.priceCash);
    case "new":
      return arr.sort((a, b) => Number(b.isNew ?? 0) - Number(a.isNew ?? 0));
    case "battery-desc":
      return arr.sort((a, b) => (b.battery ?? 0) - (a.battery ?? 0));
    case "popular":
    default:
      // Без реального трафика — показываем в порядке: новинки сначала, потом в наличии, потом по убыванию цены
      return arr.sort((a, b) => {
        const newDiff = Number(b.isNew ?? 0) - Number(a.isNew ?? 0);
        if (newDiff) return newDiff;
        const stockDiff = Number(b.inStock ?? 0) - Number(a.inStock ?? 0);
        if (stockDiff) return stockDiff;
        return b.priceCash - a.priceCash;
      });
  }
}

export const EMPTY_FILTERS: CatalogFilters = {
  model: [],
  memory: [],
  color: [],
  sim: [],
  condition: [],
};

export function countActiveFilters(f: CatalogFilters): number {
  return (
    f.model.length +
    f.memory.length +
    f.color.length +
    f.sim.length +
    f.condition.length +
    (typeof f.priceMin === "number" ? 1 : 0) +
    (typeof f.priceMax === "number" ? 1 : 0) +
    (typeof f.batteryMin === "number" ? 1 : 0)
  );
}
