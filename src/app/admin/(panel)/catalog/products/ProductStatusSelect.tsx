"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { updateProductStatus } from "./actions";

type StatusMeta = { value: string; label: string; dot: string; hint: string };
const STATUSES: StatusMeta[] = [
  { value: "published", label: "Опубликован", dot: "bg-[#0a7d3e]", hint: "Виден на сайте" },
  { value: "draft", label: "Черновик", dot: "bg-[#c98a00]", hint: "Скрыт с сайта (не готов)" },
  { value: "archived", label: "Архив", dot: "bg-ink-subtle", hint: "Скрыт с сайта (снят с продажи)" },
];
const META = (v: string) => STATUSES.find((s) => s.value === v) ?? STATUSES[0];

/**
 * Компактный индикатор статуса товара: цветная точка + подсказка (название при
 * наведении). Клик открывает всплывающее меню (портал с fixed-позицией — не
 * обрезается overflow таблиц) со сменой статуса. Используется в списке товаров и в прайсе.
 */
export function ProductStatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = React.useState(status);
  const [busy, setBusy] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [rect, setRect] = React.useState<{ top: number; left: number } | null>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  // синхронизация со свежим prop (после router.refresh) — без эффекта, по паттерну React
  const [prevStatus, setPrevStatus] = React.useState(status);
  if (status !== prevStatus) { setPrevStatus(status); setValue(status); }

  React.useEffect(() => setMounted(true), []);

  const place = React.useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const W = 200;
    setRect({ top: r.bottom + 4, left: Math.max(8, r.right - W) });
  }, []);
  React.useEffect(() => {
    if (!open) return;
    place();
    const onScroll = (e: Event) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, place]);

  const pick = async (next: string) => {
    setOpen(false);
    if (next === value) return;
    const prev = value;
    setValue(next);
    setBusy(true);
    const res = await updateProductStatus(id, next);
    setBusy(false);
    if (res.error) { setValue(prev); toast.error(res.error); return; }
    toast.success(next === "published" ? "Опубликован на сайте" : "Скрыт с сайта");
    router.refresh();
  };

  const cur = META(value);
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={busy}
        title={cur.label + " — " + cur.hint}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2 py-1 text-ink-subtle transition-colors hover:border-ink/30 hover:text-ink disabled:opacity-50"
      >
        <span className={cn("size-2 shrink-0 rounded-full", cur.dot)} />
        <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-180")} strokeWidth={2} />
      </button>
      {open && mounted && rect
        ? createPortal(
            <>
              <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} aria-hidden />
              <div
                ref={menuRef}
                className="fixed z-[91] w-[200px] overflow-hidden rounded-md border border-border/70 bg-white py-1 shadow-lg"
                style={{ top: rect.top, left: rect.left }}
              >
                {STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => pick(s.value)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors hover:bg-surface",
                      s.value === value ? "text-ink" : "text-ink-muted"
                    )}
                  >
                    <span className={cn("size-2 shrink-0 rounded-full", s.dot)} />
                    <span className="flex-1">{s.label}</span>
                    {s.value === value ? <Check className="h-3.5 w-3.5 shrink-0 text-ink" /> : null}
                  </button>
                ))}
              </div>
            </>,
            document.body
          )
        : null}
    </>
  );
}
