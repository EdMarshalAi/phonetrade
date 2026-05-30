"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, ArrowUp, ArrowDown, Trash2, Pencil, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Panel } from "@/components/admin/ui";
import { TextInput, Textarea, Select, AdminButton, ToggleRow } from "@/components/admin/form";
import { Modal } from "@/components/admin/Modal";
import { IconPicker } from "@/components/admin/IconPicker";
import { BlocksEditor } from "@/components/admin/BlocksEditor";
import { resolveIcon } from "@/lib/admin/icons";
import type { ProductOption, ProductBadge, InfoBlock, CardDisplay } from "@/lib/content";
import { DEFAULT_CARD_DISPLAY } from "@/lib/content";
import { saveProductRegistry } from "./actions";

const TABS = [
  { key: "card", label: "Карточка" },
  { key: "options", label: "Опции" },
  { key: "badges", label: "Бейджики" },
  { key: "blocks", label: "Блоки под товаром" },
  { key: "availability", label: "Наличие" },
] as const;

const CORNERS: { value: "tl" | "tr" | "bl" | "br"; label: string }[] = [
  { value: "tl", label: "Слева сверху" },
  { value: "tr", label: "Справа сверху" },
  { value: "bl", label: "Слева снизу" },
  { value: "br", label: "Справа снизу" },
];
type Tab = (typeof TABS)[number]["key"];

/** id без crypto.randomUUID (его нет в незащищённом контексте http) */
let counter = 0;
function rid(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter}`;
}

function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Палитра фонов и цветов текста для бейджей. */
const BG_SWATCHES = ["#1d1d1f", "#e30000", "#16794a", "#1f6c9f", "#b45309", "#6d28d9", "#6b7280", "#ffffff"];
const FG_SWATCHES = ["#ffffff", "#1d1d1f"];

const iconBtn =
  "inline-flex h-9 w-9 items-center justify-center rounded-sm border border-border bg-white text-ink-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-40";

export function ProductSettingsForm({
  initialOptions,
  initialBadges,
  initialBlocks,
  initialAllowZeroStock = true,
  initialCardDisplay = DEFAULT_CARD_DISPLAY,
}: {
  initialOptions: ProductOption[];
  initialBadges: ProductBadge[];
  initialBlocks: InfoBlock[];
  initialAllowZeroStock?: boolean;
  initialCardDisplay?: CardDisplay;
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("card");
  const [options, setOptions] = React.useState<ProductOption[]>(initialOptions);
  const [badges, setBadges] = React.useState<ProductBadge[]>(initialBadges);
  const [blocks, setBlocks] = React.useState<InfoBlock[]>(initialBlocks);
  const [allowZeroStock, setAllowZeroStock] = React.useState<boolean>(initialAllowZeroStock);
  const [card, setCard] = React.useState<CardDisplay>(initialCardDisplay);
  const [saving, setSaving] = React.useState(false);
  const [editOption, setEditOption] = React.useState<number | null>(null);
  const [editBadge, setEditBadge] = React.useState<number | null>(null);

  const setCardField = (patch: Partial<CardDisplay>) => setCard((c) => ({ ...c, ...patch }));
  const toggleCardOption = (key: string) => setCard((c) => ({ ...c, options: c.options.includes(key) ? c.options.filter((k) => k !== key) : [...c.options, key] }));

  const save = async () => {
    setSaving(true);
    const res = await saveProductRegistry(options, badges, blocks, allowZeroStock, card);
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Настройки сохранены");
    router.refresh();
  };

  const addOption = () => {
    setOptions((a) => {
      setEditOption(a.length);
      return [...a, { key: rid("opt"), label: "Новая опция", field: null, values: [], sort: a.length }];
    });
  };
  const addBadge = () => {
    setBadges((a) => {
      setEditBadge(a.length);
      return [...a, { key: rid("badge"), label: "Новый бейдж", bg: "#1d1d1f", fg: "#ffffff", icon: null, tooltip: "", sort: a.length }];
    });
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

      {tab === "card" ? (
        <div className="space-y-5">
          <Panel className="space-y-3 p-5">
            <p className="text-[14px] font-semibold text-ink">Что показывать на карточке</p>
            <p className="-mt-1 text-[13px] text-ink-muted">Применяется к карточкам товара на главной, в каталоге и в подборках.</p>
            <ToggleRow checked={card.cash} onChange={(v) => setCardField({ cash: v })} title="Цена наличными" hint="Красная цена" />
            <ToggleRow checked={card.card} onChange={(v) => setCardField({ card: v })} title="Цена картой" />
            <ToggleRow checked={card.credit} onChange={(v) => setCardField({ credit: v })} title="Строка «В кредит — от …/мес»" />
            <ToggleRow checked={card.old_price} onChange={(v) => setCardField({ old_price: v })} title="Старая цена (зачёркнутая)" hint="Показывается, если задана и больше текущей" />
            <ToggleRow checked={card.badges} onChange={(v) => setCardField({ badges: v })} title="Бейджи" hint="Раскладываются по углам (см. вкладку «Бейджики»)" />
          </Panel>
          <Panel className="space-y-3 p-5">
            <p className="text-[14px] font-semibold text-ink">Опции на карточке</p>
            <p className="-mt-1 text-[13px] text-ink-muted">Какие опции выводить доп. строками. У опции в её настройках можно задать тип товара (например «Состояние» — только Б/У).</p>
            {options.length === 0 ? (
              <p className="text-[13px] text-ink-subtle">Опций пока нет — добавьте на вкладке «Опции».</p>
            ) : (
              <div className="space-y-1.5">
                {options.map((o) => (
                  <ToggleRow
                    key={o.key}
                    checked={card.options.includes(o.key)}
                    onChange={() => toggleCardOption(o.key)}
                    title={o.label}
                    hint={o.applies_to && o.applies_to !== "both" ? `Только ${o.applies_to === "used" ? "Б/У" : "новые"}` : "Все товары"}
                  />
                ))}
              </div>
            )}
          </Panel>
          <Panel className="space-y-1.5 p-5">
            <p className="text-[14px] font-semibold text-ink">Генерация артикула (SKU)</p>
            <p className="text-[13px] text-ink-muted">
              Формула: <code className="rounded bg-surface px-1.5 py-0.5">PH{"{код категории}"}-{"{номер}"}</code>, например <b>PH584-1042</b>.
              «PH» — магазин, 3 цифры — код категории, последние цифры — уникальный номер (не повторяется).
              Кнопка «Сгенерировать» рядом с полем «Артикул» в карточке товара подбирает уникальный SKU автоматически.
            </p>
          </Panel>
        </div>
      ) : tab === "options" ? (
        <Panel className="divide-y divide-border/60">
          {options.length === 0 ? (
            <p className="px-5 py-8 text-center text-[14px] text-ink-muted">Опций пока нет.</p>
          ) : (
            options.map((opt, i) => (
              <Row
                key={opt.key}
                grip
                title={opt.label || "Без названия"}
                subtitle={
                  opt.field
                    ? `Базовая · ${opt.values.length} знач.`
                    : `Кастомная · ${opt.values.length} знач.`
                }
                onEdit={() => setEditOption(i)}
                onUp={() => setOptions((a) => move(a, i, -1))}
                onDown={() => setOptions((a) => move(a, i, 1))}
                onDelete={() => setOptions((a) => a.filter((_, idx) => idx !== i))}
              />
            ))
          )}
          <div className="px-4 py-3">
            <AdminButton type="button" variant="outline" size="sm" onClick={addOption}>
              <Plus className="h-4 w-4" strokeWidth={2} /> Добавить опцию
            </AdminButton>
          </div>
        </Panel>
      ) : tab === "badges" ? (
        <Panel className="divide-y divide-border/60">
          {badges.length === 0 ? (
            <p className="px-5 py-8 text-center text-[14px] text-ink-muted">Бейджей пока нет.</p>
          ) : (
            badges.map((b, i) => (
              <Row
                key={b.key}
                preview={<BadgeChip badge={b} />}
                title={b.label || "Без названия"}
                subtitle={b.tooltip ? "С подсказкой" : "Без подсказки"}
                onEdit={() => setEditBadge(i)}
                onUp={() => setBadges((a) => move(a, i, -1))}
                onDown={() => setBadges((a) => move(a, i, 1))}
                onDelete={() => setBadges((a) => a.filter((_, idx) => idx !== i))}
              />
            ))
          )}
          <div className="px-4 py-3">
            <AdminButton type="button" variant="outline" size="sm" onClick={addBadge}>
              <Plus className="h-4 w-4" strokeWidth={2} /> Добавить бейдж
            </AdminButton>
          </div>
        </Panel>
      ) : tab === "blocks" ? (
        <div>
          <p className="mb-3 text-[13px] text-ink-muted">
            Блоки на странице товара (самовывоз, доставка, гарантия, trade-in). Блок со ссылкой выделяется тёмной плашкой.
          </p>
          <BlocksEditor value={blocks} onChange={setBlocks} withHref onDone={save} saving={saving} />
        </div>
      ) : (
        <Panel className="space-y-4 p-5">
          <ToggleRow
            checked={allowZeroStock}
            onChange={setAllowZeroStock}
            title="Разрешать покупку товаров с нулевым остатком"
            hint="Если выключено — товары с остатком 0 не показываются на сайте и недоступны к заказу. Товары без указанного остатка («уточняйте») показываются всегда."
          />
        </Panel>
      )}

      <div className="sticky bottom-0 -mx-1 flex items-center gap-2 border-t border-border/60 bg-bg/85 py-3 backdrop-blur-sm">
        <AdminButton type="button" onClick={save} loading={saving}>
          Сохранить
        </AdminButton>
        <span className="text-[12px] text-ink-subtle">Применяется к фильтрам и бейджам на сайте.</span>
      </div>

      {/* Модалка опции */}
      <Modal
        open={editOption !== null}
        onClose={() => setEditOption(null)}
        title="Опция"
        footer={
          <AdminButton type="button" loading={saving} onClick={() => { setEditOption(null); void save(); }}>
            Готово и сохранить
          </AdminButton>
        }
      >
        {editOption !== null && options[editOption] ? (
          <OptionEditor
            option={options[editOption]}
            onChange={(patch) =>
              setOptions((a) => a.map((o, idx) => (idx === editOption ? { ...o, ...patch } : o)))
            }
          />
        ) : null}
      </Modal>

      {/* Модалка бейджа */}
      <Modal
        open={editBadge !== null}
        onClose={() => setEditBadge(null)}
        title="Бейдж"
        footer={
          <AdminButton type="button" loading={saving} onClick={() => { setEditBadge(null); void save(); }}>
            Готово и сохранить
          </AdminButton>
        }
      >
        {editBadge !== null && badges[editBadge] ? (
          <BadgeEditor
            badge={badges[editBadge]}
            onChange={(patch) =>
              setBadges((a) => a.map((b, idx) => (idx === editBadge ? { ...b, ...patch } : b)))
            }
          />
        ) : null}
      </Modal>
    </div>
  );
}

/* ── Компактная строка списка ────────────────────────────────────────────── */

function Row({
  title,
  subtitle,
  preview,
  grip,
  onEdit,
  onUp,
  onDown,
  onDelete,
}: {
  title: string;
  subtitle: string;
  preview?: React.ReactNode;
  grip?: boolean;
  onEdit: () => void;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {grip ? <GripVertical className="h-4 w-4 shrink-0 text-ink-subtle" strokeWidth={1.75} /> : null}
      {preview ? <div className="shrink-0">{preview}</div> : null}
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[14px] font-medium text-ink">{title}</span>
        <span className="block text-[12px] text-ink-subtle">{subtitle}</span>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={onEdit} className={iconBtn} title="Изменить">
          <Pencil className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button type="button" onClick={onUp} className={iconBtn} title="Выше">
          <ArrowUp className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button type="button" onClick={onDown} className={iconBtn} title="Ниже">
          <ArrowDown className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button type="button" onClick={onDelete} className={cn(iconBtn, "text-sale hover:bg-sale/5")} title="Удалить">
          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

/* ── Предпросмотр бейджа ─────────────────────────────────────────────────── */

function BadgeChip({ badge }: { badge: ProductBadge }) {
  const Icon = badge.icon ? resolveIcon(badge.icon) : null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-black/[0.06]"
      style={{ backgroundColor: badge.bg, color: badge.fg }}
    >
      {Icon ? <Icon className="h-3 w-3" strokeWidth={2} /> : null}
      {badge.label || "Бейдж"}
    </span>
  );
}

/* ── Редактор опции (в модалке) ──────────────────────────────────────────── */

function OptionEditor({
  option,
  onChange,
}: {
  option: ProductOption;
  onChange: (patch: Partial<ProductOption>) => void;
}) {
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-ink">Название</span>
        <TextInput value={option.label} onChange={(e) => onChange({ label: e.target.value })} />
        <span className="mt-1 block text-[12px] text-ink-subtle">
          {option.field ? `Базовая опция · поле «${option.field}»` : "Кастомная опция"}
        </span>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-ink">Применима к типу товара</span>
        <Select value={option.applies_to ?? "both"} onChange={(e) => onChange({ applies_to: e.target.value as ProductOption["applies_to"] })}>
          <option value="both">Все товары</option>
          <option value="new">Только новые</option>
          <option value="used">Только Б/У</option>
        </Select>
        <span className="mt-1 block text-[12px] text-ink-subtle">Если опция включена в показе на карточке — выводится только для этого типа. Напр. «Состояние» → только Б/У.</span>
      </label>
      <ValuesEditor values={option.values} onChange={(values) => onChange({ values })} />
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
      <div className="flex items-center gap-2">
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

/* ── Редактор бейджа (в модалке) ─────────────────────────────────────────── */

function BadgeEditor({
  badge,
  onChange,
}: {
  badge: ProductBadge;
  onChange: (patch: Partial<ProductBadge>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="shrink-0">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">Иконка</span>
          <IconPicker value={badge.icon ?? null} onChange={(name) => onChange({ icon: name })} />
        </div>
        <label className="block flex-1">
          <span className="mb-1.5 block text-[13px] font-medium text-ink">Название</span>
          <TextInput value={badge.label} onChange={(e) => onChange({ label: e.target.value })} />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-ink">Угол на карточке</span>
        <Select value={badge.position ?? "tl"} onChange={(e) => onChange({ position: e.target.value as ProductBadge["position"] })}>
          {CORNERS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>
      </label>

      <div className="grid grid-cols-2 gap-4">
        <Swatches label="Фон" value={badge.bg} colors={BG_SWATCHES} onChange={(c) => onChange({ bg: c })} />
        <Swatches label="Цвет текста" value={badge.fg} colors={FG_SWATCHES} onChange={(c) => onChange({ fg: c })} />
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-ink">Подсказка при наведении</span>
        <Textarea
          value={badge.tooltip ?? ""}
          onChange={(e) => onChange({ tooltip: e.target.value })}
          placeholder="напр. Имеет недостаток в виде невозможности предустановки RuStore"
          className="min-h-[64px]"
        />
        <span className="mt-1 block text-[12px] text-ink-subtle">Если задана — у бейджа появляется иконка ⓘ и тултип.</span>
      </label>

      <div className="flex items-center gap-2 rounded-md bg-surface/60 px-3 py-2.5">
        <span className="text-[12px] text-ink-subtle">Предпросмотр:</span>
        <BadgeChip badge={badge} />
      </div>
    </div>
  );
}

function Swatches({
  label,
  value,
  colors,
  onChange,
}: {
  label: string;
  value: string;
  colors: string[];
  onChange: (c: string) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-medium text-ink">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {colors.map((c) => {
          const active = value.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => onChange(c)}
              style={{ backgroundColor: c }}
              className={cn(
                "h-7 w-7 rounded-full ring-1 ring-black/10 transition",
                active && "ring-2 ring-ink ring-offset-2"
              )}
            />
          );
        })}
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          title="Свой цвет"
          className="h-7 w-7 shrink-0 cursor-pointer rounded-full border border-border p-0.5"
        />
      </div>
    </div>
  );
}
