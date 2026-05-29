import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { CategoryForm } from "../CategoryForm";

export const metadata: Metadata = { title: "Новая категория блога" };

export default function Page() {
  return (
    <>
      <PageHeader title="Новая категория блога" />
      <CategoryForm />
    </>
  );
}
