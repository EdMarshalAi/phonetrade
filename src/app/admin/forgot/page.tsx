import type { Metadata } from "next";
import { RequestResetForm } from "@/components/auth/PasswordResetForms";

export const metadata: Metadata = {
  title: "Восстановление пароля",
  robots: { index: false, follow: false },
};

export default function AdminForgotPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-[380px]">
        <div className="mb-7 text-center">
          <p className="text-[20px] font-semibold tracking-tight text-ink">PhoneTrade</p>
          <p className="mt-1 text-[12px] uppercase tracking-[0.18em] text-ink-subtle">Панель управления</p>
        </div>
        <div className="rounded-md border border-border/70 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-7">
          <h1 className="mb-1 text-[17px] font-semibold tracking-tight text-ink">Восстановление пароля</h1>
          <p className="mb-5 text-[13px] text-ink-muted">Укажите e-mail администратора — отправим ссылку для смены пароля.</p>
          <RequestResetForm audience="admin" loginHref="/admin/login" />
        </div>
      </div>
    </div>
  );
}
