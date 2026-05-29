import * as React from "react";
import Image from "next/image";
import { BentoCard, type BentoCardSize } from "@/components/ui/BentoCard";
import { MotionReveal } from "@/components/ui/MotionReveal";
import type { Category } from "@/lib/data/products";

type Props = {
  categories: Category[];
};

type TileLayout = {
  slug: Category["slug"];
  size: BentoCardSize;
  tone: "light" | "surface" | "ink";
  span: string;
};

const LAYOUT: TileLayout[] = [
  {
    slug: "iphone",
    size: "xl",
    tone: "ink",
    span: "sm:col-span-2 lg:col-span-4 lg:row-span-2",
  },
  {
    slug: "mac",
    size: "lg",
    tone: "light",
    span: "sm:col-span-2 lg:col-span-2 lg:row-span-2",
  },
  {
    slug: "ipad",
    size: "md",
    tone: "surface",
    span: "sm:col-span-1 lg:col-span-2",
  },
  {
    slug: "watch",
    size: "md",
    tone: "light",
    span: "sm:col-span-1 lg:col-span-2",
  },
  {
    slug: "accessories",
    size: "md",
    tone: "surface",
    span: "sm:col-span-1 lg:col-span-2",
  },
];

export function BentoCategories({ categories }: Props) {
  const bySlug = new Map(categories.map((c) => [c.slug, c]));

  return (
    <section className="bg-surface">
      <div className="container-page py-16 md:py-24">
        <MotionReveal>
          <header className="mb-10 md:mb-14 flex items-end justify-between gap-6 flex-wrap">
            <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1.02] text-ink">
              Каталог Apple
            </h2>
            <p className="text-sm md:text-base text-ink-muted max-w-md">
              Полная линейка устройств — с гарантией, проверкой и сервисом в
              Белгороде.
            </p>
          </header>
        </MotionReveal>

        <div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 auto-rows-auto">
          {LAYOUT.map((tile) => {
            const cat = bySlug.get(tile.slug);
            if (!cat) return null;
            return (
              <BentoCard
                key={cat.id}
                title={cat.title}
                description={cat.subtitle}
                href={`/category/${cat.slug}`}
                size={tile.size}
                tone={tile.tone}
                className={tile.span}
                image={
                  <Image
                    src={`${cat.image}?v=3`}
                    alt={cat.title}
                    fill
                    sizes="(min-width: 1024px) 50vw, 90vw"
                    className="object-contain object-bottom-right drop-shadow-[0_18px_30px_rgba(0,0,0,0.18)]"
                    unoptimized
                  />
                }
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
