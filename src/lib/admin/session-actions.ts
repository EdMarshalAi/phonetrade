"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/admin/auth";
import { writeAudit } from "@/lib/admin/audit";

/** Выход из админки: завершает сессию Supabase, пишет аудит, ведёт на логин. */
export async function signOutAction() {
  const admin = await getAdminUser();
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  if (admin) {
    await writeAudit({ userId: admin.id, action: "logout" });
  }
  redirect("/admin/login");
}
