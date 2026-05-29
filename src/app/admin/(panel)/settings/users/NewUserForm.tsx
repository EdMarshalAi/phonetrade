"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { Field, TextInput, Select, FormError, AdminButton } from "@/components/admin/form";
import { Panel } from "@/components/admin/ui";
import { createAdminUser, type NewUserInput } from "./actions";

export function NewUserForm() {
  const [formError, setFormError] = React.useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<NewUserInput>({
    defaultValues: { email: "", full_name: "", role: "manager", password: "" },
  });

  const onSubmit = async (values: NewUserInput) => {
    setFormError(null);
    const res = await createAdminUser(values);
    if (res?.error) setFormError(res.error);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <FormError message={formError} />
      <Panel className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Имя" required><TextInput placeholder="Иван Менеджеров" {...register("full_name")} /></Field>
          <Field label="Email" required><TextInput type="email" placeholder="manager@phonetrade.ru" {...register("email")} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Роль">
            <Select {...register("role")}>
              <option value="manager">Менеджер</option>
              <option value="content">Контент</option>
              <option value="admin">Администратор</option>
            </Select>
          </Field>
          <Field label="Пароль" required hint="Минимум 8 символов; сотрудник сменит после входа">
            <TextInput type="text" placeholder="временный пароль" {...register("password")} />
          </Field>
        </div>
      </Panel>
      <div className="flex items-center gap-2">
        <AdminButton type="submit" loading={isSubmitting}>Создать пользователя</AdminButton>
        <Link href="/admin/settings/users"><AdminButton type="button" variant="outline">Отмена</AdminButton></Link>
      </div>
    </form>
  );
}
