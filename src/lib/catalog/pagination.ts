export const CATALOG_PAGE_SIZE = 12;

export type RouteSearchParams = Record<
  string,
  string | string[] | undefined
>;

const CATALOG_VIEW_PARAMS = new Set([
  "model",
  "memory",
  "color",
  "sim",
  "condition",
  "min",
  "max",
  "battery",
  "sort",
]);

export function parsePageNumber(raw: string): number | null {
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const page = Number(raw);
  return Number.isSafeInteger(page) ? page : null;
}

export function pagePath(basePath: string, page: number): string {
  const normalizedBase = basePath === "/" ? "/" : basePath.replace(/\/+$/, "");
  if (page <= 1) return normalizedBase;
  return normalizedBase === "/"
    ? `/page/${page}`
    : `${normalizedBase}/page/${page}`;
}

export function totalPages(total: number, pageSize = CATALOG_PAGE_SIZE): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  if (!Number.isSafeInteger(pageSize) || pageSize <= 0) {
    throw new RangeError("pageSize must be a positive integer");
  }
  return Math.ceil(total / pageSize);
}

export function slicePage<T>(
  items: readonly T[],
  page: number,
  pageSize = CATALOG_PAGE_SIZE
): T[] {
  if (!Number.isSafeInteger(page) || page < 1) return [];
  if (!Number.isSafeInteger(pageSize) || pageSize <= 0) {
    throw new RangeError("pageSize must be a positive integer");
  }
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function hasCatalogViewParams(searchParams: RouteSearchParams): boolean {
  return Object.keys(searchParams).some((key) => CATALOG_VIEW_PARAMS.has(key));
}

export function searchParamsString(searchParams: RouteSearchParams): string {
  const result = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) result.append(key, item);
    } else if (value !== undefined) {
      result.set(key, value);
    }
  }
  return result.toString();
}
