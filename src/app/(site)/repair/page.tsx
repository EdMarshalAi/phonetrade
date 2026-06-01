import type { Metadata } from "next";
import { RepairShell } from "@/components/repair/RepairShell";
import { getStorefrontUser } from "@/lib/auth/server-user";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Ремонт техники Apple в Белгороде — iPhone, iPad, Mac, Apple Watch",
  description:
    "Ремонт iPhone, iPad, Mac, Apple Watch и AirPods в Белгороде в день обращения. Замена экрана, стекла, аккумулятора, разъёма зарядки, ремонт после воды. Оригинальные запчасти, гарантия до 12 месяцев. Узнайте стоимость ремонта за минуту.",
  alternates: { canonical: "/repair" },
  openGraph: {
    title: "Ремонт техники Apple в Белгороде — PhoneTrade",
    description: "Ремонт iPhone, iPad, Mac, Apple Watch и AirPods в день обращения. Оригинальные запчасти, гарантия до 12 месяцев.",
    url: `${SITE}/repair`,
    type: "website",
  },
};

// Service-разметка для локального SEO (без цен) — помогает по «ремонт iphone белгород».
const serviceLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Ремонт техники Apple",
  name: "Ремонт iPhone, iPad, Mac, Apple Watch и AirPods в Белгороде",
  description:
    "Сервисный центр PhoneTrade: замена экрана, стекла, аккумулятора, разъёма зарядки, камеры, ремонт после попадания влаги. Оригинальные запчасти, гарантия до 12 месяцев, ремонт в день обращения.",
  areaServed: { "@type": "City", name: "Белгород" },
  provider: {
    "@type": "LocalBusiness",
    name: "PhoneTrade",
    "@id": `${SITE}/#organization`,
    url: SITE,
    telephone: "+79040988877",
    address: {
      "@type": "PostalAddress",
      streetAddress: "ул. Попова, 36",
      addressLocality: "Белгород",
      addressRegion: "Белгородская область",
      postalCode: "308000",
      addressCountry: "RU",
    },
  },
};

export default async function RepairPage() {
  const user = await getStorefrontUser();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }} />
      <RepairShell authed={!!user} initialName={user?.name ?? undefined} initialPhone={user?.phone ?? undefined} />
    </>
  );
}
