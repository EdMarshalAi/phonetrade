"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import type { Product } from "@/lib/data/products";
import { cn } from "@/lib/utils/cn";

type Props = { product: Product };

export function ProductGallery({ product }: Props) {
  const images = React.useMemo(() => {
    if (product.gallery && product.gallery.length > 0) return product.gallery;
    return [product.image];
  }, [product.gallery, product.image]);

  const [index, setIndex] = React.useState(0);
  const hasMultiple = images.length > 1;

  return (
    <div className="flex flex-col-reverse md:flex-row gap-4">
      {hasMultiple && (
        <ul className="flex md:flex-col gap-2.5 md:gap-3 shrink-0 overflow-x-auto md:overflow-visible scrollbar-hide">
          {images.map((src, i) => (
            <li key={src + i} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Фото ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "relative block size-16 md:size-20 rounded-2xl overflow-hidden bg-surface border-2 transition-colors",
                  i === index
                    ? "border-ink"
                    : "border-transparent hover:border-border"
                )}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-contain p-1.5"
                  unoptimized
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative flex-1 rounded-3xl bg-surface overflow-hidden aspect-square">
        {product.badge && (
          <span className="absolute top-5 left-5 z-10 inline-flex items-center rounded-full bg-white/95 backdrop-blur-sm px-3 py-1.5 text-[11px] font-medium tracking-tight text-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            {product.badge}
          </span>
        )}
        {product.isNew && (
          <span className="absolute top-5 right-5 z-10 inline-flex items-center rounded-full bg-ink text-white px-3 py-1.5 text-[11px] font-medium tracking-wide uppercase">
            Новинка
          </span>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={images[index]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={images[index]}
              alt={product.title}
              fill
              sizes="(min-width: 1024px) 55vw, 90vw"
              className="object-contain p-8 md:p-12"
              priority
              unoptimized
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
