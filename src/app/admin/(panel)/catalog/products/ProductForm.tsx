"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { RefreshCw, Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format-price";
import { calculatePrices, margin, type PricingSettings } from "@/lib/pricing/calculate";
import { recalcProductPrices, generateSku } from "./actions";
import { productSchema, type ProductInput, type ProductFormValues } from "@/lib/admin/schemas";
import { slugify } from "@/lib/admin/slug";
import { Field, TextInput, Textarea, Select, Switch, ToggleRow, FormError, AdminButton } from "@/components/admin/form";
import { ImageField } from "@/components/admin/ImageField";
import { RichEditor } from "@/components/admin/RichEditor";
import { Panel } from "@/components/admin/ui";
import { Plus, X } from "lucide-react";
import Image from "next/image";
import type { ProductOption, ProductBadge } from "@/lib/content";
import { createProduct, updateProduct } from "./actions";
import { VariantsSection, GallerySection, type Variant, type ProductImage } from "./VariantsManager";
import { OptionsBadgesSection } from "./OptionsBadgesSection";

export interface ProductValue extends Partial<ProductInput> {
  id: string;
  prices_recalculated_at?: string | null;
}

const TABS = [
  { key: "main", label: "Основное" },
  { key: "optionsBadges", label: "Опции и Бейджи" },
  { key: "price", label: "Цены и наличие" },
  { key: "related", label: "Сопутствующие" },
  { key: "description", label: "Описание" },
  { key: "used", label: "Состояние (Б/У)" },
  { key: "seo", label: "SEO" },
  { key: "variants", label: "Варианты" },
  { key: "gallery", label: "Галерея" },
] as const;

export type RelatedOption = { id: string; title: string; category_slug: string; image: string | null };
export type PriceHistoryRow = {
  id: number;
  cost_rub: number | null;
  cost_rate: number | null;
  price_cash: number | null;
  price_card: number | null;
  reason: string | null;
  changed_at: string;
};
type TabKey = (typeof TABS)[number]["key"];

export function ProductForm({
  product,
  categories,
  variants = [],
  images = [],
  optionDefs = [],
  badgeDefs = [],
  allProducts = [],
  pricingSettings = null,
  categoryPricing = {},
  cbrUsd = null,
  priceHistory = [],
}: {
  product?: ProductValue;
  categories: { slug: string; title: string }[];
  variants?: Variant[];
  images?: ProductImage[];
  optionDefs?: ProductOption[];
  badgeDefs?: ProductBadge[];
  allProducts?: RelatedOption[];
  pricingSettings?: PricingSettings | null;
  categoryPricing?: Record<string, { markup_percent: number; min_margin_rub: number }>;
  cbrUsd?: number | null;
  priceHistory?: PriceHistoryRow[];
}) {
  const isEdit = !!product;
  const router = useRouter();
  const [recalcing, setRecalcing] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [genningSku, setGenningSku] = React.useState(false);
  const [tab, setTab] = React.useState<TabKey>("main");
  const [formError, setFormError] = React.useState<string | null>(null);
  const slugTouched = React.useRef(isEdit);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues, unknown, ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: product?.title ?? "",
      slug: product?.slug ?? "",
      sku: product?.sku ?? "",
      category_slug: product?.category_slug ?? categories[0]?.slug ?? "",
      model: product?.model ?? "",
      color: product?.color ?? "",
      memory: product?.memory ?? "",
      sim: product?.sim ?? "",
      condition: product?.condition ?? "",
      type: product?.type ?? "new",
      badge: product?.badge ?? "",
      badges: product?.badges ?? [],
      options: product?.options ?? {},
      short_description: product?.short_description ?? "",
      image: product?.image ?? "",
      price_cash: product?.price_cash ?? 0,
      price_card: product?.price_card ?? 0,
      price_old: product?.price_old ?? undefined,
      cost_rub: product?.cost_rub ?? undefined,
      cost_rate: product?.cost_rate ?? undefined,
      price_override: product?.price_override ?? false,
      installment_from: product?.installment_from ?? undefined,
      installment_partner: product?.installment_partner ?? "",
      related_product_ids: product?.related_product_ids ?? [],
      description_html: product?.description_html ?? "",
      warranty_months: product?.warranty_months ?? undefined,
      stock: product?.stock ?? undefined,
      min_stock: product?.min_stock ?? undefined,
      is_available: product?.is_available ?? true,
      in_stock: product?.in_stock ?? true,
      status: product?.status ?? "published",
      condition_text: product?.condition_text ?? "",
      condition_category: product?.condition_category ?? undefined,
      battery: product?.battery ?? undefined,
      meta_title: product?.meta_title ?? "",
      meta_description: product?.meta_description ?? "",
      is_indexable: product?.is_indexable ?? true,
    },
  });

  const title = watch("title");
  const type = watch("type");
  React.useEffect(() => {
    if (!slugTouched.current) setValue("slug", slugify(title));
  }, [title, setValue]);

  // ── Прайс: живой предпросмотр расчётных цен ──
  const costRub = Number(watch("cost_rub")) || null;
  const costRate = Number(watch("cost_rate")) || null;
  const overrideOn = !!watch("price_override");
  const wCash = Number(watch("price_cash")) || null;
  const wCard = Number(watch("price_card")) || null;
  const costUsd = costRub && costRate ? costRub / costRate : null;
  const catSlug = watch("category_slug") as string | undefined;
  const catPricing = catSlug ? categoryPricing[catSlug] : undefined;
  const catMarkup = catPricing?.markup_percent ?? pricingSettings?.default_markup_percent ?? null;
  const catMinMarginRub = catPricing?.min_margin_rub ?? 0;
  const formulaActive = !!pricingSettings && type !== "used" && (overrideOn || !!costUsd);
  const preview =
    formulaActive && pricingSettings
      ? calculatePrices(
          { cost_usd: costUsd, price_override: overrideOn, override_price_cash: wCash, override_price_card: wCard },
          pricingSettings,
          catMarkup
        )
      : null;
  const marginInfo = preview ? margin(preview.price_cash, costRub) : null;
  const lowMargin = marginInfo != null && catMinMarginRub > 0 ? marginInfo.rub < catMinMarginRub : false;
  const priceReadonly = !!costUsd && !overrideOn; // считает формула → нал/карта только чтение

  const onRecalc = async () => {
    if (!isEdit) return;
    setRecalcing(true);
    const res = await recalcProductPrices(product!.id);
    setRecalcing(false);
    if (res.error) return toast.error(res.error);
    toast.success("Цены пересчитаны по формуле");
    router.refresh();
  };

  const onSubmit = async (values: ProductInput) => {
    setFormError(null);
    const res = isEdit ? await updateProduct(product!.id, values) : await createProduct(values);
    if (res?.error) {
      setFormError(res.error);
      setTab("main");
    }
  };

  const visibleTabs = TABS.filter((t) => {
    if (t.key === "used") return type === "used";
    if (t.key === "variants" || t.key === "gallery") return isEdit;
    return true;
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FormError message={formError} />

      {/* tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border/70">
        {visibleTabs.map((t) => (
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

      {/* Основное */}
      <div hidden={tab !== "main"} className="space-y-5">
        <Panel className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Название" required error={errors.title?.message}>
              <TextInput placeholder="iPhone 17 Pro 256GB Orange" hasError={!!errors.title} {...register("title")} />
            </Field>
            <Field label="Slug / ID" error={errors.slug?.message} hint={isEdit ? "Менять осторожно — это URL товара" : "Авто из названия"}>
              <TextInput hasError={!!errors.slug} {...register("slug", { onChange: () => (slugTouched.current = true) })} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Категория" required error={errors.category_slug?.message}>
              <Controller
                control={control}
                name="category_slug"
                render={({ field }) => (
                  <Select value={field.value} onChange={field.onChange} hasError={!!errors.category_slug}>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.title}
                      </option>
                    ))}
                  </Select>
                )}
              />
            </Field>
            <Field label="Тип">
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onChange={field.onChange}>
                    <option value="new">Новый</option>
                    <option value="used">Б/У</option>
                  </Select>
                )}
              />
            </Field>
            <Field label="Артикул (SKU)" hint="PH{код категории}-{номер}, напр. PH584-1042">
              <div className="flex items-center gap-2">
                <TextInput placeholder="PH584-1042" {...register("sku")} />
                <button
                  type="button"
                  onClick={async () => {
                    const cat = watch("category_slug");
                    if (!cat) return toast.error("Сначала выберите категорию");
                    setGenningSku(true);
                    const res = await generateSku(cat);
                    setGenningSku(false);
                    if (res.error) return toast.error(res.error);
                    if (res.sku) { setValue("sku", res.sku); toast.success(`SKU: ${res.sku}`); }
                  }}
                  disabled={genningSku}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-sm border border-border bg-white px-3 text-[13px] text-ink hover:bg-surface disabled:opacity-60"
                >
                  {genningSku ? "Генерация…" : "Сгенерировать"}
                </button>
              </div>
            </Field>
          </div>
          <Field label="Модель" hint="Линейка для фильтра (напр. iPhone 17 Pro)">
            <TextInput placeholder="iPhone 17 Pro" {...register("model")} />
          </Field>
          <Field label="Краткое описание" hint="1–2 строки для карточки в списке">
            <Textarea {...register("short_description")} />
          </Field>
        </Panel>

        <Panel className="p-5">
          <Field label="Главное фото">
            <Controller
              control={control}
              name="image"
              render={({ field }) => (
                <ImageField value={field.value || null} onChange={(u) => field.onChange(u ?? "")} bucket="product-images" folder="products" />
              )}
            />
          </Field>
        </Panel>
      </div>

      {/* Опции и Бейджи */}
      <div hidden={tab !== "optionsBadges"}>
        <OptionsBadgesSection control={control} options={optionDefs} badges={badgeDefs} />
      </div>

      {/* Сопутствующие товары */}
      <div hidden={tab !== "related"}>
        <Controller
          control={control}
          name="related_product_ids"
          render={({ field }) => (
            <RelatedPicker
              value={field.value ?? []}
              onChange={field.onChange}
              allProducts={allProducts}
              categories={categories}
              currentId={product?.id}
            />
          )}
        />
      </div>

      {/* Подробное описание */}
      <div hidden={tab !== "description"}>
        <Panel className="space-y-3 p-5">
          <Field label="Подробное описание" hint="Показывается на странице товара под блоком «Сопутствующие товары».">
            <Controller
              control={control}
              name="description_html"
              render={({ field }) => (
                <RichEditor value={field.value ?? ""} onChange={field.onChange} bucket="product-images" />
              )}
            />
          </Field>
        </Panel>
      </div>

      {/* Цены и наличие */}
      <div hidden={tab !== "price"} className="space-y-5">
        {type !== "used" ? (
          <Panel className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[14px] font-semibold text-ink">Закупка</p>
              {cbrUsd ? <span className="text-[12px] text-ink-subtle">Курс ЦБ сегодня: {cbrUsd.toFixed(4)} ₽/$</span> : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Закупочная цена, ₽">
                <TextInput type="number" min={0} placeholder="напр. 64 000" {...register("cost_rub")} />
              </Field>
              <Field label="Курс USD на момент закупа" hint="Если не знаете — вставьте курс ЦБ">
                <div className="flex items-center gap-2">
                  <TextInput type="number" step="0.0001" min={0} {...register("cost_rate")} />
                  {cbrUsd ? (
                    <button type="button" onClick={() => setValue("cost_rate", cbrUsd)} className="h-9 shrink-0 whitespace-nowrap rounded-sm border border-border bg-white px-2.5 text-[12.5px] text-ink hover:bg-surface">
                      Курс ЦБ
                    </button>
                  ) : null}
                </div>
              </Field>
              <Field label="Закупка в долларах">
                <div className="flex h-9 items-center rounded-sm border border-border/60 bg-surface/50 px-3 text-[14px] text-ink-muted tabular-nums">
                  {costUsd ? `$${costUsd.toFixed(2)}` : "—"}
                </div>
              </Field>
            </div>
            <p className="text-[12px] text-ink-subtle">
              Закупка в долларах фиксируется при сохранении. Дальше цены пересчитываются от неё и текущего рабочего курса USD в «Прайсе».
            </p>

            <Controller
              control={control}
              name="price_override"
              render={({ field }) => (
                <ToggleRow
                  checked={!!field.value}
                  onChange={field.onChange}
                  title="Зафиксировать цену вручную"
                  hint="Цена не будет пересчитываться при изменении курса. Снимите флажок после акции."
                />
              )}
            />

            {preview ? (
              <div className="rounded-xl border border-border/60 bg-surface/40 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[12px] font-medium uppercase tracking-wide text-ink-subtle">
                    {overrideOn ? "Зафиксировано вручную" : "Рассчитано автоматически"}
                  </span>
                  {overrideOn ? <span className="inline-flex items-center gap-1 rounded-full bg-ink/80 px-2 py-0.5 text-[11px] font-medium text-white"><Lock className="h-3 w-3" />фикс</span> : null}
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-3">
                  <Stat label="Нал" value={formatPrice(preview.price_cash)} strong />
                  <Stat label="Картой" value={formatPrice(preview.price_card)} />
                  <Stat label="Маржа" value={marginInfo ? `${marginInfo.percent.toFixed(0)}% (${formatPrice(marginInfo.rub)})` : "—"} danger={lowMargin} />
                  <Stat label="6 мес" value={`${formatPrice(preview.credit_6m_monthly)}/мес`} />
                  <Stat label="12 мес" value={`${formatPrice(preview.credit_12m_monthly)}/мес`} />
                  <Stat label="24 мес" value={`${formatPrice(preview.credit_24m_monthly)}/мес`} />
                </div>
                {lowMargin ? <p className="mt-2 text-[12px] font-medium text-sale">Маржа ниже минимальной по категории ({formatPrice(catMinMarginRub)})</p> : null}
                {isEdit ? (
                  <div className="mt-3 flex items-center gap-3">
                    <button type="button" onClick={onRecalc} disabled={recalcing} className="inline-flex h-8 items-center gap-2 rounded-sm border border-border bg-white px-3 text-[13px] text-ink hover:bg-surface disabled:opacity-60">
                      <RefreshCw className={cn("h-3.5 w-3.5", recalcing && "animate-spin")} strokeWidth={1.75} /> Обновить из формулы
                    </button>
                    {product?.prices_recalculated_at ? (
                      <span className="text-[12px] text-ink-subtle">Пересчитано: {new Date(product.prices_recalculated_at).toLocaleString("ru-RU")}</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </Panel>
        ) : null}

        <Panel className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {!priceReadonly ? (
              <>
                <Field label="Цена наличными, ₽" error={errors.price_cash?.message} hint={overrideOn ? "Зафиксированная цена" : "Красная цена на сайте"}>
                  <TextInput type="number" min={0} hasError={!!errors.price_cash} {...register("price_cash")} />
                </Field>
                <Field label="Цена картой, ₽" error={errors.price_card?.message}>
                  <TextInput type="number" min={0} hasError={!!errors.price_card} {...register("price_card")} />
                </Field>
              </>
            ) : null}
            <Field label="Старая цена, ₽" hint="Зачёркнутая цена на витрине (необязательно)">
              <TextInput type="number" min={0} {...register("price_old")} />
            </Field>
            <Field label="Гарантия, мес">
              <TextInput type="number" min={0} {...register("warranty_months")} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Статус">
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onChange={field.onChange}>
                    <option value="published">Опубликован</option>
                    <option value="draft">Черновик</option>
                    <option value="archived">Архив</option>
                  </Select>
                )}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Остаток на складе">
              <TextInput type="number" min={0} placeholder="оставьте пустым — «уточняйте»" {...register("stock")} />
            </Field>
            <Field label="Мин. остаток (алёрт)">
              <TextInput type="number" min={0} {...register("min_stock")} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Controller control={control} name="is_available" render={({ field }) => (
              <ToggleRow checked={!!field.value} onChange={field.onChange} title="Доступен для заказа" hint="Можно добавить в корзину и оформить" />
            )} />
            <Controller control={control} name="in_stock" render={({ field }) => (
              <ToggleRow checked={!!field.value} onChange={field.onChange} title="В наличии" hint="Показывать как «в наличии» на витрине" />
            )} />
          </div>
        </Panel>

        {isEdit && priceHistory.length > 0 ? (
          <Panel className="p-0">
            <button type="button" onClick={() => setHistoryOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-3.5 text-left">
              <span className="text-[14px] font-semibold text-ink">История цен ({priceHistory.length})</span>
              <span className="text-[12px] text-ink-subtle">{historyOpen ? "Свернуть" : "Развернуть"}</span>
            </button>
            {historyOpen ? (
              <div className="overflow-x-auto border-t border-border/60">
                <table className="w-full text-[13px]">
                  <thead className="bg-surface/50 text-ink-subtle">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Дата</th>
                      <th className="px-4 py-2 text-right font-medium">Нал</th>
                      <th className="px-4 py-2 text-right font-medium">Картой</th>
                      <th className="px-4 py-2 text-left font-medium">Причина</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {priceHistory.map((h) => (
                      <tr key={h.id}>
                        <td className="whitespace-nowrap px-4 py-2 text-ink-muted">{new Date(h.changed_at).toLocaleString("ru-RU")}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{h.price_cash != null ? formatPrice(h.price_cash) : "—"}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{h.price_card != null ? formatPrice(h.price_card) : "—"}</td>
                        <td className="px-4 py-2 text-ink-muted">{REASON_LABEL[h.reason ?? ""] ?? h.reason ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </Panel>
        ) : null}
      </div>

      {/* Состояние (Б/У) */}
      <div hidden={tab !== "used"} className="space-y-5">
        <Panel className="space-y-4 p-5">
          <Field label="Описание состояния">
            <Textarea placeholder="Ни разу не разбирался, полностью в оригинале, все функции работают…" {...register("condition_text")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Категория состояния">
              <Controller
                control={control}
                name="condition_category"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)}>
                    <option value="">— Не указано —</option>
                    <option value="perfect">Идеальное</option>
                    <option value="good">Хорошее</option>
                    <option value="fair">Удовлетворительное</option>
                  </Select>
                )}
              />
            </Field>
            <Field label="Аккумулятор, %">
              <TextInput type="number" min={0} max={100} {...register("battery")} />
            </Field>
          </div>
        </Panel>
      </div>

      {/* SEO */}
      <div hidden={tab !== "seo"} className="space-y-5">
        <Panel className="space-y-4 p-5">
          <Field label="Meta title">
            <TextInput {...register("meta_title")} />
          </Field>
          <Field label="Meta description">
            <Textarea {...register("meta_description")} />
          </Field>
          <Controller control={control} name="is_indexable" render={({ field }) => <Switch checked={!!field.value} onChange={field.onChange} label="Индексировать (показывать в поиске)" />} />
        </Panel>
      </div>

      {/* Варианты */}
      {isEdit ? (
        <div hidden={tab !== "variants"}>
          <VariantsSection productId={product!.id} variants={variants} />
        </div>
      ) : null}

      {/* Галерея */}
      {isEdit ? (
        <div hidden={tab !== "gallery"}>
          <GallerySection productId={product!.id} images={images} />
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <AdminButton type="submit" loading={isSubmitting}>
          {isEdit ? "Сохранить" : "Создать товар"}
        </AdminButton>
        <Link href="/admin/catalog/products">
          <AdminButton type="button" variant="outline">
            Отмена
          </AdminButton>
        </Link>
      </div>
    </form>
  );
}

/* ── Пикер сопутствующих товаров: сначала категория, потом товары ─────────── */
function RelatedPicker({
  value,
  onChange,
  allProducts,
  categories,
  currentId,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  allProducts: RelatedOption[];
  categories: { slug: string; title: string }[];
  currentId?: string;
}) {
  const [cat, setCat] = React.useState<string>(categories[0]?.slug ?? "");
  const [q, setQ] = React.useState("");

  const byId = React.useMemo(() => new Map(allProducts.map((p) => [p.id, p])), [allProducts]);
  const selected = value.map((id) => byId.get(id)).filter((p): p is RelatedOption => !!p);

  const candidates = allProducts.filter(
    (p) =>
      p.category_slug === cat &&
      p.id !== currentId &&
      !value.includes(p.id) &&
      (q.trim() === "" || p.title.toLowerCase().includes(q.trim().toLowerCase()))
  );

  const add = (id: string) => onChange([...value, id]);
  const remove = (id: string) => onChange(value.filter((x) => x !== id));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-5">
      <Panel className="space-y-4 p-5">
        <p className="text-[13px] text-ink-muted">
          Выберите категорию, затем добавьте товары — они покажутся в блоке «Сопутствующие товары» на странице этого товара (в выбранном порядке).
        </p>
        <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
          <Field label="Категория">
            <Select value={cat} onChange={(e) => setCat(e.target.value)}>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.title}</option>
              ))}
            </Select>
          </Field>
          <Field label="Поиск по названию">
            <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Начните вводить…" />
          </Field>
        </div>

        <div className="max-h-72 divide-y divide-border/60 overflow-y-auto rounded-lg border border-border/60">
          {candidates.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-ink-muted">Нет доступных товаров в этой категории.</p>
          ) : (
            candidates.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => add(p.id)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface"
              >
                <span className="inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white">
                  {p.image ? <Image src={p.image} alt="" width={32} height={32} unoptimized className="size-8 object-contain" /> : null}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{p.title}</span>
                <Plus className="h-4 w-4 shrink-0 text-ink-subtle" strokeWidth={2} />
              </button>
            ))
          )}
        </div>
      </Panel>

      <div>
        <p className="mb-2 text-[13px] font-medium text-ink">Выбрано: {selected.length}</p>
        <Panel className="divide-y divide-border/60">
          {selected.length === 0 ? (
            <p className="px-5 py-8 text-center text-[14px] text-ink-muted">Сопутствующие товары не выбраны — на сайте покажутся товары той же категории.</p>
          ) : (
            selected.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white">
                  {p.image ? <Image src={p.image} alt="" width={32} height={32} unoptimized className="size-8 object-contain" /> : null}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{p.title}</span>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => move(i, -1)} className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-white text-ink-muted hover:bg-surface hover:text-ink disabled:opacity-40" disabled={i === 0} title="Выше">↑</button>
                  <button type="button" onClick={() => move(i, 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-white text-ink-muted hover:bg-surface hover:text-ink disabled:opacity-40" disabled={i === selected.length - 1} title="Ниже">↓</button>
                  <button type="button" onClick={() => remove(p.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-white text-sale hover:bg-sale/5" title="Убрать"><X className="h-4 w-4" strokeWidth={2} /></button>
                </div>
              </div>
            ))
          )}
        </Panel>
      </div>
    </div>
  );
}

const REASON_LABEL: Record<string, string> = {
  manual_edit: "Ручное изменение",
  fx_recalc: "Пересчёт по курсу",
  formula_change: "Изменение формулы",
  import: "Импорт прайса",
};

function Stat({ label, value, strong, danger }: { label: string; value: string; strong?: boolean; danger?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 sm:flex-col sm:items-start sm:justify-start sm:gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-ink-subtle">{label}</span>
      <span className={cn("font-semibold tabular-nums", strong ? "text-sale" : "text-ink", danger && "text-sale")}>{value}</span>
    </div>
  );
}
