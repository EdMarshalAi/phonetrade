"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, ArrowUp, ArrowDown, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Panel } from "@/components/admin/ui";
import { Field, TextInput, Textarea, AdminButton } from "@/components/admin/form";
import type { ProductOption, ProductBadge } from "@/lib/content";
import { saveProductRegistry } from "./actions";

const TABS = [
  { key: "options", label: "Опции" },
  { key: "badges", label: "Бейджики" },
] as const;
type Tab = (typeof TABS)[number]["key"];

function rid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function ProductSettingsForm({
  initialOptions,
  initialBadges,
}: {
  initialOptions: ProductOption[];
  initialBadges: ProductBadge[];
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("options");
  const [options, setOptions] = React.useState<ProductOption[]>(initialOptions);
  const [badges, setBadges] = React.useState<ProductBadge[]>(initialBadges);
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    setSaving(true);
    const res = await saveProductRegistry(options, badges);
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
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

      {tab === "options" ? (
        <OptionsTab options={options} setOptions={setOptions} />
      ) : (
        <BadgesTab badges={badges} setBadges={setBadges} />
      )}

      <div className="sticky bottom-0 -mx-1 flex items-center gap-2 border-t border-border/60 bg-bg/80 py-3 backdrop-blur-sm">
        <AdminButton type="button" onClick={save} loading={saving}>
          Сохранить
        </AdminButton>
        <span className="text-[12px] text-ink-subtle">Изменения применяются к фильтрам и бейджам на сайте.</span>
      </div>
    </div>
  );
}

/* ── Опции ────────────────────────────────────────────────────────────────── */

function OptionsTab({
  options,
  setOptions,
}: {
  options: ProductOption[];
  setOptions: React.Dispatch<React.SetStateAction<ProductOption[]>>;
}) {
  const patch = (i: number, p: Partial<ProductOption>) =>
    setOptions((arr) => arr.map((o, idx) => (idx === i ? { ...o, ...p } : o)));

  return (
    <div className="space-y-4">
      {options.map((opt, i) => (
        <Panel key={opt.key} className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <GripVertical className="mt-2.5 h-4 w-4 shrink-0 text-ink-subtle" strokeWidth={1.75} />
            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <Field label="Название" hint={opt.field ? `Базовая опция · поле «${opt.field}»` : "Кастомная опция"}>
                <TextInput value={opt.label} onChange={(e) => patch(i, { label: e.target.value })} />
              </Field>
              <div className="flex items-end gap-1.5 pb-1">
                <button type="button" onClick={() => setOptions((a) => move(a, i, -1))} className={iconBtn} title="Выше">
                  <ArrowUp className="h-4 w-4" strokeWidth={1.75} />
                </button>
                <button type="button" onClick={() => setOptions((a) => move(a, i, 1))} className={iconBtn} title="Ниже">
                  <ArrowDown className="h-4 w-4" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => setOptions((a) => a.filter((_, idx) => idx !== i))}
                  className={cn(iconBtn, "text-sale hover:bg-sale/5")}
                  title="Удалить опцию"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
            </div>
          </div>
          <ValuesEditor values={opt.values} onChange={(values) => patch(i, { values })} />
        </Panel>
      ))}

      <AdminButton
        type="button"
        variant="outline"
        onClick={() =>
          setOptions((a) => [...a, { key: rid("opt"), label: "Новая опция", field: null, values: [], sort: a.length }])
        }
      >
        <Plus className="h-4 w-4" strokeWidth={2} /> Добавить опцию
      </AdminButton>
    </div>
  );
}

function ValuesEditor({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = React.useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || values.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <span className="block text-[13px] font-medium text-ink">Значения справочника</span>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[12.5px] text-ink">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="text-ink-subtle hover:text-sale">
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </span>
        ))}
        {values.length === 0 ? <span className="text-[12.5px] text-ink-subtle">Значений нет</span> : null}
      </div>
      <div className="flex max-w-sm items-center gap-2">
        <TextInput
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Добавить значение и Enter"
          className="h-9"
        />
        <AdminButton type="button" variant="outline" size="sm" onClick={add}>
          Добавить
        </AdminButton>
      </div>
    </div>
  );
}

/* ── Бейджики ──────────────────────────────────────────────────────────────── */

function BadgesTab({
  badges,
  setBadges,
}: {
  badges: ProductBadge[];
  setBadges: React.Dispatch<React.SetStateAction<ProductBadge[]>>;
}) {
  const patch = (i: number, p: Partial<ProductBadge>) =>
    setBadges((arr) => arr.map((b, idx) => (idx === i ? { ...b, ...p } : b)));

  return (
    <div className="space-y-4">
      {badges.map((b, i) => (
        <Panel key={b.key} className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <div className="grid flex-1 gap-4 sm:grid-cols-[1fr_auto_auto]">
              <Field label="Название">
                <TextInput value={b.label} onChange={(e) => patch(i, { label: e.target.value })} />
              </Field>
              <ColorField label="Фон" value={b.bg} onChange={(v) => patch(i, { bg: v })} />
              <ColorField label="Текст" value={b.fg} onChange={(v) => patch(i, { fg: v })} />
            </div>
            <div className="flex items-end gap-1.5 pb-1">
              <button type="button" onClick={() => setBadges((a) => move(a, i, -1))} className={iconBtn} title="Выше">
                <ArrowUp className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <button type="button" onClick={() => setBadges((a) => move(a, i, 1))} className={iconBtn} title="Ниже">
                <ArrowDown className="h-4 w-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => setBadges((a) => a.filter((_, idx) => idx !== i))}
                className={cn(iconBtn, "text-sale hover:bg-sale/5")}
                title="Удалить бейдж"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>
          <Field label="Подсказка при наведении" hint="Если задана — у бейджа появляется иконка и тултип">
            <Textarea
              value={b.tooltip ?? ""}
              onChange={(e) => patch(i, { tooltip: e.target.value })}
              placeholder="напр. Имеет недостаток в виде невозможности предустановки RuStore"
              className="min-h-[64px]"
            />
          </Field>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-ink-subtle">Предпросмотр:</span>
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium ring-1 ring-black/[0.04]"
              style={{ backgroundColor: b.bg, color: b.fg }}
            >
              {b.label || "Бейдж"}
            </span>
          </div>
        </Panel>
      ))}

      <AdminButton
        type="button"
        variant="outline"
        onClick={() =>
          setBadges((a) => [...a, { key: rid("badge"), label: "Новый бейдж", bg: "#1d1d1f", fg: "#ffffff", tooltip: "", sort: a.length }])
        }
      >
        <Plus className="h-4 w-4" strokeWidth={2} /> Добавить бейдж
      </AdminButton>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10 shrink-0 cursor-pointer rounded-sm border border-border p-0.5"
        />
        <TextInput value={value} onChange={(e) => onChange(e.target.value)} className="w-24 font-mono text-[12px]" />
      </div>
    </Field>
  );
}

const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-sm border border-border bg-white text-ink-muted hover:bg-surface hover:text-ink disabled:opacity-40";
