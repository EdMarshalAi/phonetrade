"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Select } from "@/components/admin/form";

/** Обновляет один search-param и сбрасывает страницу на 1. */
function useSetParam() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (!("page" in patch)) next.delete("page");
      router.push(`${pathname}?${next.toString()}`);
    },
    [router, pathname, params]
  );
}

/** Поиск с debounce (URL-параметр q). */
export function SearchBox({ placeholder = "Поиск…" }: { placeholder?: string }) {
  const params = useSearchParams();
  const setParam = useSetParam();
  const [value, setValue] = React.useState(params.get("q") ?? "");
  const first = React.useRef(true);

  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => setParam({ q: value || null }), 350);
    return () => clearTimeout(t);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" strokeWidth={1.75} />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-sm border border-border bg-white pl-9 pr-3 text-[14px] text-ink placeholder:text-ink-subtle focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15"
      />
    </div>
  );
}

/** Селект-фильтр (URL-параметр). */
export function FilterSelect({
  param,
  options,
  allLabel = "Все",
}: {
  param: string;
  options: { value: string; label: string }[];
  allLabel?: string;
}) {
  const params = useSearchParams();
  const setParam = useSetParam();
  const current = params.get(param) ?? "";
  return (
    <Select
      className="w-48"
      value={current}
      onChange={(e) => setParam({ [param]: e.target.value || null })}
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

/** Фильтр категория + зависимая подкатегория (URL: category, subcategory). */
export function CategoryFilter({
  tree,
}: {
  tree: { slug: string; title: string; children: { slug: string; title: string }[] }[];
}) {
  const params = useSearchParams();
  const setParam = useSetParam();
  const cat = params.get("category") ?? "";
  const sub = params.get("subcategory") ?? "";
  const children = tree.find((t) => t.slug === cat)?.children ?? [];
  return (
    <>
      <Select
        className="w-48"
        value={cat}
        onChange={(e) => setParam({ category: e.target.value || null, subcategory: null })}
      >
        <option value="">Все категории</option>
        {tree.map((t) => (
          <option key={t.slug} value={t.slug}>{t.title}</option>
        ))}
      </Select>
      {children.length > 0 ? (
        <Select
          className="w-48"
          value={sub}
          onChange={(e) => setParam({ subcategory: e.target.value || null })}
        >
          <option value="">Все подкатегории</option>
          {children.map((c) => (
            <option key={c.slug} value={c.slug}>{c.title}</option>
          ))}
        </Select>
      ) : null}
    </>
  );
}

/** Пагинация по URL-параметру page. */
export function Pagination({ page, pages }: { page: number; pages: number }) {
  const setParam = useSetParam();
  if (pages <= 1) return null;
  const go = (p: number) => setParam({ page: String(p) });
  return (
    <div className="flex items-center justify-between gap-3 pt-1 text-[13px] text-ink-muted">
      <span>
        Стр. {page} из {pages}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          className={cn("flex h-8 items-center gap-1 rounded-sm border border-border bg-white px-2.5 hover:bg-surface disabled:opacity-40")}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} /> Назад
        </button>
        <button
          onClick={() => go(page + 1)}
          disabled={page >= pages}
          className={cn("flex h-8 items-center gap-1 rounded-sm border border-border bg-white px-2.5 hover:bg-surface disabled:opacity-40")}
        >
          Вперёд <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
