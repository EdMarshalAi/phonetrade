import * as React from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { getStorefrontUser } from "@/lib/auth/server-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Вход и регистрация",
  description:
    "Войдите или зарегистрируйтесь в PhoneTrade, чтобы следить за заказами и копить бонусы.",
};

export default async function LoginPage() {
  const initialUser = await getStorefrontUser();
  return (
    <React.Suspense fallback={null}>
      <AuthShell initialUser={initialUser} />
    </React.Suspense>
  );
}
