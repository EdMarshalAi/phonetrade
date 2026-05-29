"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, TextInput, Textarea, Select, FormError, AdminButton } from "@/components/admin/form";
import { Panel, PanelTitle } from "@/components/admin/ui";
import { saveDiscountsSettings, type DiscountsSettings } from "./actions";

export function DiscountsForm({ initial }: { initial: DiscountsSettings }) {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const { register, handleSubmit, control, formState: { isSubmitting } } = useForm<DiscountsSettings>({
    defaultValues: {
      cash_discount_type: initial.cash_discount_type ?? "percent",
      cash_discount_value: initial.cash_discount_value ?? 0,
      loyalty_note: initial.loyalty_note ?? "",
    },
  });

  const onSubmit = async (values: DiscountsSettings) => {
    setFormError(null);
    const payload: DiscountsSettings = {
      ...values,
      cash_discount_value: Number(values.cash_discount_value),
    };
    const res = await saveDiscountsSettings(payload);
    if (res?.error) { setFormError(res.error); return; }
    toast.success("Настройки скидок сохранены");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FormError message={formError} />

      <Panel className="space-y-4 p-5">
        <PanelTitle>Скидка за наличные</PanelTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Тип скидки">
            <Controller
              control={control}
              name="cash_discount_type"
              render={({ field }) => (
                <Select value={field.value ?? "percent"} onChange={field.onChange}>
                  <option value="percent">Процент (%)</option>
                  <option value="fixed">Фиксированная сумма (₽)</option>
                </Select>
              )}
            />
          </Field>
          <Field label="Размер скидки" hint="Число без знака (% или ₽ в зависимости от типа)">
            <TextInput
              type="number"
              min={0}
              placeholder="3"
              {...register("cash_discount_value")}
            />
          </Field>
        </div>
      </Panel>

      <Panel className="space-y-4 p-5">
        <PanelTitle>Программа лояльности</PanelTitle>
        <Field
          label="Описание программы лояльности"
          hint="Показывается покупателям. Кратко об условиях бонусов, кешбэка или скидок постоянным клиентам."
        >
          <Textarea
            placeholder="Постоянным клиентам — скидка 2% на следующую покупку. Накапливается с каждого заказа."
            {...register("loyalty_note")}
          />
        </Field>
      </Panel>

      <AdminButton type="submit" loading={isSubmitting}>Сохранить настройки</AdminButton>
    </form>
  );
}
