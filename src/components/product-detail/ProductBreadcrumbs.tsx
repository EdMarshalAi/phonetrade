import * as React from "react";
import { ChevronRight } from "lucide-react";
import { getCategoryConfig } from "@/lib/catalog/category-config";
import type { Product } from "@/lib/data/products";

type Props = { product: Product };

export function ProductBreadcrumbs({ product }: Props) {
  const cat = getCategoryConfig(product.categorySlug);
  return (
    <nav
      aria-label="Хлебные крошки"
      className="flex items-center flex-wrap gap-1.5 text-xs text-ink-subtle"
    >
      <a href="/" className="hover:text-ink transition-colors">
        Главная
      </a>
      <ChevronRight className="size-3.5" aria-hidden />
      <a href="/catalog" className="hover:text-ink transition-colors">
        Каталог
      </a>
      {cat && (
        <>
          <ChevronRight className="size-3.5" aria-hidden />
          <a
            href={`/category/${cat.slug}`}
            className="hover:text-ink transition-colors"
          >
            {cat.title}
          </a>
        </>
      )}
      {product.model && (
        <>
          <ChevronRight className="size-3.5" aria-hidden />
          <a
            href={`/category/${product.categorySlug}?model=${encodeURIComponent(product.model)}`}
            className="hover:text-ink transition-colors"
          >
            {product.model}
          </a>
        </>
      )}
    </nav>
  );
}
