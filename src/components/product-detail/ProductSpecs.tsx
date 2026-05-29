import * as React from "react";
import type { ProductSpec } from "@/lib/data/products";

type Props = { specs: ProductSpec[] };

export function ProductSpecs({ specs }: Props) {
  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-semibold tracking-[-0.02em] text-ink mb-8 md:mb-10">
        Характеристики
      </h2>
      <dl className="grid gap-x-12 gap-y-0 md:grid-cols-2 max-w-4xl">
        {specs.map((s) => (
          <div
            key={s.label}
            className="flex justify-between items-baseline gap-6 py-4 border-b border-dashed border-border/70"
          >
            <dt className="text-sm text-ink-muted shrink-0">{s.label}</dt>
            <dd className="text-sm md:text-[15px] text-ink font-medium text-right">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
