"use server";

import { adminMutation } from "@/lib/admin/mutations";

const STAFF = ["admin"] as const;

export interface RoleInput {
  key: string;
  label: string;
  full_access: boolean;
  permissions: string[];
  is_system: boolean;
  sort: number;
}

/** Сохраняет (upsert) набор ролей. Удаление — отдельным экшеном. */
export async function saveRoles(roles: RoleInput[]): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "settings_change",
      entityType: "settings",
      entityId: "admin_roles",
      changes: { count: roles.length },
      revalidate: ["/admin"],
      run: async (db) => {
        const rows = roles.map((r, i) => ({
          key: r.key,
          label: r.label.trim() || r.key,
          full_access: !!r.full_access,
          permissions: r.full_access ? [] : r.permissions,
          is_system: !!r.is_system,
          sort: i,
        }));
        const { error } = await db.from("admin_roles").upsert(rows, { onConflict: "key" });
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сохранения ролей" };
  }
}

/** Удаляет роль. Нельзя удалить системную или назначенную пользователю. */
export async function deleteRole(key: string): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "delete",
      entityType: "settings",
      entityId: `role:${key}`,
      revalidate: ["/admin"],
      run: async (db) => {
        const { data: roleRow } = await db.from("admin_roles").select("is_system").eq("key", key).maybeSingle();
        if (roleRow?.is_system) throw new Error("Системную роль удалить нельзя");
        const { count } = await db
          .from("admin_users")
          .select("id", { count: "exact", head: true })
          .eq("role", key);
        if ((count ?? 0) > 0) throw new Error("Роль назначена сотрудникам — сначала смените её у них");
        const { error } = await db.from("admin_roles").delete().eq("key", key);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка удаления роли" };
  }
}
