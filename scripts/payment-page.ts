/**
 * Создаёт страницу /payment (static_pages): способы оплаты + рассрочка Т-Банк.
 * Заливает иллюстрацию и логотип Т-Банк в Storage. Запуск:
 *   npx tsx scripts/payment-page.ts
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function up(db: any, src: string, path: string, ct: string) {
  const buf = readFileSync(src);
  const r = await db.storage.from(BUCKET).upload(path, buf, { contentType: ct, upsert: true });
  if (r.error) throw r.error;
  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function main() {
  loadEnv();
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const frame = await up(db, "/Users/admin/Downloads/frame_12342889.png", "content/installment.png", "image/png");
  const logo = await up(db, "/Users/admin/Downloads/t_bank_logo_yellow_left_rus.svg", "content/t-bank.svg", "image/svg+xml");
  console.log("frame:", frame);
  console.log("logo:", logo);

  const officeLi = `<li>В нашем офисе продаж в г. Белгород, ул. Попова, 36 (Универмаг «Белгород», 1 этаж)</li>
<li>При доставке товаров/оказании услуг.</li>`;

  const content = `<p>Оплатить покупку в PhoneTrade можно наличными, банковской картой или оформить рассрочку от Т-Банк — выберите удобный способ при оформлении заказа.</p>
<h2>Наличный расчёт</h2>
<p>Вы отдаёте деньги при получении товаров/оказании услуг и вместе с заказом получаете все необходимые документы и кассовый чек.</p>
<p>Оплатить наличными Вы можете:</p>
<ul>
${officeLi}
</ul>
<h2>Банковской картой</h2>
<p>Мы используем платёжный шлюз ПАО «Сбербанк России» и принимаем к оплате карты: VISA, MasterCard и МИР.</p>
<p>Оплатить банковской картой Вы можете:</p>
<ul>
${officeLi}
</ul>
<h2>Рассрочка от Т-Банк</h2>
<p><img src="${logo}" alt="Т-Банк" style="width:160px;height:auto;margin:0 0 8px" /></p>
<div style="display:flex;gap:40px;align-items:center;flex-wrap:wrap">
<div style="flex:1 1 320px">
<ul>
<li>За 2 минуты</li>
<li>От 3 до 36 месяцев</li>
<li>Сумма покупки от 3000 до 200 000 руб.</li>
<li>Достаточно только паспорта</li>
<li>Подписание с помощью СМС</li>
</ul>
</div>
<div style="flex:0 1 360px;max-width:360px">
<img src="${frame}" alt="Рассрочка 0-0-0 от Т-Банк" style="width:100%;height:auto;margin:0" />
</div>
</div>
<p style="font-size:0.85em;color:#6e6e73">0+ Рассрочка предоставляется АО «Т-Банк», лицензия №2673.</p>`;

  const row = {
    slug: "payment",
    title: "Оплата",
    content,
    status: "published",
    meta_title: "Оплата и рассрочка — PhoneTrade Белгород",
    meta_description:
      "Способы оплаты в PhoneTrade: наличными, банковской картой (VISA, MasterCard, МИР) и рассрочка от Т-Банк до 36 месяцев. Купить технику Apple в Белгороде на удобных условиях.",
    updated_at: new Date().toISOString(),
  };

  const { error } = await db.from("static_pages").upsert(row, { onConflict: "slug" });
  if (error) throw error;
  console.log("✓ /payment создана —", content.length, "символов");
}

main().then(() => process.exit(0));
