"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Field, TextInput, Select, Switch, AdminButton } from "@/components/admin/form";
import { Panel, PanelTitle } from "@/components/admin/ui";
import { ImageField } from "@/components/admin/ImageField";
import { IconPicker } from "@/components/admin/IconPicker";
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

          <Panel className="space-y-4 p-5">
            <PanelTitle>Контакт-ссылки (шапка и футер)</PanelTitle>
            <p className="text-[13px] text-ink-muted">
              Включайте/выключайте, выбирайте иконку из набора или загружайте свою, и где показывать (шапка/футер).
            </p>
            {contacts.map((c, i) => (
              <div key={c.id} className="rounded-xl border border-border/60 bg-white p-4">
                {/* строка 1: иконка + название + действия */}
                <div className="flex items-center gap-3">
                  <IconPicker value={c.icon ?? null} onChange={(name) => patchC(i, { icon: name })} />
                  <input
                    value={c.label}
                    onChange={(e) => patchC(i, { label: e.target.value })}
                    placeholder="Название (напр. WhatsApp)"
                    className="h-10 min-w-0 flex-1 rounded-sm border border-border bg-white px-3 text-[14px] font-medium text-ink placeholder:text-ink-subtle focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15"
                  />
                  <Switch checked={c.enabled} onChange={(on) => patchC(i, { enabled: on })} />
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setContacts((a) => move(a, i, -1))} className={iconBtn} title="Выше"><ArrowUp className="h-4 w-4" strokeWidth={1.75} /></button>
                    <button type="button" onClick={() => setContacts((a) => move(a, i, 1))} className={iconBtn} title="Ниже"><ArrowDown className="h-4 w-4" strokeWidth={1.75} /></button>
                    <button type="button" onClick={() => setContacts((a) => a.filter((_, idx) => idx !== i))} className={cn(iconBtn, "text-sale hover:bg-sale/5")} title="Удалить"><Trash2 className="h-4 w-4" strokeWidth={1.75} /></button>
                  </div>
                </div>
                {/* строка 2: ссылка + где показывать */}
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_200px]">
                  <Field label="Ссылка"><TextInput value={c.href} onChange={(e) => patchC(i, { href: e.target.value })} placeholder="https://wa.me/7900… или tel:+7900…" /></Field>
                  <Field label="Где показывать">
                    <Select value={c.location} onChange={(e) => patchC(i, { location: e.target.value as ShopContactLink["location"] })}>
                      <option value="both">Шапка и футер</option>
                      <option value="header">Только шапка</option>
                      <option value="footer">Только футер</option>
                    </Select>
                  </Field>
                </div>
                {/* строка 3: своя иконка (необязательно) */}
                <details className="mt-3 group">
                  <summary className="cursor-pointer list-none text-[12.5px] text-ink-muted hover:text-ink">
                    Своя иконка <span className="text-ink-subtle">(необязательно, заменит выбранную)</span>
                  </summary>
                  <div className="mt-3">
                    <ImageField value={c.iconUrl ?? null} onChange={(u) => patchC(i, { iconUrl: u ?? null })} bucket="general" folder="contact-icons" />
                  </div>
                </details>
              </div>
            ))}
            <AdminButton type="button" variant="outline" size="sm" onClick={() => setContacts((a) => [...a, { id: rid(), label: "Новый контакт", value: "", href: "", icon: "phone", iconUrl: null, enabled: true, location: "both" }])}>
              <Plus className="h-4 w-4" strokeWidth={2} /> Добавить контакт
            </AdminButton>
          </Panel>
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
    </div>
  );
}
