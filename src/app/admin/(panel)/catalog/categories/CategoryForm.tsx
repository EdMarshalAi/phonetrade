"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { categorySchema, type CategoryInput, type CategoryFormValues } from "@/lib/admin/schemas";
import { slugify } from "@/lib/admin/slug";
import { Field, TextInput, Textarea, Select, Switch, FormError, AdminButton } from "@/components/admin/form";
import { ImageField } from "@/components/admin/ImageField";
import { Panel, PanelTitle } from "@/components/admin/ui";
import { RichEditor } from "@/components/admin/RichEditor";
import { cn } from "@/lib/utils/cn";
import type { ProductOption } from "@/lib/content";
import { createCategory, updateCategory } from "./actions";

const CAT_TABS = [
  { key: "main", label: "Основное" },
  { key: "media", label: "Изображения" },
  { key: "home", label: "На главной" },
  { key: "filters", label: "Фильтры" },
  { key: "seo", label: "SEO" },
] as const;
type CatTab = (typeof CAT_TABS)[number]["key"];

export interface CategoryValue {
  slug: string;
  title: string;
  parent_slug: string | null;
  subtitle: string | null;
  description: string | null;
  image: string | null;
  icon_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  seo_text: string | null;
  sort: number;
  show_on_home: boolean;
  home_limit: number;
  available_filters: string[] | null;
  is_published: boolean;
}

export function CategoryForm({
  category,
  parents,
  optionDefs = [],
}: {
  category?: CategoryValue;
  parents: { slug: string; title: string }[];
  optionDefs?: ProductOption[];
}) {
  const isEdit = !!category;
  const [formError, setFormError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<CatTab>("main");
  const slugTouched = React.useRef(isEdit);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues, unknown, CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      title: category?.title ?? "",
      slug: category?.slug ?? "",
      parent_slug: category?.parent_slug ?? "",
      subtitle: category?.subtitle ?? "",
      description: category?.description ?? "",
      image: category?.image ?? "",
      icon_url: category?.icon_url ?? "",
      meta_title: category?.meta_title ?? "",
      meta_description: category?.meta_description ?? "",
      seo_text: category?.seo_text ?? "",
      sort: category?.sort ?? 0,
      show_on_home: category?.show_on_home ?? false,
      home_limit: category?.home_limit ?? 8,
      available_filters: category?.available_filters ?? [],
      is_published: category?.is_published ?? true,
    },
  });

  const title = watch("title");
  React.useEffect(() => {
    if (!slugTouched.current) setValue("slug", slugify(title));
  }, [title, setValue]);

  const onSubmit = async (values: CategoryInput) => {
    setFormError(null);
    const res = isEdit ? await updateCategory(category!.slug, values) : await createCategory(values);
    if (res?.error) setFormError(res.error);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FormError message={formError} />

      <div className="flex flex-wrap gap-1 border-b border-border/70">
        {CAT_TABS.map((t) => (
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

      <div hidden={tab !== "main"}>
      <Panel className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Название" required error={errors.title?.message}>
            <TextInput placeholder="iPhone" hasError={!!errors.title} {...register("title")} />
          </Field>
          <Field
            label="Slug"
            required
            error={errors.slug?.message}
            hint={isEdit ? "Slug нельзя менять — на него ссылаются товары" : "Латиница, используется в URL"}
          >
            <TextInput
              placeholder="iphone"
              disabled={isEdit}
              hasError={!!errors.slug}
              {...register("slug", { onChange: () => (slugTouched.current = true) })}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Родительская категория" hint="Для построения дерева">
            <Controller
              control={control}
              name="parent_slug"
              render={({ field }) => (
                <Select value={field.value ?? ""} onChange={field.onChange}>
                  <option value="">— Корневая —</option>
                  {parents.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.title}
                    </option>
                  ))}
                </Select>
              )}
            />
          </Field>
          <Field label="Порядок" error={errors.sort?.message}>
            <TextInput type="number" min={0} {...register("sort")} />
          </Field>
        </div>

        <Field label="Подзаголовок" hint="Короткая строка под названием в bento">
          <TextInput placeholder="MacBook Air и Pro на Apple Silicon" {...register("subtitle")} />
        </Field>
        <Field label="Описание" hint="Показывается над списком товаров в каталоге">
          <Textarea placeholder="Описание категории…" {...register("description")} />
        </Field>
      </Panel>
      </div>

      <div hidden={tab !== "media"}>
      <Panel className="p-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Изображение" hint="Картинка для bento-плитки в блоке «Каталог Apple» на главной">
            <Controller
              control={control}
              name="image"
              render={({ field }) => (
                <ImageField
                  value={field.value || null}
                  onChange={(u) => field.onChange(u ?? "")}
                  bucket="bento-tiles"
                  folder="categories"
                  aspect="wide"
                />
              )}
            />
          </Field>
          <Field label="Иконка" hint="Маленькая иконка рядом с названием на странице категории (/category/slug)">
            <Controller
              control={control}
              name="icon_url"
              render={({ field }) => (
                <ImageField value={field.value || null} onChange={(u) => field.onChange(u ?? "")} bucket="general" folder="category-icons" />
              )}
            />
          </Field>
        </div>
      </Panel>
      </div>

      <div hidden={tab !== "home"}>
      <Panel className="p-5">
        <PanelTitle>Вывод на главной</PanelTitle>
        <p className="mt-1 text-[13px] text-ink-muted">
          Отдельный ряд товаров этой категории на главной странице.
        </p>
        <div className="mt-4 space-y-4">
          <Controller
            control={control}
            name="show_on_home"
            render={({ field }) => (
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-border/60 bg-surface/40 px-4 py-3">
                <span>
                  <span className="block text-[14px] font-medium text-ink">Показывать на главной</span>
                  <span className="mt-0.5 block text-[12px] text-ink-subtle">Ряд товаров появится на главной странице</span>
                </span>
                <Switch checked={!!field.value} onChange={field.onChange} />
              </label>
            )}
          />
          <Field label="Сколько товаров в ряду" hint="От 1 до 24">
            <TextInput type="number" min={1} max={24} className="w-28" {...register("home_limit")} />
          </Field>
        </div>
      </Panel>
      </div>

      <div hidden={tab !== "filters"}>
      <Panel className="space-y-4 p-5">
        <PanelTitle>Фильтры в этой категории</PanelTitle>
        <p className="text-[13px] text-ink-muted">
          Какие фильтры показывать покупателю на странице категории. Значения берутся из «Товары → Настройки → Опции».
          Фильтр по цене показывается всегда.
        </p>
        <Controller
          control={control}
          name="available_filters"
          render={({ field }) => {
            const current = new Set<string>((field.value as string[]) ?? []);
            const items = [
              { key: "model", label: "Модель" },
              ...optionDefs.map((o) => ({ key: o.key, label: o.label })),
            ];
            const toggle = (key: string) => {
              const next = new Set(current);
              if (next.has(key)) next.delete(key);
              else next.add(key);
              field.onChange([...next]);
            };
            return (
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((it) => {
                  const on = current.has(it.key);
                  return (
                    <label
                      key={it.key}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-4 rounded-md border px-4 py-3 transition-colors",
                        on ? "border-ink/40 bg-ink/[0.03]" : "border-border/60 bg-surface/40 hover:border-border"
                      )}
                    >
                      <span className="text-[14px] font-medium text-ink">{it.label}</span>
                      <Switch checked={on} onChange={() => toggle(it.key)} />
                    </label>
                  );
                })}
              </div>
            );
          }}
        />
        <p className="text-[12px] text-ink-subtle">
          Если ничего не выбрано — используется набор по умолчанию для категории.
        </p>
      </Panel>
      </div>

      <div hidden={tab !== "seo"}>
      <Panel className="space-y-4 p-5">
        <PanelTitle>SEO</PanelTitle>
        <Field label="Meta title">
          <TextInput {...register("meta_title")} />
        </Field>
        <Field label="Meta description">
          <Textarea {...register("meta_description")} />
        </Field>
        <Field label="SEO-текст (внизу страницы категории)" hint="Тот самый блок «Купить … в Белгороде» под списком товаров — с форматированием и режимом «Источник» (HTML)">
          <Controller
            control={control}
            name="seo_text"
            render={({ field }) => (
              <RichEditor value={field.value || ""} onChange={field.onChange} bucket="general" />
            )}
          />
        </Field>
        <div className="border-t border-border/60 pt-4">
          <Controller
            control={control}
            name="is_published"
            render={({ field }) => <Switch checked={!!field.value} onChange={field.onChange} label="Категория опубликована" />}
          />
        </div>
      </Panel>
      </div>

      <div className="flex items-center gap-2">
        <AdminButton type="submit" loading={isSubmitting}>
          {isEdit ? "Сохранить" : "Создать категорию"}
        </AdminButton>
        <Link href="/admin/catalog/categories">
          <AdminButton type="button" variant="outline">
            Отмена
          </AdminButton>
        </Link>
      </div>
    </form>
  );
}
