"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { productSchema, type ProductInput, type ProductFormValues } from "@/lib/admin/schemas";
import { slugify } from "@/lib/admin/slug";
import { Field, TextInput, Textarea, Select, Switch, FormError, AdminButton } from "@/components/admin/form";
import { ImageField } from "@/components/admin/ImageField";
import { Panel } from "@/components/admin/ui";
import type { ProductOption, ProductBadge } from "@/lib/content";
import { createProduct, updateProduct } from "./actions";
import { VariantsSection, GallerySection, type Variant, type ProductImage } from "./VariantsManager";
import { OptionsBadgesSection } from "./OptionsBadgesSection";

export interface ProductValue extends Partial<ProductInput> {
  id: string;
}

const TABS = [
  { key: "main", label: "Основное" },
  { key: "optionsBadges", label: "Опции и Бейджи" },
  { key: "price", label: "Цены и наличие" },
  { key: "used", label: "Состояние (Б/У)" },
  { key: "seo", label: "SEO" },
  { key: "variants", label: "Варианты" },
  { key: "gallery", label: "Галерея" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function ProductForm({
  product,
  categories,
  variants = [],
  images = [],
  optionDefs = [],
  badgeDefs = [],
}: {
  product?: ProductValue;
  categories: { slug: string; title: string }[];
  variants?: Variant[];
  images?: ProductImage[];
  optionDefs?: ProductOption[];
  badgeDefs?: ProductBadge[];
}) {
  const isEdit = !!product;
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
      installment_from: product?.installment_from ?? undefined,
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
            <Field label="Артикул (SKU)">
              <TextInput placeholder="IP17PRO-256-ORANGE" {...register("sku")} />
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

      {/* Цены и наличие */}
      <div hidden={tab !== "price"} className="space-y-5">
        <Panel className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Цена наличными, ₽" error={errors.price_cash?.message} hint="Красная цена на сайте">
              <TextInput type="number" min={0} hasError={!!errors.price_cash} {...register("price_cash")} />
            </Field>
            <Field label="Цена картой, ₽" error={errors.price_card?.message}>
              <TextInput type="number" min={0} hasError={!!errors.price_card} {...register("price_card")} />
            </Field>
            <Field label="Старая цена, ₽" hint="Для зачёркивания (акция)">
              <TextInput type="number" min={0} {...register("price_old")} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Рассрочка от, ₽/мес">
              <TextInput type="number" min={0} {...register("installment_from")} />
            </Field>
            <Field label="Гарантия, мес">
              <TextInput type="number" min={0} {...register("warranty_months")} />
            </Field>
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
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Остаток на складе">
              <TextInput type="number" min={0} placeholder="оставьте пустым — «уточняйте»" {...register("stock")} />
            </Field>
            <Field label="Мин. остаток (алёрт)">
              <TextInput type="number" min={0} {...register("min_stock")} />
            </Field>
            <div className="flex flex-col justify-center gap-3 pt-5">
              <Controller control={control} name="is_available" render={({ field }) => <Switch checked={!!field.value} onChange={field.onChange} label="Доступен для заказа" />} />
              <Controller control={control} name="in_stock" render={({ field }) => <Switch checked={!!field.value} onChange={field.onChange} label="В наличии" />} />
            </div>
          </div>
        </Panel>
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
