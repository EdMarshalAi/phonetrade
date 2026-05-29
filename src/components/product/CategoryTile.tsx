import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { cn } from "@/lib/utils/cn";
import type { Category } from "@/lib/data/products";

type Props = {
  category: Category;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function CategoryTile({ category, size = "md", className }: Props) {
  const heading =
    size === "lg"
      ? "text-3xl md:text-4xl"
      : size === "sm"
        ? "text-lg md:text-xl"
        : "text-2xl md:text-3xl";

  return (
    <a
      href={`/category/${category.slug}`}
      className={cn(
        "group relative flex flex-col justify-between rounded-3xl bg-white border border-border/60 overflow-hidden",
        "transition-all duration-300 ease-[var(--ease-apple)] hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)]",
        "min-h-[260px] md:min-h-[320px]",
        className
      )}
    >
      <div className="flex items-start justify-between p-6 md:p-7">
        <div>
          <h3
            className={cn(
              "font-semibold tracking-tight text-ink leading-tight",
              heading
            )}
          >
            {category.title}
          </h3>
          {category.subtitle && (
            <p className="mt-1.5 text-sm text-ink-muted max-w-[24ch]">
              {category.subtitle}
            </p>
          )}
        </div>
        <span
          className="size-9 shrink-0 rounded-full bg-surface flex items-center justify-center text-ink-muted transition-colors group-hover:bg-ink group-hover:text-white"
          aria-hidden
        >
          <ArrowUpRight className="size-4" />
        </span>
      </div>

      <div className="px-6 pb-6 md:px-7 md:pb-7">
        <div className="relative overflow-hidden rounded-2xl bg-surface">
          <div className="transition-transform duration-500 ease-[var(--ease-apple)] group-hover:scale-105">
            <ImagePlaceholder
              label={category.title}
              ratio={size === "lg" ? "video" : "square"}
              className="bg-transparent from-transparent to-transparent"
            />
          </div>
        </div>
      </div>
    </a>
  );
}
