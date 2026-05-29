import * as React from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Вход и регистрация",
  description:
    "Войдите или зарегистрируйтесь в PhoneTrade, чтобы следить за заказами и копить бонусы.",
};

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <AuthShell />
    </React.Suspense>
  );
}
