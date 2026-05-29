"use client";

import * as React from "react";
import { Menu } from "@base-ui-components/react/menu";
import {
  ChevronDown,
  Grid2x2,
  Menu as MenuIcon,
  MessageCircle,
  Phone,
  Search,
  Send,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { SearchInput } from "@/components/layout/SearchInput";
import {
  CATEGORY_SUBCATEGORIES,
  subcategoryHref,
} from "@/lib/catalog/subcategories";
import type { CategorySlug } from "@/lib/data/products";
import { cn } from "@/lib/utils/cn";

const TOP_LINKS = [
  { href: "/about", label: "О компании" },
  { href: "/blog", label: "Блог" },
  { href: "/delivery", label: "Доставка" },
  { href: "/warranty", label: "Гарантия" },
  { href: "/trade-in", label: "Trade-in" },
  { href: "/loyalty", label: "Постоянным клиентам" },
  { href: "/contacts", label: "Контакты" },
];

type CategoryMenuItem = {
  href: string;
  label: string;
  slug?: CategorySlug;
};

const ALL_CATEGORIES: CategoryMenuItem[] = [
  { href: "/category/iphone", label: "iPhone", slug: "iphone" },
  { href: "/category/ipad", label: "iPad", slug: "ipad" },
  { href: "/category/mac", label: "Mac", slug: "mac" },
  { href: "/category/watch", label: "Apple Watch", slug: "watch" },
  { href: "/category/airpods", label: "AirPods", slug: "airpods" },
  {
    href: "/category/accessories",
    label: "Аксессуары",
    slug: "accessories",
  },
  { href: "/used", label: "Б/У техника", slug: "used" },
  { href: "/trade-in", label: "Trade-in", slug: "trade-in" },
];

const NAV_PRIMARY = [
  { href: "/new", label: "Новинки", highlight: true },
  { href: "/used", label: "Б/У" },
  { href: "/category/iphone", label: "iPhone" },
  { href: "/category/ipad", label: "iPad" },
  { href: "/category/mac", label: "Mac" },
  { href: "/category/watch", label: "Watch" },
  { href: "/category/airpods", label: "AirPods" },
  { href: "/category/accessories", label: "Аксессуары" },
];

type MobileSection = {
  heading: string;
  items: { href: string; label: string }[];
};

const MOBILE_SECTIONS: MobileSection[] = [
  {
    heading: "Каталог",
    items: NAV_PRIMARY.map(({ href, label }) => ({ href, label })),
  },
  {
    heading: "Сервисы",
    items: [
      { href: "/trade-in", label: "Trade-in" },
      { href: "/delivery", label: "Доставка" },
      { href: "/warranty", label: "Гарантия" },
    ],
  },
  {
    heading: "Информация",
    items: [
      { href: "/about", label: "О компании" },
      { href: "/loyalty", label: "Постоянным клиентам" },
      { href: "/blog", label: "Блог" },
    ],
  },
];

export function Header() {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [contactOpen, setContactOpen] = React.useState(false);

  React.useEffect(() => {
    if (mobileOpen) setContactOpen(false);
  }, [mobileOpen]);
  React.useEffect(() => {
    if (contactOpen) setMobileOpen(false);
  }, [contactOpen]);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileOpen]);

  return (
    <>
      {/* === DESKTOP: top dark blocks (utility + brand + search) === */}
      <header className="hidden lg:block bg-ink text-white">
        <div className="border-b border-white/8">
          <div className="container-page flex items-center justify-between h-9 text-[12px] text-onDark-muted">
            <ul className="flex items-center gap-6">
              {TOP_LINKS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="hover:text-white transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3">
              <a
                href="https://wa.me/79040988877"
                aria-label="WhatsApp"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-7 items-center justify-center rounded-full bg-white/8 text-onDark hover:bg-white/15 hover:text-white transition-colors"
              >
                <Phone className="size-3.5" aria-hidden />
              </a>
              <a
                href="https://t.me/phonetradebel"
                aria-label="Telegram"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-7 items-center justify-center rounded-full bg-white/8 text-onDark hover:bg-white/15 hover:text-white transition-colors"
              >
                <Send className="size-3.5" aria-hidden />
              </a>
              <a
                href="tel:+79040988877"
                className="font-medium text-white hover:text-onDark transition-colors tabular-nums"
              >
                +7 (904) 098-88-77
              </a>
            </div>
          </div>
        </div>

        <div className="container-page flex items-center gap-8 h-[76px]">
          <a
            href="/"
            aria-label="PhoneTrade — главная"
            className="shrink-0 inline-flex items-center gap-2.5"
          >
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-white text-ink text-[11px] font-bold tracking-tighter">
              PT
            </span>
            <span className="text-lg font-semibold tracking-tight text-white">
              PhoneTrade
            </span>
          </a>

          <SearchInput tone="dark" />

          <div className="ml-auto flex items-center gap-1 shrink-0">
            <a
              href="/cart"
              className="inline-flex items-center gap-2 h-10 px-3 rounded-xl text-sm font-medium text-white hover:bg-white/8 transition-colors"
            >
              <ShoppingBag className="size-[18px]" aria-hidden />
              Корзина
            </a>
            <a
              href="/account"
              className="inline-flex items-center gap-2 h-10 px-3 rounded-xl text-sm font-medium text-white hover:bg-white/8 transition-colors"
            >
              <User className="size-[18px]" aria-hidden />
              Войти
            </a>
          </div>
        </div>
      </header>

      {/* === STICKY WHITE CATEGORIES PANEL (desktop + mobile bar inside) === */}
      <div className="sticky top-0 z-50 bg-white border-b border-border/60 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
        {/* DESKTOP categories */}
        <div className="hidden lg:block">
          <div className="container-page flex items-center h-[60px] gap-4">
            {scrolled && (
              <a
                href="/"
                aria-label="PhoneTrade — главная"
                className="shrink-0 animate-in fade-in slide-in-from-left-2 duration-300"
              >
                <span className="inline-flex size-9 items-center justify-center rounded-lg bg-ink text-white text-[11px] font-bold tracking-tighter">
                  PT
                </span>
              </a>
            )}

            <Menu.Root>
              <Menu.Trigger
                nativeButton
                render={(props) => (
                  <button
                    {...props}
                    type="button"
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-ink text-white hover:bg-ink/85 text-sm font-medium transition-colors shrink-0"
                  >
                    <Grid2x2 className="size-4" aria-hidden />
                    Все категории
                    <ChevronDown
                      className="size-3.5 opacity-70 group-data-[popup-open]:rotate-180 transition-transform"
                      aria-hidden
                    />
                  </button>
                )}
              />
              <Menu.Portal>
                <Menu.Positioner sideOffset={8} align="start" className="z-[60]">
                  <Menu.Popup
                    className={cn(
                      "min-w-[260px] rounded-2xl bg-white border border-border/60 p-2",
                      "shadow-[0_20px_50px_rgba(0,0,0,0.12)]",
                      "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
                      "data-[starting-style]:scale-95 data-[ending-style]:scale-95",
                      "transition-[opacity,transform] duration-150 origin-top-left"
                    )}
                  >
                    {ALL_CATEGORIES.map((item) => {
                      const subs = item.slug
                        ? CATEGORY_SUBCATEGORIES[item.slug] ?? []
                        : [];
                      const itemRow = (
                        <span className="flex items-center gap-3 w-full">
                          <span
                            aria-hidden
                            className="inline-flex size-7 items-center justify-center rounded-md bg-surface text-[10px] text-ink-subtle"
                          >
                            {item.label.slice(0, 2)}
                          </span>
                          <span className="font-medium flex-1">
                            {item.label}
                          </span>
                          {subs.length > 0 && (
                            <ChevronDown
                              className="size-3.5 -rotate-90 text-ink-subtle"
                              aria-hidden
                            />
                          )}
                        </span>
                      );

                      if (subs.length === 0) {
                        return (
                          <Menu.Item
                            key={item.href}
                            render={(props) => (
                              <a
                                {...props}
                                href={item.href}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-ink hover:bg-surface data-[highlighted]:bg-surface outline-none cursor-pointer"
                              >
                                {itemRow}
                              </a>
                            )}
                          />
                        );
                      }

                      return (
                        <Menu.SubmenuRoot key={item.href}>
                          <Menu.SubmenuTrigger
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-ink hover:bg-surface data-[highlighted]:bg-surface data-[popup-open]:bg-surface outline-none cursor-pointer w-full text-left"
                          >
                            {itemRow}
                          </Menu.SubmenuTrigger>
                          <Menu.Portal>
                            <Menu.Positioner
                              side="inline-end"
                              align="start"
                              sideOffset={8}
                              className="z-[61]"
                            >
                              <Menu.Popup
                                className={cn(
                                  "min-w-[240px] max-h-[60vh] overflow-y-auto rounded-2xl bg-white border border-border/60 p-1.5",
                                  "shadow-[0_20px_50px_rgba(0,0,0,0.12)]",
                                  "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
                                  "data-[starting-style]:scale-95 data-[ending-style]:scale-95",
                                  "transition-[opacity,transform] duration-150 origin-top-left"
                                )}
                              >
                                <Menu.Item
                                  render={(props) => (
                                    <a
                                      {...props}
                                      href={item.href}
                                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-ink hover:bg-surface data-[highlighted]:bg-surface outline-none cursor-pointer border-b border-border/60 mb-1"
                                    >
                                      Все {item.label}
                                      <span className="text-xs text-ink-subtle tabular-nums">
                                        {subs.reduce(
                                          (acc, s) => acc + s.count,
                                          0
                                        )}
                                      </span>
                                    </a>
                                  )}
                                />
                                {subs.map((sub) => (
                                  <Menu.Item
                                    key={sub.label}
                                    render={(props) => (
                                      <a
                                        {...props}
                                        href={subcategoryHref(
                                          item.slug!,
                                          sub.label
                                        )}
                                        className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm text-ink hover:bg-surface data-[highlighted]:bg-surface outline-none cursor-pointer"
                                      >
                                        <span>{sub.label}</span>
                                        <span className="text-xs text-ink-subtle tabular-nums">
                                          {sub.count}
                                        </span>
                                      </a>
                                    )}
                                  />
                                ))}
                              </Menu.Popup>
                            </Menu.Positioner>
                          </Menu.Portal>
                        </Menu.SubmenuRoot>
                      );
                    })}
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>

            <nav
              className="flex-1 min-w-0"
              aria-label="Основная навигация"
            >
              <ul className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-hide">
                {NAV_PRIMARY.map((item) => (
                  <li key={item.href} className="shrink-0">
                    <a
                      href={item.href}
                      className={cn(
                        "inline-flex items-center h-10 px-4 rounded-lg text-sm whitespace-nowrap transition-colors",
                        item.highlight
                          ? "bg-ink text-white font-semibold"
                          : "text-ink-muted hover:text-ink hover:bg-surface"
                      )}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {scrolled && (
              <div className="flex items-center gap-0.5 shrink-0 animate-in fade-in duration-300">
                <button
                  type="button"
                  aria-label="Поиск"
                  className="inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-surface transition-colors"
                >
                  <Search className="size-[18px]" />
                </button>
                <a
                  href="/cart"
                  aria-label="Корзина"
                  className="inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-surface transition-colors"
                >
                  <ShoppingBag className="size-[18px]" />
                </a>
                <a
                  href="/account"
                  aria-label="Личный кабинет"
                  className="inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-surface transition-colors"
                >
                  <User className="size-[18px]" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* MOBILE BAR (sticky, dark) */}
        <div className="lg:hidden bg-ink text-white">
          <div className="container-page flex items-center justify-between gap-4 h-14">
            <a
              href="/"
              aria-label="PhoneTrade — главная"
              className="inline-flex items-center gap-2"
            >
              <span className="inline-flex size-7 items-center justify-center rounded-md bg-white text-ink text-[10px] font-bold tracking-tighter">
                PT
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-white">
                PhoneTrade
              </span>
            </a>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={contactOpen ? "Закрыть контакты" : "Контакты"}
                aria-expanded={contactOpen}
                onClick={() => setContactOpen((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[12px] font-medium transition-colors",
                  contactOpen
                    ? "bg-white text-ink"
                    : "bg-white/10 text-white hover:bg-white/15"
                )}
              >
                <Phone className="size-[14px]" aria-hidden />
                Контакты
              </button>
              <a
                href="/cart"
                aria-label="Корзина"
                className="relative inline-flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
              >
                <ShoppingBag className="size-[18px]" />
                <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-white text-ink text-[10px] font-semibold px-1">
                  0
                </span>
              </a>
              <button
                type="button"
                aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню"}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((v) => !v)}
                className="inline-flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
              >
                {mobileOpen ? (
                  <X className="size-5" />
                ) : (
                  <MenuIcon className="size-5" />
                )}
              </button>
            </div>
          </div>

          {/* MOBILE CONTACT PANEL */}
          <div
            className={cn(
              "absolute inset-x-0 top-full bg-ink border-t border-white/10 z-40",
              "transition-all duration-300 ease-[var(--ease-apple)] origin-top",
              contactOpen
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-2 pointer-events-none"
            )}
          >
            <div className="container-page py-5">
              <span className="block text-[10px] uppercase tracking-[0.18em] text-onDark-muted mb-3">
                Свяжитесь с нами
              </span>
              <a
                href="tel:+79040988877"
                onClick={() => setContactOpen(false)}
                className="flex items-center gap-3 py-3 border-b border-white/5"
              >
                <span
                  aria-hidden
                  className="inline-flex size-10 items-center justify-center rounded-xl bg-white/10 text-white"
                >
                  <Phone className="size-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-white tabular-nums">
                    +7 (904) 098-88-77
                  </p>
                  <p className="text-[12px] text-onDark-muted">
                    Пн–Вс · 10:00–20:00
                  </p>
                </div>
              </a>
              <a
                href="https://wa.me/79040988877"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setContactOpen(false)}
                className="flex items-center gap-3 py-3 border-b border-white/5"
              >
                <span
                  aria-hidden
                  className="inline-flex size-10 items-center justify-center rounded-xl bg-white/10 text-white"
                >
                  <MessageCircle className="size-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-white">
                    WhatsApp
                  </p>
                  <p className="text-[12px] text-onDark-muted">
                    Напишите — ответим за 15 минут
                  </p>
                </div>
              </a>
              <a
                href="https://t.me/phonetradebel"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setContactOpen(false)}
                className="flex items-center gap-3 py-3 border-b border-white/5"
              >
                <span
                  aria-hidden
                  className="inline-flex size-10 items-center justify-center rounded-xl bg-white/10 text-white"
                >
                  <Send className="size-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-white">
                    Telegram
                  </p>
                  <p className="text-[12px] text-onDark-muted">
                    Канал и личные сообщения
                  </p>
                </div>
              </a>
              <div className="flex items-start gap-3 py-3">
                <span
                  aria-hidden
                  className="inline-flex size-10 items-center justify-center rounded-xl bg-white/10 text-white"
                >
                  <Phone className="size-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-white">
                    Универмаг Белгород
                  </p>
                  <p className="text-[12px] text-onDark-muted leading-relaxed mt-0.5">
                    ул. Попова, 36 · 1 этаж
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* MOBILE DRAWER */}
          <div
            className={cn(
              "absolute inset-x-0 top-full bg-ink border-t border-white/10 z-40",
              "transition-all duration-300 ease-[var(--ease-apple)] origin-top",
              mobileOpen
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-2 pointer-events-none"
            )}
          >
            <div className="container-page py-5 max-h-[calc(100vh-56px)] overflow-y-auto">
              <div className="mb-5">
                <SearchInput tone="dark" />
              </div>
              <div className="space-y-6">
                {MOBILE_SECTIONS.map((section) => (
                  <section key={section.heading}>
                    <h3 className="text-[10px] uppercase tracking-[0.18em] text-onDark-muted mb-2">
                      {section.heading}
                    </h3>
                    <ul className="flex flex-col">
                      {section.items.map((item) => (
                        <li key={item.href}>
                          <a
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className="block py-3 text-base text-onDark hover:text-white border-b border-white/5 last:border-0"
                          >
                            {item.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
