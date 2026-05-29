"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, TextInput, Textarea, FormError, AdminButton } from "@/components/admin/form";
import { Panel, PanelTitle } from "@/components/admin/ui";
import { saveSeoSettings, type SeoSettings } from "./actions";

export function SeoForm({ initial }: { initial: SeoSettings }) {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<SeoSettings>({
    defaultValues: {
      title_template: initial.title_template ?? "",
      default_description: initial.default_description ?? "",
      default_og_image: initial.default_og_image ?? "",
      robots: initial.robots ?? "",
      schema_org_name: initial.schema_org_name ?? "",
    },
  });

  const onSubmit = async (values: SeoSettings) => {
    setFormError(null);
    const res = await saveSeoSettings(values);
    if (res?.error) { setFormError(res.error); return; }
    toast.success("SEO-настройки сохранены");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FormError message={formError} />

      <Panel className="space-y-4 p-5">
        <PanelTitle>Мета-теги по умолчанию</PanelTitle>
        <Field
          label="Шаблон title"
          hint='Используйте %page% для подстановки названия страницы. Пример: %page% | PhoneTrade'
        >
          <TextInput
            placeholder="%page% | PhoneTrade — Apple в Белгороде"
            {...register("title_template")}
          />
        </Field>
        <Field label="Описание по умолчанию (meta description)">
          <Textarea
            placeholder="Официальный магазин Apple в Белгороде. iPhone, MacBook, iPad, AirPods."
            {...register("default_description")}
          />
        </Field>
        <Field label="OG-изображение по умолчанию (URL)">
          <TextInput
            type="url"
            placeholder="https://phonetrade.ru/og-default.jpg"
            {...register("default_og_image")}
          />
        </Field>
      </Panel>

      <Panel className="space-y-4 p-5">
        <PanelTitle>Robots.txt</PanelTitle>
        <Field hint="Содержимое файла robots.txt. Оставьте пустым для значений по умолчанию.">
          <Textarea
            className="min-h-[120px] font-mono text-[13px]"
            placeholder={"User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: https://phonetrade.ru/sitemap.xml"}
            {...register("robots")}
          />
        </Field>
      </Panel>

      <Panel className="space-y-4 p-5">
        <PanelTitle>Schema.org</PanelTitle>
        <Field label="Название организации (schema:name)">
          <TextInput placeholder="PhoneTrade" {...register("schema_org_name")} />
        </Field>
      </Panel>

      <AdminButton type="submit" loading={isSubmitting}>Сохранить SEO-настройки</AdminButton>
    </form>
  );
}
