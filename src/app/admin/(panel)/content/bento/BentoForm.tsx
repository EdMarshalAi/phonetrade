"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { bentoSchema, type BentoInput, type BentoFormValues } from "@/lib/admin/schemas";
import { Field, TextInput, Select, Switch, FormError, AdminButton } from "@/components/admin/form";
import { ImageField } from "@/components/admin/ImageField";
import { Panel } from "@/components/admin/ui";
import { createBentoTile, updateBentoTile } from "./actions";

export interface BentoValue {
  id: string;
  category_slug: string | null;
  custom_title: string | null;
  subtitle: string | null;
  custom_image_url: string | null;
  size: "large" | "medium" | "small";
  theme: "dark" | "light";
  sort_order: number;
  is_published: boolean;
}

export function BentoForm({
  tile,
  categories,
}: {
  tile?: BentoValue;
  categories: { slug: string; title: string }[];
}) {
  const isEdit = !!tile;
  const [formError, setFormError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BentoFormValues, unknown, BentoInput>({
    resolver: zodResolver(bentoSchema),
    defaultValues: {
      category_slug: tile?.category_slug ?? "",
      custom_title: tile?.custom_title ?? "",
      subtitle: tile?.subtitle ?? "",
      custom_image_url: tile?.custom_image_url ?? "",
      size: tile?.size ?? "medium",
      theme: tile?.theme ?? "light",
      sort_order: tile?.sort_order ?? 0,
      is_published: tile?.is_published ?? true,
    },
  });

  const onSubmit = async (values: BentoInput) => {
    setFormError(null);
    const res = isEdit
      ? await updateBentoTile(tile!.id, values)
      : await createBentoTile(values);
    if (res?.error) setFormError(res.error);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FormError message={formError} />

      <Panel className="space-y-4 p-5">
        <Field label="Категория" hint="Привязка к категории каталога">
          <Controller
            control={control}
            name="category_slug"
            render={({ field }) => (
              <Select value={field.value ?? ""} onChange={field.onChange}>
                <option value="">— Без привязки —</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title}
                  </option>
                ))}
              </Select>
            )}
          />
        </Field>
        <Field label="Заголовок" hint="Переопределяет название категории" error={errors.custom_title?.message}>
          <TextInput
            placeholder="iPhone"
            hasError={!!errors.custom_title}
            {...register("custom_title")}
          />
        </Field>
        <Field label="Подзаголовок" error={errors.subtitle?.message}>
          <TextInput
            placeholder="Найди свой идеальный"
            hasError={!!errors.subtitle}
            {...register("subtitle")}
          />
        </Field>
      </Panel>

      <Panel className="p-5">
        <Field label="Изображение плитки">
          <Controller
            control={control}
            name="custom_image_url"
            render={({ field }) => (
              <ImageField
                value={field.value || null}
                onChange={(u) => field.onChange(u ?? "")}
                bucket="bento-tiles"
                folder="bento"
                aspect="wide"
              />
            )}
          />
        </Field>
      </Panel>

      <Panel className="p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Размер">
            <Controller
              control={control}
              name="size"
              render={({ field }) => (
                <Select value={field.value} onChange={field.onChange}>
                  <option value="large">Большой</option>
                  <option value="medium">Средний</option>
                  <option value="small">Маленький</option>
                </Select>
              )}
            />
          </Field>
          <Field label="Тема">
            <Controller
              control={control}
              name="theme"
              render={({ field }) => (
                <Select value={field.value} onChange={field.onChange}>
                  <option value="light">Светлая</option>
                  <option value="dark">Тёмная</option>
                </Select>
              )}
            />
          </Field>
          <Field label="Порядок">
            <TextInput type="number" min={0} {...register("sort_order")} />
          </Field>
        </div>
        <div className="mt-4 flex items-center">
          <Controller
            control={control}
            name="is_published"
            render={({ field }) => (
              <Switch checked={!!field.value} onChange={field.onChange} label="Активна" />
            )}
          />
        </div>
      </Panel>

      <div className="flex items-center gap-2">
        <AdminButton type="submit" loading={isSubmitting}>
          {isEdit ? "Сохранить" : "Создать плитку"}
        </AdminButton>
        <Link href="/admin/content/bento">
          <AdminButton type="button" variant="outline">Отмена</AdminButton>
        </Link>
      </div>
    </form>
  );
}
