import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Banknote, CreditCard, Check, MapPin, Truck } from "lucide-react";
import { MotionReveal, MotionStagger, MotionItem } from "@/components/ui/MotionReveal";

const TBANK_LOGO =
  "https://giwehapapi.beget.app/storage/v1/object/public/product-images/content/t-bank.svg";
const INSTALLMENT_IMG =
  "https://giwehapapi.beget.app/storage/v1/object/public/product-images/content/installment.png";

export const metadata: Metadata = {
  title: "Оплата и рассрочка — PhoneTrade Белгород",
  description:
    "Способы оплаты в PhoneTrade: наличными, банковской картой (VISA, MasterCard, МИР) и рассрочка от Т-Банк до 36 месяцев. Купить технику Apple в Белгороде на удобных условиях.",
  alternates: { canonical: "/payment" },
  openGraph: {
    title: "Оплата и рассрочка — PhoneTrade",
    description: "Наличные, карта и рассрочка от Т-Банк до 36 месяцев на технику Apple в Белгороде.",
    url: "/payment",
    type: "website",
  },
};

const WHERE = [
  { icon: MapPin, text: "В нашем офисе продаж: Белгород, ул. Попова, 36 (Универмаг «Белгород», 1 этаж)" },
  { icon: Truck, text: "При доставке товаров или оказании услуг" },
];

const INSTALLMENT = [
  "За 2 минуты",
  "От 3 до 36 месяцев",
  "Сумма покупки от 3 000 до 200 000 ₽",
  "Достаточно только паспорта",
  "Подписание с помощью СМС",
];

export default function PaymentPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-surface">
        <div className="container-page py-16 md:py-24">
          <MotionReveal className="max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-border/70 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              Оплата
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-ink md:text-5xl">
              Удобная оплата и рассрочка
            </h1>
            <p className="mt-5 text-[16px] leading-relaxed text-ink-muted">
              Оплатить покупку в PhoneTrade можно наличными, банковской картой или оформить
              рассрочку от Т-Банк прямо при заказе. Выберите подходящий способ — мы поможем на
              каждом шаге.
            </p>
          </MotionReveal>
        </div>
      </section>

      {/* Способы оплаты */}
      <section className="bg-white">
        <div className="container-page py-16 md:py-24">
          <MotionStagger className="grid gap-6 md:grid-cols-2">
            <MotionItem className="rounded-3xl border border-border/60 bg-white p-7 md:p-8">
              <span aria-hidden className="inline-flex size-11 items-center justify-center rounded-2xl bg-surface text-ink">
                <Banknote className="size-5" />
              </span>
              <h2 className="mt-4 text-xl font-semibold text-ink">Наличный расчёт</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
                Вы отдаёте деньги при получении товаров или оказании услуг и вместе с заказом
                получаете все необходимые документы и кассовый чек.
              </p>
              <p className="mt-5 text-[13px] font-medium uppercase tracking-[0.1em] text-ink-muted">
                Оплатить наличными можно
              </p>
              <ul className="mt-3 space-y-3">
                {WHERE.map((w) => (
                  <li key={w.text} className="flex items-start gap-3 text-[14px] text-ink">
                    <w.icon className="mt-0.5 size-[18px] shrink-0 text-ink-muted" aria-hidden />
                    {w.text}
                  </li>
                ))}
              </ul>
            </MotionItem>

            <MotionItem className="rounded-3xl border border-border/60 bg-white p-7 md:p-8">
              <span aria-hidden className="inline-flex size-11 items-center justify-center rounded-2xl bg-surface text-ink">
                <CreditCard className="size-5" />
              </span>
              <h2 className="mt-4 text-xl font-semibold text-ink">Банковской картой</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
                Мы используем платёжный шлюз ПАО «Сбербанк России» и принимаем к оплате карты
                VISA, MasterCard и МИР.
              </p>
              <p className="mt-5 text-[13px] font-medium uppercase tracking-[0.1em] text-ink-muted">
                Оплатить картой можно
              </p>
              <ul className="mt-3 space-y-3">
                {WHERE.map((w) => (
                  <li key={w.text} className="flex items-start gap-3 text-[14px] text-ink">
                    <w.icon className="mt-0.5 size-[18px] shrink-0 text-ink-muted" aria-hidden />
                    {w.text}
                  </li>
                ))}
              </ul>
            </MotionItem>
          </MotionStagger>
        </div>
      </section>

      {/* Рассрочка Т-Банк */}
      <section className="bg-surface">
        <div className="container-page py-16 md:py-24">
          <MotionReveal>
            <div className="overflow-hidden rounded-3xl border border-border/60 bg-white">
              <div className="grid items-center gap-8 p-7 md:grid-cols-2 md:gap-12 md:p-12">
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={TBANK_LOGO} alt="Т-Банк" width={160} height={63} className="h-[52px] w-auto" />
                  <h2 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-ink md:text-3xl">
                    Рассрочка от Т-Банк
                  </h2>
                  <ul className="mt-6 space-y-3">
                    {INSTALLMENT.map((t) => (
                      <li key={t} className="flex items-start gap-3 text-[15px] text-ink">
                        <span aria-hidden className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-ink text-white">
                          <Check className="size-3" />
                        </span>
                        {t}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 text-[12px] leading-relaxed text-ink-subtle">
                    0+ Рассрочка предоставляется АО «Т-Банк», лицензия №2673.
                  </p>
                </div>
                <div className="relative mx-auto aspect-square w-full max-w-[360px]">
                  <Image
                    src={INSTALLMENT_IMG}
                    alt="Рассрочка 0-0-0 от Т-Банк"
                    fill
                    className="object-contain"
                    sizes="(max-width:768px) 80vw, 360px"
                  />
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/catalog"
                className="inline-flex h-12 items-center rounded-full bg-ink px-7 text-sm font-medium text-white transition-colors hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2"
              >
                Выбрать технику
              </Link>
              <Link
                href="/delivery"
                className="inline-flex h-12 items-center rounded-full border border-border px-7 text-sm font-medium text-ink transition-colors hover:border-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
              >
                О доставке
              </Link>
            </div>
          </MotionReveal>
        </div>
      </section>
    </>
  );
}
