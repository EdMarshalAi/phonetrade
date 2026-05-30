"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, Sparkles, Search } from "lucide-react";
import { Panel } from "@/components/admin/ui";
import { AdminButton } from "@/components/admin/form";
import { cn } from "@/lib/utils/cn";
import { setVariantGroup } from "./variant-actions";
import type { RelatedOption } from "./ProductForm";

/**
 * «Связанные товары» — варианты одного товара по цвету/памяти. Выбранные товары
 * получают общий variant_group_id (двунаправленно). На сайте из группы строятся
 * переключатели цвет/память. Если группа не задана — фолбэк на объединение по model.
 */
export function RelatedProductsManager({
  productId,
  currentGroupId,
  currentModel,
  products,
}: {
  productId: string;
  currentGroupId: string | null;
  currentModel: string | null;
  products: RelatedOption[];
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
  const [saving, setSaving] = React.useState(false);

  const byId = React.useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const dirty = React.useMemo(() => {
    const a = [...members].sort().join("|");
    const b = [...initial].sort().join("|");
    return a !== b;
  }, [members, initial]);

  const add = (id: string) => setMembers((m) => (m.includes(id) ? m : [...m, id]));
  const remove = (id: string) => setMembers((m) => m.filter((x) => x !== id));

  const addByModel = () => {
    if (!currentModel) return toast.error("У товара не задана модель");
    const ids = products.filter((p) => p.id !== productId && p.model === currentModel).map((p) => p.id);
    if (!ids.length) return toast.error("Не нашёл товаров с такой же моделью");
    setMembers((m) => Array.from(new Set([...m, ...ids])));
    toast.success(`Добавлено по модели «${currentModel}»: ${ids.length}`);
  };

  const candidates = products.filter((p) => {
    if (p.id === productId || members.includes(p.id)) return false;
    if (!q.trim()) return false;
    const t = `${p.title} ${p.color ?? ""} ${p.memory ?? ""}`.toLowerCase();
    return t.includes(q.trim().toLowerCase());
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
          Если ничего не выбрать — сработает авто-объединение по модели.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AdminButton type="button" variant="outline" size="sm" onClick={addByModel}>
          <Sparkles className="h-4 w-4" strokeWidth={1.75} /> Подтянуть по модели{currentModel ? ` «${currentModel}»` : ""}
        </AdminButton>
        <span className="text-[12px] text-ink-subtle">Выбрано: {members.length}</span>
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
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" strokeWidth={1.75} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Найти товар по названию, цвету, памяти…"
            className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-[13px] text-ink outline-none focus:border-ink/40"
          />
        </div>
        {candidates.length > 0 ? (
          <ul className="mt-2 max-h-64 space-y-1 overflow-auto rounded-lg border border-border/60 p-1">
            {candidates.slice(0, 40).map((p) => (
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
        ) : q.trim() ? (
          <p className="mt-2 text-[13px] text-ink-subtle">Ничего не найдено.</p>
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
