import type { Metadata } from "next";
import { RepairShell } from "@/components/repair/RepairShell";
import { getStorefrontUser } from "@/lib/auth/server-user";
import { REPAIR_FAQ } from "@/lib/repair/faq";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://phonetrade31.ru").replace(/\/$/, "");
const OG_IMAGE = "https://giwehapapi.beget.app/storage/v1/object/public/product-images/content/store-belgorod.jpg";

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
    images: [{ url: OG_IMAGE, width: 1400, height: 1400, alt: "Ремонт техники Apple в Белгороде — PhoneTrade" }],
  },
};

// FAQPage — из того же источника, что видимый FAQ в RepairShell (соответствие обязательно).
const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: REPAIR_FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <RepairShell authed={!!user} initialName={user?.name ?? undefined} initialPhone={user?.phone ?? undefined} />
    </>
  );
}
