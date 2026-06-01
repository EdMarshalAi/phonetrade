import * as React from "react";
import Image from "next/image";
import { MapPin, Clock, Phone, Mail } from "lucide-react";
import { ContactLinks } from "@/components/layout/ContactLinks";
import { CookieSettingsButton } from "@/components/legal/CookieConsent";


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

import type { ShopContacts, MenuLink } from "@/lib/content";

export function Footer({ contacts, legalLinks }: { contacts?: ShopContacts | null; legalLinks?: MenuLink[] }) {
  const hours = contacts?.working_hours || "Ежедневно 10:00–20:00";
  const address = contacts?.address || "Белгород, ул. Попова, 36 (Ун-г Белгород, 1 этаж)";
  const phone = contacts?.phone || "+7 (904) 098-88-77";
  const phoneTel = `tel:+${phone.replace(/\D/g, "")}`;
  const phoneShown = contacts?.phone_enabled !== false;
  const phone2 = contacts?.phone2?.trim();
  const phone2Shown = !!phone2 && contacts?.phone2_enabled !== false;
  const email = contacts?.email?.trim();
  const emailShown = !!email && contacts?.email_enabled !== false;
  // Реквизиты (юр. лицо / ИНН / ОГРН) — trust-сигнал для РФ-торговли.
  const cx = (contacts ?? {}) as Record<string, unknown>;
  const legalEntity = (cx.legal_entity as string | undefined)?.trim();
  const inn = (cx.inn as string | undefined)?.trim();
  const ogrn = (cx.ogrn as string | undefined)?.trim();
  const requisites = [legalEntity, inn ? `ИНН ${inn}` : "", ogrn ? `ОГРН ${ogrn}` : ""].filter(Boolean).join(" · ");
  // Юр. ссылки из меню админки (footer) с фолбэком на встроенные.
  const legal = legalLinks && legalLinks.length > 0 ? legalLinks.map((l) => ({ href: l.href, label: l.title })) : LEGAL;
  return (
    <footer className="bg-ink text-onDark">
      <div className="container-page pt-14 md:pt-20 pb-10 md:pb-14">
        <div className="grid gap-10 lg:gap-14 lg:grid-cols-12 items-start">
          <div className="lg:col-span-7 flex flex-col">
            <div className="flex items-center gap-2.5 mb-8">
              <Image src="/brand/logo-mark-white.png" alt="PhoneTrade" width={32} height={32} className="size-8 object-contain" />
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
                <span className="pt-1.5">{hours}</span>
              </li>
              <li className="flex items-start gap-4">
                <span
                  aria-hidden
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-onDark"
                >
                  <MapPin className="size-4" />
                </span>
                <span className="pt-1.5">{address}</span>
              </li>
            </ul>

            <div className="my-8 h-px w-32 bg-white/15" aria-hidden />

            <div className="flex flex-wrap items-center gap-x-10 gap-y-5">
              {phoneShown ? (
                <a
                  href={phoneTel}
                  className="group inline-flex items-center gap-3 text-[15px] font-medium text-white hover:text-onDark transition-colors"
                >
                  <span
                    aria-hidden
                    className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 group-hover:border-white/40 transition-colors"
                  >
                    <Phone className="size-4" />
                  </span>
                  {phone}
                </a>
              ) : null}

              {phone2Shown ? (
                <a
                  href={`tel:+${phone2!.replace(/\D/g, "")}`}
                  className="group inline-flex items-center gap-3 text-[15px] font-medium text-white hover:text-onDark transition-colors"
                >
                  <span aria-hidden className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 group-hover:border-white/40 transition-colors">
                    <Phone className="size-4" />
                  </span>
                  {phone2}
                </a>
              ) : null}

              {emailShown ? (
                <a
                  href={`mailto:${email}`}
                  className="group inline-flex items-center gap-3 text-[15px] font-medium text-white hover:text-onDark transition-colors"
                >
                  <span aria-hidden className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 group-hover:border-white/40 transition-colors">
                    <Mail className="size-4" />
                  </span>
                  {email}
                </a>
              ) : null}

              <ContactLinks
                contacts={contacts?.contacts}
                location="footer"
                className="flex items-center gap-2.5"
                itemClassName="inline-flex size-10 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-onDark hover:text-white"
                iconClassName="size-[15px]"
              />
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

        <ul className="mt-8 flex w-full flex-col md:flex-row md:flex-wrap items-start md:items-center md:justify-between gap-x-8 gap-y-3 text-sm">
          {legal.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="text-onDark hover:text-white underline-offset-4 hover:underline transition-colors"
              >
                {item.label}
              </a>
            </li>
          ))}
          <li>
            <CookieSettingsButton className="text-onDark hover:text-white underline-offset-4 hover:underline transition-colors" />
          </li>
        </ul>
      </div>

      <div className="border-t border-white/5">
        <div className="container-page flex flex-col gap-1 py-5 text-xs text-onDark-muted sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          {requisites ? <p>{requisites}</p> : <span />}
          <p>© PhoneTrade, 2025 г. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
}
