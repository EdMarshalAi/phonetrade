"use server";

import { adminMutation } from "@/lib/admin/mutations";
import { getAdminUser } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const STAFF = ["admin", "manager"] as const;

/** Полное удаление клиента. Заказы/заявки остаются, но отвязываются (FK SET NULL). */
export async function deleteCustomer(id: string): Promise<{ error?: string }> {
  try {
    await adminMutation({
      roles: [...STAFF],
      action: "delete",
      entityType: "customer",
      entityId: id,
      revalidate: ["/admin/customers"],
      run: async (db) => {
        const { error } = await db.from("customers").delete().eq("id", id);
        if (error) throw error;
      },
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка удаления" };
  }
}

export type ExportScope = "all" | "registered" | "marketing";

type CustomerRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  user_id: string | null;
  total_orders: number | null;
  total_spent: number | null;
  segment: string | null;
  created_at: string;
};

const SEGMENT_LABEL: Record<string, string> = { new: "Новый", regular: "Постоянный", vip: "VIP" };

function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Экспорт клиентов в CSV. scope: все / только с личным кабинетом / только с
 * согласием на рассылку. Возвращает имя файла и содержимое (BOM для Excel).
 */
export async function exportCustomers(
  scope: ExportScope
): Promise<{ filename: string; csv: string; count: number } | { error: string }> {
  const admin = await getAdminUser();
  if (!admin) return { error: "Нет доступа" };

  const db = createSupabaseAdminClient();

  // Множество телефонов/клиентов с активным согласием на маркетинг.
  const marketingPhones = new Set<string>();
  const marketingCustomers = new Set<string>();
  {
    const { data } = await db
      .from("data_consents")
      .select("user_phone, customer_id")
      .eq("consent_type", "marketing")
      .is("revoked_at", null);
    for (const r of (data ?? []) as { user_phone: string | null; customer_id: string | null }[]) {
      if (r.user_phone) marketingPhones.add(r.user_phone.replace(/\D/g, "").slice(-10));
      if (r.customer_id) marketingCustomers.add(r.customer_id);
    }
  }

  let query = db.from("customers").select("id,name,phone,email,user_id,total_orders,total_spent,segment,created_at");
  if (scope === "registered") query = query.not("user_id", "is", null);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return { error: "Не удалось выгрузить клиентов" };

  let rows = (data ?? []) as CustomerRow[];
  const hasMarketing = (c: CustomerRow) =>
    marketingCustomers.has(c.id) || (!!c.phone && marketingPhones.has(c.phone.replace(/\D/g, "").slice(-10)));
  if (scope === "marketing") rows = rows.filter(hasMarketing);

  const header = ["Имя", "Телефон", "Email", "Личный кабинет", "Заказов", "Сумма, ₽", "Сегмент", "Согласие на рассылку", "Создан"];
  const lines = [header.map(csvCell).join(",")];
  for (const c of rows) {
    lines.push(
      [
        csvCell(c.name),
        csvCell(c.phone),
        csvCell(c.email),
        csvCell(c.user_id ? "да" : "нет"),
        csvCell(c.total_orders ?? 0),
        csvCell(c.total_spent ?? 0),
        csvCell(SEGMENT_LABEL[c.segment ?? ""] ?? c.segment ?? ""),
        csvCell(hasMarketing(c) ? "да" : "нет"),
        csvCell(new Date(c.created_at).toLocaleDateString("ru-RU")),
      ].join(",")
    );
  }

  const csv = "﻿" + lines.join("\r\n");
  const filename = `customers-${scope}-${new Date().toISOString().slice(0, 10)}.csv`;
  return { filename, csv, count: rows.length };
}
