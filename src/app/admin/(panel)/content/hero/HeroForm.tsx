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
import { cn } from "@/lib/utils/cn";

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

const BG_PRESETS = ["#1d1d1f", "#000000", "#f5f5f7", "#ffffff", "#0b3d2e", "#13315c", "#5b2333", "#3a3a3c"];

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
        <Field label="Текст кнопки">
          <TextInput placeholder="Узнать подробнее" {...register("button_text")} />
        </Field>
        <Field label="Ссылка кнопки" hint="Выберите категорию, подкатегорию, товар или укажите свою ссылку">
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

      <Panel className="space-y-4 p-5">
        <Field label="Фон слайда" hint="Выберите любой цвет или оставьте по теме">
          <Controller
            control={control}
            name="bg_color"
            render={({ field }) => {
              const val = field.value || "";
              return (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="color"
                      aria-label="Палитра цветов"
                      value={val || "#1d1d1f"}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="h-10 w-12 cursor-pointer rounded-md border border-border bg-white p-1"
                    />
                    <TextInput
                      placeholder="#1d1d1f"
                      value={val}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="w-32 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => field.onChange("")}
                      className={cn(
                        "h-9 rounded-md border px-3 text-[13px] font-medium transition-colors",
                        val ? "border-border text-ink-muted hover:text-ink" : "border-ink bg-ink text-white"
                      )}
                    >
                      По теме
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {BG_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={c}
                        title={c}
                        onClick={() => field.onChange(c)}
                        className={cn(
                          "size-7 rounded-md border transition-transform hover:scale-110",
                          val.toLowerCase() === c ? "border-ink ring-2 ring-ink/30" : "border-border"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              );
            }}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Цвет текста" hint="Поверх фона">
            <Controller control={control} name="theme" render={({ field }) => (
              <Select value={field.value} onChange={field.onChange}>
                <option value="dark">Светлый текст</option>
                <option value="light">Тёмный текст</option>
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
