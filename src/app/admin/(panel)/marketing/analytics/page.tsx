import { redirect } from "next/navigation";

// Аналитика сведена в «Обзор» — отдельный раздел не дублируем.
export default function AnalyticsRedirect() {
  redirect("/admin/marketing/overview");
}
