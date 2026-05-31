import type { Metadata } from "next";
import { HelpCircle, MapPin, Wallet } from "lucide-react";
import { getActiveTradeInModels } from "@/lib/trade-in/trade-in-actions";
import { TradeInQuiz } from "@/components/trade-in/TradeInQuiz";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Trade-in iPhone в Белгороде — узнать цену за 2 минуты | PhoneTrade",
  description:
    "Сдайте старый iPhone и получите деньги или скидку на новый. Оценка онлайн за 2 минуты, выкуп в Белгороде с гарантией. Принимаем iPhone от 8 до 16 Pro Max.",
  alternates: { canonical: "/trade-in" },
};

const STEPS = [
  { icon: HelpCircle, title: "Узнайте цену", text: "Пройдите оценку за 2 минуты онлайн — без визита в магазин." },
  { icon: MapPin, title: "Принесите в магазин", text: "Покажите устройство менеджеру для осмотра — ул. Попова, 36." },
  { icon: Wallet, title: "Получите деньги", text: "Наличными, на карту по СБП или скидкой на новый iPhone." },
];

const FAQ = [
  { q: "Можно ли сдать iPhone с разбитым экраном?", a: "Да, мы принимаем устройства с различными повреждениями. Цена будет ниже, но предложение мы всё равно сделаем." },
  { q: "Что если iCloud привязан и я не помню пароль?", a: "Без отвязки Apple ID мы не сможем принять устройство. Восстановить пароль можно через iforgot.apple.com." },
  { q: "Сколько занимает осмотр?", a: "В среднем 15–20 минут. Менеджер проверит внешний вид, функции и состояние аккумулятора." },
  { q: "Как я получу деньги?", a: "Наличными, на банковскую карту по СБП или в виде скидки на новый iPhone — доплачиваете только разницу." },
  { q: "Что если я не согласен с ценой после осмотра?", a: "Можете отказаться без штрафа. Никаких обязательств после онлайн-оценки нет." },
  { q: "Какие модели вы принимаете?", a: "Все iPhone начиная с iPhone 8. Если не нашли свою модель в калькуляторе — позвоните +7 (904) 098-88-77." },
];

export default async function TradeInPage() {
  const models = await getActiveTradeInModels();

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <section className="bg-surface">
        <div className="container-page py-16 text-center md:py-24">
          <span className="inline-flex items-center rounded-full border border-border/70 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">Trade-in</span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-ink md:text-6xl">
            Сдай старый — забери новый
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-ink-muted md:text-lg">
            Узнайте цену вашего iPhone за 2 минуты онлайн. Получите деньги или скидку на новый.
          </p>
          <a href="#quiz" className="mt-8 inline-flex h-12 items-center rounded-full bg-ink px-8 text-sm font-medium text-white transition-colors hover:bg-ink/85">
            Узнать цену
          </a>
        </div>
      </section>

      {/* Квиз */}
      <section id="quiz" className="scroll-mt-24 bg-white">
        <div className="container-page py-14 md:py-20">
          <TradeInQuiz models={models} />
        </div>
      </section>

      {/* Как это работает */}
      <section className="bg-surface">
        <div className="container-page py-16 md:py-24">
          <h2 className="text-center text-3xl font-semibold tracking-[-0.02em] text-ink md:text-4xl">Как это работает</h2>
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-3xl border border-border/60 bg-white p-7 text-center">
                <span aria-hidden className="inline-flex size-12 items-center justify-center rounded-2xl bg-surface text-ink">
                  <s.icon className="size-6" />
                </span>
                <p className="mt-4 text-[13px] font-semibold uppercase tracking-wider text-ink-subtle">Шаг {i + 1}</p>
                <h3 className="mt-1 text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white">
        <div className="container-page py-16 md:py-24">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-ink md:text-4xl">Частые вопросы</h2>
          <div className="mt-8 max-w-3xl">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-b border-border/60">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[16px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="text-2xl font-normal leading-none text-ink-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="pb-5 text-[15px] leading-relaxed text-ink-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
