import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";

/**
 * Раздел «Обзор» убран — вход в админку ведёт на «Аналитику сайта»
 * (первый раздел сайдбара). requireAdmin гарантирует авторизацию.
 */
export default async function AdminIndexPage() {
  await requireAdmin(["admin", "manager", "content", "analytics"]);
  redirect("/admin/analytics/site");
}
