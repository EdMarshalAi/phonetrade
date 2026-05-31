"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/admin/table";
import { AdminButton, TextInput, Select, Switch, Field } from "@/components/admin/form";
import { SearchBox } from "@/components/admin/ListControls";
import { Modal } from "@/components/admin/Modal";
import {
  updateBasePrice, toggleBasePriceActive, addBaseModel, deleteBasePrices,
  bulkSetActive, bulkAdjustPercent, saveTradeInFormula, type TradeInFormula,
} from "./actions";

export type PriceRow = {
  id: string; model_key: string; model_title: string; memory_gb: number;
  base_price_rub: number; is_active: boolean; notes: string | null;
};

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n) + " ₽";

function roundPrice(v: number, step: number, dir: "floor" | "round") {
  return dir === "floor" ? Math.floor(v / step) * step : Math.round(v / step) * step;
}

export function TradeInPricesClient({ rows, formula, q }: { rows: PriceRow[]; formula: TradeInFormula; q?: string }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = React.useState(false);
  const [formulaOpen, setFormulaOpen] = React.useState(false);
  const [pct, setPct] = React.useState("");

  const allChecked = rows.length > 0 && selected.size === rows.length;
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)));
  const toggleOne = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const after = (res: { error?: string }, ok: string) => {
    if (res.error) toast.error(res.error);
    else { toast.success(ok); router.refresh(); }
  };

  const runBulk = async (fn: () => Promise<{ error?: string }>, ok: string) => {
    const res = await fn();
    if (res.error) toast.error(res.error);
    else { toast.success(ok); setSelected(new Set()); router.refresh(); }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Модель, память…" />
        <div className="flex-1" />
        <AdminButton variant="outline" onClick={() => setFormulaOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" /> Формула
        </AdminButton>
        <AdminButton onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Добавить модель
        </AdminButton>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface/60 px-3 py-2 text-[13px]">
          <span className="font-medium text-ink">Выбрано: {selected.size}</span>
          <AdminButton size="sm" variant="outline" onClick={() => runBulk(() => bulkSetActive([...selected], true), "Активированы")}>Активировать</AdminButton>
          <AdminButton size="sm" variant="outline" onClick={() => runBulk(() => bulkSetActive([...selected], false), "Деактивированы")}>Скрыть</AdminButton>
          <div className="inline-flex items-center gap-1">
            <input value={pct} onChange={(e) => setPct(e.target.value)} placeholder="±%" className="h-8 w-16 rounded-sm border border-border px-2 text-[13px] outline-none focus:ring-2 focus:ring-ink/15" />
            <AdminButton size="sm" variant="outline" onClick={() => { const p = parseFloat(pct.replace(",", ".")); if (Number.isFinite(p)) runBulk(() => bulkAdjustPercent([...selected], p), "Цены пересчитаны"); }}>Применить %</AdminButton>
          </div>
          <AdminButton size="sm" variant="danger" onClick={() => { if (confirm(`Удалить ${selected.size} позиций?`)) runBulk(() => deleteBasePrices([...selected]), "Удалено"); }}>
            <Trash2 className="h-3.5 w-3.5" /> Удалить
          </AdminButton>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState title={q ? "Ничего не найдено" : "Цен пока нет"} hint={q ? "Измените запрос" : "Добавьте модели или импортируйте из JSON."} />
      ) : (
        <Table>
          <THead>
            <TH className="w-px"><input type="checkbox" checked={allChecked} onChange={toggleAll} className="size-4 accent-[var(--color-ink)]" /></TH>
            <TH>Модель</TH>
            <TH className="w-24">Память</TH>
            <TH className="w-44">Цена за идеал</TH>
            <TH className="w-28 text-center">Активна</TH>
            <TH className="w-px text-right" />
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.id}>
                <TD><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} className="size-4 accent-[var(--color-ink)]" /></TD>
                <TD className="font-medium">{r.model_title}</TD>
                <TD className="text-ink-muted">{r.memory_gb} GB</TD>
                <TD><PriceCell id={r.id} value={r.base_price_rub} onSaved={(res) => after(res, "Цена сохранена")} /></TD>
                <TD className="text-center">
                  <Switch checked={r.is_active} onChange={(v) => toggleBasePriceActive(r.id, v).then((res) => after(res, v ? "Показывается" : "Скрыта"))} />
                </TD>
                <TD className="text-right">
                  <button type="button" aria-label="Удалить" onClick={() => { if (confirm(`Удалить ${r.model_title} ${r.memory_gb}GB?`)) deleteBasePrices([r.id]).then((res) => after(res, "Удалено")); }} className="inline-flex size-8 items-center justify-center rounded-sm text-ink-muted hover:bg-surface hover:text-sale">
                    <Trash2 className="size-4" />
                  </button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {addOpen && <AddModelModal onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); router.refresh(); }} />}
      {formulaOpen && <FormulaModal initial={formula} sampleBase={rows[0]?.base_price_rub ?? 53000} onClose={() => setFormulaOpen(false)} onDone={() => { setFormulaOpen(false); router.refresh(); }} />}
    </>
  );
}

/* ── Инлайн-правка цены ─────────────────────────────────────────────── */
function PriceCell({ id, value, onSaved }: { id: string; value: number; onSaved: (res: { error?: string }) => void }) {
  const [editing, setEditing] = React.useState(false);
  const [val, setVal] = React.useState(String(value));
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => setVal(String(value)), [value]);

  const commit = async () => {
    setEditing(false);
    const n = parseInt(val.replace(/\D/g, ""), 10);
    if (Number.isNaN(n) || n === value) { setVal(String(value)); return; }
    const res = await updateBasePrice(id, n);
    onSaved(res);
    if (!res.error) { setSaved(true); setTimeout(() => setSaved(false), 1500); }
  };

  if (editing) {
    return (
      <input
        autoFocus value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(String(value)); setEditing(false); } }}
        inputMode="numeric"
        className="h-9 w-32 rounded-sm border border-ink/40 px-2 text-[14px] tabular-nums outline-none focus:ring-2 focus:ring-ink/20"
      />
    );
  }
  return (
    <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-sm px-2 py-1 text-[14px] tabular-nums hover:bg-surface">
      {fmt(value)}
      {saved && <Check className="size-3.5 text-emerald-600" />}
    </button>
  );
}

/* ── Модалка добавления модели ──────────────────────────────────────── */
function AddModelModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [key, setKey] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [mem, setMem] = React.useState("256");
  const [price, setPrice] = React.useState("");
  const [active, setActive] = React.useState(true);
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    setBusy(true);
    const res = await addBaseModel({ model_key: key, model_title: title, memory_gb: parseInt(mem, 10), base_price_rub: parseInt(price.replace(/\D/g, ""), 10) || 0, is_active: active, notes });
    setBusy(false);
    if (res.error) toast.error(res.error);
    else { toast.success("Модель добавлена"); onDone(); }
  };

  return (
    <Modal open onClose={onClose} title="Добавить модель" footer={<AdminButton loading={busy} onClick={submit}>Создать</AdminButton>}>
      <div className="space-y-3">
        <Field label="Ключ модели" hint="как в каталоге, напр. iphone-15-pro"><TextInput value={key} onChange={(e) => setKey(e.target.value)} placeholder="iphone-15-pro" /></Field>
        <Field label="Название" hint="для UI"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="iPhone 15 Pro" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Память"><Select value={mem} onChange={(e) => setMem(e.target.value)}><option value="64">64 GB</option><option value="128">128 GB</option><option value="256">256 GB</option><option value="512">512 GB</option><option value="1024">1 TB</option></Select></Field>
          <Field label="Цена за идеал, ₽"><TextInput value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" placeholder="50000" /></Field>
        </div>
        <Field label="Заметка (необязательно)"><TextInput value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <Switch checked={active} onChange={setActive} label="Активна (показывать в квизе)" />
      </div>
    </Modal>
  );
}

/* ── Модалка формулы коэффициентов ──────────────────────────────────── */
const COEF_GROUPS: { title: string; fields: { key: keyof TradeInFormula; label: string }[] }[] = [
  { title: "Внешний вид", fields: [
    { key: "external_perfect", label: "Как новый" }, { key: "external_light_wear", label: "Лёгкие потёртости" },
    { key: "external_scratches", label: "Заметные царапины" }, { key: "external_glass_crack", label: "Трещины на стекле" },
    { key: "external_body_crack", label: "Трещины на корпусе" },
  ] },
  { title: "Аккумулятор", fields: [
    { key: "battery_90_100", label: "90–100%" }, { key: "battery_85_89", label: "85–89%" },
    { key: "battery_80_84", label: "80–84%" }, { key: "battery_below_80", label: "Меньше 80%" },
  ] },
  { title: "Поломки", fields: [
    { key: "broken_none", label: "Всё работает" }, { key: "broken_yes", label: "Есть поломки" },
  ] },
  { title: "Комплект", fields: [
    { key: "kit_full", label: "Коробка + зарядка" }, { key: "kit_box_only", label: "Только коробка" }, { key: "kit_none", label: "Без коробки" },
  ] },
];

function FormulaModal({ initial, sampleBase, onClose, onDone }: { initial: TradeInFormula; sampleBase: number; onClose: () => void; onDone: () => void }) {
  const [f, setF] = React.useState<TradeInFormula>(initial);
  const [busy, setBusy] = React.useState(false);
  const set = (k: keyof TradeInFormula, v: string) => setF((s) => ({ ...s, [k]: k === "price_rounding" ? parseInt(v, 10) || 0 : k === "rounding_direction" ? (v as "floor" | "round") : parseFloat(v.replace(",", ".")) || 0 }));

  const ideal = roundPrice(sampleBase * f.external_perfect * f.battery_90_100 * f.broken_none * f.icloud_unlinked * f.kit_full, f.price_rounding || 500, f.rounding_direction);
  const mid = roundPrice(sampleBase * f.external_scratches * f.battery_85_89 * f.broken_none * f.icloud_unlinked * f.kit_none, f.price_rounding || 500, f.rounding_direction);

  const save = async () => {
    setBusy(true);
    const res = await saveTradeInFormula(f);
    setBusy(false);
    if (res.error) toast.error(res.error);
    else { toast.success("Формула сохранена"); onDone(); }
  };

  return (
    <Modal open onClose={onClose} title="Формула расчёта trade-in" footer={<AdminButton loading={busy} onClick={save}>Сохранить</AdminButton>}>
      <div className="space-y-6">
        <p className="rounded-lg bg-surface px-3 py-2 text-[12.5px] leading-relaxed text-ink-muted">
          Коэффициент — множитель к базовой цене. <b className="text-ink">1.0</b> — без скидки, меньше — цена ниже,
          больше — выше (напр. комплект 1.05 = +5%).
        </p>

        {COEF_GROUPS.map((g) => (
          <div key={g.title}>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">{g.title}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {g.fields.map((fl) => (
                <div key={fl.key} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-white px-3.5 py-2.5">
                  <span className="text-[13.5px] text-ink">{fl.label}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-ink-subtle">
                    <span className="text-[13px]">×</span>
                    <input type="number" step="0.01" min="0" value={String(f[fl.key])} onChange={(e) => set(fl.key, e.target.value)} className="h-9 w-[68px] rounded-lg border border-border bg-white px-2 text-right text-[14px] font-medium tabular-nums text-ink outline-none focus:border-ink/40 focus:ring-2 focus:ring-ink/15" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface/40 px-3.5 py-2.5">
          <div>
            <p className="text-[13.5px] font-medium text-ink">iCloud привязан</p>
            <p className="text-[12px] text-ink-muted">Не принимаем — цена ×0</p>
          </div>
          <span className="text-[13px] font-medium tabular-nums text-ink-subtle">× 0.000</span>
        </div>

        <div>
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">Округление цены</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-white px-3.5 py-2.5">
              <span className="text-[13.5px] text-ink">Шаг, ₽</span>
              <input type="number" value={String(f.price_rounding)} onChange={(e) => set("price_rounding", e.target.value)} className="h-9 w-[68px] rounded-lg border border-border bg-white px-2 text-right text-[14px] font-medium tabular-nums text-ink outline-none focus:border-ink/40 focus:ring-2 focus:ring-ink/15" />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-white px-3.5 py-1.5">
              <span className="text-[13.5px] text-ink">Направление</span>
              <Select value={f.rounding_direction} onChange={(e) => set("rounding_direction", e.target.value)} className="w-36"><option value="floor">Вниз</option><option value="round">К ближайшему</option></Select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ink/15 bg-ink/[0.03] p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-subtle">Превью · база {fmt(sampleBase)}</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <span className="text-ink-muted">Идеал · 100% · полный комплект</span>
              <span className="text-[15px] font-bold tabular-nums text-ink">{fmt(ideal)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-ink/10 pt-2 text-[13px]">
              <span className="text-ink-muted">Царапины · 85–89% · без комплекта</span>
              <span className="text-[15px] font-bold tabular-nums text-ink">{fmt(mid)}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
