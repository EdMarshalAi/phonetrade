"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ArrowUp, ArrowDown, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Panel } from "@/components/admin/ui";
import { Field, TextInput, Textarea, Switch, AdminButton } from "@/components/admin/form";
import { Modal } from "@/components/admin/Modal";
import { IconPicker } from "@/components/admin/IconPicker";
import { BlocksEditor } from "@/components/admin/BlocksEditor";
import { resolveIcon } from "@/lib/admin/icons";
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

/** Единая компактная строка списка настроек (иконка + название + подпись + действия). */
function SettingRow({
  icon,
  title,
  subtitle,
  enabled,
  onToggle,
  onEdit,
  onUp,
  onDown,
  onDelete,
}: {
  icon: string | null;
  title: string;
  subtitle: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  onEdit: () => void;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
}) {
  const Icon = icon ? resolveIcon(icon) : null;
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-ink">
        {Icon ? <Icon className="size-[18px]" strokeWidth={1.75} /> : null}
      </span>
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[14px] font-medium text-ink">{title}</span>
        <span className="block truncate text-[12px] text-ink-subtle">{subtitle}</span>
      </button>
      <Switch checked={enabled} onChange={onToggle} />
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={onEdit} className={iconBtn} title="Изменить"><Pencil className="h-4 w-4" strokeWidth={1.75} /></button>
        <button type="button" onClick={onUp} className={iconBtn} title="Выше"><ArrowUp className="h-4 w-4" strokeWidth={1.75} /></button>
        <button type="button" onClick={onDown} className={iconBtn} title="Ниже"><ArrowDown className="h-4 w-4" strokeWidth={1.75} /></button>
        <button type="button" onClick={onDelete} className={cn(iconBtn, "text-sale hover:bg-sale/5")} title="Удалить"><Trash2 className="h-4 w-4" strokeWidth={1.75} /></button>
      </div>
    </div>
  );
}

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
  const [editPay, setEditPay] = React.useState<number | null>(null);
  const [editDel, setEditDel] = React.useState<number | null>(null);
  const [saving, setSaving] = React.useState(false);

  const patchP = (i: number, p: Partial<CartPaymentMethod>) =>
    setPayments((a) => a.map((x, idx) => (idx === i ? { ...x, ...p } : x)));
  const patchD = (i: number, p: Partial<CartDeliveryOption>) =>
    setDelivery((a) => a.map((x, idx) => (idx === i ? { ...x, ...p } : x)));

  const save = async () => {
    setSaving(true);
    const res = await saveCartSettings({ payments, delivery }, blocks);
    setSaving(false);
    if (res.error) return toast.error(res.error);
    toast.success("Настройки корзины сохранены");
    router.refresh();
  };

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
        <>
          <p className="text-[13px] text-ink-muted">
            «База цены» — какую цену товара брать (наличными/картой), «наценка» добавляет процент к итогу (напр. +7% картой).
          </p>
          <Panel className="divide-y divide-border/60">
            {payments.length === 0 ? (
              <p className="px-5 py-8 text-center text-[14px] text-ink-muted">Способов оплаты нет.</p>
            ) : (
              payments.map((p, i) => (
                <SettingRow
                  key={p.key}
                  icon={p.icon}
                  title={p.label || "Способ оплаты"}
                  subtitle={`${p.priceBase === "card" ? "Цена картой" : "Цена наличными"}${p.surcharge > 0 ? ` · +${p.surcharge}%` : ""}`}
                  enabled={p.enabled}
                  onToggle={(v) => patchP(i, { enabled: v })}
                  onEdit={() => setEditPay(i)}
                  onUp={() => setPayments((a) => move(a, i, -1))}
                  onDown={() => setPayments((a) => move(a, i, 1))}
                  onDelete={() => setPayments((a) => a.filter((_, idx) => idx !== i))}
                />
              ))
            )}
            <div className="px-4 py-3">
              <AdminButton type="button" variant="outline" size="sm" onClick={() => setPayments((a) => { setEditPay(a.length); return [...a, { key: rid("pay"), enabled: true, label: "Новый способ", note: "", description: "", icon: "credit-card", priceBase: "cash", surcharge: 0 }]; })}>
                <Plus className="h-4 w-4" strokeWidth={2} /> Добавить способ оплаты
              </AdminButton>
            </div>
          </Panel>
        </>
      ) : tab === "delivery" ? (
        <Panel className="divide-y divide-border/60">
          {delivery.length === 0 ? (
            <p className="px-5 py-8 text-center text-[14px] text-ink-muted">Способов доставки нет.</p>
          ) : (
            delivery.map((d, i) => (
              <SettingRow
                key={d.key}
                icon={d.icon}
                title={d.label || "Способ доставки"}
                subtitle={d.requiresAddress ? `С адресом${d.price > 0 ? ` · ${d.price} ₽` : " · бесплатно"}` : "Самовывоз"}
                enabled={d.enabled}
                onToggle={(v) => patchD(i, { enabled: v })}
                onEdit={() => setEditDel(i)}
                onUp={() => setDelivery((a) => move(a, i, -1))}
                onDown={() => setDelivery((a) => move(a, i, 1))}
                onDelete={() => setDelivery((a) => a.filter((_, idx) => idx !== i))}
              />
            ))
          )}
          <div className="px-4 py-3">
            <AdminButton type="button" variant="outline" size="sm" onClick={() => setDelivery((a) => { setEditDel(a.length); return [...a, { key: rid("del"), enabled: true, label: "Новый способ", note: "", description: "", icon: "truck", requiresAddress: false, price: 0, freeFrom: 0 }]; })}>
              <Plus className="h-4 w-4" strokeWidth={2} /> Добавить способ доставки
            </AdminButton>
          </div>
        </Panel>
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

      {/* Модалка способа оплаты */}
      <Modal
        open={editPay !== null}
        onClose={() => setEditPay(null)}
        title="Способ оплаты"
        footer={<AdminButton type="button" onClick={() => setEditPay(null)}>Готово</AdminButton>}
      >
        {editPay !== null && payments[editPay] ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <IconPicker value={payments[editPay].icon ?? null} onChange={(name) => patchP(editPay, { icon: name })} />
              <Field label="Название" className="flex-1">
                <TextInput value={payments[editPay].label} onChange={(e) => patchP(editPay, { label: e.target.value })} />
              </Field>
            </div>
            <Field label="Подпись (под названием)">
              <TextInput value={payments[editPay].note} onChange={(e) => patchP(editPay, { note: e.target.value })} />
            </Field>
            <Field label="Описание (текст под выбранным способом в корзине)">
              <Textarea value={payments[editPay].description} onChange={(e) => patchP(editPay, { description: e.target.value })} className="min-h-[64px]" placeholder="напр. После подтверждения заказа откроется приложение банка для оплаты по QR…" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="База цены" hint="Какую цену товара брать">
                <div className="inline-flex rounded-sm border border-border p-0.5">
                  {(["cash", "card"] as const).map((b) => (
                    <button key={b} type="button" onClick={() => patchP(editPay, { priceBase: b })}
                      className={cn("h-8 rounded-[3px] px-3 text-[13px] font-medium transition-colors", payments[editPay].priceBase === b ? "bg-ink text-white" : "text-ink-muted hover:text-ink")}>
                      {b === "cash" ? "Наличными" : "Картой"}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Наценка, %" hint="0 — без наценки">
                <TextInput type="number" min={0} value={payments[editPay].surcharge} onChange={(e) => patchP(editPay, { surcharge: Number(e.target.value) || 0 })} className="w-28" />
              </Field>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Модалка способа доставки */}
      <Modal
        open={editDel !== null}
        onClose={() => setEditDel(null)}
        title="Способ доставки"
        footer={<AdminButton type="button" onClick={() => setEditDel(null)}>Готово</AdminButton>}
      >
        {editDel !== null && delivery[editDel] ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <IconPicker value={delivery[editDel].icon ?? null} onChange={(name) => patchD(editDel, { icon: name })} />
              <Field label="Название" className="flex-1">
                <TextInput value={delivery[editDel].label} onChange={(e) => patchD(editDel, { label: e.target.value })} />
              </Field>
            </div>
            <Field label="Подпись (под названием)">
              <TextInput value={delivery[editDel].note} onChange={(e) => patchD(editDel, { note: e.target.value })} />
            </Field>
            <Field label="Описание (текст под выбранным способом)">
              <Textarea value={delivery[editDel].description} onChange={(e) => patchD(editDel, { description: e.target.value })} className="min-h-[64px]" />
            </Field>
            <Field label="Нужен адрес доставки">
              <Switch checked={delivery[editDel].requiresAddress} onChange={(v) => patchD(editDel, { requiresAddress: v })} label={delivery[editDel].requiresAddress ? "Да (показать форму адреса)" : "Нет (самовывоз)"} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Стоимость, ₽" hint="0 — бесплатно">
                <TextInput type="number" min={0} value={delivery[editDel].price} onChange={(e) => patchD(editDel, { price: Number(e.target.value) || 0 })} />
              </Field>
              <Field label="Бесплатно от, ₽" hint="0 — порога нет">
                <TextInput type="number" min={0} value={delivery[editDel].freeFrom} onChange={(e) => patchD(editDel, { freeFrom: Number(e.target.value) || 0 })} />
              </Field>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
