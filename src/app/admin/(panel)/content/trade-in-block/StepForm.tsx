"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { tradeInStepSchema, type TradeInStepInput, type TradeInStepFormValues } from "@/lib/admin/schemas";
import { Field, TextInput, Textarea, FormError, AdminButton } from "@/components/admin/form";
import { IconPicker } from "@/components/admin/IconPicker";
import { Panel } from "@/components/admin/ui";
import { createStep, updateStep } from "./actions";

export interface StepValue {
  id: string;
  step_number: number;
  title: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

export function StepForm({ step }: { step?: StepValue }) {
  const isEdit = !!step;
  const [formError, setFormError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TradeInStepFormValues, unknown, TradeInStepInput>({
    resolver: zodResolver(tradeInStepSchema),
    defaultValues: {
      step_number: step?.step_number ?? 1,
      title: step?.title ?? "",
      description: step?.description ?? "",
      icon: step?.icon ?? "",
      sort_order: step?.sort_order ?? 0,
    },
  });

  const onSubmit = async (values: TradeInStepInput) => {
    setFormError(null);
    const res = isEdit ? await updateStep(step!.id, values) : await createStep(values);
    if (res?.error) setFormError(res.error);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FormError message={formError} />
      <Panel className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Номер шага">
            <TextInput type="number" min={1} {...register("step_number")} />
          </Field>
          <Field label="Порядок">
            <TextInput type="number" min={0} {...register("sort_order")} />
          </Field>
          <Field label="Иконка">
            <Controller control={control} name="icon" render={({ field }) => (
              <IconPicker value={field.value || null} onChange={(n) => field.onChange(n ?? "")} />
            )} />
          </Field>
        </div>
        <Field label="Заголовок" required error={errors.title?.message}>
          <TextInput placeholder="Оценка устройства" hasError={!!errors.title} {...register("title")} />
        </Field>
        <Field label="Описание">
          <Textarea {...register("description")} />
        </Field>
      </Panel>
      <div className="flex items-center gap-2">
        <AdminButton type="submit" loading={isSubmitting}>{isEdit ? "Сохранить" : "Добавить шаг"}</AdminButton>
        <Link href="/admin/content/trade-in-block">
          <AdminButton type="button" variant="outline">Отмена</AdminButton>
        </Link>
      </div>
    </form>
  );
}
