"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, Search } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { AdminButton, Select } from "@/components/admin/form";
import { cn } from "@/lib/utils/cn";
import { setVariantGroup } from "./variant-actions";
import type { RelatedOption } from "./ProductForm";

type CategoryRow = { slug: string; title: string; parent_slug?: string | null };

/**
 * «Связанные товары» — варианты одного товара по цвету/памяти. Выбранные товары
 * получают общий variant_group_id (двунаправленно). На сайте из группы строятся
 * переключатели цвет/память. Если группа не задана — фолбэк на объединение по model.
 *
 * Добавлять можно двумя способами: поиском по названию/цвету/памяти ИЛИ выбором
 * категории/подкатегории — тогда показывается весь список товаров этой категории.
 */
export function RelatedProductsManager({
  productId,
  currentGroupId,
  products,
  categories = [],
}: {
  productId: string;
  currentGroupId: string | null;
  products: RelatedOption[];
  categories?: CategoryRow[];
}) {
  const router = useRouter();
  const self = products.find((p) => p.id === productId);
  const initial = React.useMemo(
    () =>
      currentGroupId
        ? products.filter((p) => p.id !== productId && p.variant_group_id === currentGroupId).map((p) => p.id)
        : [],
    [currentGroupId, productId, products]
  );
  const [members, setMembers] = React.useState<string[]>(initial);
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState(""); // выбранная категория/подкатегория для просмотра списком
  const [saving, setSaving] = React.useState(false);

  const byId = React.useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const dirty = React.useMemo(() => {
    const a = [...members].sort().join("|");
    const b = [...initial].sort().join("|");
    return a !== b;
  }, [members, initial]);

  const add = (id: string) => setMembers((m) => (m.includes(id) ? m : [...m, id]));
  const remove = (id: string) => setMembers((m) => m.filter((x) => x !== id));

  // Сколько товаров в каждой категории (для подписей в списке выбора).
  const countByCat = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) m.set(p.category_slug, (m.get(p.category_slug) ?? 0) + 1);
    return m;
  }, [products]);

  // Категории с товарами, упорядочены: родитель → его подкатегории.
  const childrenSlugs = React.useMemo(() => {
    const m = new Map<string, string[]>();
    for (const c of categories) if (c.parent_slug) m.set(c.parent_slug, [...(m.get(c.parent_slug) ?? []), c.slug]);
    return m;
  }, [categories]);

  const catOptions = React.useMemo(() => {
    const parents = categories.filter((c) => !c.parent_slug);
    const out: { value: string; label: string }[] = [];
    const totalFor = (slug: string) =>
      (countByCat.get(slug) ?? 0) + (childrenSlugs.get(slug) ?? []).reduce((s, ch) => s + (countByCat.get(ch) ?? 0), 0);
    for (const p of parents) {
      const t = totalFor(p.slug);
      if (t > 0) out.push({ value: p.slug, label: `${p.title} (${t})` });
      for (const ch of childrenSlugs.get(p.slug) ?? []) {
        const c = categories.find((x) => x.slug === ch);
        const n = countByCat.get(ch) ?? 0;
        if (c && n > 0) out.push({ value: ch, label: `— ${c.title} (${n})` });
      }
    }
    return out;
  }, [categories, childrenSlugs, countByCat]);

  // Поиск имеет приоритет; иначе — список выбранной категории (вместе с подкатегориями).
  const candidates = products.filter((p) => {
    if (p.id === productId || members.includes(p.id)) return false;
    if (q.trim()) {
      const t = `${p.title} ${p.color ?? ""} ${p.memory ?? ""}`.toLowerCase();
      return t.includes(q.trim().toLowerCase());
    }
    if (cat) {
      const kids = childrenSlugs.get(cat) ?? [];
      return p.category_slug === cat || kids.includes(p.category_slug);
    }
    return false;
  });

  const save = async () => {
    setSaving(true);
    const res = await setVariantGroup(productId, members);
    setSaving(false);
    if (res.error) return toast.error(res.error);
    toast.success(members.length ? `Группа сохранена: ${res.count} товаров` : "Связи сняты");
    router.refresh();
  };

  const meta = (p: RelatedOption | undefined) => [p?.color, p?.memory].filter(Boolean).join(" · ") || "—";

  return (
    <Panel className="space-y-4 p-5">
      <div>
        <p className="text-[14px] font-semibold text-ink">Связанные товары (варианты)</p>
        <p className="mt-1 text-[13px] text-ink-muted">
          Объедините варианты этого товара по цвету и памяти — на сайте они станут переключателями.
          Связь двусторонняя: товары попадут в общую группу и будут ссылаться друг на друга.
          Объединяются только те товары, что вы выберете вручную (авто-подбора нет).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] text-ink-subtle">Выбрано связанных: {members.length}</span>
      </div>

      {/* Текущий товар */}
      {self ? (
        <div className="flex items-center gap-3 rounded-lg border border-ink/20 bg-ink/[0.03] px-3 py-2">
          <Thumb url={self.image} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium text-ink">{self.title}</p>
            <p className="text-[12px] text-ink-subtle">{meta(self)} · этот товар</p>
          </div>
        </div>
      ) : null}

      {/* Выбранные связанные */}
      {members.length > 0 ? (
        <ul className="space-y-1.5">
          {members.map((id) => {
            const p = byId.get(id);
            return (
              <li key={id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-white px-3 py-2">
                <Thumb url={p?.image ?? null} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] text-ink">{p?.title ?? id}</p>
                  <p className="text-[12px] text-ink-subtle">{meta(p)}</p>
                </div>
                <button type="button" onClick={() => remove(id)} className="rounded-sm p-1.5 text-ink-subtle hover:bg-surface hover:text-sale" aria-label="Убрать">
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[13px] text-ink-subtle">Связанных товаров пока нет.</p>
      )}

      {/* Поиск и добавление */}
      <div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" strokeWidth={1.75} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Найти товар по названию, цвету, памяти…"
              className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-[13px] text-ink outline-none focus:border-ink/40"
            />
          </div>
          {catOptions.length > 0 ? (
            <Select
              value={cat}
              onChange={(e) => { setCat(e.target.value); setQ(""); }}
              className="sm:w-64"
            >
              <option value="">Выбрать из категории…</option>
              {catOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          ) : null}
        </div>

        {/* Когда показан список категории — даём добавить все видимые разом (для объединения вариантов). */}
        {!q.trim() && cat && candidates.length > 0 ? (
          <div className="mt-2 flex items-center justify-between rounded-lg bg-surface px-3 py-1.5">
            <span className="text-[12px] text-ink-subtle">В категории доступно: {candidates.length}</span>
            <button
              type="button"
              onClick={() => setMembers((m) => Array.from(new Set([...m, ...candidates.map((c) => c.id)])))}
              className="text-[12px] font-medium text-ink hover:underline"
            >
              Добавить все
            </button>
          </div>
        ) : null}

        {candidates.length > 0 ? (
          <ul className="mt-2 max-h-80 space-y-1 overflow-auto rounded-lg border border-border/60 p-1">
            {candidates.slice(0, cat && !q.trim() ? 200 : 40).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => add(p.id)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-surface"
                >
                  <Thumb url={p.image} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] text-ink">{p.title}</span>
                    <span className="block text-[12px] text-ink-subtle">{meta(p)}{p.variant_group_id ? " · уже в группе" : ""}</span>
                  </span>
                  <Plus className="h-4 w-4 shrink-0 text-ink-subtle" strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        ) : q.trim() || cat ? (
          <p className="mt-2 text-[13px] text-ink-subtle">{q.trim() ? "Ничего не найдено." : "В этой категории нет доступных товаров для добавления."}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2 border-t border-border/60 pt-3">
        <AdminButton type="button" onClick={save} loading={saving} disabled={!dirty}>
          Сохранить группу
        </AdminButton>
        {dirty ? <span className="text-[12px] text-ink-subtle">Есть несохранённые изменения</span> : null}
      </div>
    </Panel>
  );
}

function Thumb({ url }: { url: string | null }) {
  return (
    <span className={cn("inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white")}>
      {url ? <Image src={url} alt="" width={32} height={32} unoptimized className="size-8 object-contain" /> : null}
    </span>
  );
}
