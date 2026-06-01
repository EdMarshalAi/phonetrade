"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Minus, RefreshCw, SlidersHorizontal, Lock, Loader2, Check, ArrowUpRight, Download, Upload, Info, Pencil, ChevronLeft, ChevronRight, ChevronDown, Send, Rss, Copy } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format-price";
import { Modal } from "@/components/admin/Modal";
import { AdminButton, Field, TextInput, Switch, Select } from "@/components/admin/form";
import { calculatePrices, type PricingSettings } from "@/lib/pricing/calculate";
import { updatePricingSettings, recalcAllPrices, refreshCbrRate, setWorkingRate, recalcSelected, updateProductCost, updateCategoryPricing, type PricingSettingsInput } from "./actions";
import { exportPricing, exportPricingToTelegram, savePricingExportPrefs, saveYmlFeedPrefs, parsePricingFile, applyPricingImport, bulkUpdateCost, type ImportPreviewRow, type BulkOp } from "./io-actions";
import { EXPORT_COLUMNS, type ExportColumnKey, type PricingExportPrefs, type YmlFeedPrefs } from "./export-columns";

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
const r2 = (n: number) => Math.round(n * 100) / 100;

export type CourseInfo = { usd: number | null; eur: number | null; prevUsd: number | null; prevEur: number | null; date: string | null; fetchedAt: string | null };
export type PricingRow = {
  id: string; sku: string | null; title: string; color: string | null; memory: string | null;
  category_slug: string | null; image: string | null; status: string | null; is_used: boolean;
  cost_rub: number | null; cost_rate: number | null; cost_usd: number | null;
  price_cash: number | null; price_card: number | null;
  credit_6m_monthly: number | null; credit_12m_monthly: number | null; credit_24m_monthly: number | null;
  price_override: boolean;
};

const MARKUPS = [0, 1, 1.5, 2, 3];
const CATEGORY_LABEL: Record<string, string> = { iphone: "iPhone", ipad: "iPad", mac: "Mac", watch: "Apple Watch", airpods: "AirPods", accessories: "Аксессуары", used: "Б/У" };
const PAGE_SIZES = [20, 50, 100];

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.round(h / 24)} дн назад`;
}

export type PricingCategory = { slug: string; title: string; parent_slug: string | null; markup_percent: number; min_margin_rub: number };

export function PricingShell({
  settings,
  course,
  rows,
  categories,
  exportPrefs,
  ymlPrefs,
}: {
  settings: PricingSettingsInput;
  course: CourseInfo;
  rows: PricingRow[];
  categories: PricingCategory[];
  exportPrefs: PricingExportPrefs;
  ymlPrefs: YmlFeedPrefs;
}) {
  const router = useRouter();
  const savedRate = r2(settings.working_usd_rate);
  const [working, setWorking] = React.useState(String(savedRate));
  React.useEffect(() => setWorking(String(savedRate)), [savedRate]);
  const [busy, setBusy] = React.useState(false);
  const [formulaOpen, setFormulaOpen] = React.useState(false);
  const [markupOpen, setMarkupOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [feedOpen, setFeedOpen] = React.useState(false);
  const feedUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "") + "/api/feed/yml";

  const [cat, setCat] = React.useState("");
  const [q, setQ] = React.useState("");
  const [hideFixed, setHideFixed] = React.useState(false);
  const [lowOnly, setLowOnly] = React.useState(false);
  const [pageSize, setPageSize] = React.useState(50);
  const [page, setPage] = React.useState(1);
  React.useEffect(() => setPage(1), [cat, q, hideFixed, lowOnly, pageSize]);
  const [localRows, setLocalRows] = React.useState<PricingRow[]>(rows);
  React.useEffect(() => setLocalRows(rows), [rows]);
  const [sel, setSel] = React.useState<Set<string>>(new Set());
  const [dialog, setDialog] = React.useState<null | { title: string; desc?: string; input?: { label: string; placeholder?: string; def?: string }; confirmLabel?: string; onConfirm: (v: number | null) => void }>(null);
  const [dlgVal, setDlgVal] = React.useState("");
  React.useEffect(() => { setDlgVal(dialog?.input?.def ?? ""); }, [dialog]);
  const submitDialog = () => {
    if (!dialog) return;
    if (dialog.input) {
      const v = Number(dlgVal.replace(",", "."));
      if (!Number.isFinite(v)) return toast.error("Введите число");
      dialog.onConfirm(v);
    } else {
      dialog.onConfirm(null);
    }
    setDialog(null);
  };

  const settingsForCalc: PricingSettings = settings;
  // slug → данные категории (наценка, мин.маржа ₽, название)
  const catBy = React.useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories]);
  const markupOf = (slug: string | null) => (slug && catBy.get(slug)?.markup_percent != null ? catBy.get(slug)!.markup_percent : settings.default_markup_percent);
  const minMarginOf = (slug: string | null) => (slug ? catBy.get(slug)?.min_margin_rub ?? 0 : 0);
  const delta = course.usd && course.prevUsd ? ((course.usd - course.prevUsd) / course.prevUsd) * 100 : null;
  const deltaEur = course.eur && course.prevEur ? ((course.eur - course.prevEur) / course.prevEur) * 100 : null;
  const dirtyRate = Math.abs(Number(working.replace(",", ".")) - savedRate) > 1e-6 && Number(working.replace(",", ".")) > 0;

  const filtered = localRows.filter((r) => {
    if (cat && r.category_slug !== cat) return false;
    if (hideFixed && r.price_override) return false;
    if (q.trim()) {
      const t = `${r.title} ${r.sku ?? ""} ${r.color ?? ""} ${r.memory ?? ""}`.toLowerCase();
      if (!t.includes(q.trim().toLowerCase())) return false;
    }
    if (lowOnly) {
      const minRub = minMarginOf(r.category_slug);
      const mRub = (r.price_cash ?? 0) - (r.cost_rub ?? 0);
      if (!(r.cost_rub && minRub > 0 && mRub < minRub)) return false;
    }
    return true;
  });

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageClamped = Math.min(page, pages);
  const paged = filtered.slice((pageClamped - 1) * pageSize, pageClamped * pageSize);

  const groups = React.useMemo(() => {
    const order = new Map(categories.map((c, i) => [c.slug, i]));
    const map = new Map<string, PricingRow[]>();
    for (const r of paged) {
      const key = r.category_slug ?? "other";
      (map.get(key) ?? map.set(key, []).get(key)!).push(r);
    }
    const keys = [...map.keys()].sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
    return keys.map((k) => ({ key: k, label: catBy.get(k)?.title ?? CATEGORY_LABEL[k] ?? k, items: map.get(k)! }));
  }, [paged, categories, catBy]);

  const withoutCost = localRows.filter((r) => !r.is_used && r.cost_rub == null).length;

  /* ── курс / пересчёт ── */
  const applyWorking = async () => {
    const rate = r2(Number(working.replace(",", ".")));
    setBusy(true);
    const res = await setWorkingRate(rate);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Рабочий курс сохранён. Нажмите «Пересчитать всё», чтобы применить к ценам.");
    router.refresh();
  };
  const applyFromCbr = async (markup: number) => {
    setMarkupOpen(false);
    setBusy(true);
    const r = await refreshCbrRate();
    if (r.error || r.usd == null) { setBusy(false); return toast.error(`Не удалось получить курс ЦБ: ${r.error ?? ""}`); }
    const value = r2(r.usd * (1 + markup / 100));
    const res = await setWorkingRate(value);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    setWorking(String(value));
    toast.success(`Рабочий курс: ${value} ₽ (ЦБ ${r2(r.usd)} + ${markup}%). Нажмите «Пересчитать всё».`);
    router.refresh();
  };
  const onRecalcAll = () => setDialog({
    title: "Пересчитать все цены?",
    desc: "Цены всех товаров (кроме зафиксированных и Б/У) пересчитаются по текущей формуле и курсу.",
    confirmLabel: "Пересчитать",
    onConfirm: async () => {
      setBusy(true);
      const res = await recalcAllPrices();
      setBusy(false);
      if (res.error) return toast.error(res.error);
      toast.success(`Пересчитано товаров: ${res.recalculated ?? 0}`);
      router.refresh();
    },
  });

  /* ── inline-правка закупки + пересчёт строки ── */
  const saveCost = async (row: PricingRow, costRub: number | null, costRate: number | null) => {
    const costUsd = costRub && costRate ? costRub / costRate : null;
    const calc = costUsd && !row.price_override ? calculatePrices({ cost_usd: costUsd, price_override: false }, settingsForCalc, markupOf(row.category_slug)) : null;
    setLocalRows((rs) => rs.map((r) => (r.id === row.id ? {
      ...r, cost_rub: costRub, cost_rate: costRate, cost_usd: costUsd,
      ...(calc ? { price_cash: calc.price_cash, price_card: calc.price_card, credit_6m_monthly: calc.credit_6m_monthly, credit_12m_monthly: calc.credit_12m_monthly, credit_24m_monthly: calc.credit_24m_monthly } : {}),
    } : r)));
    const res = await updateProductCost(row.id, costRub, costRate);
    if (res.error) { toast.error(res.error); router.refresh(); }
  };
  const recalcOne = async (id: string) => {
    setBusy(true);
    const res = await recalcSelected([id]);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success("Цены товара пересчитаны");
    router.refresh();
  };

  /* ── экспорт выбранных (по галочкам в таблице) — текущими колонками ── */
  const onExportIds = async (ids: string[]) => {
    if (!ids.length) return toast.error("Ничего не выбрано");
    setBusy(true);
    const res = await exportPricing({ ids, categories: null, columns: exportPrefs.columns, format: "xlsx" });
    setBusy(false);
    if ("error" in res) return toast.error(res.error);
    downloadBase64(res.filename, res.base64, res.mime);
    toast.success("Файл сформирован");
  };

  /* ── выбор / bulk ── */
  const toggleSel = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allPageSelected = paged.length > 0 && paged.every((r) => sel.has(r.id));
  const toggleAll = () => setSel((s) => { const n = new Set(s); if (allPageSelected) paged.forEach((r) => n.delete(r.id)); else paged.forEach((r) => n.add(r.id)); return n; });
  const runBulkNow = async (op: BulkOp) => {
    const ids = [...sel];
    if (!ids.length) return;
    setBusy(true);
    const res = await bulkUpdateCost(ids, op);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success(`Изменено: ${res.updated ?? 0}`);
    setSel(new Set());
    router.refresh();
  };
  // Открыть диалог для операции, требующей значения.
  const askBulk = (cfg: { title: string; label: string; placeholder?: string; def?: string; build: (v: number) => BulkOp }) =>
    setDialog({
      title: cfg.title,
      desc: `Применить к ${sel.size} выбранным товарам.`,
      input: { label: cfg.label, placeholder: cfg.placeholder, def: cfg.def },
      onConfirm: (v) => { if (v != null && Number.isFinite(v)) runBulkNow(cfg.build(v)); },
    });
  const confirmBulk = (title: string, op: BulkOp) =>
    setDialog({ title, desc: `Применить к ${sel.size} выбранным товарам.`, confirmLabel: "Применить", onConfirm: () => runBulkNow(op) });
  const onRecalcSelected = async () => {
    const ids = [...sel];
    if (!ids.length) return;
    setBusy(true);
    const res = await recalcSelected(ids);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    toast.success(`Пересчитано: ${res.recalculated ?? 0}`);
    setSel(new Set());
    router.refresh();
  };

  return (
    <div className="space-y-5">
      {/* ── Единая плашка курса ── */}
      <div className="rounded-2xl border border-border/60 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[12.5px] text-ink-muted">
            Курс ЦБ{course.date ? ` за ${course.date.split("-").reverse().join(".")}` : ""}
            {course.fetchedAt ? ` · обновлён ${relativeTime(course.fetchedAt)}` : ""}
          </span>
          <div className="flex items-center gap-5">
            <CourseChip label="USD" value={course.usd} delta={delta} />
            <CourseChip label="EUR" value={course.eur} delta={deltaEur} />
          </div>
        </div>

        <div className="my-4 h-px bg-border/50" />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-subtle">
              Рабочий курс USD <span className="font-normal normal-case tracking-normal text-ink-subtle">· можно изменить</span>
            </label>
            <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/40 px-3 py-1.5 transition-colors focus-within:border-ink/40 focus-within:bg-white">
              <input
                value={working}
                onChange={(e) => setWorking(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && dirtyRate) applyWorking(); }}
                inputMode="decimal"
                aria-label="Рабочий курс USD"
                className="w-28 bg-transparent text-3xl font-semibold tabular-nums tracking-tight text-ink outline-none"
              />
              <span className="text-xl font-medium text-ink-subtle">₽</span>
              <Pencil className="h-4 w-4 text-ink-subtle" strokeWidth={1.75} aria-hidden />
            </div>
          </div>
          {/* Кнопки в сетке 2×2 равной ширины: «Формула» — верхний ряд, над курсовыми. */}
          <div className="grid w-full grid-cols-2 gap-2 sm:w-[340px]">
            <AdminButton type="button" variant="outline" size="sm" onClick={() => setFormulaOpen(true)} className="w-full">
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} /> Формула
            </AdminButton>
            <div className="relative">
              <AdminButton type="button" variant="outline" size="sm" onClick={() => setMarkupOpen((o) => !o)} className="w-full">Из ЦБ +%▾</AdminButton>
              {markupOpen ? (
                <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-lg border border-border/70 bg-white py-1 shadow-lg">
                  <p className="px-3 py-1 text-[11px] text-ink-subtle">Свежий курс ЦБ + поправка:</p>
                  {MARKUPS.map((m) => (
                    <button key={m} type="button" onClick={() => applyFromCbr(m)} className="block w-full px-3 py-1.5 text-left text-[13px] text-ink hover:bg-surface">ЦБ + {m}%</button>
                  ))}
                </div>
              ) : null}
            </div>
            <AdminButton type="button" variant="outline" size="sm" onClick={applyWorking} disabled={!dirtyRate} loading={busy} className="w-full">Сохранить курс</AdminButton>
            <AdminButton type="button" size="sm" onClick={onRecalcAll} loading={busy} className="w-full"><RefreshCw className="h-4 w-4" strokeWidth={1.75} /> Пересчитать всё</AdminButton>
          </div>
        </div>
        <p className="mt-3 text-[12px] text-ink-subtle">
          {settings.use_cbr_auto ? "Автообновление курса включено" : "Автообновление выключено"} · поправка +{settings.cbr_markup_percent}%
          {dirtyRate ? " · курс изменён — сохраните и нажмите «Пересчитать всё»" : ""}
        </p>
      </div>

      {/* ── Тулбар действий ── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ActionTile icon={<Upload className="h-5 w-5" strokeWidth={1.5} />} title="Импорт прайса" hint="XLSX или CSV" onClick={() => setImportOpen(true)} />
        <ActionTile icon={<Rss className="h-5 w-5" strokeWidth={1.5} />} title="YML-фид" hint="Для ВКонтакте · авто-цены" onClick={() => setFeedOpen(true)} />
        <ActionTile icon={<Download className="h-5 w-5" strokeWidth={1.5} />} title="Экспорт" hint="Скачать или в Telegram" onClick={() => setExportOpen(true)} />
      </div>

      {/* ── Фильтры (тулбар, один ряд) ── */}
      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-white px-4 py-2.5">
        <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-44 shrink-0">
          <option value="">Все категории</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}
        </Select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по названию или SKU…" className="h-10 w-56 min-w-0 flex-1 rounded-lg border border-border bg-white px-3 text-[13px] text-ink outline-none focus:border-ink/40" />
        <Switch checked={hideFixed} onChange={setHideFixed} label="Скрыть зафиксированные" />
        <Switch checked={lowOnly} onChange={setLowOnly} label="Маржа ниже мин." />
        <div className="ml-auto flex shrink-0 items-center gap-2.5">
          <div className="inline-flex overflow-hidden rounded-lg border border-border">
            {PAGE_SIZES.map((n) => (
              <button key={n} type="button" onClick={() => setPageSize(n)} className={cn("px-2.5 py-1.5 text-[12.5px] transition-colors", pageSize === n ? "bg-ink text-white" : "bg-white text-ink hover:bg-surface")}>{n}</button>
            ))}
          </div>
          <span className="text-[12.5px] tabular-nums text-ink-subtle">{filtered.length}</span>
        </div>
      </div>

      {/* ── Плавающая bulk-плашка ── */}
      {sel.size > 0 ? (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
            <span className="text-[13px] font-medium">Выбрано: {sel.size}</span>
            <button type="button" onClick={() => setSel(new Set())} className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white" title="Снять выделение"><span aria-hidden>✕</span></button>
            <span className="mx-1 h-5 w-px bg-white/20" />
            <DarkBtn label="+ %" onClick={() => askBulk({ title: "Наценить закупку на %", label: "Процент", placeholder: "напр. 5", build: (v) => ({ type: "markup_pct", value: v }) })} />
            <DarkBtn label="+ ₽" onClick={() => askBulk({ title: "Наценить закупку на ₽", label: "Сумма, ₽", placeholder: "напр. 1000", build: (v) => ({ type: "markup_rub", value: v }) })} />
            <DarkBtn label="− %" onClick={() => askBulk({ title: "Скинуть с закупки %", label: "Процент", placeholder: "напр. 5", build: (v) => ({ type: "discount_pct", value: v }) })} />
            <DarkBtn label="Курс закупа" onClick={() => askBulk({ title: "Курс закупа для выбранных", label: "Курс USD", placeholder: "напр. 90", build: (v) => ({ type: "set_rate", value: v }) })} />
            <DarkBtn label="Сбросить к формуле" onClick={() => confirmBulk("Снять ручную фиксацию?", { type: "reset_formula" })} />
            <DarkBtn label="Пересчитать" onClick={onRecalcSelected} />
            <DarkBtn label="Экспорт выбранных" onClick={() => onExportIds([...sel])} />
          </div>
        </div>
      ) : null}

      {/* ── Таблица / карточки ── */}
      {localRows.length === 0 ? (
        <EmptyBox title="В каталоге пока нет товаров" hint="Добавьте товары в разделе «Товары»." href="/admin/catalog/products" cta="Перейти в каталог" />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-border/60 bg-white lg:block">
            <table className="w-full min-w-[1000px] text-[13px]">
              <thead className="sticky top-0 z-10 bg-surface/90 text-ink-subtle backdrop-blur-sm">
                <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium">
                  <th className="w-8"><input type="checkbox" checked={allPageSelected} onChange={toggleAll} aria-label="Выбрать все" className="size-4" /></th>
                  <th className="w-12"></th>
                  <th>Товар</th>
                  <th className="w-32 text-right">Закупка ₽</th>
                  <th className="w-24 text-right">Курс</th>
                  <th className="w-28 text-right">Нал</th>
                  <th className="w-28 text-right">Карта</th>
                  <th className="w-28 text-right">Кредит 24м</th>
                  <th className="w-20 text-right">Наценка</th>
                  <th className="w-24 text-right">
                    <span className="inline-flex items-center justify-end gap-1">
                      Маржа ₽
                      <InfoTip text="Маржа = цена нал − закупка ₽. Наценка считается от закупки по РАБОЧЕМУ курсу, а не по курсу закупа. Если рабочий курс ниже курса закупа — часть наценки уходит на курсовую разницу, и маржа меньше, чем % наценки." />
                    </span>
                  </th>
                  <th className="w-24">Статус</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <React.Fragment key={g.key}>
                    <tr className="bg-surface/40">
                      <td colSpan={12} className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-subtle">{g.label} · {g.items.length} · наценка {markupOf(g.key === "other" ? null : g.key)}%</td>
                    </tr>
                    {g.items.map((r) => {
                      return (
                        <tr
                          key={r.id}
                          onClick={(e) => { if (!(e.target as HTMLElement).closest("a,button,input,label")) toggleSel(r.id); }}
                          className={cn("cursor-pointer select-none border-t border-border/40 align-middle transition-colors hover:bg-surface/50 [&>td]:px-3 [&>td]:py-2", sel.has(r.id) && "bg-ink/[0.06]")}
                        >
                          <td><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggleSel(r.id)} aria-label="Выбрать" className="size-4" /></td>
                          <td>
                            <span className="inline-flex size-10 items-center justify-center overflow-hidden rounded-md border border-border bg-white">
                              {r.image ? <Image src={r.image} alt="" width={36} height={36} unoptimized className="size-9 object-contain" /> : null}
                            </span>
                          </td>
                          <td>
                            <Link href={`/admin/catalog/products/${r.id}/edit`} className="font-medium text-ink hover:underline">{r.title}</Link>
                            <div className="text-[11.5px] text-ink-subtle">{[r.sku, r.color, r.memory].filter(Boolean).join(" · ") || "—"}{r.is_used ? " · Б/У" : ""}</div>
                          </td>
                          <td className="text-right">
                            {r.price_override ? (
                              <span className="text-ink-subtle">фикс</span>
                            ) : (
                              <>
                                <EditableNum value={r.cost_rub} onSave={(v) => saveCost(r, v, r.cost_rate)} />
                              </>
                            )}
                          </td>
                          <td className="text-right">
                            {r.price_override ? <span className="text-ink-subtle">—</span> : <EditableNum value={r.cost_rate} step="0.01" onSave={(v) => saveCost(r, r.cost_rub, v)} />}
                          </td>
                          <td className="text-right font-semibold text-sale tabular-nums">{r.price_cash != null ? formatPrice(r.price_cash) : "—"}</td>
                          <td className="text-right tabular-nums text-ink-muted">{r.price_card != null ? formatPrice(r.price_card) : "—"}</td>
                          <td className="text-right tabular-nums text-ink-muted">{r.credit_24m_monthly != null ? `${formatPrice(r.credit_24m_monthly)}` : "—"}</td>
                          <td className="text-right tabular-nums text-ink-subtle">{r.price_override ? "—" : `${markupOf(r.category_slug)}%`}</td>
                          <td className="text-right"><MarginPill rub={r.cost_rub != null && r.price_cash != null ? r.price_cash - r.cost_rub : null} minRub={minMarginOf(r.category_slug)} /></td>
                          <td>
                            <span className="inline-flex items-center gap-1.5">
                              <StatusPill status={r.status} />
                              {r.price_override ? <span className="inline-flex items-center gap-0.5 rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-medium text-white"><Lock className="h-2.5 w-2.5" />фикс</span> : null}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center justify-end gap-1">
                              <button type="button" onClick={() => recalcOne(r.id)} title="Пересчитать по формуле" className="inline-flex size-7 items-center justify-center rounded-sm border border-border bg-white text-ink-subtle hover:bg-surface hover:text-ink"><RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} /></button>
                              <Link href={`/admin/catalog/products/${r.id}/edit`} className="inline-flex size-7 items-center justify-center rounded-sm border border-border bg-white text-ink-subtle hover:bg-surface hover:text-ink" title="Открыть карточку"><ArrowUpRight className="h-4 w-4" strokeWidth={1.75} /></Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
                {paged.length === 0 ? <tr><td colSpan={12} className="px-4 py-10 text-center text-ink-muted">Нет товаров по фильтру.</td></tr> : null}
              </tbody>
            </table>
          </div>

          {/* мобильные карточки */}
          <div className="space-y-3 lg:hidden">
            {paged.length === 0 ? <div className="rounded-lg border border-border/60 bg-white px-4 py-8 text-center text-ink-muted">Нет товаров по фильтру.</div> : paged.map((r) => {
              return (
                <div key={r.id} onClick={(e) => { if (!(e.target as HTMLElement).closest("a,button,input,label")) toggleSel(r.id); }} className={cn("cursor-pointer select-none rounded-xl border border-border/60 bg-white p-3", sel.has(r.id) && "ring-1 ring-ink/30")}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggleSel(r.id)} className="mt-1.5 size-4" />
                    <span className="inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white">{r.image ? <Image src={r.image} alt="" width={36} height={36} unoptimized className="size-9 object-contain" /> : null}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/catalog/products/${r.id}/edit`} className="block truncate text-[14px] font-medium text-ink">{r.title}</Link>
                      <div className="truncate text-[11.5px] text-ink-subtle">{[r.sku, r.color, r.memory].filter(Boolean).join(" · ") || "—"}</div>
                    </div>
                    <button type="button" onClick={() => recalcOne(r.id)} className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm border border-border text-ink-subtle"><RefreshCw className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                    <Cell label="Нал"><span className="font-semibold text-sale">{r.price_cash != null ? formatPrice(r.price_cash) : "—"}</span></Cell>
                    <Cell label="Карта">{r.price_card != null ? formatPrice(r.price_card) : "—"}</Cell>
                    <div className="flex items-center justify-between gap-2"><span className="text-ink-subtle">Закупка</span>{r.price_override ? <span>фикс</span> : <EditableNum value={r.cost_rub} onSave={(v) => saveCost(r, v, r.cost_rate)} />}</div>
                    <Cell label="Наценка">{r.price_override ? "—" : `${markupOf(r.category_slug)}%`}</Cell>
                    <Cell label="Маржа ₽"><MarginPill rub={r.cost_rub != null && r.price_cash != null ? r.price_cash - r.cost_rub : null} minRub={minMarginOf(r.category_slug)} /></Cell>
                  </div>
                </div>
              );
            })}
          </div>

          {/* пагинация */}
          {pages > 1 ? (
            <div className="flex items-center justify-center gap-1.5">
              <button type="button" disabled={pageClamped <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-white px-3 text-[13px] text-ink hover:bg-surface disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Назад</button>
              {Array.from({ length: pages }, (_, i) => i + 1).filter((p) => Math.abs(p - pageClamped) <= 2 || p === 1 || p === pages).map((p, i, arr) => (
                <React.Fragment key={p}>
                  {i > 0 && p - arr[i - 1] > 1 ? <span className="px-1 text-ink-subtle">…</span> : null}
                  <button type="button" onClick={() => setPage(p)} className={cn("inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-[13px] tabular-nums", p === pageClamped ? "border-ink bg-ink text-white" : "border-border bg-white text-ink hover:bg-surface")}>{p}</button>
                </React.Fragment>
              ))}
              <button type="button" disabled={pageClamped >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-white px-3 text-[13px] text-ink hover:bg-surface disabled:opacity-40">Вперёд <ChevronRight className="h-4 w-4" /></button>
            </div>
          ) : null}
        </>
      )}

      <p className="text-[12px] text-ink-subtle">Закупку и курс закупа можно править прямо в таблице — цены пересчитываются сразу. Кнопка ↻ в строке пересчитывает товар по формуле. Б/У в формулу не входят.</p>

      <FormulaModal open={formulaOpen} onClose={() => setFormulaOpen(false)} initial={settings} course={course} categories={categories} affected={localRows.filter((r) => !r.is_used && !r.price_override && r.cost_rub != null).length} onSaved={() => { router.refresh(); }} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={() => { setImportOpen(false); router.refresh(); }} />

      {exportOpen ? <ExportModal open onClose={() => setExportOpen(false)} categories={categories} prefs={exportPrefs} /> : null}
      {feedOpen ? <FeedModal open onClose={() => setFeedOpen(false)} categories={categories} prefs={ymlPrefs} feedUrl={feedUrl} /> : null}

      <Modal open={!!dialog} onClose={() => setDialog(null)} title={dialog?.title ?? ""}
        footer={<><AdminButton type="button" variant="outline" onClick={() => setDialog(null)}>Отмена</AdminButton><AdminButton type="button" onClick={submitDialog}>{dialog?.confirmLabel ?? "Применить"}</AdminButton></>}>
        {dialog?.desc ? <p className="mb-3 text-[13px] text-ink-muted">{dialog.desc}</p> : null}
        {dialog?.input ? (
          <Field label={dialog.input.label}>
            <TextInput autoFocus type="number" step="0.01" value={dlgVal} placeholder={dialog.input.placeholder} onChange={(e) => setDlgVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitDialog(); }} />
          </Field>
        ) : null}
      </Modal>
    </div>
  );
}

/* ── мелкие компоненты ── */
function CourseChip({ label, value, delta }: { label: string; value: number | null; delta: number | null }) {
  const up = delta != null && delta > 0.01, down = delta != null && delta < -0.01;
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums text-ink">
      <span className="text-ink-subtle">{label}</span>
      <span className="font-semibold">{value != null ? `${value.toFixed(2)} ₽` : "—"}</span>
      {delta != null ? (
        <span className={cn("inline-flex items-center text-[12px]", up ? "text-[#0a7d3e]" : down ? "text-sale" : "text-ink-subtle")}>
          {up ? <ArrowUp className="h-3 w-3" /> : down ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}{Math.abs(delta).toFixed(1)}%
        </span>
      ) : null}
    </span>
  );
}

function ActionTile({ icon, title, hint, onClick }: { icon: React.ReactNode; title: string; hint: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-white px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-[0_8px_24px_-16px_rgba(0,0,0,0.18)]">
      <span className="inline-flex size-9 items-center justify-center rounded-lg bg-surface text-ink">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[14px] font-medium text-ink">{title}</span>
        <span className="block text-[12px] text-ink-subtle">{hint}</span>
      </span>
    </button>
  );
}

/** Маржа в ₽ с подсветкой по мин.марже категории: зелёный >1.5×, красный <мин. */
function MarginPill({ rub, minRub }: { rub: number | null; minRub: number }) {
  if (rub == null) return <span className="text-ink-subtle">—</span>;
  const cls =
    minRub > 0 && rub < minRub ? "bg-sale/10 text-sale"
    : minRub > 0 && rub >= minRub * 1.5 ? "bg-[#e7f6ee] text-[#0a7d3e]"
    : "bg-surface text-ink-muted";
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[12px] font-medium tabular-nums", cls)}>{formatPrice(rub)}</span>;
}

function StatusPill({ status }: { status: string | null }) {
  if (status === "draft") return <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-ink-muted">Черновик</span>;
  if (status === "archived") return <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-ink-subtle">Архив</span>;
  return <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] text-ink">Опубликован</span>;
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-2"><span className="text-ink-subtle">{label}</span><span className="tabular-nums">{children}</span></div>;
}

function EmptyBox({ title, hint, href, cta }: { title: string; hint: string; href: string; cta: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-white px-6 py-16 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-surface text-ink-muted"><Upload className="h-5 w-5" strokeWidth={1.5} /></span>
      <p className="mt-4 text-base font-medium text-ink">{title}</p>
      <p className="mt-1.5 max-w-md text-sm text-ink-muted">{hint}</p>
      <Link href={href} className="mt-6"><AdminButton type="button">{cta}</AdminButton></Link>
    </div>
  );
}

/** Инлайн-редактирование числа в ячейке таблицы. */
function EditableNum({ value, onSave, step }: { value: number | null; onSave: (v: number | null) => void; step?: string }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  if (!editing) {
    return (
      <button type="button" onClick={() => { setDraft(value != null ? String(value) : ""); setEditing(true); }} className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 tabular-nums hover:bg-surface">
        {value != null ? value.toLocaleString("ru-RU") : <span className="text-ink-subtle">указать</span>}
        {saved ? <Check className="h-3.5 w-3.5 text-[#0a7d3e]" /> : <Pencil className="h-3 w-3 text-ink-subtle/60" />}
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
    <input autoFocus value={draft} step={step} inputMode="decimal" onChange={(e) => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
      className="h-7 w-24 rounded-sm border border-ink/40 bg-white px-1.5 text-right text-[13px] tabular-nums outline-none" />
  );
}

function DarkBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="inline-flex h-8 items-center rounded-md bg-white/10 px-3 text-[13px] text-white transition-colors hover:bg-white/20">{label}</button>;
}

/** Подсказка при наведении (без зависимостей). */
function InfoTip({ text }: { text: string }) {
  return (
    <span className="group/tip relative inline-flex">
      <Info className="h-3.5 w-3.5 cursor-help text-ink-subtle" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-[80] mb-1.5 hidden w-56 -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-[11px] font-normal leading-relaxed text-white shadow-[0_10px_30px_rgba(0,0,0,0.2)] group-hover/tip:block">
        {text}
      </span>
    </span>
  );
}

/* ── Модалка формулы ── */
const TOOLTIPS: Record<string, string> = {
  default_markup_percent: "Наценка по умолчанию — применяется к категориям, где наценка не задана отдельно. Накручивается на закупочную цену через рабочий курс.",
  card_markup_percent: "На сколько цена картой выше наличных. Закладывайте комиссию эквайринга (1.5–3.5%) и маржу за безнал.",
  credit_6m_markup_percent: "Удорожание для рассрочки 6 мес. Покрывает комиссию банка-партнёра и риск.",
  credit_12m_markup_percent: "Удорожание для рассрочки 12 мес.",
  credit_24m_markup_percent: "Удорожание для рассрочки 24 мес. Стандарт рынка: 23/28/37%.",
  price_rounding: "До какой суммы округляются итоговые цены. Психологически выгоднее круглые числа.",
  working_usd_rate: "Курс, по которому считаются цены. Можно тянуть из ЦБ с поправкой.",
  cbr_markup_percent: "Поправка к курсу ЦБ при автообновлении (на конвертацию у эквайринга).",
};

function FormulaModal({ open, onClose, initial, course, affected, categories, onSaved }: { open: boolean; onClose: () => void; initial: PricingSettingsInput; course: CourseInfo; affected: number; categories: PricingCategory[]; onSaved: () => void }) {
  const [v, setV] = React.useState<PricingSettingsInput>(initial);
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => { if (open) setV(initial); }, [open, initial]);
  const set = (patch: Partial<PricingSettingsInput>) => setV((s) => ({ ...s, ...patch }));
  const previewFor = (usd: number) => calculatePrices({ cost_usd: usd, price_override: false }, v as PricingSettings);

  const save = async () => {
    setSaving(true);
    const res = await updatePricingSettings(v);
    setSaving(false);
    if (res.error) return toast.error(res.error);
    toast.success("Формула сохранена. Нажмите «Пересчитать всё», чтобы применить к ценам.");
    onSaved();
    onClose();
  };

  const numField = (label: string, key: keyof PricingSettingsInput, hint?: string) => (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-ink">
        {label}
        {TOOLTIPS[key] ? <InfoTip text={TOOLTIPS[key]} /> : null}
      </span>
      <TextInput type="number" step="0.01" value={String(v[key] ?? "")} onChange={(e) => set({ [key]: e.target.value === "" ? 0 : Number(e.target.value) } as Partial<PricingSettingsInput>)} />
      {hint ? <span className="mt-1 block text-[12px] text-ink-subtle">{hint}</span> : null}
    </label>
  );

  return (
    <Modal open={open} onClose={onClose} title="Формула расчёта цен" className="max-w-3xl"
      footer={<div className="flex items-center gap-3"><span className="text-[12px] text-ink-subtle">Сохраняет формулу. Затронет {affected} товаров после «Пересчитать всё».</span><AdminButton type="button" loading={saving} onClick={save}>Сохранить</AdminButton></div>}>
      <div className="space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Глобальные настройки</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {numField("Рабочий курс USD", "working_usd_rate", course.usd ? `ЦБ: ${course.usd.toFixed(2)}` : undefined)}
          {numField("Наценка по умолчанию, %", "default_markup_percent")}
          {numField("Округление, ₽", "price_rounding")}
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {numField("Карта, %", "card_markup_percent")}
          {numField("6 мес, %", "credit_6m_markup_percent")}
          {numField("12 мес, %", "credit_12m_markup_percent")}
          {numField("24 мес, %", "credit_24m_markup_percent")}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {numField("Поправка к курсу ЦБ, %", "cbr_markup_percent")}
          <Field label="Автообновление курса ЦБ">
            <div className="flex h-9 items-center"><Switch checked={v.use_cbr_auto} onChange={(on) => set({ use_cbr_auto: on })} label={v.use_cbr_auto ? "Включено" : "Выключено"} /></div>
          </Field>
        </div>

        <CategoryMarkupTable categories={categories} onSaved={onSaved} />
        <div className="grid gap-3 sm:grid-cols-3">
          {[500, 1000, 2000].map((usd) => {
            const p = previewFor(usd);
            return (
              <div key={usd} className="rounded-lg border border-border/60 bg-surface/40 p-3 text-[12.5px]">
                <p className="mb-1.5 font-medium text-ink">Закупка ${usd}</p>
                {p ? (
                  <dl className="space-y-0.5 text-ink-muted">
                    <div className="flex justify-between"><dt>Нал</dt><dd className="font-semibold text-sale tabular-nums">{formatPrice(p.price_cash)}</dd></div>
                    <div className="flex justify-between"><dt>Карта</dt><dd className="tabular-nums">{formatPrice(p.price_card)}</dd></div>
                    <div className="flex justify-between"><dt>24 мес</dt><dd className="tabular-nums">{formatPrice(p.credit_24m_monthly)}/мес</dd></div>
                  </dl>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

/** Таблица наценок и мин.маржи по категориям внутри модалки «Формула». */
function CategoryMarkupTable({ categories, onSaved }: { categories: PricingCategory[]; onSaved: () => void }) {
  // только общие (родительские) категории; наценка каскадом применяется к подкатегориям
  const parents = categories.filter((c) => !c.parent_slug);
  if (parents.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">Наценки по категориям</p>
        <InfoTip text="Наценка на закупочную цену (не на курс). Задаётся на общей категории и автоматически применяется ко всем её подкатегориям. Телефоны 8–12%, часы/планшеты ~20%, колонки 30–50%. После сохранения пересчитываются товары категории и всех подкатегорий." />
      </div>
      <div className="overflow-hidden rounded-lg border border-border/60">
        <table className="w-full text-[13px]">
          <thead className="bg-surface/70 text-ink-subtle">
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
              <th>Категория</th>
              <th className="w-28 text-right">Наценка %</th>
              <th className="w-32 text-right">Мин. маржа ₽</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody>
            {parents.map((c) => (
              <CategoryMarkupRow key={c.slug} cat={c} onSaved={onSaved} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoryMarkupRow({ cat, onSaved }: { cat: PricingCategory; onSaved: () => void }) {
  const [mk, setMk] = React.useState(String(cat.markup_percent));
  const [mm, setMm] = React.useState(String(cat.min_margin_rub));
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => { setMk(String(cat.markup_percent)); setMm(String(cat.min_margin_rub)); }, [cat.markup_percent, cat.min_margin_rub]);
  const dirty = Number(mk) !== cat.markup_percent || Number(mm) !== cat.min_margin_rub;
  const save = async () => {
    const mkn = Number(mk.replace(",", ".")), mmn = Number(mm.replace(",", "."));
    if (!Number.isFinite(mkn) || !Number.isFinite(mmn)) return toast.error("Введите числа");
    setSaving(true);
    const res = await updateCategoryPricing(cat.slug, mkn, mmn);
    setSaving(false);
    if (res.error) return toast.error(res.error);
    toast.success(`«${cat.title}»: пересчитано ${res.recalculated ?? 0} товаров`);
    onSaved();
  };
  return (
    <tr className="border-t border-border/40 [&>td]:px-3 [&>td]:py-1.5">
      <td className="text-ink">{cat.title}</td>
      <td className="text-right">
        <input type="number" min={0} step="0.5" value={mk} onChange={(e) => setMk(e.target.value)} className="h-8 w-20 rounded-md border border-border bg-white px-2 text-right tabular-nums outline-none focus:border-ink/40" />
      </td>
      <td className="text-right">
        <input type="number" min={0} step="100" value={mm} onChange={(e) => setMm(e.target.value)} className="h-8 w-24 rounded-md border border-border bg-white px-2 text-right tabular-nums outline-none focus:border-ink/40" />
      </td>
      <td className="text-right">
        {dirty ? (
          <button type="button" onClick={save} disabled={saving} className="rounded-md bg-ink px-2.5 py-1 text-[12px] font-medium text-white transition-colors hover:bg-ink/90 disabled:opacity-50">
            {saving ? "…" : "Сохранить"}
          </button>
        ) : null}
      </td>
    </tr>
  );
}

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
          <p className="text-[13px] text-ink-muted">Файл XLSX или CSV с колонками <b>SKU</b>, <b>Закупка ₽</b>, <b>Курс закупа</b>. До 5 МБ / 5000 строк.</p>
          <div className="flex items-center gap-2 text-[13px] text-ink">
            <span>Идентификатор:</span>
            <Select value={idBy} onChange={(e) => setIdBy(e.target.value as "sku" | "id")} className="w-36">
              <option value="sku">по SKU</option>
              <option value="id">по ID</option>
            </Select>
          </div>
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
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium"><th>SKU</th><th>Товар</th><th className="text-right">Закупка ₽</th><th className="text-right">Курс</th><th></th></tr>
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

// ── Выбор главных категорий (чекбоксы в выпадающем списке) ────────────────────
function CategoryPicker({ categories, value, onChange }: { categories: PricingCategory[]; value: string[] | null; onChange: (v: string[] | null) => void }) {
  const [open, setOpen] = React.useState(false);
  const parents = categories.filter((c) => !c.parent_slug);
  const sel = value ?? [];
  const isAll = sel.length === 0;
  const toggle = (slug: string) => {
    const next = sel.includes(slug) ? sel.filter((s) => s !== slug) : [...sel, slug];
    onChange(next.length === 0 ? null : next);
  };
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-sm border border-border bg-white px-3 text-[13px] text-ink hover:bg-surface">
        <span className="truncate">{isAll ? "Все категории" : `Выбрано: ${sel.length}`}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-subtle transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="absolute z-40 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border/70 bg-white py-1 shadow-lg">
          <button type="button" onClick={() => onChange(null)}
            className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-surface", isAll ? "font-medium text-ink" : "text-ink-muted")}>
            <span className={cn("flex h-4 w-4 items-center justify-center rounded-[4px] border", isAll ? "border-ink bg-ink text-white" : "border-border")}>{isAll ? <Check className="h-3 w-3" /> : null}</span>
            Все категории
          </button>
          <div className="my-1 border-t border-border/50" />
          {parents.map((c) => {
            const on = sel.includes(c.slug);
            return (
              <button key={c.slug} type="button" onClick={() => toggle(c.slug)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-ink hover:bg-surface">
                <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border", on ? "border-ink bg-ink text-white" : "border-border")}>{on ? <Check className="h-3 w-3" /> : null}</span>
                <span className="truncate">{c.title}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// ── Модалка экспорта прайса (категории + колонки + куда отправить) ────────────
function ExportModal({ open, onClose, categories, prefs }: { open: boolean; onClose: () => void; categories: PricingCategory[]; prefs: PricingExportPrefs }) {
  // Модалка монтируется только когда открыта (см. рендер) — state из prefs при маунте.
  const [cols, setCols] = React.useState<ExportColumnKey[]>((prefs.columns?.length ? prefs.columns : ["title", "price_cash", "price_card"]) as ExportColumnKey[]);
  const [cats, setCats] = React.useState<string[] | null>(prefs.categories ?? null);
  const [busy, setBusy] = React.useState(false);

  const persist = (nextCols: ExportColumnKey[], nextCats: string[] | null) => { void savePricingExportPrefs({ columns: nextCols, categories: nextCats }); };
  const setColsP = (next: ExportColumnKey[]) => { setCols(next); persist(next, cats); };
  const setCatsP = (next: string[] | null) => { setCats(next); persist(cols, next); };

  const run = async (dest: "download" | "telegram", format: "xlsx" | "csv") => {
    if (cols.length === 0) return toast.error("Выберите хотя бы одну колонку");
    setBusy(true);
    persist(cols, cats);
    if (dest === "download") {
      const res = await exportPricing({ categories: cats, columns: cols, format });
      setBusy(false);
      if ("error" in res) return toast.error(res.error);
      downloadBase64(res.filename, res.base64, res.mime);
      toast.success("Файл сформирован");
    } else {
      const res = await exportPricingToTelegram({ categories: cats, columns: cols, format });
      setBusy(false);
      if (res.error) return toast.error(res.error);
      toast.success(`Отправлено в Telegram (${res.ok} чат.)`);
    }
  };

  const groups = Array.from(new Set(EXPORT_COLUMNS.map((c) => c.group)));
  return (
    <Modal open={open} onClose={onClose} title="Экспорт прайса" className="max-w-2xl"
      footer={<AdminButton type="button" variant="outline" onClick={onClose}>Закрыть</AdminButton>}>
      <div className="space-y-5">
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Категории</p>
          <CategoryPicker categories={categories} value={cats} onChange={setCatsP} />
          <p className="mt-1 text-[12px] text-ink-subtle">Выбор главной категории включает её подкатегории. Пусто = весь каталог.</p>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Какие данные включить</p>
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g}>
                <p className="mb-1 text-[11px] text-ink-subtle">{g}</p>
                <div className="flex flex-wrap gap-1.5">
                  {EXPORT_COLUMNS.filter((c) => c.group === g).map((c) => {
                    const on = cols.includes(c.key);
                    return (
                      <button key={c.key} type="button"
                        onClick={() => setColsP(on ? cols.filter((x) => x !== c.key) : [...cols, c.key])}
                        className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] transition-colors", on ? "border-ink bg-ink text-white" : "border-border bg-white text-ink-muted hover:border-ink/40")}>
                        {on ? <Check className="h-3 w-3" /> : null}{c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-surface/30 p-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Куда отправить</p>
          <div className="flex flex-wrap items-center gap-2">
            <AdminButton type="button" variant="outline" size="sm" disabled={busy} onClick={() => run("download", "xlsx")}><Download className="h-4 w-4" strokeWidth={1.75} /> Скачать XLSX</AdminButton>
            <AdminButton type="button" variant="outline" size="sm" disabled={busy} onClick={() => run("download", "csv")}><Download className="h-4 w-4" strokeWidth={1.75} /> Скачать CSV</AdminButton>
            <span className="mx-1 hidden h-7 w-px bg-border sm:block" />
            <AdminButton type="button" size="sm" loading={busy} onClick={() => run("telegram", "xlsx")}><Send className="h-4 w-4" strokeWidth={1.75} /> В Telegram (XLSX)</AdminButton>
            <AdminButton type="button" variant="outline" size="sm" disabled={busy} onClick={() => run("telegram", "csv")}><Send className="h-4 w-4" strokeWidth={1.75} /> В Telegram (CSV)</AdminButton>
          </div>
          <p className="mt-2 text-[12px] text-ink-subtle">Выбранные категории и колонки сохраняются автоматически.</p>
        </div>
      </div>
    </Modal>
  );
}

// ── Модалка YML-фида (ссылка + выбор главных категорий + Б/У) ─────────────────
function FeedModal({ open, onClose, categories, prefs, feedUrl }: { open: boolean; onClose: () => void; categories: PricingCategory[]; prefs: YmlFeedPrefs; feedUrl: string }) {
  // Монтируется только когда открыта (см. рендер) — state из prefs при маунте.
  const [cats, setCats] = React.useState<string[] | null>(prefs.categories ?? null);
  const [includeUsed, setIncludeUsed] = React.useState(prefs.includeUsed !== false);
  const persist = (nextCats: string[] | null, used: boolean) => { void saveYmlFeedPrefs({ categories: nextCats, includeUsed: used }); };

  return (
    <Modal open={open} onClose={onClose} title="YML-фид для ВКонтакте" className="max-w-2xl"
      footer={<AdminButton type="button" variant="outline" onClick={onClose}>Закрыть</AdminButton>}>
      <p className="mb-3 text-[13px] text-ink-muted">
        Постоянная ссылка на фид в формате YML. Отдайте её в рекламном кабинете ВКонтакте
        (Магазин / Товары → загрузка по ссылке). Цены и наличие подтягиваются из прайса
        автоматически — новые товары появляются в фиде сами, файл всегда свежий.
      </p>
      <div className="flex items-center gap-2">
        <input readOnly value={feedUrl} onFocus={(e) => e.currentTarget.select()}
          className="h-9 flex-1 rounded-sm border border-border bg-surface/40 px-3 text-[13px] text-ink outline-none focus:border-ink/40" />
        <AdminButton type="button" variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(feedUrl); toast.success("Ссылка скопирована"); }}>
          <Copy className="h-4 w-4" strokeWidth={1.75} /> Копировать
        </AdminButton>
        <a href={feedUrl} target="_blank" rel="noopener noreferrer">
          <AdminButton type="button" size="sm"><ArrowUpRight className="h-4 w-4" strokeWidth={1.75} /> Открыть</AdminButton>
        </a>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Категории в фиде</p>
          <CategoryPicker categories={categories} value={cats} onChange={(v) => { setCats(v); persist(v, includeUsed); }} />
          <p className="mt-1 text-[12px] text-ink-subtle">Только главные категории — подкатегории включаются автоматически. Пусто = все.</p>
        </div>
        <label className="flex items-center gap-2.5 text-[13px] text-ink">
          <Switch checked={includeUsed} onChange={(v) => { setIncludeUsed(v); persist(cats, v); }} />
          Включать Б/У товары в фид
        </label>
      </div>

      <ul className="mt-4 space-y-1.5 text-[12.5px] text-ink-subtle">
        <li>· Цена — наличными; старая цена (зачёркнутая) — картой, чтобы показать выгоду.</li>
        <li>· Передаются картинки, бренд и характеристики (цвет, память, SIM, гарантия).</li>
        <li>· Товары без цены и архив в фид не входят.</li>
      </ul>
    </Modal>
  );
}
