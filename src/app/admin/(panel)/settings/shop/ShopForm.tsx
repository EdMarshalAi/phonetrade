"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, TextInput, FormError, AdminButton } from "@/components/admin/form";
import { Panel, PanelTitle } from "@/components/admin/ui";
import { saveShopSettings, type ShopGeneral } from "./actions";

export function ShopForm({ initial }: { initial: ShopGeneral }) {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<ShopGeneral>({ defaultValues: initial });

  const onSubmit = async (values: ShopGeneral) => {
    setFormError(null);
    const res = await saveShopSettings(values);
    if (res?.error) { setFormError(res.error); return; }
    toast.success("Настройки сохранены");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FormError message={formError} />
      <Panel className="space-y-4 p-5">
        <PanelTitle>Основное</PanelTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Название магазина"><TextInput placeholder="PhoneTrade" {...register("name")} /></Field>
          <Field label="Часы работы"><TextInput placeholder="Ежедневно 10:00–20:00" {...register("working_hours")} /></Field>
        </div>
        <Field label="Адрес"><TextInput placeholder="Белгород, ул. Попова, 36" {...register("address")} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Широта (lat)"><TextInput placeholder="50.5977" {...register("lat")} /></Field>
          <Field label="Долгота (lng)"><TextInput placeholder="36.5856" {...register("lng")} /></Field>
        </div>
      </Panel>

      <Panel className="space-y-4 p-5">
        <PanelTitle>Контакты и соцсети</PanelTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Телефон"><TextInput placeholder="+7 …" {...register("phone")} /></Field>
          <Field label="Доп. телефон"><TextInput {...register("phone2")} /></Field>
          <Field label="Email"><TextInput type="email" {...register("email")} /></Field>
          <Field label="VK"><TextInput placeholder="https://vk.com/…" {...register("vk")} /></Field>
          <Field label="WhatsApp"><TextInput {...register("whatsapp")} /></Field>
          <Field label="Telegram"><TextInput {...register("telegram")} /></Field>
        </div>
      </Panel>

      <Panel className="space-y-4 p-5">
        <PanelTitle>Юридическая информация</PanelTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ИНН"><TextInput {...register("inn")} /></Field>
          <Field label="ОГРН"><TextInput {...register("ogrn")} /></Field>
        </div>
        <Field label="Юридический адрес"><TextInput {...register("legal_address")} /></Field>
      </Panel>

      <AdminButton type="submit" loading={isSubmitting}>Сохранить настройки</AdminButton>
    </form>
  );
}
