import type { Metadata } from "next";
import { RepairShell } from "@/components/repair/RepairShell";
import { getStorefrontUser } from "@/lib/auth/server-user";

export const metadata: Metadata = {
  title: "Ремонт техники Apple в Белгороде — iPhone, iPad, Mac",
  description:
    "Сервисный центр PhoneTrade в Белгороде: ремонт iPhone, iPad и Mac в день обращения. Замена экрана, аккумулятора, стекла. Бесплатная диагностика, гарантия до 12 месяцев, оригинальные запчасти.",
  alternates: { canonical: "/repair" },
};

export default async function RepairPage() {
  const user = await getStorefrontUser();
  return (
    <RepairShell initialName={user?.name ?? undefined} initialPhone={user?.phone ?? undefined} />
  );
}
