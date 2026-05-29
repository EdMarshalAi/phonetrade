/**
 * Заливает контент сайта (hero, преимущества, бренды, trade-in блок+шаги,
 * категории и посты блога, статические страницы, настройки магазина) в
 * Supabase, чтобы публичный сайт читал РЕАЛЬНЫЕ данные из БД, а не дефолты.
 * Идемпотентно (upsert по стабильным ключам). Запуск: npm run seed:content
 * Нужны в .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* optional */
  }
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY");
  const db = createClient(url, key, { auth: { persistSession: false } });

  const reqIns = async (table: string, rows: unknown[]) => {
    const { error } = await db.from(table).insert(rows as never);
    if (error) throw new Error(`${table}: ${error.message}`);
    console.log(`OK ${table}: +${rows.length}`);
  };
  const reqUpsert = async (table: string, rows: unknown[], onConflict: string) => {
    const { error } = await db.from(table).upsert(rows as never, { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
    console.log(`OK ${table}: ~${rows.length}`);
  };

  // ── Hero ────────────────────────────────────────────────────────────
  const hero = [
    { overline: "Новинка осени", title: "iPhone 17 Pro", description: "Титановый корпус, чип A19 Pro и переработанная камера. От 99 000 ₽ наличными.", button_text: "Узнать подробнее", button_link: "/category/iphone", image_url: "/categories/iphone-cutout.png?v=3", theme: "dark", sort_order: 0, is_published: true },
    { overline: "Свежая Mac-линейка", title: "MacBook Air M4", description: "Тонкий корпус, до 18 часов работы и чип M4 для всего, что задумали. От 134 000 ₽.", button_text: "Смотреть Mac", button_link: "/category/mac", image_url: "/categories/mac-cutout.png?v=3", theme: "light", sort_order: 1, is_published: true },
    { overline: "Trade-in без задержек", title: "Сдай старое — получи скидку", description: "Принимаем iPhone, iPad, Mac, Watch и AirPods. Оценка за 15 минут, сумма сразу учитывается в покупке.", button_text: "Узнать вашу скидку", button_link: "/trade-in", image_url: "/categories/accessories-cutout.png?v=3", theme: "dark", sort_order: 2, is_published: true },
    { overline: "iPad Pro M5", title: "Pro для всех", description: "ProMotion-дисплей, чип M5 и Magic Keyboard с floating-design. Подберём под ваши задачи.", button_text: "Смотреть iPad", button_link: "/category/ipad", image_url: "/categories/ipad-cutout.png?v=3", theme: "light", sort_order: 3, is_published: true },
  ];
  await db.from("hero_slides").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await reqIns("hero_slides", hero);

  // ── Преимущества ────────────────────────────────────────────────────
  const advantages = [
    { icon: "shield-check", title: "Только оригинал", description: "Каждое устройство проходит проверку. Серийный номер можно сверить с базой Apple прямо в магазине.", sort_order: 0, is_published: true },
    { icon: "wrench", title: "Свой сервис в Белгороде", description: "Диагностика и ремонт на месте — без отправки в другие города и долгого ожидания запчастей.", sort_order: 1, is_published: true },
    { icon: "arrow-right-left", title: "Trade-in без задержек", description: "Принимаем iPhone, iPad, Mac, Watch и AirPods. Сумма обмена сразу учитывается в покупке.", sort_order: 2, is_published: true },
    { icon: "messages-square", title: "Помощь без впаривания", description: "Подберём модель под ваши задачи и бюджет. Расскажем, на чём можно сэкономить.", sort_order: 3, is_published: true },
    { icon: "map-pin", title: "Удобно дойти", description: "Центр Белгорода — Универмаг Белгород, 1 этаж. Парковка, кафе и фитнес рядом.", sort_order: 4, is_published: true },
    { icon: "heart-handshake", title: "Поддержка после покупки", description: "Настроим Apple ID, перенесём данные, поможем по гарантии. Звоните или приходите.", sort_order: 5, is_published: true },
  ];
  await db.from("advantages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await reqIns("advantages", advantages);

  // ── Бренды ──────────────────────────────────────────────────────────
  const brands = ["Apple", "Samsung", "Dyson", "Dreame", "Bose", "Marshall", "Beats", "JBL", "B&W", "Garmin", "DJI", "Sony"].map((t, i) => ({
    slug: t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    title: t,
    logo_url: null,
    link_url: null,
    sort_order: i,
    is_published: true,
  }));
  await reqUpsert("brands", brands, "slug");

  // ── Trade-in блок + шаги ────────────────────────────────────────────
  await db.from("trade_in_block").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await reqIns("trade_in_block", [{ block_title: "Trade-in и выкуп старых устройств", block_description: "Сдайте старое устройство и получите выгоду при покупке новых моделей Apple. Принимаем iPhone, iPad, Mac, Watch и AirPods.", button_text: "Узнать вашу скидку", button_link: "/trade-in", image_url: null, is_published: true }]);
  await db.from("trade_in_steps").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await reqIns("trade_in_steps", [
    { step_number: 1, title: "Оценка устройства", description: "Принесите iPhone, iPad, Mac или Watch — проверим за 15 минут и назовём точную сумму.", icon: "search", sort_order: 0 },
    { step_number: 2, title: "Расчёт выгоды", description: "Сумма Trade-in вычитается прямо из стоимости новой модели — фиксируем цену в день обращения.", icon: "calculator", sort_order: 1 },
    { step_number: 3, title: "Новое устройство", description: "Подбираем модель из каталога, переносим данные и настраиваем Apple ID на месте.", icon: "smartphone", sort_order: 2 },
  ]);

  // ── Блог: категории + посты ─────────────────────────────────────────
  const blogCats = [
    { slug: "gadgets", title: "Гаджеты", color: "#6e6e73", sort_order: 0 },
    { slug: "iphone", title: "iPhone", color: "#1d1d1f", sort_order: 1 },
    { slug: "ipad", title: "iPad", color: "#1d1d1f", sort_order: 2 },
    { slug: "watch", title: "Apple Watch", color: "#1d1d1f", sort_order: 3 },
    { slug: "mac", title: "Mac", color: "#1d1d1f", sort_order: 4 },
  ];
  await reqUpsert("blog_categories", blogCats, "slug");
  const { data: catRows } = await db.from("blog_categories").select("id,slug");
  const catId = (slug: string) => catRows?.find((c) => c.slug === slug)?.id ?? null;

  const posts = [
    { slug: "iphone-17e-vs-17", title: "iPhone 17e vs iPhone 17: какой выбрать?", cat: "iphone", img: "https://picsum.photos/seed/iphone17e/1400/900", date: "2026-05-15" },
    { slug: "xreal-one-pro", title: "Обзор XREAL One Pro: очки, которые превращают смартфон в личный экран", cat: "gadgets", img: "https://picsum.photos/seed/xreal-glasses/1200/800", date: "2026-05-14" },
    { slug: "studio-display-2026", title: "Apple Studio Display и Studio Display XDR: какой выбрать в 2026", cat: "mac", img: "https://picsum.photos/seed/studio-display/1200/800", date: "2026-05-08" },
    { slug: "apple-watch-10-review", title: "Apple Watch Series 10: главные изменения и стоит ли обновляться", cat: "watch", img: "https://picsum.photos/seed/apple-watch-10/1200/800", date: "2026-05-03" },
    { slug: "ipad-air-m3", title: "iPad Air на M3: рабочая лошадка для творческих задач", cat: "ipad", img: "https://picsum.photos/seed/ipad-air-m3/1200/800", date: "2026-04-28" },
    { slug: "mac-mini-m4", title: "Mac mini M4 для дома: компактный сервер и медиацентр", cat: "mac", img: "https://picsum.photos/seed/mac-mini-m4/1200/800", date: "2026-04-21" },
  ].map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.title,
    content: `<p>${p.title}. Полный текст статьи скоро появится — отредактируйте его в админке (Контент → Блог).</p>`,
    cover_url: p.img,
    category_id: catId(p.cat),
    tags: [] as string[],
    status: "published",
    published_at: new Date(p.date).toISOString(),
  }));
  await reqUpsert("blog_posts", posts, "slug");

  // ── Статические страницы (закрывают 404 ссылки шапки/футера) ─────────
  const pages = [
    ["about", "О компании", "PhoneTrade — магазин оригинальной техники Apple в Белгороде. Универмаг Белгород, 1 этаж, ул. Попова, 36."],
    ["delivery", "Доставка", "Самовывоз из магазина бесплатно. Курьерская доставка по Белгороду и области. Сроки и стоимость уточняйте у менеджера."],
    ["warranty", "Гарантия", "На всю технику распространяется гарантия. Собственный сервисный центр в Белгороде — диагностика и ремонт на месте."],
    ["trade-in", "Trade-in", "Сдайте старое устройство Apple и получите скидку на новое. Оценка за 15 минут, сумма учитывается в покупке."],
    ["loyalty", "Постоянным клиентам", "Накопительная система скидок и бонусы для постоянных покупателей PhoneTrade."],
    ["contacts", "Контакты", "Белгород, ул. Попова, 36 (Универмаг Белгород, 1 этаж). Ежедневно 10:00–20:00."],
    ["service-rules", "Правила ремонтных работ", "Условия и порядок проведения ремонтных работ в сервисном центре PhoneTrade."],
    ["privacy", "Политика конфиденциальности", "Политика обработки персональных данных PhoneTrade."],
    ["consent", "Согласие на обработку ПД", "Согласие на обработку персональных данных."],
    ["offer", "Публичная оферта", "Публичная оферта о продаже товаров дистанционным способом."],
  ].map(([slug, title, content]) => ({ slug, title, content, status: "published", updated_at: new Date().toISOString() }));
  await reqUpsert("static_pages", pages, "slug");

  // ── Настройки магазина ──────────────────────────────────────────────
  await reqUpsert("shop_settings", [{
    key: "general",
    value: {
      name: "PhoneTrade",
      address: "Белгород, ул. Попова, 36 (Универмаг Белгород, 1 этаж)",
      working_hours: "Ежедневно 10:00–20:00",
      phone: "+7 (904) 098-88-77",
      email: "hello@phonetrade.ru",
      vk: "", whatsapp: "", telegram: "",
    },
  }], "key");

  console.log("Контент залит: hero, advantages, brands, trade-in, блог, страницы, настройки.");
}

main().catch((e) => {
  console.error("Ошибка seed-content:", e.message ?? e);
  process.exit(1);
});
