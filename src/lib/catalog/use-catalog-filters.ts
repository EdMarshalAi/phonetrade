"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  EMPTY_FILTERS,
  type CatalogFilters,
} from "@/lib/catalog/filters";
import type { SortKey } from "@/lib/catalog/category-config";

const SPLIT = ",";

function readList(sp: URLSearchParams, key: string): string[] {
  const v = sp.get(key);
  return v ? v.split(SPLIT).filter(Boolean) : [];
}

function readNum(sp: URLSearchParams, key: string): number | undefined {
  const v = sp.get(key);
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export function parseFilters(sp: URLSearchParams): CatalogFilters {
  return {
    model: readList(sp, "model"),
    memory: readList(sp, "memory"),
    color: readList(sp, "color"),
    sim: readList(sp, "sim"),
    condition: readList(sp, "condition"),
    priceMin: readNum(sp, "min"),
    priceMax: readNum(sp, "max"),
    batteryMin: readNum(sp, "battery"),
  };
}

export function parseSort(sp: URLSearchParams): SortKey {
  const v = sp.get("sort");
  if (
    v === "price-asc" ||
    v === "price-desc" ||
    v === "new" ||
    v === "battery-desc" ||
    v === "popular"
  )
    return v;
  return "popular";
}

function writeFiltersToParams(
  current: URLSearchParams,
  next: CatalogFilters
): URLSearchParams {
  const sp = new URLSearchParams(current);
  const set = (k: string, v: string | undefined | string[]) => {
    if (Array.isArray(v)) {
      if (v.length) sp.set(k, v.join(SPLIT));
      else sp.delete(k);
    } else if (v === undefined || v === "" || v === null) sp.delete(k);
    else sp.set(k, v);
  };
  set("model", next.model);
  set("memory", next.memory);
  set("color", next.color);
  set("sim", next.sim);
  set("condition", next.condition);
  set(
    "min",
    typeof next.priceMin === "number" ? String(next.priceMin) : undefined
  );
  set(
    "max",
    typeof next.priceMax === "number" ? String(next.priceMax) : undefined
  );
  set(
    "battery",
    typeof next.batteryMin === "number" ? String(next.batteryMin) : undefined
  );
  // Strip any stale page param — pagination is local component state now.
  sp.delete("page");
  return sp;
}

export function useCatalogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = React.useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );
  const sort = React.useMemo(
    () => parseSort(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const replaceUrl = React.useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname]
  );

  const setFilters = React.useCallback(
    (next: CatalogFilters) => {
      const sp = writeFiltersToParams(
        new URLSearchParams(searchParams.toString()),
        next
      );
      replaceUrl(sp);
    },
    [searchParams, replaceUrl]
  );

  const setSort = React.useCallback(
    (next: SortKey) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (next === "popular") sp.delete("sort");
      else sp.set("sort", next);
      sp.delete("page");
      replaceUrl(sp);
    },
    [searchParams, replaceUrl]
  );

  const toggleValue = React.useCallback(
    (facet: keyof CatalogFilters, value: string) => {
      if (
        facet === "priceMin" ||
        facet === "priceMax" ||
        facet === "batteryMin"
      )
        return;
      const list = filters[facet] as string[];
      const next: CatalogFilters = {
        ...filters,
        [facet]: list.includes(value)
          ? list.filter((v) => v !== value)
          : [...list, value],
      };
      setFilters(next);
    },
    [filters, setFilters]
  );

  const reset = React.useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, [setFilters]);

  return {
    filters,
    sort,
    setFilters,
    setSort,
    toggleValue,
    reset,
  };
}
