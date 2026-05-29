import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminRole = "owner" | "admin" | "manager" | "content" | "analytics";

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  isActive: boolean;
}

/**
 * Текущий активный админ или null. Читает сессию через cookie-клиент и
 * сверяет её с таблицей admin_users (RLS «self read» позволяет прочитать
 * свою строку).
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("admin_users")
    .select("id, email, full_name, role, is_active")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name ?? "",
    role: data.role as AdminRole,
    isActive: data.is_active,
  };
}

/**
 * Гард для серверных компонентов/экшенов админки. Возвращает админа или
 * редиректит на логин. Опционально проверяет минимально требуемые роли.
 */
export async function requireAdmin(roles?: AdminRole[]): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login?error=forbidden");
  // Owner — суперадмин: доступ ко всему независимо от списка ролей.
  if (admin.role === "owner") return admin;
  if (roles && roles.length > 0 && !roles.includes(admin.role)) {
    redirect("/admin?error=role");
  }
  return admin;
}

/** Доступ к разделу по роли (owner — всегда). */
export function canAccess(role: AdminRole, allowed: AdminRole[]): boolean {
  return role === "owner" || allowed.includes(role);
}
