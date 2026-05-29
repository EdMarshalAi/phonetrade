"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Field, TextInput, FormError, AdminButton } from "@/components/admin/form";
import { Panel } from "@/components/admin/ui";
import { createTradeInPrice, updateTradeInPrice, type TradeInPriceFormValues } from "./actions";

/* ── Re-declare local schema for client-side resolver ────────────────── */
const schema = z.object({
  model: z.string().trim().min(1, "Укажите модель"),
  base_price: z.coerce.number().int().min(0, "Цена не может быть отрицательной"),
  perfect: z.coerce.number().min(0).max(1, "Коэффициент от 0 до 1").default(1.0),
  good: z.coerce.number().min(0).max(1, "Коэффициент от 0 до 1").default(0.85),
  fair: z.coerce.number().min(0).max(1, "Коэффициент от 0 до 1").default(0.6),
  broken: z.coerce.number().min(0).max(1, "Коэффициент от 0 до 1").default(0.3),
});

type FormValues = z.input<typeof schema>;
type Input = z.infer<typeof schema>;

export interface TradeInPriceValue {
  id: string;
  model: string;
  base_price: number;
  coefficients: {
    perfect?: number;
    good?: number;
    fair?: number;
    broken?: number;
  };
}

export function TradeInPriceForm({ price }: { price?: TradeInPriceValue }) {
  const isEdit = !!price;
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, Input>({
    resolver: zodResolver(schema),
    defaultValues: {
      model: price?.model ?? "",
      base_price: price?.base_price ?? 0,
      perfect: price?.coefficients?.perfect ?? 1.0,
      good: price?.coefficients?.good ?? 0.85,
      fair: price?.coefficients?.fair ?? 0.6,
      broken: price?.coefficients?.broken ?? 0.3,
    },
  });

  const onSubmit = async (values: Input) => {
    setFormError(null);
    const res = isEdit
      ? await updateTradeInPrice(price!.id, values as TradeInPriceFormValues)
      : await createTradeInPrice(values as TradeInPriceFormValues);
    if (res?.error) setFormError(res.error);
    // успех → server action делает redirect
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FormError message={formError} />
      <Panel className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Модель" required error={errors.model?.message}>
            <TextInput
              placeholder="iPhone 15 Pro"
              hasError={!!errors.model}
              {...register("model")}
            />
          </Field>
          <Field
            label="Базовая цена, ₽"
            required
            error={errors.base_price?.message}
            hint="Цена за идеальное состояние (до коэффициентов)"
          >
            <TextInput
              type="number"
              min={0}
              step={100}
              placeholder="50000"
              hasError={!!errors.base_price}
              {...register("base_price")}
            />
          </Field>
        </div>

        <div>
          <p className="mb-3 text-[13px] font-medium text-ink">
            Коэффициенты состояний
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Идеальное (perfect)"
              error={errors.perfect?.message}
              hint="коэффициент 0..1"
            >
              <TextInput
                type="number"
                min={0}
                max={1}
                step={0.05}
                placeholder="1.0"
                hasError={!!errors.perfect}
                {...register("perfect")}
              />
            </Field>
            <Field
              label="Хорошее (good)"
              error={errors.good?.message}
              hint="коэффициент 0..1"
            >
              <TextInput
                type="number"
                min={0}
                max={1}
                step={0.05}
                placeholder="0.85"
                hasError={!!errors.good}
                {...register("good")}
              />
            </Field>
            <Field
              label="Удовлетворительное (fair)"
              error={errors.fair?.message}
              hint="коэффициент 0..1"
            >
              <TextInput
                type="number"
                min={0}
                max={1}
                step={0.05}
                placeholder="0.6"
                hasError={!!errors.fair}
                {...register("fair")}
              />
            </Field>
            <Field
              label="Сломанное (broken)"
              error={errors.broken?.message}
              hint="коэффициент 0..1"
            >
              <TextInput
                type="number"
                min={0}
                max={1}
                step={0.05}
                placeholder="0.3"
                hasError={!!errors.broken}
                {...register("broken")}
              />
            </Field>
          </div>
        </div>
      </Panel>

      <div className="flex items-center gap-2">
        <AdminButton type="submit" loading={isSubmitting}>
          {isEdit ? "Сохранить" : "Создать запись"}
        </AdminButton>
        <Link href="/admin/catalog/trade-in-prices">
          <AdminButton type="button" variant="outline">
            Отмена
          </AdminButton>
        </Link>
      </div>
    </form>
  );
}
