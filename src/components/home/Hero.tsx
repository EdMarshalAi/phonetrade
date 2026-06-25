"use client";

import * as React from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { trackHero } from "@/lib/analytics/track";

/**
 * Banner slide schema — будущая админка-конструктор будет сохранять
 * сюда: фон, эйбро, заголовок, подзаголовок, одну кнопку и картинку.
 */
export type HeroSlide = {
  id: string;
  /** "ink" | "surface" | "white" | произвольный CSS-цвет (#hex / token). */
  background: "ink" | "surface" | "white" | (string & {});
  /** Светлый или тёмный текст поверх фона. */
  textTone?: "light" | "dark";
  eyebrow?: string;
  title: string;
  subtitle?: string;
  cta?: { label: string; href: string };
  image?: string;
};

type Props = {
  slides: HeroSlide[];
  autoplayMs?: number;
};

const AUTOPLAY_DEFAULT = 5000;

function bgClass(background: HeroSlide["background"]): string {
  if (background === "ink") return "bg-ink";
  if (background === "surface") return "bg-surface";
  if (background === "white") return "bg-white";
  return "";
}

function bgStyle(background: HeroSlide["background"]): React.CSSProperties | undefined {
  if (background === "ink" || background === "surface" || background === "white")
    return undefined;
  return { backgroundColor: background };
}

export function Hero({ slides, autoplayMs = AUTOPLAY_DEFAULT }: Props) {
  const [index, setIndex] = React.useState(0);
  const [direction, setDirection] = React.useState<1 | -1>(1);
  const [paused, setPaused] = React.useState(false);
  const reduce = useReducedMotion();

  const total = slides.length;
  const slide = slides[index];

  const go = React.useCallback(
    (next: number) => {
      const normalized = ((next % total) + total) % total;
      setDirection(normalized > index ? 1 : -1);
      setIndex(normalized);
    },
    [index, total]
  );

  const next = React.useCallback(() => go(index + 1), [index, go]);
  const prev = React.useCallback(() => go(index - 1), [index, go]);

  React.useEffect(() => {
    if (paused || total <= 1 || reduce) return;
    const id = window.setTimeout(next, autoplayMs);
    return () => window.clearTimeout(id);
  }, [paused, next, autoplayMs, total, reduce, index]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // Трекинг показа слайда (CTR hero в аналитике).
  React.useEffect(() => {
    if (slide?.id) trackHero(slide.id, "view");
  }, [slide?.id]);

  const tone = slide.textTone ?? (slide.background === "ink" ? "light" : "dark");
  const isLight = tone === "light";

  const touchStartX = React.useRef<number | null>(null);
  const touchStartY = React.useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setPaused(true);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy =
      touchStartY.current !== null
        ? e.changedTouches[0].clientY - touchStartY.current
        : 0;
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (dx < 0) next();
      else prev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
    setPaused(false);
  };

  return (
    <section
      aria-roledescription="карусель"
      aria-label="Главные баннеры"
      className="group relative overflow-hidden touch-pan-y"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative min-h-[400px] sm:min-h-[460px] lg:min-h-[38vh]">
        {/* Редкий «блик» — лёгкий световой проход по баннеру */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 w-1/4"
            style={{ background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.45), transparent)", animation: "heroShine 9s ease-in-out infinite" }}
          />
        </div>
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={slide.id}
            initial={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, x: direction * 40 }
            }
            animate={{ opacity: 1, x: 0 }}
            exit={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, x: direction * -40 }
            }
            transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
            className={cn(
              "absolute inset-0",
              bgClass(slide.background),
              isLight ? "text-white" : "text-ink"
            )}
            style={bgStyle(slide.background)}
          >
            <div className="container-page h-full flex flex-col justify-center lg:grid lg:grid-cols-12 items-center gap-3 sm:gap-5 lg:gap-10 py-6 md:py-10">
              <div className="order-2 lg:order-none w-full lg:col-span-6 flex flex-col justify-center lg:max-w-xl">
                {slide.eyebrow && (
                  <span
                    className={cn(
                      "inline-flex items-center self-start text-[10px] sm:text-xs uppercase tracking-[0.18em] mb-2 sm:mb-4",
                      isLight ? "text-onDark-muted" : "text-ink-muted"
                    )}
                  >
                    {slide.eyebrow}
                  </span>
                )}
                <h1
                  className={cn(
                    "text-xl sm:text-2xl md:text-4xl lg:text-5xl font-semibold tracking-[-0.04em] leading-[1.05]",
                    isLight ? "text-white" : "text-ink"
                  )}
                >
                  {slide.title}
                </h1>
                {slide.subtitle && (
                  <p
                    className={cn(
                      "mt-2 sm:mt-4 text-xs sm:text-sm md:text-base lg:text-lg max-w-md line-clamp-2 sm:line-clamp-3",
                      isLight ? "text-onDark-muted" : "text-ink-muted"
                    )}
                  >
                    {slide.subtitle}
                  </p>
                )}
                {slide.cta && (
                  <div className="mt-3 sm:mt-5 md:mt-8">
                    <Button
                      variant={isLight ? "invert" : "primary"}
                      size="sm"
                      onClick={() => {
                        trackHero(slide.id, "click");
                        window.location.href = slide.cta!.href;
                      }}
                      className="h-9 px-4 text-[12px] sm:h-10 sm:px-5 sm:text-[13px] md:h-12 md:px-7 md:text-[15px]"
                    >
                      {slide.cta.label}
                    </Button>
                  </div>
                )}
              </div>

              <div className="order-1 lg:order-none w-full lg:col-span-6 relative h-[150px] sm:h-[200px] lg:h-full lg:min-h-[260px]">
                {slide.image && (
                  <Image
                    src={slide.image}
                    alt={`${slide.title} — Apple в Белгороде, PhoneTrade`}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    priority
                    className="object-contain object-center lg:object-right drop-shadow-[0_18px_30px_rgba(0,0,0,0.25)]"
                  />
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            aria-label="Предыдущий баннер"
            onClick={prev}
            className={cn(
              "hidden md:flex absolute left-0 top-0 bottom-0 w-20 lg:w-28 z-10",
              "items-center justify-start pl-3 lg:pl-5",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
              "focus-visible:opacity-100 outline-none",
              isLight
                ? "bg-gradient-to-r from-black/25 to-transparent text-white"
                : "bg-gradient-to-r from-ink/15 to-transparent text-ink"
            )}
          >
            <span
              className={cn(
                "inline-flex items-center justify-center size-11 rounded-full backdrop-blur-md transition-all",
                isLight
                  ? "bg-white/15 hover:bg-white/25 border border-white/15"
                  : "bg-white/70 hover:bg-white border border-border/60"
              )}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </span>
          </button>
          <button
            type="button"
            aria-label="Следующий баннер"
            onClick={next}
            className={cn(
              "hidden md:flex absolute right-0 top-0 bottom-0 w-20 lg:w-28 z-10",
              "items-center justify-end pr-3 lg:pr-5",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
              "focus-visible:opacity-100 outline-none",
              isLight
                ? "bg-gradient-to-l from-black/25 to-transparent text-white"
                : "bg-gradient-to-l from-ink/15 to-transparent text-ink"
            )}
          >
            <span
              className={cn(
                "inline-flex items-center justify-center size-11 rounded-full backdrop-blur-md transition-all",
                isLight
                  ? "bg-white/15 hover:bg-white/25 border border-white/15"
                  : "bg-white/70 hover:bg-white border border-border/60"
              )}
            >
              <ChevronRight className="size-5" aria-hidden />
            </span>
          </button>

          <div
            role="tablist"
            aria-label="Выбор баннера"
            className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2"
          >
            {slides.map((s, i) => {
              const active = i === index;
              const ringClass = isLight
                ? "bg-white/30 hover:bg-white/60"
                : "bg-ink/25 hover:bg-ink/50";
              const activeClass = isLight ? "bg-white" : "bg-ink";
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`Перейти к баннеру ${i + 1}`}
                  onClick={() => go(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    active ? `w-8 ${activeClass}` : `w-1.5 ${ringClass}`
                  )}
                />
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
