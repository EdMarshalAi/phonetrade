"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, TextInput, Textarea, Switch, FormError, AdminButton } from "@/components/admin/form";
import { Panel, PanelTitle } from "@/components/admin/ui";
import { saveDeliverySettings, type DeliverySettings } from "./actions";

export function DeliveryForm({ initial }: { initial: DeliverySettings }) {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const { register, handleSubmit, control, formState: { isSubmitting } } = useForm<DeliverySettings>({
    defaultValues: {
      pickup_enabled: initial.pickup_enabled ?? false,
      pickup_address: initial.pickup_address ?? "",
      courier_enabled: initial.courier_enabled ?? false,
      courier_price: initial.courier_price ?? 0,
      free_from: initial.free_from ?? 0,
      zones: initial.zones ?? "",
      note: initial.note ?? "",
    },
  });

  const onSubmit = async (values: DeliverySettings) => {
    setFormError(null);
    const payload: DeliverySettings = {
      ...values,
      courier_price: Number(values.courier_price),
      free_from: Number(values.free_from),
    };
    const res = await saveDeliverySettings(payload);
    if (res?.error) { setFormError(res.error); return; }
    toast.success("Настройки доставки сохранены");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FormError message={formError} />

      <Panel className="space-y-4 p-5">
        <PanelTitle>Самовывоз</PanelTitle>
        <Controller
          control={control}
          name="pickup_enabled"
          render={({ field }) => (
            <Switch
              checked={!!field.value}
              onChange={field.onChange}
              label="Самовывоз доступен"
            />
          )}
        />
        <Field label="Адрес самовывоза">
          <TextInput
            placeholder="Белгород, ул. Попова, 36"
            {...register("pickup_address")}
          />
        </Field>
      </Panel>

      <Panel className="space-y-4 p-5">
        <PanelTitle>Курьерская доставка</PanelTitle>
        <Controller
          control={control}
          name="courier_enabled"
          render={({ field }) => (
            <Switch
              checked={!!field.value}
              onChange={field.onChange}
              label="Курьерская доставка доступна"
            />
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Стоимость доставки, ₽">
            <TextInput
              type="number"
              min={0}
              placeholder="300"
              {...register("courier_price")}
            />
          </Field>
          <Field label="Бесплатно от, ₽" hint="0 — не показывать порог">
            <TextInput
              type="number"
              min={0}
              placeholder="5000"
              {...register("free_from")}
            />
          </Field>
        </div>
        <Field label="Зоны и цены" hint="Произвольный текст: зоны доставки, тарифы, условия">
          <Textarea
            placeholder={"Зона 1 (центр) — 200 ₽\nЗона 2 (периферия) — 400 ₽"}
            {...register("zones")}
          />
        </Field>
      </Panel>

      <Panel className="space-y-4 p-5">
        <PanelTitle>Примечание</PanelTitle>
        <Field hint="Показывается покупателям в блоке доставки на сайте">
          <Textarea
            placeholder="Доставка в день заказа при оформлении до 14:00"
            {...register("note")}
          />
        </Field>
      </Panel>

      <AdminButton type="submit" loading={isSubmitting}>Сохранить настройки</AdminButton>
    </form>
  );
}
