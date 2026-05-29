"use server";

import { adminMutation } from "@/lib/admin/mutations";

const STAFF = ["admin", "manager"] as const;

const STATUSES = ["new", "in_progress", "converted", "rejected"] as const;
type LeadStatus = (typeof STATUSES)[number];

export async function setLeadStatus(id: string, status: string): Promise<{ error?: string }> {
  if (!STATUSES.includes(status as LeadStatus)) return { error: "Неизвестный статус" };
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "status_change",
      entityType: "lead",
      entityId: id,
      changes: { status },
      run: async (db) => {
        const { error } = await db.from("leads").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка" };
  }
}

export async function updateLeadNotes(id: string, notes: string): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "update",
      entityType: "lead",
      entityId: id,
      run: async (db) => {
        const { error } = await db.from("leads").update({ notes: notes || null, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка" };
  }
}

export async function deleteLead(id: string): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "delete",
      entityType: "lead",
      entityId: id,
      run: async (db) => {
        const { error } = await db.from("leads").delete().eq("id", id);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка" };
  }
}
