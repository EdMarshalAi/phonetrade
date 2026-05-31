import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { HeroForm } from "../HeroForm";
import { loadHeroPickerData } from "../picker-data";

export const metadata: Metadata = { title: "Новый слайд" };

export default async function Page() {
  const { categories, products } = await loadHeroPickerData();
  return (
    <>
      <PageHeader title="Новый слайд" description="Заголовок, изображение, кнопка, фон и цвет текста." />
      <HeroForm categories={categories} products={products} />
    </>
  );
}
