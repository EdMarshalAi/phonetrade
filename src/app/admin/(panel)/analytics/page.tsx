import { redirect } from "next/navigation";

/** /admin/analytics → разделено на «сайт» и «заказы» (spec v3 §3.2). */
export default function AnalyticsIndex() {
  redirect("/admin/analytics/orders");
}
