"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, TextInput, Switch, FormError, AdminButton } from "@/components/admin/form";
import { Panel, PanelTitle } from "@/components/admin/ui";
import { savePaymentSettings, type PaymentSettings } from "./actions";

export function PaymentForm({ initial }: { initial: PaymentSettings }) {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const { register, handleSubmit, control, formState: { isSubmitting } } = useForm<PaymentSettings>({
    defaultValues: {
      sbp_enabled: initial.sbp_enabled ?? false,
      card_enabled: initial.card_enabled ?? false,
      on_delivery_enabled: initial.on_delivery_enabled ?? false,
      installment_enabled: initial.installment_enabled ?? false,
      sbp_provider: initial.sbp_provider ?? "",
      card_provider: initial.card_provider ?? "",
      installment_partner: initial.installment_partner ?? "",
      installment_min: initial.installment_min ?? 0,
      installment_terms: initial.installment_terms ?? "",
    },
  });

  const onSubmit = async (values: PaymentSettings) => {
    setFormError(null);
    const payload: PaymentSettings = {
      ...values,
      installment_min: Number(values.installment_min),
    };
    const res = await savePaymentSettings(payload);
    if (res?.error) { setFormError(res.error); return; }
    toast.success("Настройки оплаты сохранены");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FormError message={formError} />

      <Panel className="space-y-4 p-5">
        <PanelTitle>СБП (Система быстрых платежей)</PanelTitle>
        <Controller
          control={control}
          name="sbp_enabled"
          render={({ field }) => (
            <Switch checked={!!field.value} onChange={field.onChange} label="СБП включён" />
          )}
        />
        <Field label="Провайдер СБП" hint="Например: ЮKassa, Т-Банк, Сбербанк">
          <TextInput placeholder="ЮKassa" {...register("sbp_provider")} />
        </Field>
      </Panel>

      <Panel className="space-y-4 p-5">
        <PanelTitle>Оплата картой онлайн</PanelTitle>
        <Controller
          control={control}
          name="card_enabled"
          render={({ field }) => (
            <Switch checked={!!field.value} onChange={field.onChange} label="Оплата картой включена" />
          )}
        />
        <Field label="Провайдер эквайринга" hint="Например: ЮKassa, Т-Банк">
          <TextInput placeholder="ЮKassa" {...register("card_provider")} />
        </Field>
      </Panel>

      <Panel className="space-y-4 p-5">
        <PanelTitle>Оплата при получении</PanelTitle>
        <Controller
          control={control}
          name="on_delivery_enabled"
          render={({ field }) => (
            <Switch checked={!!field.value} onChange={field.onChange} label="Оплата при получении включена" />
          )}
        />
      </Panel>

      <Panel className="space-y-4 p-5">
        <PanelTitle>Рассрочка / BNPL</PanelTitle>
        <Controller
          control={control}
          name="installment_enabled"
          render={({ field }) => (
            <Switch checked={!!field.value} onChange={field.onChange} label="Рассрочка включена" />
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Партнёр по рассрочке" hint="Например: Т-Банк, Сплит">
            <TextInput placeholder="Т-Банк Рассрочка" {...register("installment_partner")} />
          </Field>
          <Field label="Минимальная сумма, ₽">
            <TextInput type="number" min={0} placeholder="3000" {...register("installment_min")} />
          </Field>
        </div>
        <Field label="Условия рассрочки" hint="Краткое описание для покупателей">
          <TextInput placeholder="0-0-3, 0-0-6, 0-0-12 месяцев" {...register("installment_terms")} />
        </Field>
      </Panel>

      <AdminButton type="submit" loading={isSubmitting}>Сохранить настройки</AdminButton>
    </form>
  );
}
