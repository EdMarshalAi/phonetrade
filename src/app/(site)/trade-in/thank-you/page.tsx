import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { getTradeInLeadByNumber, getUpsellProducts } from "@/lib/trade-in/trade-in-actions";

export const metadata: Metadata = { title: "Заявка отправлена — Trade-in | PhoneTrade", robots: { index: false } };

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n) + " ₽";

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const lead = sp.lead ? await getTradeInLeadByNumber(sp.lead) : null;
  const price = lead?.estimated_price_rub ?? 0;
  const upsell = lead ? await getUpsellProducts(price) : [];

  return (
    <section className="bg-surface">
      <div className="container-page py-16 md:py-24">
        {/* Результат */}
        <div className="mx-auto max-w-xl rounded-3xl border border-border/60 bg-white p-8 text-center md:p-10">
          <span aria-hidden className="inline-flex size-14 items-center justify-center rounded-full bg-ink text-white">
            <Check className="size-7" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink md:text-3xl">Заявка отправлена</h1>
          {lead ? (
            <>
              <p className="mt-1 text-[13px] uppercase tracking-wider text-ink-subtle">№ {lead.lead_number}</p>
              <p className="mt-6 text-[14px] text-ink-muted">Предварительная стоимость выкупа</p>
              <p className="mt-1 text-[44px] font-bold leading-none tracking-tight text-ink">{fmt(price)}</p>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">{lead.model_title} {lead.memory_gb}GB · точная цена — после осмотра в магазине</p>
            </>
          ) : (
            <p className="mt-6 text-[15px] text-ink-muted">Мы получили вашу заявку и скоро свяжемся с вами.</p>
          )}
        </div>

        {/* Что дальше */}
        <div className="mx-auto mt-10 max-w-xl">
          <h2 className="text-center text-lg font-semibold text-ink">Что будет дальше</h2>
          <ol className="mt-5 space-y-3">
            {["Менеджер свяжется с вами в течение 30 минут", "Договоримся об удобном времени визита", "Принесёте iPhone в магазин — оценим и выкупим"].map((t, i) => (
              <li key={i} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-white px-4 py-3.5">
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-white">{i + 1}</span>
                <span className="pt-0.5 text-[14px] text-ink">{t}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Upsell */}
        {upsell.length > 0 && (
          <div className="mx-auto mt-14 max-w-5xl">
            <h2 className="text-center text-2xl font-semibold tracking-[-0.02em] text-ink md:text-3xl">Или сразу выберите новый iPhone</h2>
            <p className="mt-3 text-center text-[15px] text-ink-muted">Зачтём вашу цену за trade-in — доплатите только разницу.</p>
            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {upsell.map((p) => {
                const surcharge = Math.max(0, p.priceCash - price);
                return (
                  <div key={p.id} className="flex flex-col rounded-3xl border border-border/60 bg-white p-6">
                    <div className="relative mx-auto aspect-square w-full max-w-[180px]">
                      {p.image ? <Image src={p.image} alt={p.title} fill className="object-contain" sizes="180px" unoptimized /> : null}
                    </div>
                    <h3 className="mt-4 min-h-[44px] text-[15px] font-semibold leading-snug text-ink">{p.title}</h3>
                    <div className="mt-auto">
                      <div className="mt-3 space-y-0.5 text-[13px]">
                        <div className="flex justify-between text-ink-muted"><span>Цена</span><span className="tabular-nums">{fmt(p.priceCash)}</span></div>
                        <div className="flex justify-between text-ink-muted"><span>Зачёт trade-in</span><span className="tabular-nums text-sale">− {fmt(price)}</span></div>
                      </div>
                      <div className="mt-3 border-t border-border/60 pt-3">
                        <p className="text-[12px] text-ink-subtle">Доплата</p>
                        <p className="text-xl font-bold tabular-nums text-ink">{fmt(surcharge)}</p>
                        {p.monthly > 0 && <p className="text-[12px] text-ink-subtle">≈ {fmt(p.monthly)}/мес в рассрочку</p>}
                      </div>
                      <Link href={`/product/${p.id}`} className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-ink text-sm font-medium text-white transition-colors hover:bg-ink/85">
                        Выбрать
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-12 text-center">
          <Link href="/" className="inline-flex h-12 items-center rounded-full border border-border px-7 text-sm font-medium text-ink transition-colors hover:border-ink/40">
            На главную
          </Link>
        </div>
      </div>
    </section>
  );
}
