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
import { createCategory, updateCategory } from "./actions";

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
  sort: number;
  is_published: boolean;
}

export function CategoryForm({
  category,
  parents,
}: {
  category?: CategoryValue;
  parents: { slug: string; title: string }[];
}) {
  const isEdit = !!category;
  const [formError, setFormError] = React.useState<string | null>(null);
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
      sort: category?.sort ?? 0,
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

      <Panel className="p-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Изображение (bento на главной)">
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
          <Field label="Иконка (промо-лента)">
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

      <Panel className="space-y-4 p-5">
        <PanelTitle>SEO</PanelTitle>
        <Field label="Meta title">
          <TextInput {...register("meta_title")} />
        </Field>
        <Field label="Meta description">
          <Textarea {...register("meta_description")} />
        </Field>
        <Controller
          control={control}
          name="is_published"
          render={({ field }) => <Switch checked={!!field.value} onChange={field.onChange} label="Опубликована" />}
        />
      </Panel>

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
