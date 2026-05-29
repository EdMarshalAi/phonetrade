import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { HeroForm } from "../HeroForm";

export const metadata: Metadata = { title: "Новый слайд" };

export default function Page() {
  return (
    <>
      <PageHeader title="Новый слайд" description="Заголовок, изображение, кнопка и тема." />
      <HeroForm />
    </>
  );
}
