"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import Link from "next/link";
import { Field, TextInput, Select, Switch, FormError, AdminButton } from "@/components/admin/form";
import { Panel, PanelTitle } from "@/components/admin/ui";
import { createMenuItem, updateMenuItem, type MenuItemInput } from "./actions";

export interface MenuItemValue {
  id: string;
  menu_location: string;
  title: string;
  link_url: string;
  link_type: string;
  link_target_id: string | null;
  sort_order: number;
  is_visible: boolean;
}

export function MenuItemForm({ item, defaultLocation }: { item?: MenuItemValue; defaultLocation?: string }) {
  const isEdit = !!item;
  const [formError, setFormError] = React.useState<string | null>(null);
  const { register, handleSubmit, control, formState: { isSubmitting } } = useForm<MenuItemInput>({
    defaultValues: {
      menu_location: (item?.menu_location as MenuItemInput["menu_location"]) ?? (defaultLocation as MenuItemInput["menu_location"]) ?? "main",
      title: item?.title ?? "",
      link_url: item?.link_url ?? "",
      link_type: (item?.link_type as MenuItemInput["link_type"]) ?? "url",
      link_target_id: item?.link_target_id ?? "",
      sort_order: item?.sort_order ?? 0,
      is_visible: item?.is_visible ?? true,
    },
  });

  const onSubmit = async (values: MenuItemInput) => {
    setFormError(null);
    const res = isEdit
      ? await updateMenuItem(item!.id, values)
      : await createMenuItem(values);
    if (res?.error) setFormError(res.error);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FormError message={formError} />

      <Panel className="space-y-4 p-5">
        <PanelTitle>{isEdit ? "Редактирование пункта" : "Новый пункт меню"}</PanelTitle>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Расположение меню">
            <Controller
              control={control}
              name="menu_location"
              render={({ field }) => (
                <Select value={field.value} onChange={field.onChange}>
                  <option value="top">Верхнее меню</option>
                  <option value="main">Основное меню</option>
                  <option value="footer">Футер</option>
                </Select>
              )}
            />
          </Field>
          <Field label="Порядок сортировки">
            <TextInput type="number" min={0} placeholder="0" {...register("sort_order")} />
          </Field>
        </div>

        <Field label="Название пункта">
          <TextInput placeholder="iPhone" {...register("title")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="URL ссылки">
            <TextInput placeholder="/category/iphone" {...register("link_url")} />
          </Field>
          <Field label="Тип ссылки">
            <Controller
              control={control}
              name="link_type"
              render={({ field }) => (
                <Select value={field.value} onChange={field.onChange}>
                  <option value="url">Произвольный URL</option>
                  <option value="category">Категория</option>
                  <option value="page">Страница</option>
                </Select>
              )}
            />
          </Field>
        </div>

        <Field
          label="ID цели ссылки"
          hint="Slug категории или ID страницы (только для типов Категория / Страница)"
        >
          <TextInput placeholder="iphone" {...register("link_target_id")} />
        </Field>

        <Controller
          control={control}
          name="is_visible"
          render={({ field }) => (
            <Switch checked={!!field.value} onChange={field.onChange} label="Видимый" />
          )}
        />
      </Panel>

      <div className="flex items-center gap-2">
        <AdminButton type="submit" loading={isSubmitting}>
          {isEdit ? "Сохранить" : "Создать пункт"}
        </AdminButton>
        <Link href="/admin/settings/navigation">
          <AdminButton type="button" variant="outline">Отмена</AdminButton>
        </Link>
      </div>
    </form>
  );
}
