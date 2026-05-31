"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { promoSchema, type PromoInput, type PromoFormValues } from "@/lib/admin/schemas";
import { Field, TextInput, Select, Switch, FormError, AdminButton } from "@/components/admin/form";
import { Panel } from "@/components/admin/ui";
import { createPromo, updatePromo } from "./actions";

export interface PromoValue {
  id: string;
  code: string;
  discount_type: "percent" | "fixed" | "free_shipping";
  discount_value: number;
  min_order_amount: number;
  starts_at: string | null;
  expires_at: string | null;
  total_limit: number | null;
  per_customer_limit: number | null;
  only_new_customers: boolean;
  is_active: boolean;
  applies_to: "all" | "categories" | "products";
  applies_to_ids: string[];
}

function dateInput(iso: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : "";
}

export function PromoForm({
  promo,
  categories = [],
}: {
  promo?: PromoValue;
  categories?: { slug: string; title: string }[];
}) {
  const isEdit = !!promo;
  const [formError, setFormError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PromoFormValues, unknown, PromoInput>({
    resolver: zodResolver(promoSchema),
    defaultValues: {
      code: promo?.code ?? "",
      discount_type: promo?.discount_type ?? "percent",
      discount_value: promo?.discount_value ?? 0,
      min_order_amount: promo?.min_order_amount ?? 0,
      starts_at: dateInput(promo?.starts_at ?? null),
      expires_at: dateInput(promo?.expires_at ?? null),
      total_limit: promo?.total_limit ?? undefined,
      per_customer_limit: promo?.per_customer_limit ?? undefined,
      only_new_customers: promo?.only_new_customers ?? false,
      is_active: promo?.is_active ?? true,
      applies_to: promo?.applies_to ?? "all",
      applies_to_ids: promo?.applies_to_ids ?? [],
    },
  });
  const appliesTo = watch("applies_to");

  const onSubmit = async (values: PromoInput) => {
    setFormError(null);
    const res = isEdit ? await updatePromo(promo!.id, values) : await createPromo(values);
    if (res?.error) setFormError(res.error);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FormError message={formError} />
      <Panel className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Код" required error={errors.code?.message} hint="Автоматически в верхнем регистре">
            <TextInput placeholder="SUMMER2026" hasError={!!errors.code} {...register("code")} />
          </Field>
          <Field label="Тип скидки">
            <Controller control={control} name="discount_type" render={({ field }) => (
              <Select value={field.value} onChange={field.onChange}>
                <option value="percent">Процент (%)</option>
                <option value="fixed">Фиксированная (₽)</option>
                <option value="free_shipping">Бесплатная доставка</option>
              </Select>
            )} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Размер скидки" hint="% или ₽ в зависимости от типа">
            <TextInput type="number" min={0} {...register("discount_value")} />
          </Field>
          <Field label="Мин. сумма заказа, ₽">
            <TextInput type="number" min={0} {...register("min_order_amount")} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Действует с">
            <TextInput type="date" {...register("starts_at")} />
          </Field>
          <Field label="Действует по">
            <TextInput type="date" {...register("expires_at")} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Лимит использований (всего)">
            <TextInput type="number" min={0} {...register("total_limit")} />
          </Field>
          <Field label="Лимит на клиента">
            <TextInput type="number" min={0} {...register("per_customer_limit")} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-5">
          <Controller control={control} name="only_new_customers" render={({ field }) => <Switch checked={!!field.value} onChange={field.onChange} label="Только новым клиентам" />} />
          <Controller control={control} name="is_active" render={({ field }) => <Switch checked={!!field.value} onChange={field.onChange} label="Активен" />} />
        </div>
      </Panel>

      <Panel className="space-y-4 p-5">
        <Field label="Область применения" hint="К каким товарам применяется скидка">
          <Controller control={control} name="applies_to" render={({ field }) => (
            <Select value={field.value} onChange={field.onChange}>
              <option value="all">Все товары</option>
              <option value="categories">Только определённые категории</option>
              <option value="products">Только определённые товары</option>
            </Select>
          )} />
        </Field>

        {appliesTo === "categories" && (
          <Controller control={control} name="applies_to_ids" render={({ field }) => {
            const ids = field.value ?? [];
            const toggle = (slug: string) =>
              field.onChange(ids.includes(slug) ? ids.filter((s) => s !== slug) : [...ids, slug]);
            return (
              <div className="grid gap-1.5 sm:grid-cols-2">
                {categories.map((c) => (
                  <label key={c.slug} className="flex items-center gap-2.5 text-[14px] text-ink">
                    <input type="checkbox" checked={ids.includes(c.slug)} onChange={() => toggle(c.slug)} className="size-4 accent-[var(--color-ink)]" />
                    {c.title}
                  </label>
                ))}
              </div>
            );
          }} />
        )}

        {appliesTo === "products" && (
          <Controller control={control} name="applies_to_ids" render={({ field }) => (
            <Field label="ID товаров" hint="Через запятую — ID из адреса товара /product/…">
              <TextInput
                placeholder="iphone-17-pro, ipad-air-m3"
                value={(field.value ?? []).join(", ")}
                onChange={(e) => field.onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              />
            </Field>
          )} />
        )}
      </Panel>
      <div className="flex items-center gap-2">
        <AdminButton type="submit" loading={isSubmitting}>{isEdit ? "Сохранить" : "Создать промокод"}</AdminButton>
        <Link href="/admin/promotions/promo-codes">
          <AdminButton type="button" variant="outline">Отмена</AdminButton>
        </Link>
      </div>
    </form>
  );
}
