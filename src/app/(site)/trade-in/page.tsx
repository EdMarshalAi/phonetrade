import type { Metadata } from "next";
import { getActiveTradeInModels } from "@/lib/trade-in/trade-in-actions";
import { getTradeInSteps } from "@/lib/content";
import { getStorefrontUser } from "@/lib/auth/server-user";
import { TradeInQuiz } from "@/components/trade-in/TradeInQuiz";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trade-in iPhone в Белгороде — узнать цену за 2 минуты",
  description:
    "Сдайте старый iPhone и получите деньги или скидку на новый. Оценка онлайн за 2 минуты, выкуп в Белгороде с гарантией. Принимаем iPhone от 8 до 16 Pro Max.",
  alternates: { canonical: "/trade-in" },
};

const FAQ = [
  { q: "Можно ли сдать iPhone с разбитым экраном?", a: "Да, мы принимаем устройства с различными повреждениями. Цена будет ниже, но предложение мы всё равно сделаем." },
  { q: "Что если iCloud привязан и я не помню пароль?", a: "Без отвязки Apple ID мы не сможем принять устройство. Восстановить пароль можно через iforgot.apple.com." },
  { q: "Сколько занимает осмотр?", a: "В среднем 15–20 минут. Менеджер проверит внешний вид, функции и состояние аккумулятора." },
  { q: "Как я получу деньги?", a: "Наличными, на банковскую карту по СБП или в виде скидки на новый iPhone — доплачиваете только разницу." },
  { q: "Что если я не согласен с ценой после осмотра?", a: "Можете отказаться без штрафа. Никаких обязательств после онлайн-оценки нет." },
  { q: "Какие модели вы принимаете?", a: "Все iPhone начиная с iPhone 8. Если не нашли свою модель в калькуляторе — позвоните +7 (904) 098-88-77." },
];

const FALLBACK_STEPS = [
  { n: 1, title: "Узнайте цену", description: "Пройдите оценку за 2 минуты онлайн — без визита в магазин." },
  { n: 2, title: "Принесите в магазин", description: "Покажите устройство менеджеру для осмотра — ул. Попова, 36." },
  { n: 3, title: "Получите деньги", description: "Наличными, на карту по СБП или скидкой на новый iPhone." },
];

export default async function TradeInPage() {
  const [models, stepRows, initialUser] = await Promise.all([getActiveTradeInModels(), getTradeInSteps(), getStorefrontUser()]);
  const steps = stepRows.length > 0 ? stepRows.map((s) => ({ n: s.step_number, title: s.title, description: s.description ?? "" })) : FALLBACK_STEPS;

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero — узкий баннер на всю ширину, без кнопки */}
      <section className="bg-ink text-white">
        <div className="container-page py-10 text-center md:py-14">
          <span className="inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">Trade-in</span>
          <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-[1.05] tracking-[-0.03em] text-white md:text-5xl">
            Trade-in iPhone в Белгороде
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/65 md:text-[17px]">
            Узнайте цену вашего iPhone за 2 минуты онлайн — получите деньги или скидку на новый.
          </p>
        </div>
      </section>

      {/* Квиз */}
      <section id="quiz" className="scroll-mt-24 bg-white">
        <div className="container-page py-14 md:py-20">
          <TradeInQuiz models={models} initialUser={initialUser} />
        </div>
      </section>

      {/* Как это работает — тёмная секция (контент с главной) */}
      <section className="bg-ink text-white">
        <div className="container-page py-16 md:py-24">
          <h2 className="text-center text-3xl font-semibold tracking-[-0.02em] text-white md:text-4xl">Как это работает</h2>
          <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="rounded-3xl border border-white/10 bg-white/[0.04] p-7">
                <span aria-hidden className="inline-flex size-11 items-center justify-center rounded-2xl bg-white/10 text-[17px] font-semibold text-white">{s.n}</span>
                <h3 className="mt-4 text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-white/60">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — на всю ширину, по центру */}
      <section className="bg-surface">
        <div className="container-page py-16 md:py-24">
          <h2 className="text-center text-3xl font-semibold tracking-[-0.02em] text-ink md:text-4xl">Частые вопросы</h2>
          <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-3xl border border-border/60 bg-white px-6 md:px-8">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-b border-border/60 last:border-b-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[16px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="shrink-0 text-2xl font-normal leading-none text-ink-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="-mt-1 pb-5 text-[15px] leading-relaxed text-ink-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
