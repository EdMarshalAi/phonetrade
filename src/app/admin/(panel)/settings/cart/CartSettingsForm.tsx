"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { Panel } from "@/components/admin/ui";
import { Field, TextInput, Switch, AdminButton } from "@/components/admin/form";
import { BlocksEditor } from "@/components/admin/BlocksEditor";
import type { CartSettings, InfoBlock, CartPaymentMethod, CartDeliveryOption } from "@/lib/content";
import { saveCartSettings } from "./actions";

const TABS = [
  { key: "payment", label: "Оплата" },
  { key: "delivery", label: "Доставка" },
  { key: "blocks", label: "Блоки" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export function CartSettingsForm({
  initial,
  initialBlocks,
}: {
  initial: CartSettings;
  initialBlocks: InfoBlock[];
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("payment");
  const [payments, setPayments] = React.useState<CartPaymentMethod[]>(initial.payments);
  const [delivery, setDelivery] = React.useState<CartDeliveryOption[]>(initial.delivery);
  const [blocks, setBlocks] = React.useState<InfoBlock[]>(initialBlocks);
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    setSaving(true);
    const res = await saveCartSettings({ payments, delivery }, blocks);
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Настройки корзины сохранены");
    router.refresh();
  };

  const patchPayment = (i: number, p: Partial<CartPaymentMethod>) =>
    setPayments((arr) => arr.map((x, idx) => (idx === i ? { ...x, ...p } : x)));
  const patchDelivery = (i: number, p: Partial<CartDeliveryOption>) =>
    setDelivery((arr) => arr.map((x, idx) => (idx === i ? { ...x, ...p } : x)));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1 border-b border-border/70">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "relative px-3.5 py-2 text-[13.5px] font-medium transition-colors",
              tab === t.key ? "text-ink" : "text-ink-muted hover:text-ink"
            )}
          >
            {t.label}
            {tab === t.key ? <span className="absolute inset-x-2.5 -bottom-px h-0.5 rounded-full bg-ink" /> : null}
          </button>
        ))}
      </div>

      {tab === "payment" ? (
        <div className="space-y-4">
          {payments.map((p, i) => (
            <Panel key={p.key} className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[14px] font-semibold text-ink">{p.label || p.key}</span>
                <Switch checked={p.enabled} onChange={(v) => patchPayment(i, { enabled: v })} label={p.enabled ? "Включён" : "Выключен"} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Название"><TextInput value={p.label} onChange={(e) => patchPayment(i, { label: e.target.value })} /></Field>
                <Field label="Подпись"><TextInput value={p.note} onChange={(e) => patchPayment(i, { note: e.target.value })} /></Field>
              </div>
            </Panel>
          ))}
        </div>
      ) : tab === "delivery" ? (
        <div className="space-y-4">
          {delivery.map((d, i) => (
            <Panel key={d.key} className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[14px] font-semibold text-ink">{d.label || d.key}</span>
                <Switch checked={d.enabled} onChange={(v) => patchDelivery(i, { enabled: v })} label={d.enabled ? "Включён" : "Выключен"} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Название"><TextInput value={d.label} onChange={(e) => patchDelivery(i, { label: e.target.value })} /></Field>
                <Field label="Подпись"><TextInput value={d.note} onChange={(e) => patchDelivery(i, { note: e.target.value })} /></Field>
              </div>
              {d.key === "courier" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Цена доставки, ₽" hint="0 — бесплатно">
                    <TextInput type="number" min={0} value={d.price} onChange={(e) => patchDelivery(i, { price: Number(e.target.value) || 0 })} />
                  </Field>
                  <Field label="Бесплатно от суммы, ₽" hint="0 — порога нет">
                    <TextInput type="number" min={0} value={d.freeFrom} onChange={(e) => patchDelivery(i, { freeFrom: Number(e.target.value) || 0 })} />
                  </Field>
                </div>
              ) : null}
            </Panel>
          ))}
        </div>
      ) : (
        <div>
          <p className="mb-3 text-[13px] text-ink-muted">Блоки под кнопкой «Подтвердить заказ» в корзине.</p>
          <BlocksEditor value={blocks} onChange={setBlocks} />
        </div>
      )}

      <div className="sticky bottom-0 -mx-1 flex items-center gap-2 border-t border-border/60 bg-bg/85 py-3 backdrop-blur-sm">
        <AdminButton type="button" onClick={save} loading={saving}>Сохранить</AdminButton>
        <span className="text-[12px] text-ink-subtle">Применяется к оформлению заказа на сайте.</span>
      </div>
    </div>
  );
}
