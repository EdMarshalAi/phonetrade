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
import { HeroLinkPicker, type PickerCategory, type PickerProduct } from "./HeroLinkPicker";

export interface HeroValue {
  id: string;
  overline: string | null;
  title: string;
  description: string | null;
  button_text: string | null;
  button_link: string | null;
  image_url: string | null;
  bg_color: string | null;
  theme: "dark" | "light";
  sort_order: number;
  is_published: boolean;
}

export function HeroForm({
  slide,
  categories = [],
  products = [],
}: {
  slide?: HeroValue;
  categories?: PickerCategory[];
  products?: PickerProduct[];
}) {
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
      bg_color: slide?.bg_color ?? "",
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

      {/* Контент — короткие поля в два столбика */}
      <Panel className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Надзаголовок" hint="Напр. «Новинка осени»">
            <TextInput {...register("overline")} />
          </Field>
          <Field label="Заголовок" required error={errors.title?.message}>
            <TextInput placeholder="iPhone 17 Pro" hasError={!!errors.title} {...register("title")} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Описание">
            <Textarea rows={2} placeholder="Титановый корпус, чип A19 Pro…" {...register("description")} />
          </Field>
          <Field label="Текст кнопки">
            <TextInput placeholder="Узнать подробнее" {...register("button_text")} />
          </Field>
        </div>
        <Field label="Ссылка кнопки" hint="Категория, подкатегория, товар или своя ссылка">
          <Controller
            control={control}
            name="button_link"
            render={({ field }) => (
              <HeroLinkPicker
                value={field.value || ""}
                onChange={(v) => field.onChange(v)}
                categories={categories}
                products={products}
              />
            )}
          />
        </Field>
      </Panel>

      {/* Оформление — изображение и фон одним рядом по блокам */}
      <Panel className="p-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Изображение" hint="Показывается справа на слайде">
            <Controller
              control={control}
              name="image_url"
              render={({ field }) => (
                <ImageField value={field.value || null} onChange={(u) => field.onChange(u ?? "")} bucket="hero-slides" folder="hero" aspect="wide" />
              )}
            />
          </Field>
          <div className="space-y-4">
            <Field label="Фон слайда" hint="Цвет из палитры или HEX-код">
              <Controller
                control={control}
                name="bg_color"
                render={({ field }) => {
                  const val = field.value || "";
                  return (
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        aria-label="Палитра цветов"
                        value={/^#[0-9a-fA-F]{6}$/.test(val) ? val : "#1d1d1f"}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-white p-1"
                      />
                      <TextInput
                        placeholder="#1d1d1f"
                        value={val}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="flex-1 font-mono"
                      />
                    </div>
                  );
                }}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Цвет текста">
                <Controller control={control} name="theme" render={({ field }) => (
                  <Select value={field.value} onChange={field.onChange}>
                    <option value="dark">Светлый</option>
                    <option value="light">Тёмный</option>
                  </Select>
                )} />
              </Field>
              <Field label="Порядок">
                <TextInput type="number" min={0} {...register("sort_order")} />
              </Field>
            </div>
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
