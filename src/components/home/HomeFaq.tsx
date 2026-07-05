import { Plus } from "lucide-react";
import { HOME_FAQ } from "@/lib/home-faq";
import { MotionReveal } from "@/components/ui/MotionReveal";

/**
 * Видимый FAQ на главной (server; синхронизирован с FAQPage-схемой). Редакторский
 * минимализм: без карточек-коробок, только hairline-разделители, крупная
 * типографика, «+»→«×» переключатель. Локальные вопросы под нейро-поиск/PAA.
 */
export function HomeFaq() {
  return (
    <section className="bg-white">
      <div className="container-page py-20 md:py-28">
        <div className="mx-auto max-w-3xl">
          <MotionReveal>
            <span className="block text-xs uppercase tracking-[0.18em] text-ink-subtle">Поддержка</span>
            <h2 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-ink md:text-5xl">
              Частые вопросы
            </h2>
            <p className="mt-5 max-w-xl text-base text-ink-muted md:text-lg">
              Коротко о покупке, доставке, гарантии, Trade-in и ремонте техники Apple в Белгороде.
            </p>
          </MotionReveal>

          <MotionReveal delay={0.08}>
            <div className="mt-12 border-t border-border/60">
              {HOME_FAQ.map((f) => (
                <details key={f.q} className="group border-b border-border/60">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-lg font-medium text-ink transition-colors hover:text-ink/70 md:text-xl">
                    <span>{f.q}</span>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border/60 text-ink-subtle transition-all duration-500 ease-[var(--ease-apple)] group-open:rotate-45 group-open:border-ink group-open:text-ink">
                      <Plus className="size-4" strokeWidth={1.75} />
                    </span>
                  </summary>
                  <p className="-mt-1 max-w-2xl pb-7 text-[15px] leading-relaxed text-ink-muted md:text-base">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </MotionReveal>
        </div>
      </div>
    </section>
  );
}
