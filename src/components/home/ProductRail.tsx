import * as React from "react";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import {
  MotionItem,
  MotionReveal,
  MotionStagger,
} from "@/components/ui/MotionReveal";
import { cn } from "@/lib/utils/cn";
import type { Product } from "@/lib/data/products";

type Props = {
  title: string;
  href: string;
  products: Product[];
  bg?: "white" | "surface";
  eyebrow?: string;
};

export function ProductRail({
  title,
  href,
  products,
  bg = "white",
  eyebrow,
}: Props) {
  return (
    <section className={cn(bg === "surface" ? "bg-surface" : "bg-bg")}>
      <div className="container-page py-16 md:py-24">
        <MotionReveal>
          <header className="mb-8 md:mb-12 flex items-end justify-between gap-6 flex-wrap">
            <div>
              {eyebrow && (
                <p className="text-xs uppercase tracking-[0.16em] text-ink-subtle mb-3">
                  {eyebrow}
                </p>
              )}
              <h2 className="text-3xl md:text-5xl font-semibold tracking-[-0.03em] text-ink">
                {title}
              </h2>
            </div>
            <a
              href={href}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-ink-muted transition-colors group"
            >
              Смотреть все
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </header>
        </MotionReveal>

        <MotionStagger
          className={cn(
            "grid gap-4 md:gap-5",
            "grid-flow-col auto-cols-[minmax(260px,1fr)] sm:auto-cols-[minmax(280px,1fr)]",
            "overflow-x-auto scrollbar-hide scroll-snap-x snap-x pb-2",
            "md:grid-flow-row md:auto-cols-auto md:grid-cols-2 lg:grid-cols-4 md:overflow-visible"
          )}
        >
          {products.map((p) => (
            <MotionItem key={p.id} className="snap-card">
              <ProductCard product={p} />
            </MotionItem>
          ))}
        </MotionStagger>
      </div>
    </section>
  );
}
