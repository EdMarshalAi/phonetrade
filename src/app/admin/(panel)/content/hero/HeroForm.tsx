"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { heroSchema, type HeroInput, type HeroFormValues } from "@/lib/admin/schemas";
import { Field, TextInput, Textarea, Select, Switch, FormError, AdminButton } from "@/components/admin/form";
import { ImageField } from "@/components/admin/ImageField";
import { Panel } from "@/components/admin/ui";
import { createHeroSlide, updateHeroSlide } from "./actions";

export interface HeroValue {
  id: string;
  overline: string | null;
  title: string;
  description: string | null;
  button_text: string | null;
  button_link: string | null;
  image_url: string | null;
  theme: "dark" | "light";
  sort_order: number;
  is_published: boolean;
}

export function HeroForm({ slide }: { slide?: HeroValue }) {
  const isEdit = !!slide;
  const [formError, setFormError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<HeroFormValues, unknown, HeroInput>({
    resolver: zodResolver(heroSchema),
    defaultValues: {
      overline: slide?.overline ?? "",
      title: slide?.title ?? "",
      description: slide?.description ?? "",
      button_text: slide?.button_text ?? "",
      button_link: slide?.button_link ?? "",
      image_url: slide?.image_url ?? "",
      theme: slide?.theme ?? "dark",
      sort_order: slide?.sort_order ?? 0,
      is_published: slide?.is_published ?? true,
    },
  });

  const onSubmit = async (values: HeroInput) => {
    setFormError(null);
    const res = isEdit ? await updateHeroSlide(slide!.id, values) : await createHeroSlide(values);
    if (res?.error) setFormError(res.error);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FormError message={formError} />
      <Panel className="space-y-4 p-5">
        <Field label="Надзаголовок" hint="Напр. «Новинка осени»">
          <TextInput {...register("overline")} />
        </Field>
        <Field label="Заголовок" required error={errors.title?.message}>
          <TextInput placeholder="iPhone 17 Pro" hasError={!!errors.title} {...register("title")} />
        </Field>
        <Field label="Описание">
          <Textarea placeholder="Титановый корпус, чип A19 Pro…" {...register("description")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Текст кнопки">
            <TextInput placeholder="Узнать подробнее" {...register("button_text")} />
          </Field>
          <Field label="Ссылка кнопки" hint="URL, /product/… или /category/…">
            <TextInput placeholder="/product/iphone-17-pro" {...register("button_link")} />
          </Field>
        </div>
      </Panel>

      <Panel className="p-5">
        <Field label="Изображение (справа на слайде)">
          <Controller
            control={control}
            name="image_url"
            render={({ field }) => (
              <ImageField value={field.value || null} onChange={(u) => field.onChange(u ?? "")} bucket="hero-slides" folder="hero" aspect="wide" />
            )}
          />
        </Field>
      </Panel>

      <Panel className="p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Тема">
            <Controller control={control} name="theme" render={({ field }) => (
              <Select value={field.value} onChange={field.onChange}>
                <option value="dark">Тёмная</option>
                <option value="light">Светлая</option>
              </Select>
            )} />
          </Field>
          <Field label="Порядок">
            <TextInput type="number" min={0} {...register("sort_order")} />
          </Field>
          <div className="flex items-end pb-1.5">
            <Controller control={control} name="is_published" render={({ field }) => <Switch checked={!!field.value} onChange={field.onChange} label="Активен" />} />
          </div>
        </div>
      </Panel>

      <div className="flex items-center gap-2">
        <AdminButton type="submit" loading={isSubmitting}>{isEdit ? "Сохранить" : "Создать слайд"}</AdminButton>
        <Link href="/admin/content/hero">
          <AdminButton type="button" variant="outline">Отмена</AdminButton>
        </Link>
      </div>
    </form>
  );
}
