"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { staticPageSchema, type StaticPageInput, type StaticPageFormValues } from "@/lib/admin/schemas";
import { slugify } from "@/lib/admin/slug";
import { Field, TextInput, Textarea, Select, FormError, AdminButton } from "@/components/admin/form";
import { Panel, PanelTitle } from "@/components/admin/ui";
import { createPage, updatePage } from "./actions";

export interface PageValue {
  slug: string;
  title: string;
  content: string | null;
  meta_title: string | null;
  meta_description: string | null;
  status: "draft" | "published" | "archived";
}

export function PageForm({ page }: { page?: PageValue }) {
  const isEdit = !!page;
  const [formError, setFormError] = React.useState<string | null>(null);
  const slugTouched = React.useRef(isEdit);
  const {
    register, handleSubmit, control, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<StaticPageFormValues, unknown, StaticPageInput>({
    resolver: zodResolver(staticPageSchema),
    defaultValues: {
      title: page?.title ?? "",
      slug: page?.slug ?? "",
      content: page?.content ?? "",
      meta_title: page?.meta_title ?? "",
      meta_description: page?.meta_description ?? "",
      status: page?.status ?? "draft",
    },
  });

  const title = watch("title");
  React.useEffect(() => { if (!slugTouched.current) setValue("slug", slugify(title)); }, [title, setValue]);

  const onSubmit = async (values: StaticPageInput) => {
    setFormError(null);
    const res = isEdit ? await updatePage(page!.slug, values) : await createPage(values);
    if (res?.error) setFormError(res.error);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FormError message={formError} />
      <Panel className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Заголовок" required error={errors.title?.message}>
            <TextInput placeholder="О компании" hasError={!!errors.title} {...register("title")} />
          </Field>
          <Field label="Slug" required error={errors.slug?.message} hint={isEdit ? "Менять осторожно — это URL страницы" : "Латиница, URL: /slug"}>
            <TextInput disabled={isEdit} hasError={!!errors.slug} {...register("slug", { onChange: () => (slugTouched.current = true) })} />
          </Field>
        </div>
        <Field label="Контент" hint="Markdown или текст">
          <Textarea className="min-h-[260px] font-mono text-[13px]" {...register("content")} />
        </Field>
        <Field label="Статус">
          <Controller control={control} name="status" render={({ field }) => (
            <Select value={field.value} onChange={field.onChange} className="w-48">
              <option value="draft">Черновик</option>
              <option value="published">Опубликована</option>
              <option value="archived">Архив</option>
            </Select>
          )} />
        </Field>
      </Panel>
      <Panel className="space-y-4 p-5">
        <PanelTitle>SEO</PanelTitle>
        <Field label="Meta title"><TextInput {...register("meta_title")} /></Field>
        <Field label="Meta description"><Textarea {...register("meta_description")} /></Field>
      </Panel>
      <div className="flex items-center gap-2">
        <AdminButton type="submit" loading={isSubmitting}>{isEdit ? "Сохранить" : "Создать страницу"}</AdminButton>
        <Link href="/admin/content/pages"><AdminButton type="button" variant="outline">Отмена</AdminButton></Link>
      </div>
    </form>
  );
}
