"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";

const newUserSchema = z.object({
  email: z.string().trim().email("Некорректный email").transform((s) => s.toLowerCase()),
  full_name: z.string().trim().min(1, "Укажите имя"),
  role: z.enum(["admin", "manager", "content"]),
  password: z.string().min(8, "Минимум 8 символов"),
});

export type NewUserInput = z.input<typeof newUserSchema>;

export async function createAdminUser(input: NewUserInput): Promise<{ error?: string }> {
  const me = await requireAdmin(["admin"]);
  const parsed = newUserSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля" };

  const db = createSupabaseAdminClient();
  try {
    const created = await db.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      return { error: created.error?.message ?? "Не удалось создать пользователя" };
    }
    const { error } = await db.from("admin_users").insert({
      id: created.data.user.id,
      email: parsed.data.email,
      full_name: parsed.data.full_name,
      role: parsed.data.role,
      is_active: true,
    });
    if (error) {
      await db.auth.admin.deleteUser(created.data.user.id);
      throw error;
    }
    await writeAudit({ userId: me.id, action: "create", entityType: "admin_user", entityId: created.data.user.id, changes: { email: parsed.data.email, role: parsed.data.role } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка";
    return { error: msg.includes("duplicate") || msg.includes("registered") ? "Пользователь с таким email уже есть" : msg };
  }
  redirect("/admin/settings/users");
}

export async function setUserRole(id: string, role: string): Promise<{ error?: string }> {
  const me = await requireAdmin(["admin"]);
  if (!["admin", "manager", "content"].includes(role)) return { error: "Неизвестная роль" };
  const db = createSupabaseAdminClient();
  const { error } = await db.from("admin_users").update({ role }).eq("id", id);
  if (error) return { error: error.message };
  await writeAudit({ userId: me.id, action: "update", entityType: "admin_user", entityId: id, changes: { role } });
  return {};
}

export async function setUserActive(id: string, isActive: boolean): Promise<{ error?: string }> {
  const me = await requireAdmin(["admin"]);
  if (id === me.id && !isActive) return { error: "Нельзя деактивировать самого себя" };
  const db = createSupabaseAdminClient();
  const { error } = await db.from("admin_users").update({ is_active: isActive }).eq("id", id);
  if (error) return { error: error.message };
  await writeAudit({ userId: me.id, action: "update", entityType: "admin_user", entityId: id, changes: { is_active: isActive } });
  return {};
}
