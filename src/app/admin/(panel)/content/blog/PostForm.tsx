"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { blogPostSchema, type BlogPostInput, type BlogPostFormValues } from "@/lib/admin/schemas";
import { slugify } from "@/lib/admin/slug";
import { Field, TextInput, Textarea, Select, FormError, AdminButton } from "@/components/admin/form";
import { Panel, PanelTitle } from "@/components/admin/ui";
import { ImageField } from "@/components/admin/ImageField";
import { RichEditor } from "@/components/admin/RichEditor";
import { createBlogPost, updateBlogPost } from "./actions";

export interface BlogPostValue {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_url: string | null;
  category_id: string | null;
  tags: string; // CSV string for form (converted from text[] in edit page)
  status: "draft" | "published" | "archived";
  meta_title: string | null;
  meta_description: string | null;
}

export function PostForm({
  post,
  categories,
}: {
  post?: BlogPostValue;
  categories: { id: string; title: string }[];
}) {
  const isEdit = !!post;
  const [formError, setFormError] = React.useState<string | null>(null);
  const slugTouched = React.useRef(isEdit);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BlogPostFormValues, unknown, BlogPostInput>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: post?.title ?? "",
      slug: post?.slug ?? "",
      excerpt: post?.excerpt ?? "",
      content: post?.content ?? "",
      cover_url: post?.cover_url ?? "",
      category_id: post?.category_id ?? "",
      tags: post?.tags ?? "",
      status: post?.status ?? "draft",
      meta_title: post?.meta_title ?? "",
      meta_description: post?.meta_description ?? "",
    },
  });

  const title = watch("title");
  React.useEffect(() => {
    if (!slugTouched.current) setValue("slug", slugify(title));
  }, [title, setValue]);

  const onSubmit = async (values: BlogPostInput) => {
    setFormError(null);
    const res = isEdit
      ? await updateBlogPost(post!.id, values)
      : await createBlogPost(values);
    if (res?.error) setFormError(res.error);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FormError message={formError} />

      <Panel className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Заголовок" required error={errors.title?.message}>
            <TextInput
              placeholder="Название поста"
              hasError={!!errors.title}
              {...register("title")}
            />
          </Field>
          <Field
            label="Slug"
            required
            error={errors.slug?.message}
            hint={isEdit ? "Менять осторожно — это URL поста" : "Латиница, URL: /blog/slug"}
          >
            <TextInput
              hasError={!!errors.slug}
              {...register("slug", { onChange: () => (slugTouched.current = true) })}
            />
          </Field>
        </div>

        <Field label="Анонс" hint="Краткое описание для карточки и мета-тегов">
          <Textarea
            placeholder="Короткое описание поста…"
            className="min-h-[80px]"
            {...register("excerpt")}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Категория">
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => (
                <Select value={field.value ?? ""} onChange={field.onChange}>
                  <option value="">— Без категории —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </Select>
              )}
            />
          </Field>
          <Field label="Теги" hint="Через запятую: apple, iphone, обзор">
            <TextInput placeholder="apple, обзор, новость" {...register("tags")} />
          </Field>
        </div>

        <Field label="Обложка">
          <Controller
            control={control}
            name="cover_url"
            render={({ field }) => (
              <ImageField
                value={field.value || null}
                onChange={(url) => field.onChange(url ?? "")}
                bucket="blog-covers"
                folder="blog"
                aspect="wide"
              />
            )}
          />
        </Field>

        <Field label="Статус">
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onChange={field.onChange} className="w-48">
                <option value="draft">Черновик</option>
                <option value="published">Опубликован</option>
                <option value="archived">Архив</option>
              </Select>
            )}
          />
        </Field>
      </Panel>

      <Panel className="space-y-4 p-5">
        <PanelTitle>Контент</PanelTitle>
        <Field label="Текст поста" error={errors.content?.message}>
          <Controller
            control={control}
            name="content"
            render={({ field }) => (
              <RichEditor value={field.value ?? ""} onChange={field.onChange} />
            )}
          />
        </Field>
      </Panel>

      <Panel className="space-y-4 p-5">
        <PanelTitle>SEO</PanelTitle>
        <Field label="Meta title">
          <TextInput {...register("meta_title")} />
        </Field>
        <Field label="Meta description">
          <Textarea {...register("meta_description")} />
        </Field>
      </Panel>

      <div className="flex items-center gap-2">
        <AdminButton type="submit" loading={isSubmitting}>
          {isEdit ? "Сохранить" : "Создать пост"}
        </AdminButton>
        <Link href="/admin/content/blog">
          <AdminButton type="button" variant="outline">Отмена</AdminButton>
        </Link>
      </div>
    </form>
  );
}
