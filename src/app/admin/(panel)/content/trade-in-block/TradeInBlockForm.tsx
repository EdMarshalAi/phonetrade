"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { tradeInBlockSchema, type TradeInBlockInput, type TradeInBlockFormValues } from "@/lib/admin/schemas";
import { Field, TextInput, Textarea, Switch, FormError, AdminButton } from "@/components/admin/form";
import { ImageField } from "@/components/admin/ImageField";
import { Panel } from "@/components/admin/ui";
import { saveTradeInBlock } from "./actions";

export interface TradeInBlockValue {
  id: string;
  block_title: string;
  block_description: string | null;
  button_text: string | null;
  button_link: string | null;
  image_url: string | null;
  is_published: boolean;
}

export function TradeInBlockForm({ block }: { block: TradeInBlockValue | null }) {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TradeInBlockFormValues, unknown, TradeInBlockInput>({
    resolver: zodResolver(tradeInBlockSchema),
    defaultValues: {
      block_title: block?.block_title ?? "",
      block_description: block?.block_description ?? "",
      button_text: block?.button_text ?? "",
      button_link: block?.button_link ?? "",
      image_url: block?.image_url ?? "",
      is_published: block?.is_published ?? true,
    },
  });

  const onSubmit = async (values: TradeInBlockInput) => {
    setFormError(null);
    const res = await saveTradeInBlock(block?.id ?? null, values);
    if (res?.error) {
      setFormError(res.error);
      return;
    }
    toast.success("Блок сохранён");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FormError message={formError} />
      <Panel className="space-y-4 p-5">
        <Field label="Заголовок блока" required error={errors.block_title?.message}>
          <TextInput placeholder="Trade-in и выкуп старых устройств" hasError={!!errors.block_title} {...register("block_title")} />
        </Field>
        <Field label="Описание">
          <Textarea {...register("block_description")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Текст кнопки">
            <TextInput placeholder="Оценить устройство" {...register("button_text")} />
          </Field>
          <Field label="Ссылка кнопки">
            <TextInput placeholder="/trade-in" {...register("button_link")} />
          </Field>
        </div>
        <Field label="Изображение">
          <Controller control={control} name="image_url" render={({ field }) => (
            <ImageField value={field.value || null} onChange={(u) => field.onChange(u ?? "")} bucket="general" folder="trade-in" aspect="wide" />
          )} />
        </Field>
        <Controller control={control} name="is_published" render={({ field }) => <Switch checked={!!field.value} onChange={field.onChange} label="Показывать блок на сайте" />} />
      </Panel>
      <AdminButton type="submit" loading={isSubmitting}>Сохранить блок</AdminButton>
    </form>
  );
}
