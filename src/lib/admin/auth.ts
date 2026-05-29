import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Роль теперь произвольная строка-ключ из таблицы admin_roles. */
export type AdminRole = string;

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  isActive: boolean;
  /** Полный доступ (суперадмин) — из admin_roles.full_access. */
  fullAccess: boolean;
  /** Разрешённые разделы сайдбара (href). При full_access не используется. */
  permissions: string[];
}

/**
 * Текущий активный админ или null. Читает сессию через cookie-клиент, сверяет
 * с admin_users (RLS self-read) и подмешивает права роли из admin_roles.
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

  const { data: roleRow } = await supabase
    .from("admin_roles")
    .select("full_access, permissions")
    .eq("key", data.role)
    .maybeSingle();

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name ?? "",
    role: data.role as AdminRole,
    isActive: data.is_active,
    fullAccess: !!roleRow?.full_access,
    permissions: Array.isArray(roleRow?.permissions) ? (roleRow!.permissions as string[]) : [],
  };
}

/**
 * Гард для серверных компонентов/экшенов админки. Требует активного админа.
 * Доступ к конкретным разделам гейтит proxy по правам роли (permissions) —
 * он перехватывает любой /admin/*-запрос, включая POST серверных экшенов.
 * Поэтому здесь достаточно проверки аутентификации; full_access — суперадмин.
 * Параметр `roles` оставлен для обратной совместимости и игнорируется.
 */
export async function requireAdmin(roles?: AdminRole[]): Promise<AdminUser> {
  void roles;
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login?error=forbidden");
  return admin;
}

/** Может ли роль с такими правами видеть/открывать раздел по href. */
export function canAccessHref(
  fullAccess: boolean,
  permissions: string[],
  href: string
): boolean {
  if (fullAccess) return true;
  if (href === "/admin") return true; // дашборд доступен всем админам
  return permissions.some((p) => href === p || href.startsWith(p + "/"));
}
