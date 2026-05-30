"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Minus, RefreshCw, SlidersHorizontal, Lock, Loader2, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format-price";
import { Modal } from "@/components/admin/Modal";
import { AdminButton, Field, TextInput, Switch } from "@/components/admin/form";
import { Download, Upload } from "lucide-react";
import { calculatePrices, margin, type PricingSettings } from "@/lib/pricing/calculate";
import { updatePricingSettings, recalcAllPrices, refreshCbrRate, setWorkingRate, updateProductCost, setProductOverride, type PricingSettingsInput } from "./actions";
import { exportPricing, parsePricingFile, applyPricingImport, bulkUpdateCost, type ImportPreviewRow, type BulkOp } from "./io-actions";

function downloadBase64(filename: string, base64: string, mime: string) {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([arr], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type CourseInfo = { usd: number | null; eur: number | null; prevUsd: number | null; date: string | null; fetchedAt: string | null };
export type PricingRow = {
  id: string; sku: string | null; title: string; color: string | null; memory: string | null;
  category_slug: string | null; image: string | null; status: string | null;
  cost_rub: number | null; cost_rate: number | null; cost_usd: number | null;
  price_cash: number | null; price_card: number | null;
  credit_6m_monthly: number | null; credit_12m_monthly: number | null; credit_24m_monthly: number | null;
  price_override: boolean;
};

const MARKUPS = [0, 1, 1.5, 2, 3];

export function PricingShell({
  settings,
  course,
  rows: initialRows,
  categories,
}: {
  settings: PricingSettingsInput;
  course: CourseInfo;
  rows: PricingRow[];
  categories: { slug: string; title: string }[];
}) {
  const router = useRouter();
  const [rows, setRows] = React.useState<PricingRow[]>(initialRows);
  React.useEffect(() => setRows(initialRows), [initialRows]);

  const [working, setWorking] = React.useState(String(settings.working_usd_rate));
  const [busy, setBusy] = React.useState(false);
  const [formulaOpen, setFormulaOpen] = React.useState(false);
  const [markupOpen, setMarkupOpen] = React.useState(false);

  // фильтры
  const [cat, setCat] = React.useState("");
  const [q, setQ] = React.useState("");
  const [hideFixed, setHideFixed] = React.useState(false);
  const [lowOnly, setLowOnly] = React.useState(false);

  // выбор + экспорт/импорт
  const [sel, setSel] = React.useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);

  const settingsForCalc: PricingSettings = settings;

  const delta = course.usd && course.prevUsd ? ((course.usd - course.prevUsd) / course.prevUsd) * 100 : null;

  const filtered = rows.filter((r) => {
    if (cat && r.category_slug !== cat) return false;
    if (hideFixed && r.price_override) return false;
    if (q.trim()) {
      const t = `${r.title} ${r.sku ?? ""} ${r.color ?? ""} ${r.memory ?? ""}`.toLowerCase();
      if (!t.includes(q.trim().toLowerCase())) return false;
    }
    if (lowOnly) {
      const m = margin(r.price_cash ?? 0, r.cost_rub);
      if (!m || m.percent >= settings.min_margin_percent) return false;
    }
    return true;
  });

  // ── действия с курсом/формулой ──
  const applyWorking = async (rate: number) => {
    setBusy(true);
    const res = await setWorkingRate(rate);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success(`Курс обновлён. Пересчитано: ${res.recalculated ?? 0}`);
    router.refresh();
  };
  const onRefreshCbr = async () => {
    setBusy(true);
    const res = await refreshCbrRate();
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success(`Курс ЦБ обновлён: USD ${res.usd}`);
    router.refresh();
  };
  const onRecalcAll = async () => {
    setBusy(true);
    const res = await recalcAllPrices();
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success(`Пересчитано товаров: ${res.recalculated ?? 0}`);
    router.refresh();
  };

  // ── inline-правка закупки ──
  const saveCost = async (row: PricingRow, costRub: number | null, costRate: number | null) => {
    // оптимистично пересчитываем по формуле локально
    const costUsd = costRub && costRate ? costRub / costRate : null;
    const calc = costUsd && !row.price_override ? calculatePrices({ cost_usd: costUsd, price_override: false }, settingsForCalc) : null;
    setRows((rs) => rs.map((r) => (r.id === row.id ? {
      ...r, cost_rub: costRub, cost_rate: costRate, cost_usd: costUsd,
      ...(calc ? { price_cash: calc.price_cash, price_card: calc.price_card, credit_6m_monthly: calc.credit_6m_monthly, credit_12m_monthly: calc.credit_12m_monthly, credit_24m_monthly: calc.credit_24m_monthly } : {}),
    } : r)));
    const res = await updateProductCost(row.id, costRub, costRate);
    if (res.error) { toast.error(res.error); router.refresh(); }
  };

  const onToggleOverride = async (row: PricingRow) => {
    const next = !row.price_override;
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, price_override: next } : r)));
    const res = await setProductOverride(row.id, next);
    if (res.error) { toast.error(res.error); }
    router.refresh();
  };

  // ── экспорт ──
  const onExport = async (format: "xlsx" | "csv", onlyVisible: boolean) => {
    setExportOpen(false);
    setBusy(true);
    const ids = onlyVisible ? filtered.map((r) => r.id) : null;
    const res = await exportPricing(ids, format);
    setBusy(false);
    if ("error" in res) return toast.error(res.error);
    downloadBase64(res.filename, res.base64, res.mime);
    toast.success("Файл сформирован");
  };

  // ── выбор ──
  const toggleSel = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allVisibleSelected = filtered.length > 0 && filtered.every((r) => sel.has(r.id));
  const toggleAll = () => setSel((s) => { const n = new Set(s); if (allVisibleSelected) filtered.forEach((r) => n.delete(r.id)); else filtered.forEach((r) => n.add(r.id)); return n; });

  const runBulk = async (op: BulkOp, label: string) => {
    const ids = [...sel];
    if (!ids.length) return;
    if (!confirm(`${label}\nЭто изменит ${ids.length} тов. Продолжить?`)) return;
    setBusy(true);
    const res = await bulkUpdateCost(ids, op);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success(`Изменено: ${res.updated ?? 0}`);
    setSel(new Set());
    router.refresh();
  };

  return (
    <div className="space-y-5">
      {/* ── Шапка с курсами ── */}
      <div className="sticky top-14 z-20 -mx-4 border-b border-border/60 bg-bg/90 px-4 py-3 backdrop-blur-sm lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <Tile label="USD ЦБ" value={course.usd ? `${course.usd.toFixed(2)} ₽` : "—"} delta={delta} />
          <Tile label="EUR ЦБ" value={course.eur ? `${course.eur.toFixed(2)} ₽` : "—"} />
          <div>
            <p className="text-[11px] uppercase tracking-wide text-ink-subtle">Рабочий курс USD</p>
            <div className="mt-1 flex items-center gap-2">
              <input
                value={working}
                onChange={(e) => setWorking(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") applyWorking(Number(working)); }}
                inputMode="decimal"
                className="h-9 w-28 rounded-sm border border-border bg-white px-2.5 text-[15px] font-semibold tabular-nums text-ink outline-none focus:border-ink/40"
              />
              <AdminButton type="button" size="sm" onClick={() => applyWorking(Number(working))} loading={busy}>Применить</AdminButton>
              <div className="relative">
                <AdminButton type="button" size="sm" variant="outline" onClick={() => setMarkupOpen((o) => !o)}>Из ЦБ ▾</AdminButton>
                {markupOpen ? (
                  <div className="absolute left-0 top-full z-30 mt-1 w-36 rounded-lg border border-border/70 bg-white py-1 shadow-lg">
                    {MARKUPS.map((m) => (
                      <button key={m} type="button" onClick={() => { setMarkupOpen(false); if (course.usd) { const v = +(course.usd * (1 + m / 100)).toFixed(4); setWorking(String(v)); applyWorking(v); } }} className="block w-full px-3 py-1.5 text-left text-[13px] text-ink hover:bg-surface">
                        ЦБ + {m}%
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            {course.usd ? <p className="mt-1 text-[11px] text-ink-subtle">{course.usd.toFixed(2)} (ЦБ) {settings.use_cbr_auto ? "· 🔄 автообновление" : ""}</p> : null}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <AdminButton type="button" variant="outline" size="sm" onClick={() => setFormulaOpen(true)}><SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} /> Формула</AdminButton>
            <AdminButton type="button" variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" strokeWidth={1.75} /> Импорт</AdminButton>
            <div className="relative">
              <AdminButton type="button" variant="outline" size="sm" onClick={() => setExportOpen((o) => !o)}><Download className="h-4 w-4" strokeWidth={1.75} /> Экспорт ▾</AdminButton>
              {exportOpen ? (
                <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-border/70 bg-white py-1 shadow-lg">
                  <button type="button" onClick={() => onExport("xlsx", false)} className="block w-full px-3 py-1.5 text-left text-[13px] text-ink hover:bg-surface">XLSX — все товары</button>
                  <button type="button" onClick={() => onExport("csv", false)} className="block w-full px-3 py-1.5 text-left text-[13px] text-ink hover:bg-surface">CSV — все товары</button>
                  <div className="my-1 border-t border-border/50" />
                  <button type="button" onClick={() => onExport("xlsx", true)} className="block w-full px-3 py-1.5 text-left text-[13px] text-ink hover:bg-surface">XLSX — только видимые ({filtered.length})</button>
                </div>
              ) : null}
            </div>
            <AdminButton type="button" variant="outline" size="sm" onClick={onRefreshCbr} loading={busy}><RefreshCw className="h-4 w-4" strokeWidth={1.75} /> Курс ЦБ</AdminButton>
            <AdminButton type="button" size="sm" onClick={onRecalcAll} loading={busy}>Пересчитать всё</AdminButton>
          </div>
        </div>
      </div>

      {/* ── Фильтры ── */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 rounded-sm border border-border bg-white px-2.5 text-[13px] text-ink">
          <option value="">Все категории</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по названию или SKU…" className="h-9 w-64 max-w-full rounded-sm border border-border bg-white px-2.5 text-[13px] text-ink outline-none focus:border-ink/40" />
        <label className="flex items-center gap-2 text-[13px] text-ink-muted"><input type="checkbox" checked={hideFixed} onChange={(e) => setHideFixed(e.target.checked)} /> Скрыть зафиксированные</label>
        <label className="flex items-center gap-2 text-[13px] text-ink-muted"><input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> Маржа ниже мин.</label>
        <span className="ml-auto text-[12px] text-ink-subtle">Показано: {filtered.length} из {rows.length}</span>
      </div>

      {/* ── Таблица ── */}
      <div className="overflow-x-auto rounded-lg border border-border/60 bg-white">
        <table className="w-full min-w-[1100px] text-[13px]">
          <thead className="bg-surface/60 text-ink-subtle">
            <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium">
              <th className="w-8"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Выбрать все" /></th>
              <th className="w-10"></th>
              <th>Товар</th>
              <th className="text-right">Закупка ₽</th>
              <th className="text-right">Курс</th>
              <th className="text-right">$ зак.</th>
              <th className="text-right">Нал</th>
              <th className="text-right">Карта</th>
              <th className="text-right">6 / 12 / 24 мес</th>
              <th className="text-right">Маржа</th>
              <th className="w-10 text-center">🔒</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.length === 0 ? (
              <tr><td colSpan={12} className="px-4 py-10 text-center text-ink-muted">Нет товаров по фильтру.</td></tr>
            ) : filtered.map((r) => {
              const m = margin(r.price_cash ?? 0, r.cost_rub);
              const low = m != null && m.percent < settings.min_margin_percent;
              return (
                <tr key={r.id} className={cn("[&>td]:px-3 [&>td]:py-2 align-middle", sel.has(r.id) && "bg-ink/[0.03]")}>
                  <td><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggleSel(r.id)} aria-label="Выбрать" /></td>
                  <td>
                    <span className="inline-flex size-9 items-center justify-center overflow-hidden rounded-md border border-border bg-white">
                      {r.image ? <Image src={r.image} alt="" width={32} height={32} unoptimized className="size-8 object-contain" /> : null}
                    </span>
                  </td>
                  <td>
                    <Link href={`/admin/catalog/products/${r.id}/edit`} className="font-medium text-ink hover:underline">{r.title}</Link>
                    <div className="text-[11.5px] text-ink-subtle">{[r.sku, r.color, r.memory].filter(Boolean).join(" · ") || "—"}</div>
                  </td>
                  <td className="text-right"><EditableNum value={r.cost_rub} disabled={r.price_override} onSave={(v) => saveCost(r, v, r.cost_rate)} /></td>
                  <td className="text-right"><EditableNum value={r.cost_rate} step="0.0001" disabled={r.price_override} onSave={(v) => saveCost(r, r.cost_rub, v)} /></td>
                  <td className="text-right text-ink-muted tabular-nums">{r.cost_usd ? `$${r.cost_usd.toFixed(2)}` : "—"}</td>
                  <td className="text-right font-semibold text-sale tabular-nums">{r.price_cash != null ? formatPrice(r.price_cash) : "—"}</td>
                  <td className="text-right tabular-nums">{r.price_card != null ? formatPrice(r.price_card) : "—"}</td>
                  <td className="text-right text-[11.5px] text-ink-muted tabular-nums">
                    {[r.credit_6m_monthly, r.credit_12m_monthly, r.credit_24m_monthly].every((x) => x == null)
                      ? "—"
                      : `${fmtShort(r.credit_6m_monthly)} / ${fmtShort(r.credit_12m_monthly)} / ${fmtShort(r.credit_24m_monthly)}`}
                  </td>
                  <td className={cn("text-right tabular-nums", low ? "font-semibold text-sale" : "text-ink-muted")}>{m ? `${m.percent.toFixed(0)}%` : "—"}</td>
                  <td className="text-center">
                    <button type="button" onClick={() => onToggleOverride(r)} title={r.price_override ? "Снять фиксацию" : "Зафиксировать"} className={cn("inline-flex size-7 items-center justify-center rounded-sm border", r.price_override ? "border-ink/30 bg-ink text-white" : "border-border bg-white text-ink-subtle hover:bg-surface")}>
                      <Lock className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  </td>
                  <td className="text-center">
                    <Link href={`/product/${r.id}`} target="_blank" className="inline-flex size-7 items-center justify-center rounded-sm border border-border bg-white text-ink-subtle hover:bg-surface" title="На сайте"><ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} /></Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] text-ink-subtle">Закупка/курс редактируются прямо в таблице — цены пересчитываются автоматически. Б/У товары в прайс не входят. Массовые операции и импорт/экспорт — в следующем обновлении.</p>

      {/* ── Массовые действия ── */}
      {sel.size > 0 ? (
        <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-2 border-t border-border/60 bg-bg/95 px-4 py-3 backdrop-blur-sm lg:-mx-8 lg:px-8">
          <span className="text-[13px] font-medium text-ink">Выбрано: {sel.size}</span>
          <span className="mx-1 h-5 w-px bg-border" />
          <BulkBtn label="+ %" onClick={() => { const v = numPrompt("Наценить закупку на, %"); if (v != null) runBulk({ type: "markup_pct", value: v }, `Наценка +${v}%`); }} />
          <BulkBtn label="+ ₽" onClick={() => { const v = numPrompt("Наценить закупку на, ₽"); if (v != null) runBulk({ type: "markup_rub", value: v }, `Наценка +${v} ₽`); }} />
          <BulkBtn label="− %" onClick={() => { const v = numPrompt("Скинуть с закупки, %"); if (v != null) runBulk({ type: "discount_pct", value: v }, `Скидка −${v}%`); }} />
          <BulkBtn label="− ₽" onClick={() => { const v = numPrompt("Скинуть с закупки, ₽"); if (v != null) runBulk({ type: "discount_rub", value: v }, `Скидка −${v} ₽`); }} />
          <BulkBtn label="Округлить" onClick={() => { const v = numPrompt("Округлить закупку до, ₽ (1000/500/100)", 1000); if (v != null && v > 0) runBulk({ type: "round", value: v }, `Округление до ${v}`); }} />
          <BulkBtn label="Курс закупа" onClick={() => { const v = numPrompt("Курс закупа для выбранных"); if (v != null && v > 0) runBulk({ type: "set_rate", value: v }, `Курс закупа = ${v}`); }} />
          <BulkBtn label="Сбросить к формуле" onClick={() => runBulk({ type: "reset_formula" }, "Сброс ручной фиксации")} />
          <AdminButton type="button" variant="outline" size="sm" onClick={() => setSel(new Set())}>Отмена</AdminButton>
        </div>
      ) : null}

      {/* ── Drawer «Формула» ── */}
      <FormulaModal open={formulaOpen} onClose={() => setFormulaOpen(false)} initial={settings} course={course} onSaved={() => { setFormulaOpen(false); router.refresh(); }} />

      {/* ── Импорт ── */}
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={() => { setImportOpen(false); router.refresh(); }} />
    </div>
  );
}

function fmtShort(n: number | null): string {
  if (n == null) return "—";
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(".", ",")}т` : String(n);
}

function Tile({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
  const up = delta != null && delta > 0.01;
  const down = delta != null && delta < -0.01;
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-ink-subtle">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-[15px] font-semibold tabular-nums text-ink">
        {value}
        {delta != null ? (
          <span className={cn("inline-flex items-center text-[12px]", up ? "text-[#0a7d3e]" : down ? "text-sale" : "text-ink-subtle")}>
            {up ? <ArrowUp className="h-3 w-3" /> : down ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        ) : null}
      </p>
    </div>
  );
}

function EditableNum({ value, onSave, disabled, step }: { value: number | null; onSave: (v: number | null) => void; disabled?: boolean; step?: string }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  if (disabled) return <span className="text-ink-subtle tabular-nums">{value != null ? value.toLocaleString("ru-RU") : "—"}</span>;
  if (!editing) {
    return (
      <button type="button" onClick={() => { setDraft(value != null ? String(value) : ""); setEditing(true); }} className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 tabular-nums hover:bg-surface">
        {value != null ? value.toLocaleString("ru-RU") : <span className="text-ink-subtle">—</span>}
        {saved ? <Check className="h-3.5 w-3.5 text-[#0a7d3e]" /> : null}
      </button>
    );
  }
  const commit = () => {
    const v = draft.trim() === "" ? null : Number(draft.replace(",", "."));
    setEditing(false);
    if (v != null && !Number.isFinite(v)) return;
    if (v !== value) { onSave(v); setSaved(true); setTimeout(() => setSaved(false), 1500); }
  };
  return (
    <input
      autoFocus
      value={draft}
      step={step}
      inputMode="decimal"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
      className="h-7 w-24 rounded-sm border border-ink/40 bg-white px-1.5 text-right text-[13px] tabular-nums outline-none"
    />
  );
}

/* ── Модалка формулы ── */
function FormulaModal({ open, onClose, initial, course, onSaved }: { open: boolean; onClose: () => void; initial: PricingSettingsInput; course: CourseInfo; onSaved: () => void }) {
  const [v, setV] = React.useState<PricingSettingsInput>(initial);
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => { if (open) setV(initial); }, [open, initial]);
  const set = (patch: Partial<PricingSettingsInput>) => setV((s) => ({ ...s, ...patch }));

  // превью: закупка $1000 при текущих настройках
  const preview = calculatePrices({ cost_usd: 1000, price_override: false }, v as PricingSettings);

  const save = async () => {
    setSaving(true);
    const res = await updatePricingSettings(v);
    setSaving(false);
    if (res.error) return toast.error(res.error);
    toast.success(`Формула сохранена. Пересчитано: ${res.recalculated ?? 0}`);
    onSaved();
  };

  const numField = (label: string, key: keyof PricingSettingsInput, hint?: string) => (
    <Field label={label} hint={hint}>
      <TextInput type="number" step="0.01" value={String(v[key] ?? "")} onChange={(e) => set({ [key]: e.target.value === "" ? 0 : Number(e.target.value) } as Partial<PricingSettingsInput>)} />
    </Field>
  );

  return (
    <Modal open={open} onClose={onClose} title="Формула расчёта цен" className="max-w-2xl"
      footer={<div className="flex items-center gap-3"><span className="text-[12px] text-ink-subtle">Применится ко всем товарам без ручной фиксации</span><AdminButton type="button" loading={saving} onClick={save}>Сохранить и пересчитать</AdminButton></div>}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {numField("Рабочий курс USD", "working_usd_rate", course.usd ? `ЦБ: ${course.usd.toFixed(2)}` : undefined)}
          {numField("Наценка FX, %", "fx_markup_percent", "к курсу")}
          {numField("Округление, ₽", "price_rounding")}
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {numField("Карта, %", "card_markup_percent")}
          {numField("6 мес, %", "credit_6m_markup_percent")}
          {numField("12 мес, %", "credit_12m_markup_percent")}
          {numField("24 мес, %", "credit_24m_markup_percent")}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {numField("Мин. маржа, %", "min_margin_percent", "для алёртов")}
          {numField("Поправка к курсу ЦБ, %", "cbr_markup_percent", "для автообновления")}
          <Field label="Автообновление курса ЦБ">
            <div className="flex h-9 items-center"><Switch checked={v.use_cbr_auto} onChange={(on) => set({ use_cbr_auto: on })} label={v.use_cbr_auto ? "Включено" : "Выключено"} /></div>
          </Field>
        </div>
        {preview ? (
          <div className="rounded-lg border border-border/60 bg-surface/40 p-3 text-[13px] text-ink-muted">
            При закупке <span className="font-medium text-ink">$1000</span> и текущей формуле: нал <span className="font-semibold text-sale">{formatPrice(preview.price_cash)}</span>, картой {formatPrice(preview.price_card)}, 24 мес — {formatPrice(preview.credit_24m_monthly)}/мес.
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function numPrompt(label: string, def?: number): number | null {
  const raw = typeof window !== "undefined" ? window.prompt(label, def != null ? String(def) : "") : null;
  if (raw == null) return null;
  const v = Number(raw.replace(",", "."));
  return Number.isFinite(v) ? v : null;
}

function BulkBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-8 items-center rounded-sm border border-border bg-white px-3 text-[13px] text-ink transition-colors hover:bg-surface">
      {label}
    </button>
  );
}

/* ── Модалка импорта прайса ── */
function ImportModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [idBy, setIdBy] = React.useState<"sku" | "id">("sku");
  const [preview, setPreview] = React.useState<ImportPreviewRow[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { if (!open) { setPreview(null); } }, [open]);

  const onFile = async (file: File) => {
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("idBy", idBy);
    const res = await parsePricingFile(fd);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    setPreview(res.preview ?? []);
  };

  const willUpdate = (preview ?? []).filter((r) => r.found && r.changed);
  const notFound = (preview ?? []).filter((r) => !r.found);
  const noChange = (preview ?? []).filter((r) => r.found && !r.changed);

  const apply = async () => {
    setBusy(true);
    const items = willUpdate.map((r) => ({ id: r.id as string, cost_rub: r.newCostRub ?? r.oldCostRub, cost_rate: r.newRate ?? r.oldRate }));
    const res = await applyPricingImport(items);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success(`Импорт завершён: обновлено ${res.updated ?? 0}, не найдено ${notFound.length}`);
    onDone();
  };

  return (
    <Modal open={open} onClose={onClose} title="Импорт прайса" className="max-w-3xl"
      footer={preview ? (
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-ink-subtle">Обновится {willUpdate.length}, не найдено {notFound.length}, без изменений {noChange.length}</span>
          <AdminButton type="button" variant="outline" onClick={() => setPreview(null)}>Назад</AdminButton>
          <AdminButton type="button" loading={busy} onClick={apply} disabled={willUpdate.length === 0}>Применить ({willUpdate.length})</AdminButton>
        </div>
      ) : undefined}>
      {!preview ? (
        <div className="space-y-4">
          <p className="text-[13px] text-ink-muted">
            Файл XLSX или CSV с колонками <b>SKU</b>, <b>Закупка ₽</b>, <b>Курс закупа</b>. До 5 МБ / 5000 строк.
          </p>
          <label className="flex items-center gap-2 text-[13px] text-ink">
            Идентификатор:
            <select value={idBy} onChange={(e) => setIdBy(e.target.value as "sku" | "id")} className="h-9 rounded-sm border border-border bg-white px-2.5 text-[13px]">
              <option value="sku">по SKU</option>
              <option value="id">по ID</option>
            </select>
          </label>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-surface/40 py-10 text-ink-muted hover:border-ink/30 disabled:opacity-60">
            {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" strokeWidth={1.5} />}
            <span className="text-[14px]">Выбрать файл XLSX / CSV</span>
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-4 text-[13px]">
            <span className="text-[#0a7d3e]">Обновится: {willUpdate.length}</span>
            <span className="text-ink-muted">Без изменений: {noChange.length}</span>
            <span className="text-sale">Не найдено: {notFound.length}</span>
          </div>
          <div className="max-h-80 overflow-y-auto rounded-lg border border-border/60">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-surface/80 text-ink-subtle">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                  <th>SKU</th><th>Товар</th><th className="text-right">Закупка ₽</th><th className="text-right">Курс</th><th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {preview.slice(0, 500).map((r, i) => (
                  <tr key={i} className={cn("[&>td]:px-3 [&>td]:py-1.5", !r.found && "bg-sale/5")}>
                    <td className="font-mono text-[12px]">{r.sku}</td>
                    <td className="truncate">{r.title ?? <span className="text-sale">не найдено</span>}</td>
                    <td className="text-right tabular-nums">{r.found && r.changed && r.newCostRub != null ? <span><span className="text-ink-subtle line-through">{r.oldCostRub ?? "—"}</span> → <b>{r.newCostRub}</b></span> : (r.newCostRub ?? r.oldCostRub ?? "—")}</td>
                    <td className="text-right tabular-nums">{r.found && r.changed && r.newRate != null && r.newRate !== r.oldRate ? <span><span className="text-ink-subtle line-through">{r.oldRate ?? "—"}</span> → <b>{r.newRate}</b></span> : (r.newRate ?? r.oldRate ?? "—")}</td>
                    <td>{r.found ? (r.changed ? <Check className="h-4 w-4 text-[#0a7d3e]" /> : <span className="text-[11px] text-ink-subtle">=</span>) : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
