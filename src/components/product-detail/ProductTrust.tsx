import * as React from "react";
import { MapPin, RefreshCw, ShieldCheck, Truck } from "lucide-react";
import type { Product } from "@/lib/data/products";

type Props = { product: Product };

type Card = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  href?: string;
  tone?: "light" | "ink";
};

export function ProductTrust({ product }: Props) {
  const stockText = product.inStock
    ? "В Универмаге Белгород · ул. Попова, 36"
    : product.badge ?? "Уточняйте наличие у менеджера";

  const cards: Card[] = [
    {
      icon: MapPin,
      title: "Самовывоз",
      text: stockText,
    },
    {
      icon: Truck,
      title: "Доставка по Белгороду",
      text: "Сегодня или завтра — курьер привезёт в удобное время",
    },
    {
      icon: ShieldCheck,
      title: "Гарантия 12 + 12 месяцев",
      text: "Магазинная PhoneTrade плюс гарантия производителя Apple",
    },
    {
      icon: RefreshCw,
      title: "Trade-in сразу",
      text: "Сдайте старое устройство Apple и вычтем его сумму из цены",
      href: "/trade-in",
      tone: "ink",
    },
  ];

  return (
    <ul className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Inner = (
          <article
            className={
              c.tone === "ink"
                ? "h-full rounded-3xl bg-ink text-white p-6 md:p-7 transition-transform duration-300 ease-[var(--ease-apple)] hover:-translate-y-0.5"
                : "h-full rounded-3xl bg-white border border-border/60 p-6 md:p-7 transition-all duration-300 ease-[var(--ease-apple)] hover:border-ink/25 hover:shadow-[0_18px_40px_-22px_rgba(0,0,0,0.10)]"
            }
          >
            <span
              aria-hidden
              className={
                c.tone === "ink"
                  ? "inline-flex size-11 items-center justify-center rounded-2xl bg-white/10 text-white"
                  : "inline-flex size-11 items-center justify-center rounded-2xl bg-surface text-ink"
              }
            >
              <c.icon className="size-5" />
            </span>
            <h3
              className={
                c.tone === "ink"
                  ? "mt-5 text-lg font-semibold tracking-[-0.01em] text-white"
                  : "mt-5 text-lg font-semibold tracking-[-0.01em] text-ink"
              }
            >
              {c.title}
            </h3>
            <p
              className={
                c.tone === "ink"
                  ? "mt-2 text-sm leading-relaxed text-onDark-muted"
                  : "mt-2 text-sm leading-relaxed text-ink-muted"
              }
            >
              {c.text}
            </p>
          </article>
        );
        return (
          <li key={c.title}>
            {c.href ? (
              <a href={c.href} className="block h-full">
                {Inner}
              </a>
            ) : (
              Inner
            )}
          </li>
        );
      })}
    </ul>
  );
}
