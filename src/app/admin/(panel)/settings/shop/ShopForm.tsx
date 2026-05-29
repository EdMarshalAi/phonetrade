"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { Plus, ArrowUp, ArrowDown, Trash2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Field, TextInput, Select, Switch, AdminButton } from "@/components/admin/form";
import { Panel, PanelTitle } from "@/components/admin/ui";
import { Modal } from "@/components/admin/Modal";
import { ImageField } from "@/components/admin/ImageField";
import { IconPicker } from "@/components/admin/IconPicker";
import { resolveIcon } from "@/lib/admin/icons";
import type { ShopContactLink } from "@/lib/content";
import { saveShopSettings, type ShopGeneral } from "./actions";

const TABS = [
  { key: "main", label: "Основные" },
  { key: "contacts", label: "Контакты и информация" },
  { key: "legal", label: "Юр. информация" },
] as const;
type Tab = (typeof TABS)[number]["key"];

let counter = 0;
function rid() {
  counter += 1;
  return `c-${Date.now().toString(36)}${counter}`;
}
function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const n = [...arr];
  [n[i], n[j]] = [n[j], n[i]];
  return n;
}

const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-sm border border-border bg-white text-ink-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-40";

export function ShopForm({ initial }: { initial: ShopGeneral }) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("main");
  const [v, setV] = React.useState<ShopGeneral>(initial);
  const [contacts, setContacts] = React.useState<ShopContactLink[]>(
    Array.isArray(initial.contacts) ? initial.contacts : []
  );
  const [editC, setEditC] = React.useState<number | null>(null);
  const [saving, setSaving] = React.useState(false);

  const set = (patch: Partial<ShopGeneral>) => setV((s) => ({ ...s, ...patch }));
  const patchC = (i: number, p: Partial<ShopContactLink>) =>
    setContacts((a) => a.map((x, idx) => (idx === i ? { ...x, ...p } : x)));

  const save = async () => {
    setSaving(true);
    const res = await saveShopSettings({ ...v, contacts });
    setSaving(false);
    if (res?.error) return toast.error(res.error);
    toast.success("Настройки сохранены");
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

      {tab === "main" ? (
        <Panel className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Название магазина"><TextInput value={v.name ?? ""} onChange={(e) => set({ name: e.target.value })} placeholder="PhoneTrade" /></Field>
            <Field label="Часы работы"><TextInput value={v.working_hours ?? ""} onChange={(e) => set({ working_hours: e.target.value })} placeholder="Ежедневно 10:00–20:00" /></Field>
          </div>
          <Field label="Адрес"><TextInput value={v.address ?? ""} onChange={(e) => set({ address: e.target.value })} placeholder="Белгород, ул. Попова, 36" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Широта (lat)"><TextInput value={v.lat ?? ""} onChange={(e) => set({ lat: e.target.value })} placeholder="50.5977" /></Field>
            <Field label="Долгота (lng)"><TextInput value={v.lng ?? ""} onChange={(e) => set({ lng: e.target.value })} placeholder="36.5856" /></Field>
          </div>
        </Panel>
      ) : tab === "contacts" ? (
        <div className="space-y-5">
          <Panel className="space-y-4 p-5">
            <PanelTitle>Контактная информация</PanelTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Телефон"><TextInput value={v.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} placeholder="+7 …" /></Field>
              <Field label="Доп. телефон"><TextInput value={v.phone2 ?? ""} onChange={(e) => set({ phone2: e.target.value })} /></Field>
              <Field label="Email"><TextInput type="email" value={v.email ?? ""} onChange={(e) => set({ email: e.target.value })} /></Field>
            </div>
          </Panel>

          <div>
            <PanelTitle>Контакт-ссылки (шапка и футер)</PanelTitle>
            <p className="mt-1 mb-3 text-[13px] text-ink-muted">
              Иконка из набора или загруженная картинка бренда, ссылка и где показывать.
            </p>
            <Panel className="divide-y divide-border/60">
              {contacts.length === 0 ? (
                <p className="px-5 py-8 text-center text-[14px] text-ink-muted">Контактов нет.</p>
              ) : (
                contacts.map((c, i) => {
                  const Icon = c.icon ? resolveIcon(c.icon) : null;
                  const locLabel = c.location === "header" ? "Только шапка" : c.location === "footer" ? "Только футер" : "Шапка и футер";
                  return (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white text-ink">
                        {c.iconUrl ? (
                          <Image src={c.iconUrl} alt="" width={20} height={20} unoptimized className="size-5 object-contain" />
                        ) : Icon ? (
                          <Icon className="size-[18px]" strokeWidth={1.75} />
                        ) : null}
                      </span>
                      <button type="button" onClick={() => setEditC(i)} className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-[14px] font-medium text-ink">{c.label || "Контакт"}</span>
                        <span className="block truncate text-[12px] text-ink-subtle">{locLabel}{c.href ? ` · ${c.href}` : ""}</span>
                      </button>
                      <Switch checked={c.enabled} onChange={(on) => patchC(i, { enabled: on })} />
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" onClick={() => setEditC(i)} className={iconBtn} title="Изменить"><Pencil className="h-4 w-4" strokeWidth={1.75} /></button>
                        <button type="button" onClick={() => setContacts((a) => move(a, i, -1))} className={iconBtn} title="Выше"><ArrowUp className="h-4 w-4" strokeWidth={1.75} /></button>
                        <button type="button" onClick={() => setContacts((a) => move(a, i, 1))} className={iconBtn} title="Ниже"><ArrowDown className="h-4 w-4" strokeWidth={1.75} /></button>
                        <button type="button" onClick={() => setContacts((a) => a.filter((_, idx) => idx !== i))} className={cn(iconBtn, "text-sale hover:bg-sale/5")} title="Удалить"><Trash2 className="h-4 w-4" strokeWidth={1.75} /></button>
                      </div>
                    </div>
                  );
                })
              )}
              <div className="px-4 py-3">
                <AdminButton type="button" variant="outline" size="sm" onClick={() => setContacts((a) => { setEditC(a.length); return [...a, { id: rid(), label: "Новый контакт", value: "", href: "", icon: "phone", iconUrl: null, enabled: true, location: "both" }]; })}>
                  <Plus className="h-4 w-4" strokeWidth={2} /> Добавить контакт
                </AdminButton>
              </div>
            </Panel>
          </div>
        </div>
      ) : (
        <Panel className="space-y-4 p-5">
          <PanelTitle>Юридическая информация</PanelTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ИНН"><TextInput value={v.inn ?? ""} onChange={(e) => set({ inn: e.target.value })} /></Field>
            <Field label="ОГРН"><TextInput value={v.ogrn ?? ""} onChange={(e) => set({ ogrn: e.target.value })} /></Field>
          </div>
          <Field label="Юридический адрес"><TextInput value={v.legal_address ?? ""} onChange={(e) => set({ legal_address: e.target.value })} /></Field>
        </Panel>
      )}

      <div className="sticky bottom-0 -mx-1 flex items-center gap-2 border-t border-border/60 bg-bg/85 py-3 backdrop-blur-sm">
        <AdminButton type="button" onClick={save} loading={saving}>Сохранить настройки</AdminButton>
        <span className="text-[12px] text-ink-subtle">Контакты применяются в шапке и футере сайта.</span>
      </div>

      {/* Модалка контакта */}
      <Modal
        open={editC !== null}
        onClose={() => setEditC(null)}
        title="Контакт"
        footer={<AdminButton type="button" onClick={() => setEditC(null)}>Готово</AdminButton>}
      >
        {editC !== null && contacts[editC] ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Field label="Иконка">
                <IconPicker value={contacts[editC].icon ?? null} onChange={(name) => patchC(editC, { icon: name })} />
              </Field>
              <Field label="Название" className="flex-1">
                <TextInput value={contacts[editC].label} onChange={(e) => patchC(editC, { label: e.target.value })} placeholder="WhatsApp" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
              <Field label="Ссылка">
                <TextInput value={contacts[editC].href} onChange={(e) => patchC(editC, { href: e.target.value })} placeholder="https://wa.me/7900… или tel:+7900…" />
              </Field>
              <Field label="Где показывать">
                <Select value={contacts[editC].location} onChange={(e) => patchC(editC, { location: e.target.value as ShopContactLink["location"] })}>
                  <option value="both">Шапка и футер</option>
                  <option value="header">Только шапка</option>
                  <option value="footer">Только футер</option>
                </Select>
              </Field>
            </div>
            <div className="rounded-lg border border-border/60 bg-surface/40 p-3">
              <p className="mb-2 text-[12.5px] font-medium text-ink">
                Своя иконка соцсети
                <span className="ml-1 font-normal text-ink-subtle">— PNG/SVG бренда (VK, WhatsApp…). Заменит выбранную и покажется на сайте.</span>
              </p>
              <ImageField value={contacts[editC].iconUrl ?? null} onChange={(u) => patchC(editC, { iconUrl: u ?? null })} bucket="general" folder="contact-icons" />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
