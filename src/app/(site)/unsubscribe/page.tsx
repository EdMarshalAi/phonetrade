import type { Metadata } from "next";
import { UnsubscribeClient } from "./UnsubscribeClient";

export const metadata: Metadata = {
  title: "Отписка от рассылок",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ c?: string; token?: string }> }) {
  const { c } = await searchParams;
  return (
    <div className="container-page py-12 sm:py-16">
      <div className="mx-auto w-full max-w-[460px] rounded-3xl border border-border/60 bg-white p-6 text-center shadow-[0_1px_3px_rgba(29,29,31,0.04)] sm:p-8">
        <UnsubscribeClient customerId={c ?? ""} />
      </div>
    </div>
  );
}
