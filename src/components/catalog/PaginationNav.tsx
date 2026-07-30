"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pagePath } from "@/lib/catalog/pagination";
import { cn } from "@/lib/utils/cn";

type Props = {
  basePath: string;
  currentPage: number;
  totalPages: number;
};

type PageItem = number | "ellipsis-start" | "ellipsis-end";

function pageItems(currentPage: number, count: number): PageItem[] {
  if (count <= 20) {
    return Array.from({ length: count }, (_, index) => index + 1);
  }

  const pages = new Set([1, count]);
  for (
    let page = Math.max(2, currentPage - 2);
    page <= Math.min(count - 1, currentPage + 2);
    page++
  ) {
    pages.add(page);
  }

  const ordered = [...pages].sort((a, b) => a - b);
  const result: PageItem[] = [];
  ordered.forEach((page, index) => {
    const previous = ordered[index - 1];
    if (previous && page - previous > 1) {
      result.push(index === 1 ? "ellipsis-start" : "ellipsis-end");
    }
    result.push(page);
  });
  return result;
}

const linkClass =
  "inline-flex size-10 items-center justify-center rounded-full border border-border/70 bg-white text-sm font-medium text-ink transition-colors hover:border-ink/40 hover:bg-surface";

export function PaginationNav({
  basePath,
  currentPage,
  totalPages,
}: Props) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Страницы каталога"
      className="mt-8 flex flex-wrap items-center justify-center gap-2"
    >
      {currentPage > 1 ? (
        <Link
          href={pagePath(basePath, currentPage - 1)}
          rel="prev"
          prefetch={false}
          aria-label="Предыдущая страница"
          className={linkClass}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
      ) : null}

      {pageItems(currentPage, totalPages).map((item) =>
        typeof item === "number" ? (
          item === currentPage ? (
            <span
              key={item}
              aria-current="page"
              className="inline-flex size-10 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white"
            >
              {item}
            </span>
          ) : (
            <Link
              key={item}
              href={pagePath(basePath, item)}
              prefetch={false}
              aria-label={`Страница ${item}`}
              className={linkClass}
            >
              {item}
            </Link>
          )
        ) : (
          <span
            key={item}
            aria-hidden
            className="inline-flex size-8 items-center justify-center text-ink-subtle"
          >
            …
          </span>
        )
      )}

      {currentPage < totalPages ? (
        <Link
          href={pagePath(basePath, currentPage + 1)}
          rel="next"
          prefetch={false}
          aria-label="Следующая страница"
          className={cn(linkClass, "ml-0.5")}
        >
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </nav>
  );
}
