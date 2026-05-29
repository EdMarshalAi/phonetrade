"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Panel } from "@/components/admin/ui";
import { Field, TextInput, Textarea, Switch, AdminButton } from "@/components/admin/form";
import { IconPicker } from "@/components/admin/IconPicker";
import { BlocksEditor } from "@/components/admin/BlocksEditor";
import type { CartSettings, InfoBlock, CartPaymentMethod, CartDeliveryOption } from "@/lib/content";
import { saveCartSettings } from "./actions";

const TABS = [
  { key: "payment", label: "Оплата" },
  { key: "delivery", label: "Доставка" },
  { key: "blocks", label: "Блоки" },
] as const;
type Tab = (typeof TABS)[number]["key"];

let counter = 0;
function rid(p: string) {
  counter += 1;
  return `${p}-${Date.now().toString(36)}${counter}`;
}
function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-sm border border-border bg-white text-ink-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-40";

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
    if (res.error) return toast.error(res.error);
    toast.success("Настройки корзины сохранены");
    router.refresh();
  };

  const patchP = (i: number, p: Partial<CartPaymentMethod>) =>
    setPayments((a) => a.map((x, idx) => (idx === i ? { ...x, ...p } : x)));
  const patchD = (i: number, p: Partial<CartDeliveryOption>) =>
    setDelivery((a) => a.map((x, idx) => (idx === i ? { ...x, ...p } : x)));

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
          <p className="text-[13px] text-ink-muted">
            Способы оплаты в корзине. «База цены» определяет, какую цену товара брать (наличными/картой), а «Наценка» добавляет процент к итогу — например, +7% при оплате картой.
          </p>
          {payments.map((p, i) => (
            <Panel key={p.key} className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                <div className="pt-1">
                  <IconPicker value={p.icon ?? null} onChange={(name) => patchP(i, { icon: name })} />
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[14px] font-semibold text-ink">{p.label || "Способ оплаты"}</span>
                    <div className="flex items-center gap-1.5">
                      <Switch checked={p.enabled} onChange={(v) => patchP(i, { enabled: v })} label={p.enabled ? "Вкл" : "Выкл"} />
                      <button type="button" onClick={() => setPayments((a) => move(a, i, -1))} className={iconBtn} title="Выше"><ArrowUp className="h-4 w-4" strokeWidth={1.75} /></button>
                      <button type="button" onClick={() => setPayments((a) => move(a, i, 1))} className={iconBtn} title="Ниже"><ArrowDown className="h-4 w-4" strokeWidth={1.75} /></button>
                      <button type="button" onClick={() => setPayments((a) => a.filter((_, idx) => idx !== i))} className={cn(iconBtn, "text-sale hover:bg-sale/5")} title="Удалить"><Trash2 className="h-4 w-4" strokeWidth={1.75} /></button>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Название"><TextInput value={p.label} onChange={(e) => patchP(i, { label: e.target.value })} /></Field>
                    <Field label="Подпись (под названием)"><TextInput value={p.note} onChange={(e) => patchP(i, { note: e.target.value })} /></Field>
                  </div>
                  <Field label="Описание (текст под выбранным способом в корзине)">
                    <Textarea value={p.description} onChange={(e) => patchP(i, { description: e.target.value })} className="min-h-[56px]" placeholder="напр. После подтверждения заказа откроется приложение банка для оплаты по QR…" />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="База цены" hint="Какую цену товара брать">
                      <div className="inline-flex rounded-sm border border-border p-0.5">
                        {(["cash", "card"] as const).map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => patchP(i, { priceBase: b })}
                            className={cn(
                              "h-8 rounded-[3px] px-3 text-[13px] font-medium transition-colors",
                              p.priceBase === b ? "bg-ink text-white" : "text-ink-muted hover:text-ink"
                            )}
                          >
                            {b === "cash" ? "Наличными" : "Картой"}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Наценка, %" hint="Добавится к итогу (0 — без наценки)">
                      <TextInput type="number" min={0} value={p.surcharge} onChange={(e) => patchP(i, { surcharge: Number(e.target.value) || 0 })} className="w-28" />
                    </Field>
                  </div>
                </div>
              </div>
            </Panel>
          ))}
          <AdminButton type="button" variant="outline" size="sm" onClick={() => setPayments((a) => [...a, { key: rid("pay"), enabled: true, label: "Новый способ", note: "", description: "", icon: "credit-card", priceBase: "cash", surcharge: 0 }])}>
            <Plus className="h-4 w-4" strokeWidth={2} /> Добавить способ оплаты
          </AdminButton>
        </div>
      ) : tab === "delivery" ? (
        <div className="space-y-4">
          <p className="text-[13px] text-ink-muted">Способы доставки. «Нужен адрес» включает форму адреса и времени (для курьера); иначе показывается описание (для самовывоза).</p>
          {delivery.map((d, i) => (
            <Panel key={d.key} className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                <div className="pt-1">
                  <IconPicker value={d.icon ?? null} onChange={(name) => patchD(i, { icon: name })} />
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[14px] font-semibold text-ink">{d.label || "Способ доставки"}</span>
                    <div className="flex items-center gap-1.5">
                      <Switch checked={d.enabled} onChange={(v) => patchD(i, { enabled: v })} label={d.enabled ? "Вкл" : "Выкл"} />
                      <button type="button" onClick={() => setDelivery((a) => move(a, i, -1))} className={iconBtn} title="Выше"><ArrowUp className="h-4 w-4" strokeWidth={1.75} /></button>
                      <button type="button" onClick={() => setDelivery((a) => move(a, i, 1))} className={iconBtn} title="Ниже"><ArrowDown className="h-4 w-4" strokeWidth={1.75} /></button>
                      <button type="button" onClick={() => setDelivery((a) => a.filter((_, idx) => idx !== i))} className={cn(iconBtn, "text-sale hover:bg-sale/5")} title="Удалить"><Trash2 className="h-4 w-4" strokeWidth={1.75} /></button>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Название"><TextInput value={d.label} onChange={(e) => patchD(i, { label: e.target.value })} /></Field>
                    <Field label="Подпись (под названием)"><TextInput value={d.note} onChange={(e) => patchD(i, { note: e.target.value })} /></Field>
                  </div>
                  <Field label="Описание (текст под выбранным способом)">
                    <Textarea value={d.description} onChange={(e) => patchD(i, { description: e.target.value })} className="min-h-[56px]" />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="flex items-end pb-1">
                      <Switch checked={d.requiresAddress} onChange={(v) => patchD(i, { requiresAddress: v })} label="Нужен адрес" />
                    </div>
                    <Field label="Стоимость, ₽" hint="0 — бесплатно"><TextInput type="number" min={0} value={d.price} onChange={(e) => patchD(i, { price: Number(e.target.value) || 0 })} /></Field>
                    <Field label="Бесплатно от, ₽" hint="0 — порога нет"><TextInput type="number" min={0} value={d.freeFrom} onChange={(e) => patchD(i, { freeFrom: Number(e.target.value) || 0 })} /></Field>
                  </div>
                </div>
              </div>
            </Panel>
          ))}
          <AdminButton type="button" variant="outline" size="sm" onClick={() => setDelivery((a) => [...a, { key: rid("del"), enabled: true, label: "Новый способ", note: "", description: "", icon: "truck", requiresAddress: false, price: 0, freeFrom: 0 }])}>
            <Plus className="h-4 w-4" strokeWidth={2} /> Добавить способ доставки
          </AdminButton>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-[13px] text-ink-muted">Блоки доверия под кнопкой «Подтвердить заказ» в корзине.</p>
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
