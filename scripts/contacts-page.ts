/**
 * Заливает фото магазина в Storage и обновляет страницу /contacts (static_pages):
 * фото компании + описание (текст со старого сайта). Запуск:
 *   npx tsx scripts/contacts-page.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const l of raw.split("\n")) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const BUCKET = "product-images";
const PHOTO_SRC = "/Users/admin/Downloads/hf_20260531_105038_56a68cbc-403c-41e1-987d-521b421e0fe8.png";
const PHOTO_PATH = "content/store-belgorod.png";

async function main() {
  loadEnv();
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const buf = readFileSync(PHOTO_SRC);
  const up = await db.storage
    .from(BUCKET)
    .upload(PHOTO_PATH, buf, { contentType: "image/png", upsert: true });
  if (up.error) throw up.error;
  const photoUrl = db.storage.from(BUCKET).getPublicUrl(PHOTO_PATH).data.publicUrl;
  console.log("Фото:", photoUrl);

  const content = `<figure>
<img src="${photoUrl}" alt="Магазин Phone Trade в Белгороде — ул. Попова, 36" />
<figcaption>Магазин Phone Trade — Белгород, ул. Попова, 36 (Универмаг «Белгород», 1 этаж)</figcaption>
</figure>
<h2>Айфоны и техника Apple в Белгороде</h2>
<p>Магазин Apple Phone Trade в Белгороде специализируется на продаже айфонов и техники Apple с официальной гарантией. У нас вы можете купить iPhone, iPad, MacBook, Apple Watch, AirPods и оригинальные аксессуары. Все устройства проходят проверку, имеют подтверждённую оригинальность и поддерживаются нашим собственным сервисным центром в Белгороде.</p>
<p>Благодаря прямым покупкам из других стран, обеспечивается низкая стоимость товаров, которая ниже среднерыночного уровня. Наши клиенты получают полный комплекс услуг, а постоянные покупатели могут рассчитывать на систему скидок (накопительную, участие в акциях и получение бонусов). Если покупка комплексная и единовременная, то посетители нашего магазина получают дополнительную скидку.</p>
<p>У нас работает отличная команда специалистов с большим опытом работы. Мы гарантируем:</p>
<ul>
<li>быструю диагностику устройств и ремонт;</li>
<li>доставку товаров по Белгороду и РФ;</li>
</ul>
<p>Наша успешная деятельность подтверждается положительными отзывами и рекомендациями. Семилетний опыт работы научил нас многому в сфере торговли и обслуживания населения. Но на достигнутом мы не останавливаемся и постоянно ищем пути для совершенствования.</p>
<p><strong>*Актуальную цену и наличие интересующей Вас модели уточняйте в сообщениях или по телефону.</strong></p>
<h2>Как нас найти</h2>
<p>Белгород, ул. Попова, 36 (Универмаг «Белгород», 1 этаж). Работаем ежедневно с 10:00 до 20:00.</p>`;

  const { error } = await db
    .from("static_pages")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("slug", "contacts");
  if (error) throw error;
  console.log("✓ /contacts обновлена —", content.length, "символов");
}

main().then(() => process.exit(0));
