import { revalidatePath } from "next/cache";
import { pingIndexNow } from "@/lib/seo/indexnow";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, type AdminRole } from "@/lib/admin/auth";
import { writeAudit, type AuditAction } from "@/lib/admin/audit";

/**
 * Обёртка для серверных мутаций админки: проверяет роль, даёт service-role
 * клиент, пишет аудит и ревалидирует публичные пути. Любая ошибка БД
 * пробрасывается вызывающему (формы показывают её пользователю).
 */
export async function adminMutation<T>(opts: {
  roles?: AdminRole[];
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  changes?: unknown;
  /** Публичные пути для revalidatePath после успеха. */
  revalidate?: string[];
  run: (db: ReturnType<typeof createSupabaseAdminClient>) => Promise<T>;
}): Promise<T> {
  const admin = await requireAdmin(opts.roles);
  const db = createSupabaseAdminClient();
  const result = await opts.run(db);

  await writeAudit({
    userId: admin.id,
    action: opts.action,
    entityType: opts.entityType,
    entityId: opts.entityId ?? null,
    changes: opts.changes ?? null,
  });

  for (const path of opts.revalidate ?? []) {
    revalidatePath(path);
  }
  // Уведомляем IndexNow (Яндекс/Bing) об изменённых публичных URL — мгновенный переобход.
  void pingIndexNow(opts.revalidate ?? []);
  return result;
}

/** Серверная пагинация Supabase (range). Возвращает данные + total. */
export interface Page<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export function rangeFor(page: number, pageSize: number): [number, number] {
  const from = (page - 1) * pageSize;
  return [from, from + pageSize - 1];
}
