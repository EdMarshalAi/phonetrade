import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Страница не найдена — 404",
  robots: { index: false, follow: false },
};

/**
 * Креативная 404 в стиле Apple: «0» — вращающийся радужный шарик (nod к macOS
 * beach ball), вся композиция мягко парит. Самодостаточная (рендерится в
 * корневом layout без шапки/футера) — чистый фокус на сообщении.
 */
export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-surface px-6 text-center">
      {/* лёгкие кляксы для глубины */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 size-[320px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(167,139,250,0.18), transparent 70%)" }} />
        <div className="absolute -right-24 bottom-10 size-[320px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(96,165,250,0.16), transparent 70%)" }} />
      </div>

      <div className="relative flex select-none items-center justify-center gap-3 md:gap-6" style={{ animation: "floatSoft 6s ease-in-out infinite" }}>
        <span className="text-[110px] font-semibold leading-none tracking-tighter text-ink md:text-[190px]">4</span>
        {/* «0» — вращающийся радужный шарик */}
        <span
          className="relative inline-block size-[100px] rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.18)] md:size-[170px]"
          style={{ background: "conic-gradient(from 0deg,#ff5f6d,#ffc371,#47e0a0,#3aa0ff,#a06bff,#ff5f6d)", animation: "spinBall 3.5s linear infinite" }}
        >
          <span className="absolute inset-[20%] rounded-full bg-surface" />
        </span>
        <span className="text-[110px] font-semibold leading-none tracking-tighter text-ink md:text-[190px]">4</span>
      </div>

      <h1 className="relative mt-8 text-2xl font-semibold tracking-tight text-ink md:text-3xl">
        Похоже, страница потерялась
      </h1>
      <p className="relative mt-3 max-w-md text-[15px] leading-relaxed text-ink-muted">
        Возможно, ссылка устарела или адрес введён с ошибкой. Но у нас есть кое-что
        получше — техника Apple в Белгороде по выгодным ценам.
      </p>

      <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="inline-flex h-12 items-center rounded-full bg-ink px-7 text-[15px] font-medium text-white transition-colors hover:bg-ink/85">
          На главную
        </Link>
        <Link href="/catalog" className="inline-flex h-12 items-center rounded-full border border-border bg-white px-7 text-[15px] font-medium text-ink transition-colors hover:bg-surface">
          В каталог
        </Link>
      </div>
    </main>
  );
}
