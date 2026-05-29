import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Brand = {
  name: string;
  className?: string;
};

const BRANDS: Brand[] = [
  { name: "Apple", className: "font-sans text-2xl font-medium tracking-tight" },
  {
    name: "SAMSUNG",
    className: "font-sans text-xl font-bold tracking-[0.18em]",
  },
  { name: "dyson", className: "font-sans text-2xl font-extrabold lowercase tracking-tight" },
  {
    name: "DREAME",
    className: "font-sans text-xl font-bold tracking-[0.22em]",
  },
  {
    name: "BOSE",
    className: "font-sans text-xl font-extrabold tracking-[0.16em]",
  },
  {
    name: "Marshall",
    className: "text-2xl font-semibold tracking-tight",
  },
  { name: "Beats", className: "font-sans text-2xl font-extrabold tracking-tight" },
  { name: "JBL", className: "font-sans text-2xl font-black tracking-[0.04em]" },
  {
    name: "B&W",
    className: "font-sans text-2xl font-black tracking-tight",
  },
  {
    name: "GARMIN",
    className: "font-sans text-xl font-bold tracking-[0.20em]",
  },
  {
    name: "DJI",
    className: "font-sans text-2xl font-black tracking-[0.06em]",
  },
  { name: "Sony", className: "font-sans text-2xl font-bold tracking-tight" },
];

function BrandList({ ariaHidden }: { ariaHidden?: boolean }) {
  return (
    <ul
      aria-hidden={ariaHidden}
      className="flex shrink-0 items-center gap-16 md:gap-24 px-8 md:px-12"
    >
      {BRANDS.map((b, i) => (
        <li
          key={`${b.name}-${i}`}
          className={cn(
            "shrink-0 text-white/50 hover:text-white transition-colors duration-300 select-none",
            b.className
          )}
        >
          {b.name}
        </li>
      ))}
    </ul>
  );
}

export function BrandMarquee() {
  return (
    <section
      aria-label="Бренды, представленные в PhoneTrade"
      className="bg-ink"
    >
      <div className="py-10 md:py-14 overflow-hidden relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-16 md:w-32 z-10 bg-gradient-to-r from-ink to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-32 z-10 bg-gradient-to-l from-ink to-transparent"
        />

        <div className="marquee-track flex w-max items-center motion-reduce:animate-none hover:[animation-play-state:paused]">
          <BrandList />
          <BrandList ariaHidden />
        </div>
      </div>
    </section>
  );
}
