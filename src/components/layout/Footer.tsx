import * as React from "react";
import { MapPin, Phone, Clock, Send } from "lucide-react";

const SOCIAL = [
  {
    href: "https://vk.com/phonetradebel",
    label: "VK",
    glyph: (
      <span className="text-[15px] font-bold leading-none tracking-tight">
        VK
      </span>
    ),
  },
  {
    href: "https://wa.me/79040988877",
    label: "WhatsApp",
    glyph: <Phone className="size-[15px]" aria-hidden />,
  },
  {
    href: "https://t.me/phonetradebel",
    label: "Telegram",
    glyph: <Send className="size-[15px]" aria-hidden />,
  },
];

const LEGAL = [
  { href: "/service-rules", label: "Правила ремонтных работ" },
  { href: "/privacy", label: "Политика конфиденциальности" },
  { href: "/consent", label: "Согласие на обработку персональных данных" },
  { href: "/offer", label: "Публичная оферта" },
];

const MAP_SRC =
  "https://yandex.ru/map-widget/v1/?ll=36.594843%2C50.595414&z=17&mode=search&text=%D0%91%D0%B5%D0%BB%D0%B3%D0%BE%D1%80%D0%BE%D0%B4%2C%20%D1%83%D0%BB.%20%D0%9F%D0%BE%D0%BF%D0%BE%D0%B2%D0%B0%2C%2036";

const MAP_LINK =
  "https://yandex.ru/maps/?text=%D0%91%D0%B5%D0%BB%D0%B3%D0%BE%D1%80%D0%BE%D0%B4%2C%20%D1%83%D0%BB.%20%D0%9F%D0%BE%D0%BF%D0%BE%D0%B2%D0%B0%2C%2036";

export function Footer() {
  return (
    <footer className="bg-ink text-onDark">
      <div className="container-page pt-14 md:pt-20 pb-10 md:pb-14">
        <div className="grid gap-10 lg:gap-14 lg:grid-cols-12 items-start">
          <div className="lg:col-span-7 flex flex-col">
            <div className="flex items-center gap-2.5 mb-8">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-white text-ink text-[11px] font-bold tracking-tighter">
                PT
              </span>
              <span className="text-base font-semibold tracking-tight text-white">
                PhoneTrade
              </span>
            </div>

            <ul className="space-y-5 text-[15px] text-onDark">
              <li className="flex items-start gap-4">
                <span
                  aria-hidden
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-onDark"
                >
                  <Clock className="size-4" />
                </span>
                <span className="pt-1.5">
                  Работаем ежедневно с 10:00 до 20:00
                </span>
              </li>
              <li className="flex items-start gap-4">
                <span
                  aria-hidden
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-onDark"
                >
                  <MapPin className="size-4" />
                </span>
                <span className="pt-1.5">
                  Белгород, ул. Попова, 36{" "}
                  <span className="text-onDark-muted">
                    (Ун-г Белгород, 1 этаж)
                  </span>
                </span>
              </li>
            </ul>

            <div className="my-8 h-px w-32 bg-white/15" aria-hidden />

            <div className="flex flex-wrap items-center gap-x-10 gap-y-5">
              <a
                href="tel:+79040988877"
                className="group inline-flex items-center gap-3 text-[15px] font-medium text-white hover:text-onDark transition-colors"
              >
                <span
                  aria-hidden
                  className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 group-hover:border-white/40 transition-colors"
                >
                  <Phone className="size-4" />
                </span>
                +7 (904) 098-88-77
              </a>

              <ul className="flex items-center gap-2.5">
                {SOCIAL.map(({ href, label, glyph }) => (
                  <li key={label}>
                    <a
                      href={href}
                      aria-label={label}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex size-10 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-onDark hover:text-white"
                    >
                      {glyph}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-5">
            <a
              href={MAP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Открыть на Яндекс.Картах"
              className="block overflow-hidden rounded-3xl border border-white/10 bg-white/5 aspect-[16/9] lg:aspect-auto lg:h-[220px]"
            >
              <iframe
                src={MAP_SRC}
                title="PhoneTrade на карте — Белгород, ул. Попова, 36"
                loading="lazy"
                width="100%"
                height="100%"
                className="block w-full h-full border-0 grayscale-[0.15] contrast-[0.95] brightness-[0.95]"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </a>
          </div>
        </div>

        <p className="mt-10 md:mt-14 w-full text-[10px] md:text-[10.5px] leading-[1.5] tracking-tight text-onDark-muted">
          Копирование материалов сайта возможно только по письменному согласию
          PhoneTrade. Сервисный центр — постгарантийный (неавторизованный).
          Apple, Mac, iMac, MacBook, Pro, Air, Retina, macOS, iPhone, iPad и
          логотипы — товарные знаки Apple Inc., США и др. странах. Информация
          на сайте не является публичной офертой (ст. 437 ГК РФ).
        </p>

        <ul className="mt-8 flex flex-col md:flex-row md:flex-wrap items-start md:items-center justify-center gap-x-8 gap-y-3 text-sm">
          {LEGAL.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="text-onDark hover:text-white underline-offset-4 hover:underline transition-colors"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-white/5">
        <div className="container-page py-5 text-xs text-onDark-muted">
          © PhoneTrade, 2025 г. Все права защищены.
        </div>
      </div>
    </footer>
  );
}
