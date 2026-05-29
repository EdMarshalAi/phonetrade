"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type BentoCardSize = "sm" | "md" | "lg" | "xl";

interface BentoCardProps {
  title: string;
  description?: string;
  href: string;
  image?: React.ReactNode;
  size?: BentoCardSize;
  tone?: "light" | "surface" | "ink";
  className?: string;
}

const SIZE_STYLES: Record<BentoCardSize, { h: string; title: string }> = {
  sm: { h: "min-h-[200px] md:min-h-[220px]", title: "text-2xl md:text-3xl" },
  md: { h: "min-h-[240px] md:min-h-[280px]", title: "text-3xl md:text-4xl" },
  lg: { h: "min-h-[320px] md:min-h-[380px]", title: "text-4xl md:text-5xl" },
  xl: {
    h: "min-h-[420px] md:min-h-[480px]",
    title: "text-5xl md:text-6xl lg:text-7xl",
  },
};

const TONE_STYLES: Record<NonNullable<BentoCardProps["tone"]>, string> = {
  light: "bg-white border border-border/60 text-ink",
  surface: "bg-surface border border-border/40 text-ink",
  ink: "bg-ink border border-ink text-white",
};

export const BentoCard = React.forwardRef<HTMLAnchorElement, BentoCardProps>(
  (
    { title, description, href, image, size = "md", tone = "light", className },
    ref
  ) => {
    const reduce = useReducedMotion();
    const sizes = SIZE_STYLES[size];

    return (
      <motion.a
        ref={ref}
        href={href}
        aria-label={title}
        className={cn(
          "group relative flex flex-col justify-between overflow-hidden",
          "rounded-3xl p-6 md:p-8 cursor-pointer",
          "transition-shadow duration-300 ease-[var(--ease-apple)]",
          "hover:shadow-[0_14px_40px_rgba(0,0,0,0.08)]",
          sizes.h,
          TONE_STYLES[tone],
          className
        )}
        whileHover={reduce ? undefined : { y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      >
        <div className="relative z-10 max-w-[80%]">
          <h3
            className={cn(
              "font-semibold tracking-[-0.02em] leading-[1.02]",
              sizes.title,
              tone === "ink" ? "text-white" : "text-ink"
            )}
          >
            {title}
          </h3>
          {description && (
            <p
              className={cn(
                "mt-3 text-sm md:text-[15px] leading-relaxed",
                tone === "ink" ? "text-onDark-muted" : "text-ink-muted"
              )}
            >
              {description}
            </p>
          )}
        </div>

        <div className="relative z-10 mt-6 inline-flex items-center gap-2 text-sm font-medium">
          <span className={tone === "ink" ? "text-white" : "text-ink"}>
            Смотреть
          </span>
          <span
            aria-hidden
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-full transition-transform duration-300",
              "group-hover:translate-x-0.5",
              tone === "ink"
                ? "bg-white text-ink"
                : "bg-ink text-white"
            )}
          >
            <ArrowUpRight className="size-4" />
          </span>
        </div>

        {image && (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute z-0 transition-transform duration-500 ease-[var(--ease-apple)] group-hover:scale-[1.05]",
              size === "xl"
                ? "bottom-[-4%] right-[-2%] h-[78%] w-[62%]"
                : size === "lg"
                  ? "bottom-[-4%] right-[-2%] h-[72%] w-[60%]"
                  : "bottom-[-6%] right-[-4%] h-[70%] w-[68%]"
            )}
          >
            {image}
          </div>
        )}
      </motion.a>
    );
  }
);

BentoCard.displayName = "BentoCard";
