"use client";

import * as React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { unsubscribeByCustomer, resubscribeByCustomer } from "./actions";

export function UnsubscribeClient({ customerId }: { customerId: string }) {
  const [state, setState] = React.useState<"loading" | "done" | "resubbed" | "invalid">(customerId ? "loading" : "invalid");
  const [name, setName] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!customerId) return;
    unsubscribeByCustomer(customerId).then((r) => {
      setName(r.name ?? null);
      setState(r.ok ? "done" : "invalid");
    });
  }, [customerId]);

  if (state === "loading") {
    return (
      <div className="py-6">
        <Loader2 className="mx-auto size-7 animate-spin text-ink-subtle" />
        <p className="mt-3 text-[14px] text-ink-muted">Отписываем…</p>
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <>
        <h1 className="text-[19px] font-semibold tracking-tight text-ink">Ссылка недействительна</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
          Не удалось обработать отписку. Напишите нам на{" "}
          <a href="mailto:admin@phonetrade31.ru" className="text-ink underline underline-offset-2">admin@phonetrade31.ru</a> — отпишем вручную.
        </p>
      </>
    );
  }

  if (state === "resubbed") {
    return (
      <>
        <CheckCircle2 className="mx-auto mb-3 size-9 text-emerald-600" strokeWidth={1.75} />
        <h1 className="text-[19px] font-semibold tracking-tight text-ink">Подписка возобновлена</h1>
        <p className="mt-2 text-[14px] text-ink-muted">Снова будете получать акции и новинки. Спасибо!</p>
      </>
    );
  }

  return (
    <>
      <CheckCircle2 className="mx-auto mb-3 size-9 text-emerald-600" strokeWidth={1.75} />
      <h1 className="text-[19px] font-semibold tracking-tight text-ink">Вы отписались{name ? `, ${name}` : ""}</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
        Больше не будем присылать акции и новинки. Транзакционные письма (подтверждения заказов) продолжат приходить — они часть оказания услуги.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={async () => { setBusy(true); const r = await resubscribeByCustomer(customerId); setBusy(false); if (r.ok) setState("resubbed"); }}
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-full border border-border bg-white px-5 text-[14px] font-medium text-ink transition-colors hover:bg-surface disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Подписаться обратно
      </button>
    </>
  );
}
