import type { Metadata } from "next";
import { RequestResetForm } from "@/components/auth/PasswordResetForms";

export const metadata: Metadata = {
  title: "Восстановление пароля",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="container-page py-12 sm:py-16">
      <div className="mx-auto w-full max-w-[420px] rounded-3xl border border-border/60 bg-white p-6 shadow-[0_1px_3px_rgba(29,29,31,0.04)] sm:p-8">
        <h1 className="text-[19px] font-semibold tracking-tight text-ink">Восстановление пароля</h1>
        <p className="mb-5 mt-1 text-[13.5px] leading-relaxed text-ink-muted">
          Укажите e-mail, который вы привязали к аккаунту — отправим ссылку для смены пароля.
        </p>
        <RequestResetForm audience="storefront" loginHref="/auth/login" />
      </div>
    </div>
  );
}
