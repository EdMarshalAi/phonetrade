"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { advantageSchema, type AdvantageInput, type AdvantageFormValues } from "@/lib/admin/schemas";
import { Field, TextInput, Textarea, Switch, FormError, AdminButton } from "@/components/admin/form";
import { Panel } from "@/components/admin/ui";
import { createAdvantage, updateAdvantage } from "./actions";

export interface AdvantageValue {
  id: string;
  icon: string | null;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
}

export function AdvantageForm({ advantage }: { advantage?: AdvantageValue }) {
  const isEdit = !!advantage;
  const [formError, setFormError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AdvantageFormValues, unknown, AdvantageInput>({
    resolver: zodResolver(advantageSchema),
    defaultValues: {
      icon: advantage?.icon ?? "",
      title: advantage?.title ?? "",
      description: advantage?.description ?? "",
      sort_order: advantage?.sort_order ?? 0,
      is_published: advantage?.is_published ?? true,
    },
  });

  const onSubmit = async (values: AdvantageInput) => {
    setFormError(null);
    const res = isEdit ? await updateAdvantage(advantage!.id, values) : await createAdvantage(values);
    if (res?.error) setFormError(res.error);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FormError message={formError} />
      <Panel className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Заголовок" required error={errors.title?.message}>
            <TextInput placeholder="Только оригинал" hasError={!!errors.title} {...register("title")} />
          </Field>
          <Field
            label="Иконка (lucide)"
            hint="Имя иконки lucide, напр. shield-check, truck, badge-percent"
          >
            <TextInput placeholder="shield-check" {...register("icon")} />
          </Field>
        </div>
        <Field label="Описание">
          <Textarea placeholder="Короткое пояснение преимущества" {...register("description")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Порядок">
            <TextInput type="number" min={0} {...register("sort_order")} />
          </Field>
          <div className="flex items-end pb-1.5">
            <Controller control={control} name="is_published" render={({ field }) => <Switch checked={!!field.value} onChange={field.onChange} label="Опубликовано" />} />
          </div>
        </div>
      </Panel>
      <div className="flex items-center gap-2">
        <AdminButton type="submit" loading={isSubmitting}>
          {isEdit ? "Сохранить" : "Создать"}
        </AdminButton>
        <Link href="/admin/content/advantages">
          <AdminButton type="button" variant="outline">
            Отмена
          </AdminButton>
        </Link>
      </div>
    </form>
  );
}
