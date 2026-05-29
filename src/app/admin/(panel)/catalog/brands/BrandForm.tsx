"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { brandSchema, type BrandInput, type BrandFormValues } from "@/lib/admin/schemas";
import { slugify } from "@/lib/admin/slug";
import { Field, TextInput, Switch, FormError, AdminButton } from "@/components/admin/form";
import { ImageField } from "@/components/admin/ImageField";
import { Panel } from "@/components/admin/ui";
import { createBrand, updateBrand } from "./actions";

export interface BrandValue {
  id: string;
  title: string;
  slug: string;
  logo_url: string | null;
  link_url: string | null;
  sort_order: number;
  is_published: boolean;
}

export function BrandForm({ brand }: { brand?: BrandValue }) {
  const isEdit = !!brand;
  const [formError, setFormError] = React.useState<string | null>(null);
  const slugTouched = React.useRef(isEdit);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BrandFormValues, unknown, BrandInput>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      title: brand?.title ?? "",
      slug: brand?.slug ?? "",
      logo_url: brand?.logo_url ?? "",
      link_url: brand?.link_url ?? "",
      sort_order: brand?.sort_order ?? 0,
      is_published: brand?.is_published ?? true,
    },
  });

  const title = watch("title");
  React.useEffect(() => {
    if (!slugTouched.current) setValue("slug", slugify(title));
  }, [title, setValue]);

  const onSubmit = async (values: BrandInput) => {
    setFormError(null);
    const res = isEdit ? await updateBrand(brand!.id, values) : await createBrand(values);
    if (res?.error) setFormError(res.error);
    // успех → server action делает redirect
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FormError message={formError} />
      <Panel className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Название" required error={errors.title?.message}>
            <TextInput placeholder="Beats" hasError={!!errors.title} {...register("title")} />
          </Field>
          <Field label="Slug" required error={errors.slug?.message} hint="Латиница, используется в URL/фильтрах">
            <TextInput
              placeholder="beats"
              hasError={!!errors.slug}
              {...register("slug", { onChange: () => (slugTouched.current = true) })}
            />
          </Field>
        </div>

        <Field label="Логотип">
          <Controller
            control={control}
            name="logo_url"
            render={({ field }) => (
              <ImageField
                value={field.value || null}
                onChange={(url) => field.onChange(url ?? "")}
                bucket="brand-logos"
                folder="brands"
              />
            )}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ссылка" error={errors.link_url?.message} hint="Куда ведёт логотип (категория или внешний URL)">
            <TextInput placeholder="https://…" hasError={!!errors.link_url} {...register("link_url")} />
          </Field>
          <Field label="Порядок" error={errors.sort_order?.message}>
            <TextInput type="number" min={0} {...register("sort_order")} />
          </Field>
        </div>

        <Controller
          control={control}
          name="is_published"
          render={({ field }) => (
            <Switch checked={!!field.value} onChange={field.onChange} label="Опубликован (виден на сайте)" />
          )}
        />
      </Panel>

      <div className="flex items-center gap-2">
        <AdminButton type="submit" loading={isSubmitting}>
          {isEdit ? "Сохранить" : "Создать бренд"}
        </AdminButton>
        <Link href="/admin/catalog/brands">
          <AdminButton type="button" variant="outline">
            Отмена
          </AdminButton>
        </Link>
      </div>
    </form>
  );
}
