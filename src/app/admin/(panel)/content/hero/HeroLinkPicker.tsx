"use client";

import * as React from "react";
import { Select, TextInput } from "@/components/admin/form";
import { cn } from "@/lib/utils/cn";

export type PickerCategory = { slug: string; title: string; parentSlug: string | null };
export type PickerProduct = { id: string; title: string; categorySlug: string | null };

type Mode = "category" | "product" | "custom";

function modeOf(value: string): Mode {
  if (value.startsWith("/category/")) return "category";
  if (value.startsWith("/product/")) return "product";
  return "custom";
}

/**
 * Пошаговый выбор ссылки для кнопки слайда: категория → подкатегория, товар
 * (с фильтром по категории) или произвольный URL. Результат пишется в одно
 * строковое поле (/category/…, /product/…, либо произвольный текст).
 */
export function HeroLinkPicker({
  value,
  onChange,
  categories,
  products,
}: {
  value: string;
  onChange: (v: string) => void;
  categories: PickerCategory[];
  products: PickerProduct[];
}) {
  const [mode, setMode] = React.useState<Mode>(() => modeOf(value));

  const parents = React.useMemo(() => categories.filter((c) => !c.parentSlug), [categories]);
  const childrenOf = React.useCallback(
    (parentSlug: string) => categories.filter((c) => c.parentSlug === parentSlug),
    [categories]
  );
  const bySlug = React.useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories]);

  // Текущее состояние «категория»: определяем родителя и подкатегорию из value.
  const currentCatSlug = value.startsWith("/category/") ? value.slice("/category/".length) : "";
  const currentCat = bySlug.get(currentCatSlug);
  const parentSlug = currentCat ? (currentCat.parentSlug ?? currentCat.slug) : "";
  const childSlug = currentCat && currentCat.parentSlug ? currentCat.slug : "";

  // Текущий товар.
  const currentProductId = value.startsWith("/product/") ? value.slice("/product/".length) : "";
  const currentProduct = products.find((p) => p.id === currentProductId);
  const [prodCat, setProdCat] = React.useState<string>(currentProduct?.categorySlug ?? "");
  const productList = React.useMemo(
    () => (prodCat ? products.filter((p) => p.categorySlug === prodCat) : products),
    [products, prodCat]
  );

  const TABS: { key: Mode; label: string }[] = [
    { key: "category", label: "Категория" },
    { key: "product", label: "Товар" },
    { key: "custom", label: "Своя ссылка" },
  ];

  return (
    <div className="rounded-md border border-border bg-surface/40 p-3">
      <div className="mb-3 inline-flex rounded-md border border-border bg-white p-0.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setMode(t.key)}
            className={cn(
              "h-8 rounded-[5px] px-3 text-[13px] font-medium transition-colors",
              mode === t.key ? "bg-ink text-white" : "text-ink-muted hover:text-ink"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mode === "category" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Select
            value={parentSlug}
            onChange={(e) => {
              const slug = e.target.value;
              onChange(slug ? `/category/${slug}` : "");
            }}
          >
            <option value="">— Категория —</option>
            {parents.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </Select>
          <Select
            value={childSlug}
            disabled={!parentSlug || childrenOf(parentSlug).length === 0}
            onChange={(e) => {
              const slug = e.target.value || parentSlug;
              onChange(slug ? `/category/${slug}` : "");
            }}
          >
            <option value="">
              {parentSlug && childrenOf(parentSlug).length > 0 ? "Вся категория" : "— Подкатегория —"}
            </option>
            {parentSlug &&
              childrenOf(parentSlug).map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.title}
                </option>
              ))}
          </Select>
        </div>
      )}

      {mode === "product" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Select value={prodCat} onChange={(e) => setProdCat(e.target.value)}>
            <option value="">Все категории</option>
            {parents.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </Select>
          <Select value={currentProductId} onChange={(e) => onChange(e.target.value ? `/product/${e.target.value}` : "")}>
            <option value="">— Выберите товар —</option>
            {productList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
        </div>
      )}

      {mode === "custom" && (
        <TextInput
          placeholder="https://… или /new, /used, /trade-in"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      <p className="mt-2 text-[12px] text-ink-muted">
        Ссылка: <span className="font-mono text-ink">{value || "—"}</span>
      </p>
    </div>
  );
}
