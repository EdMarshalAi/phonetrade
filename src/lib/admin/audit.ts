import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "status_change"
  | "settings_change"
  | "bulk_update"
  | "export"
  | "import"
  | "invite_sent"
  | "invite_accepted"
  | "role_changed"
  | "login_failed";

export interface AuditEntry {
  userId: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string | null;
  changes?: unknown;
}

/**
 * Пишет запись в admin_audit_log через service-role (минуя RLS).
 * Никогда не бросает наружу — аудит не должен ронять основное действие.
 */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    const h = await headers();
    const ipRaw =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null;
    const admin = createSupabaseAdminClient();
    await admin.from("admin_audit_log").insert({
      user_id: entry.userId,
      action: entry.action,
      entity_type: entry.entityType ?? "",
      entity_id: entry.entityId ?? null,
      changes: entry.changes ?? null,
      ip_address: ipRaw,
      user_agent: h.get("user-agent"),
    });
  } catch (err) {
    console.error("[audit] не удалось записать запись аудита:", err);
  }
}
