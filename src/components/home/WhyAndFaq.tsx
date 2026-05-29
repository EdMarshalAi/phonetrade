"use client";

import * as React from "react";
import {
  ArrowRightLeft,
  HeartHandshake,
  MapPin,
  MessagesSquare,
  ShieldCheck,
  Wrench,
  Award,
  Truck,
  BadgePercent,
  Star,
  Package,
  Headphones,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { motion, type Variants } from "motion/react";
import { cn } from "@/lib/utils/cn";

type Feature = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
};

/** Преимущество из админки (icon — имя lucide-строкой). */
export type AdvantageFeature = { icon: string | null; title: string; text: string };

/** Резолвер имени lucide-иконки → компонент (с фолбэком). */
const ICONS: Record<string, LucideIcon> = {
  "shield-check": ShieldCheck,
  wrench: Wrench,
  "arrow-right-left": ArrowRightLeft,
  "messages-square": MessagesSquare,
  "map-pin": MapPin,
  "heart-handshake": HeartHandshake,
  award: Award,
  truck: Truck,
  "badge-percent": BadgePercent,
  star: Star,
  package: Package,
  headphones: Headphones,
};
function resolveIcon(name: string | null): LucideIcon {
  if (!name) return Sparkles;
  return ICONS[name.trim().toLowerCase()] ?? Sparkles;
}

const FEATURES: Feature[] = [
  {
    icon: ShieldCheck,
    title: "Только оригинал",
    text: "Каждое устройство проходит проверку. Серийный номер можно сверить с базой Apple прямо в магазине.",
  },
  {
    icon: Wrench,
    title: "Свой сервис в Белгороде",
    text: "Диагностика и ремонт на месте — без отправки в другие города и долгого ожидания запчастей.",
  },
  {
    icon: ArrowRightLeft,
    title: "Trade-in без задержек",
    text: "Принимаем iPhone, iPad, Mac, Watch и AirPods. Сумма обмена сразу учитывается в покупке.",
  },
  {
    icon: MessagesSquare,
    title: "Помощь без впаривания",
    text: "Подберём модель под ваши задачи и бюджет. Расскажем, на чём можно сэкономить.",
  },
  {
    icon: MapPin,
    title: "Удобно дойти",
    text: "Центр Белгорода — Универмаг Белгород, 1 этаж. Парковка, кафе и фитнес рядом.",
  },
  {
    icon: HeartHandshake,
    title: "Поддержка после покупки",
    text: "Настроим Apple ID, перенесём данные, поможем по гарантии. Звоните или приходите.",
  },
];

const tileVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: i * 0.06,
      ease: [0.32, 0.72, 0, 1],
    },
  }),
};

export function WhyAndFaq({ features }: { features?: AdvantageFeature[] }) {
  const tiles: Feature[] =
    features && features.length > 0
      ? features.map((f) => ({ icon: resolveIcon(f.icon), title: f.title, text: f.text }))
      : FEATURES;
  return (
    <section className="relative bg-surface">
      <div className="container-page py-20 md:py-28">
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
          className="max-w-3xl mb-14 md:mb-20"
        >
          <span className="block text-xs uppercase tracking-[0.18em] text-ink-subtle mb-4">
            О компании
          </span>
          <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1.04] text-ink">
            Почему выбирают PhoneTrade в&nbsp;Белгороде
          </h2>
          <p className="mt-5 text-base md:text-lg text-ink-muted max-w-2xl">
            Шесть причин, по которым к нам возвращаются и приводят друзей.
          </p>
        </motion.header>

        <div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((f, i) => (
            <motion.article
              key={f.title}
              custom={i}
              variants={tileVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className={cn(
                "group rounded-3xl bg-white border border-border/60 p-7 md:p-8",
                "transition-all duration-300 ease-[var(--ease-apple)]",
                "hover:border-ink/25 hover:shadow-[0_18px_40px_-22px_rgba(0,0,0,0.10)]"
              )}
            >
              <span
                aria-hidden
                className="inline-flex size-11 items-center justify-center rounded-2xl bg-surface text-ink transition-colors duration-300 group-hover:bg-ink group-hover:text-white"
              >
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-6 text-lg font-semibold tracking-[-0.01em] text-ink">
                {f.title}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
                {f.text}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
