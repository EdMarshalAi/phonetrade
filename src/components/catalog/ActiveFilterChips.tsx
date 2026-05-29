"use client";

import * as React from "react";
import { X } from "lucide-react";
import { FACET_LABELS } from "@/lib/catalog/category-config";
import type { CatalogFilters } from "@/lib/catalog/filters";

type Props = {
  filters: CatalogFilters;
  onToggle: (facet: keyof CatalogFilters, value: string) => void;
  onReset: () => void;
};

function chip(text: string, onRemove: () => void, key: string) {
  return (
    <li key={key}>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-full bg-white border border-border/60 text-[12px] text-ink hover:border-ink/30 transition-colors"
      >
        {text}
        <span className="inline-flex size-4 items-center justify-center rounded-full bg-surface text-ink-muted">
          <X className="size-3" aria-hidden />
        </span>
      </button>
    </li>
  );
}

export function ActiveFilterChips({ filters, onToggle, onReset }: Props) {
  const chips: React.ReactNode[] = [];

  (["model", "memory", "color", "sim", "condition"] as const).forEach((f) => {
    filters[f].forEach((v) => {
      chips.push(
        chip(`${FACET_LABELS[f]}: ${v}`, () => onToggle(f, v), `${f}-${v}`)
      );
    });
  });

  return (
    <ul className="flex flex-wrap items-center gap-2 mb-6">
      {chips}
      <li>
        <button
          type="button"
          onClick={onReset}
          className="text-[12px] text-ink-muted hover:text-ink underline-offset-2 hover:underline px-2"
        >
          Сбросить все
        </button>
      </li>
    </ul>
  );
}
