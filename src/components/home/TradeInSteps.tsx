"use client";

import * as React from "react";
import { motion, type Variants } from "motion/react";
import { cn } from "@/lib/utils/cn";

type Step = {
  n: number;
  title: string;
  description: string;
  bullets?: string[];
};

/** Шаг trade-in из БД (передаётся с главной). */
export type TradeInStepItem = Step;

const STEPS: Step[] = [
  {
    n: 1,
    title: "Оценка устройства",
    description:
      "Принесите iPhone, iPad, Mac или Watch — проверим за 15 минут и назовём точную сумму.",
    bullets: [
      "Проверка экрана, корпуса и работы кнопок",
      "Диагностика аккумулятора и памяти",
      "Никаких ограничений по году выпуска",
    ],
  },
  {
    n: 2,
    title: "Расчёт выгоды",
    description:
      "Сумма Trade-in вычитается прямо из стоимости новой модели — фиксируем цену в день обращения.",
    bullets: [
      "Прозрачная цена без скрытых платежей",
      "Можно добавить рассрочку или картой",
      "Сразу оформляем документы",
    ],
  },
  {
    n: 3,
    title: "Новое устройство",
    description:
      "Подбираем модель из каталога, переносим данные с прежнего устройства и настраиваем Apple ID на месте.",
    bullets: [
      "Перенос контактов, фото и приложений",
      "Активация и проверка перед уходом",
      "Гарантия и поддержка после покупки",
    ],
  },
];

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      delay: i * 0.1,
      ease: [0.32, 0.72, 0, 1],
    },
  }),
};

export function TradeInSteps({ steps }: { steps?: TradeInStepItem[] }) {
  const data = steps && steps.length > 0 ? steps : STEPS;
  return (
    <section className="bg-bg">
      <div className="container-page pt-2 md:pt-4 pb-20 md:pb-28">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
          className="max-w-3xl mb-12 md:mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1.04] text-ink">
            Как работает обмен техники
          </h2>
          <p className="mt-5 text-base md:text-lg text-ink-muted max-w-2xl">
            Три простых шага — без ожидания, скрытых платежей и долгих
            расчётов.
          </p>
        </motion.header>

        <div className="relative">
          <div
            aria-hidden
            className="hidden lg:block absolute left-[16.6%] right-[16.6%] top-[15px] h-px bg-border"
          />

          <div className="hidden lg:grid grid-cols-3 mb-10 relative">
            {data.map((s) => (
              <div
                key={s.n}
                className="justify-self-center inline-flex size-8 items-center justify-center rounded-full bg-ink text-white text-[13px] font-semibold ring-8 ring-bg"
              >
                {String(s.n).padStart(2, "0")}
              </div>
            ))}
          </div>

          <ol className="grid gap-5 md:gap-6 lg:grid-cols-3">
            {data.map((step, i) => (
              <motion.li
                key={step.n}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
              >
                <article
                  className={cn(
                    "group h-full rounded-3xl bg-white border border-border/60",
                    "p-7 md:p-8",
                    "transition-all duration-300 ease-[var(--ease-apple)]",
                    "hover:border-ink/25 hover:shadow-[0_18px_40px_-20px_rgba(0,0,0,0.10)]"
                  )}
                >
                  <div className="lg:hidden inline-flex items-center gap-2 text-xs text-ink-subtle uppercase tracking-[0.16em] mb-4">
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-ink text-white text-[11px] font-semibold">
                      {step.n}
                    </span>
                    Шаг {String(step.n).padStart(2, "0")}
                  </div>

                  <h3 className="text-xl md:text-2xl font-semibold tracking-[-0.02em] text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
                    {step.description}
                  </p>

                  <ul className="mt-6 space-y-2.5">
                    {(step.bullets ?? []).map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-3 text-sm text-ink"
                      >
                        <span
                          aria-hidden
                          className="mt-[7px] inline-flex size-1.5 shrink-0 rounded-full bg-ink/35"
                        />
                        <span className="leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
