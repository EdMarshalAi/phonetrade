"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowRight, Eye } from "lucide-react";
import { motion, type Variants } from "motion/react";
import { cn } from "@/lib/utils/cn";

type Filter =
  | "Все"
  | "Гаджеты"
  | "iPhone"
  | "iPad"
  | "Apple Watch"
  | "Mac";

type Post = {
  id: string;
  title: string;
  date: string;
  views: number;
  category: Exclude<Filter, "Все">;
  image: string;
  href: string;
};

const FILTERS: Filter[] = [
  "Все",
  "Гаджеты",
  "iPhone",
  "iPad",
  "Apple Watch",
  "Mac",
];

const POSTS: Post[] = [
  {
    id: "ip17e-vs-ip17",
    title: "iPhone 17e vs iPhone 17: какой выбрать?",
    date: "15 мая",
    views: 2112,
    category: "iPhone",
    image: "https://picsum.photos/seed/iphone17e/1400/900",
    href: "/blog/iphone-17e-vs-17",
  },
  {
    id: "xreal-one-pro",
    title:
      "Обзор XREAL One Pro: очки, которые превращают смартфон в личный экран",
    date: "14 мая",
    views: 759,
    category: "Гаджеты",
    image: "https://picsum.photos/seed/xreal-glasses/900/700",
    href: "/blog/xreal-one-pro",
  },
  {
    id: "studio-display",
    title: "Apple Studio Display и Studio Display XDR: какой выбрать в 2026",
    date: "8 мая",
    views: 562,
    category: "Mac",
    image: "https://picsum.photos/seed/studio-display/900/700",
    href: "/blog/studio-display-2026",
  },
  {
    id: "watch-s10-review",
    title: "Apple Watch Series 10: главные изменения и стоит ли обновляться",
    date: "3 мая",
    views: 1284,
    category: "Apple Watch",
    image: "https://picsum.photos/seed/apple-watch-10/900/700",
    href: "/blog/apple-watch-10-review",
  },
  {
    id: "ipad-air-m3",
    title: "iPad Air на M3: рабочая лошадка для творческих задач",
    date: "28 апреля",
    views: 870,
    category: "iPad",
    image: "https://picsum.photos/seed/ipad-air-m3/900/700",
    href: "/blog/ipad-air-m3",
  },
  {
    id: "mac-mini-m4",
    title: "Mac mini M4 для дома: компактный сервер и медиацентр",
    date: "21 апреля",
    views: 1430,
    category: "Mac",
    image: "https://picsum.photos/seed/mac-mini-m4/900/700",
    href: "/blog/mac-mini-m4",
  },
];

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: i * 0.08,
      ease: [0.32, 0.72, 0, 1],
    },
  }),
};

function MetaRow({
  date,
  views,
  tone = "light",
}: {
  date: string;
  views: number;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 text-xs",
        tone === "dark" ? "text-white/85" : "text-ink-subtle"
      )}
    >
      <span>{date}</span>
      <span className="inline-flex items-center gap-1.5">
        <Eye className="size-3.5" aria-hidden />
        <span className="tabular-nums">{views.toLocaleString("ru-RU")}</span>
      </span>
    </div>
  );
}

export function BlogTeaser() {
  const [filter, setFilter] = React.useState<Filter>("Все");

  const filtered = React.useMemo(
    () => (filter === "Все" ? POSTS : POSTS.filter((p) => p.category === filter)),
    [filter]
  );

  const [featured, ...rest] = filtered;
  const sidePosts = rest.slice(0, 2);

  return (
    <section className="bg-bg">
      <div className="container-page py-14 md:py-20">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
          className="flex items-end justify-between gap-6 flex-wrap mb-6 md:mb-8"
        >
          <div>
            <span className="block text-xs uppercase tracking-[0.18em] text-ink-subtle mb-3">
              Блог
            </span>
            <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1.04] text-ink">
              Читай, смотри, действуй
            </h2>
          </div>
          <a
            href="/blog"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-ink-muted transition-colors"
          >
            Все статьи
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </motion.header>

        <div
          role="tablist"
          aria-label="Категории блога"
          className="flex items-center gap-2 mb-6 md:mb-8 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1"
        >
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f)}
                className={cn(
                  "shrink-0 inline-flex items-center h-9 px-4 rounded-full text-[13px] font-medium transition-all duration-200",
                  active
                    ? "bg-ink text-white shadow-[0_6px_16px_-8px_rgba(0,0,0,0.35)]"
                    : "bg-surface text-ink-muted hover:bg-border/60 hover:text-ink"
                )}
              >
                {f}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-border/60 bg-surface py-20 text-center text-ink-muted">
            В этой категории пока нет статей
          </div>
        ) : (
          <div className="grid gap-5 md:gap-6 lg:grid-cols-3">
            {featured && (
              <motion.a
                href={featured.href}
                custom={0}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                className={cn(
                  "group relative block lg:col-span-2 lg:row-span-2 overflow-hidden rounded-3xl",
                  "min-h-[280px] md:min-h-[320px] lg:min-h-[360px]",
                  "bg-ink"
                )}
              >
                <Image
                  src={featured.image}
                  alt={featured.title}
                  fill
                  sizes="(min-width: 1024px) 66vw, 100vw"
                  className="object-cover transition-transform duration-[600ms] ease-[var(--ease-apple)] group-hover:scale-[1.04]"
                  priority
                  unoptimized
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/30 to-transparent"
                />
                <div className="relative h-full flex flex-col justify-end p-5 md:p-7 text-white">
                  <span className="inline-flex items-center self-start rounded-full bg-white/15 backdrop-blur-md px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider mb-3">
                    {featured.category}
                  </span>
                  <h3 className="text-xl md:text-2xl lg:text-3xl font-semibold tracking-[-0.02em] leading-[1.1] max-w-xl">
                    {featured.title}
                  </h3>
                  <div className="mt-3">
                    <MetaRow
                      date={featured.date}
                      views={featured.views}
                      tone="dark"
                    />
                  </div>
                </div>
              </motion.a>
            )}

            {sidePosts.map((p, i) => (
              <motion.a
                key={p.id}
                href={p.href}
                custom={i + 1}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                className={cn(
                  "group flex flex-col rounded-3xl bg-white border border-border/60 overflow-hidden",
                  "transition-shadow duration-300 ease-[var(--ease-apple)]",
                  "hover:shadow-[0_14px_36px_-18px_rgba(0,0,0,0.10)]"
                )}
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-surface">
                  <Image
                    src={p.image}
                    alt={p.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    className="object-cover transition-transform duration-[600ms] ease-[var(--ease-apple)] group-hover:scale-[1.04]"
                    unoptimized
                  />
                  <span className="absolute top-2.5 left-2.5 inline-flex items-center rounded-full bg-white/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink">
                    {p.category}
                  </span>
                </div>
                <div className="flex flex-col flex-1 p-4 md:p-5">
                  <h3 className="text-sm md:text-[15px] font-semibold tracking-[-0.01em] leading-snug text-ink line-clamp-2 group-hover:text-ink-muted transition-colors">
                    {p.title}
                  </h3>
                  <div className="mt-auto pt-3">
                    <MetaRow date={p.date} views={p.views} />
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
