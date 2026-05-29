import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import { PageHeader } from "@/components/admin/ui";
import { AdminButton } from "@/components/admin/form";
import { getProductOptions, getProductBadges, getProductBlocks } from "@/lib/content";
import { ProductSettingsForm } from "./ProductSettingsForm";

export const metadata: Metadata = { title: "Настройки товаров" };

export default async function ProductSettingsPage() {
  await requireAdmin(["admin", "manager", "content"]);
  const [optionDefs, badgeDefs, blockDefs] = await Promise.all([
    getProductOptions(),
    getProductBadges(),
    getProductBlocks(),
  ]);

  return (
    <>
      <PageHeader
        title="Настройки товаров"
        description="Опции-характеристики (значения для фильтров) и бейджи (цвета, подсказки)."
        actions={
          <Link href="/admin/catalog/products">
            <AdminButton variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> К товарам
            </AdminButton>
          </Link>
        }
      />
      <ProductSettingsForm initialOptions={optionDefs} initialBadges={badgeDefs} initialBlocks={blockDefs} />
    </>
  );
}
