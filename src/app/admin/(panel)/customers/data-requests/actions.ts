"use server";

import { adminMutation } from "@/lib/admin/mutations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin/auth";
import { DSR_STATUS } from "@/lib/legal/dsr";

const STAFF = ["admin", "manager"] as const;

export async function setDataRequestStatus(
  id: string,
  status: string,
  response?: string
): Promise<{ error?: string }> {
  if (!(status in DSR_STATUS)) return { error: "Неизвестный статус" };
  const admin = await getAdminUser();
  const done = status === "done" || status === "rejected";
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "status_change",
      entityType: "data_subject_request",
      entityId: id,
      changes: { status, response: response || null },
      run: async (d) => {
        const { error } = await d
          .from("data_subject_requests")
          .update({
            status,
            response_text: response?.trim() || null,
            handled_by: admin?.id ?? null,
            completed_at: done ? new Date().toISOString() : null,
          })
          .eq("id", id);
        if (error) throw error;
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка" };
  }
  return {};
}
