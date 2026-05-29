"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { blogCategorySchema, type BlogCategoryInput, type BlogCategoryFormValues } from "@/lib/admin/schemas";
import { slugify } from "@/lib/admin/slug";
import { Field, TextInput, FormError, AdminButton } from "@/components/admin/form";
import { Panel } from "@/components/admin/ui";
import { createBlogCategory, updateBlogCategory } from "./actions";

export interface BlogCategoryValue {
  id: string;
  title: string;
  slug: string;
  color: string | null;
  sort_order: number;
}

export function CategoryForm({ category }: { category?: BlogCategoryValue }) {
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
  } = useForm<BlogCategoryFormValues, unknown, BlogCategoryInput>({
    resolver: zodResolver(blogCategorySchema),
    defaultValues: {
      title: category?.title ?? "",
      slug: category?.slug ?? "",
      color: category?.color ?? "",
      sort_order: category?.sort_order ?? 0,
    },
  });

  const title = watch("title");
  React.useEffect(() => {
    if (!slugTouched.current) setValue("slug", slugify(title));
  }, [title, setValue]);

  const onSubmit = async (values: BlogCategoryInput) => {
    setFormError(null);
    const res = isEdit
      ? await updateBlogCategory(category!.id, values)
      : await createBlogCategory(values);
    if (res?.error) setFormError(res.error);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FormError message={formError} />
      <Panel className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Название" required error={errors.title?.message}>
            <TextInput
              placeholder="Новости, Обзоры…"
              hasError={!!errors.title}
              {...register("title")}
            />
          </Field>
          <Field
            label="Slug"
            required
            error={errors.slug?.message}
            hint={isEdit ? "Менять осторожно — это URL категории" : "Латиница, URL: /blog?category=slug"}
          >
            <TextInput
              disabled={isEdit}
              hasError={!!errors.slug}
              {...register("slug", { onChange: () => (slugTouched.current = true) })}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Цвет" hint='HEX-цвет метки, например #e30000'>
            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={field.value || "#1d1d1f"}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded-sm border border-border bg-white p-0.5"
                  />
                  <TextInput
                    placeholder="#1d1d1f"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="flex-1"
                  />
                </div>
              )}
            />
          </Field>
          <Field label="Порядок сортировки" error={errors.sort_order?.message}>
            <TextInput
              type="number"
              min={0}
              hasError={!!errors.sort_order}
              {...register("sort_order")}
            />
          </Field>
        </div>
      </Panel>
      <div className="flex items-center gap-2">
        <AdminButton type="submit" loading={isSubmitting}>
          {isEdit ? "Сохранить" : "Создать категорию"}
        </AdminButton>
        <Link href="/admin/content/blog/categories">
          <AdminButton type="button" variant="outline">Отмена</AdminButton>
        </Link>
      </div>
    </form>
  );
}
