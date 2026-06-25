/**
 * SEO-добор по «слепым зонам» Яндекса (Белгород, аудит 25.06.2026).
 * По данным Вебмастера сайт не виден по ряду коммерческих запросов, хотя товары есть.
 * Скрипт: (1) публикует 5 статей блога под кластеры-гэпы (PlayStation, Dyson,
 * Samsung Galaxy, «сколько стоит iPhone 17», iMac/Mac mini), (2) дополняет
 * meta_title/meta_description/seo_text невидимых категорий недостающими
 * формулировками запросов. Локальный SEO Белгород, конкурентов не упоминаем.
 * Идемпотентно (upsert по slug). Запуск: npx tsx scripts/seo-gap-content-2026-06-25.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const CAT = {
  iphone: "bfb9f86f-0d4d-4f11-b4da-9bd850a33175",
  ipad: "ecbf09b9-7653-4c09-a7cd-ad6930e56748",
  watch: "46b480d1-8906-4cbb-8614-695965a355a0",
  mac: "84b12ad4-55ae-44c0-bb4e-658c707bebda",
  gadgets: "35248ff0-7831-4151-bbf3-0cee10b11d86",
};

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const l of raw.split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
}

type Post = {
  slug: string; title: string; excerpt: string; content: string;
  meta_title: string; meta_description: string; category_id: string;
  tags: string[]; coverFromCategory?: string; // slug категории товара для обложки
};

const POSTS: Post[] = [
  {
    slug: "playstation-5-belgorod",
    title: "PlayStation 5 в Белгороде: купить приставку, цены и комплектация",
    excerpt: "Где купить PlayStation 5 в Белгороде: версии Slim и с дисководом, геймпады DualSense, гарантия, доставка и самовывоз.",
    meta_title: "PlayStation 5 купить в Белгороде — цены, гарантия",
    meta_description: "Купить игровую приставку PlayStation 5 в Белгороде: PS5 Slim, версия с дисководом, геймпады DualSense. Гарантия, доставка по городу, самовывоз.",
    category_id: CAT.gadgets,
    tags: ["PlayStation 5", "игровые приставки", "Белгород"],
    coverFromCategory: "gaming-consoles",
    content: `<!--tldr--><p><strong>Кратко:</strong> В Белгороде можно купить PlayStation 5 в версии Slim и с дисководом, а также геймпады DualSense. Все приставки — с гарантией, доставкой по городу и самовывозом. В этом гайде разберём, какую версию PS5 выбрать и на что смотреть при покупке.</p>
<p>Если вы ищете, где купить <strong>PlayStation 5 в Белгороде</strong>, важно не просто найти приставку в наличии, а взять оригинальную консоль с гарантией. Разберём актуальные версии PS5, отличия и комплектацию, чтобы вы выбрали приставку под свои задачи.</p>
<h2>Какие версии PlayStation 5 есть</h2>
<p>Сейчас актуальна линейка PS5 Slim — компактнее и легче первых ревизий. Есть два варианта:</p>
<ul>
<li><strong>PS5 Slim с дисководом</strong> — играет с физических Blu-ray дисков и из цифрового магазина. Подходит, если у вас есть коллекция дисков или хотите перепродавать игры.</li>
<li><strong>PS5 Slim Digital</strong> — без дисковода, только цифровые игры. Дешевле, но игры — только из PS Store.</li>
</ul>
<p>К любой версии можно докупить дополнительный геймпад <strong>DualSense</strong> — для игры вдвоём. В нашем каталоге есть DualSense в разных цветах (White, Midnight Black и др.).</p>
<h2>На что смотреть при покупке приставки в Белгороде</h2>
<ul>
<li><strong>Оригинал и гарантия.</strong> Берите консоль с гарантией и чеком — это защита от брака.</li>
<li><strong>Регион и язык.</strong> Интерфейс PS5 русифицирован, аккаунт PS Store создаётся бесплатно.</li>
<li><strong>Комплект.</strong> В коробке — приставка, один геймпад DualSense, кабели HDMI и питания.</li>
<li><strong>Память.</strong> Встроенного SSD хватает на несколько крупных игр; при активной библиотеке стоит задуматься о расширении.</li>
</ul>
<h2>Доставка и самовывоз в Белгороде</h2>
<p>Приставку можно забрать самовывозом в Белгороде (Универмаг Белгород, ул. Попова, 36) или заказать доставку по городу. Оплата — наличными или картой при получении, доступна рассрочка.</p>
<h2>Частые вопросы</h2>
<p><strong>Какую PS5 выбрать — с дисководом или Digital?</strong> Если важны диски и перепродажа игр — берите версию с дисководом. Для чисто цифровых покупок выгоднее Digital.</p>
<p><strong>Идёт ли геймпад в комплекте?</strong> Да, один DualSense входит в комплект. Второй — докупается отдельно.</p>
<p><strong>Есть ли гарантия?</strong> Да, все приставки продаются с гарантией.</p>
<p>Посмотреть актуальные цены и наличие — в разделе <a href="/category/gaming-consoles">игровые приставки</a>. Остались вопросы по PlayStation 5 — звоните или пишите, поможем подобрать.</p>`,
  },
  {
    slug: "dyson-belgorod-stajler-fen-vypryamitel",
    title: "Dyson в Белгороде: стайлер Airwrap, фен и выпрямитель Airstrait",
    excerpt: "Где купить технику Dyson в Белгороде: стайлеры Airwrap, фены Supersonic и выпрямители Airstrait. Оригинал, гарантия, доставка.",
    meta_title: "Dyson купить в Белгороде — стайлер, фен, выпрямитель",
    meta_description: "Купить Dyson в Белгороде: стайлер Airwrap, фен Supersonic, выпрямитель Airstrait. Оригинальная техника с гарантией, доставка по городу и самовывоз.",
    category_id: CAT.gadgets,
    tags: ["Dyson", "стайлер", "фен", "Белгород"],
    coverFromCategory: "dyson-stylers",
    content: `<!--tldr--><p><strong>Кратко:</strong> В Белгороде можно купить оригинальную технику Dyson — мультистайлеры Airwrap, фены Supersonic и выпрямители Airstrait. Разберём, чем отличаются устройства и как выбрать Dyson под свой тип волос.</p>
<p>Техника Dyson для волос давно стала эталоном: бережная укладка без экстремального нагрева и продуманная инженерия. Если вы ищете, где купить <strong>Dyson в Белгороде</strong> — стайлер, фен или выпрямитель — рассказываем, чем они отличаются.</p>
<h2>Стайлер Dyson Airwrap</h2>
<p><strong>Стайлер Dyson Airwrap</strong> — мультиукладчик: завивает, выпрямляет и сушит волосы за счёт эффекта Коанда, без раскалённых пластин. Подходит для локонов и объёма. В каталоге есть Airwrap в разных цветах (Nickel/Copper, Blue/Blush, Ceramic Pink и др.).</p>
<h2>Фен Dyson Supersonic</h2>
<p><strong>Фен Dyson Supersonic</strong> — мощный поток воздуха с контролем температуры, быстро сушит и не перегревает волосы. Компактный мотор в рукоятке делает фен лёгким и сбалансированным.</p>
<h2>Выпрямитель Dyson Airstrait</h2>
<p><strong>Выпрямитель Dyson Airstrait</strong> — выпрямляет волосы потоком воздуха, без горячих пластин. Можно укладывать даже влажные волосы, что бережнее классических утюжков.</p>
<h2>Как выбрать Dyson</h2>
<ul>
<li><strong>Нужна универсальность и локоны</strong> — берите стайлер Airwrap.</li>
<li><strong>Главное — быстрая сушка</strong> — фен Supersonic.</li>
<li><strong>Нужно гладкое выпрямление без вреда</strong> — выпрямитель Airstrait.</li>
<li>Проверяйте оригинальность и гарантию — техника Dyson дорогая, подделок много.</li>
</ul>
<h2>Доставка и самовывоз в Белгороде</h2>
<p>Технику Dyson можно забрать самовывозом в Белгороде (ул. Попова, 36) или заказать доставку по городу. Оплата картой или наличными, доступна рассрочка.</p>
<h2>Частые вопросы</h2>
<p><strong>Чем стайлер отличается от фена?</strong> Стайлер Airwrap укладывает и завивает, фен Supersonic — сушит. Выпрямитель Airstrait — выпрямляет.</p>
<p><strong>Это оригинал?</strong> Да, мы продаём оригинальную технику Dyson с гарантией.</p>
<p>Смотрите актуальные модели и цены в разделе <a href="/category/dyson">Dyson</a>.</p>`,
  },
  {
    slug: "samsung-galaxy-belgorod",
    title: "Samsung Galaxy в Белгороде: купить смартфон S25 и S26 Ultra",
    excerpt: "Где купить смартфон Samsung Galaxy в Белгороде: серии S25, S25 Ultra и S26 Ultra. Гарантия, доставка по городу, рассрочка и Trade-in.",
    meta_title: "Samsung Galaxy купить в Белгороде — S25, S26 Ultra",
    meta_description: "Купить смартфон Samsung Galaxy в Белгороде: S25, S25 Ultra, S26 Ultra. Оригинал с гарантией, доставка по городу, самовывоз, рассрочка и Trade-in.",
    category_id: CAT.gadgets,
    tags: ["Samsung Galaxy", "смартфоны", "Белгород"],
    coverFromCategory: "samsung-galaxy-s25-ultra",
    content: `<!--tldr--><p><strong>Кратко:</strong> В Белгороде можно купить флагманские смартфоны Samsung Galaxy — серии S25, S25 Ultra и S26 Ultra. Все аппараты оригинальные, с гарантией, доставкой и рассрочкой. Разберём, чем отличаются модели.</p>
<p>Samsung Galaxy — главная альтернатива iPhone на Android: большие яркие экраны, мощные камеры и стилус S Pen в Ultra-версиях. Если ищете, где купить <strong>смартфон Samsung Galaxy в Белгороде</strong>, рассказываем про актуальные модели.</p>
<h2>Какие Samsung Galaxy есть</h2>
<ul>
<li><strong>Galaxy S25</strong> — компактный флагман: мощный чип, отличная камера, удобный размер.</li>
<li><strong>Galaxy S25 Ultra</strong> — максимум: большой экран, перо S Pen, продвинутая камера с зумом.</li>
<li><strong>Galaxy S26 Ultra</strong> — новейшее поколение Ultra с улучшениями по камере и автономности.</li>
</ul>
<h2>Samsung Galaxy или iPhone</h2>
<p>Galaxy выбирают за гибкость Android, S Pen и мощный зум камеры. iPhone — за экосистему Apple и стабильность. Если вы внутри экосистемы Apple, переход потребует привыкания; если цените свободу настроек — Galaxy будет ближе.</p>
<h2>На что смотреть при покупке</h2>
<ul>
<li><strong>Оригинал и гарантия</strong> — берите аппарат с гарантией и чеком.</li>
<li><strong>Память и версия</strong> — Ultra-модели доступны в разных объёмах хранилища.</li>
<li><strong>Trade-in</strong> — старый смартфон можно сдать в зачёт и доплатить.</li>
</ul>
<h2>Доставка и самовывоз в Белгороде</h2>
<p>Смартфон Samsung можно забрать самовывозом в Белгороде (ул. Попова, 36) или заказать доставку по городу. Доступны рассрочка и Trade-in.</p>
<h2>Частые вопросы</h2>
<p><strong>Какой Samsung Galaxy выбрать?</strong> Нужен компактный флагман — S25. Нужен максимум и S Pen — S25 Ultra или новый S26 Ultra.</p>
<p><strong>Можно сдать старый телефон?</strong> Да, по Trade-in — оценим и зачтём в стоимость.</p>
<p>Актуальные модели и цены — в разделе <a href="/category/samsung">смартфоны Samsung</a>.</p>`,
  },
  {
    slug: "skolko-stoit-iphone-17-belgorod",
    title: "Сколько стоит iPhone 17 в Белгороде: цена, версии памяти, цвета",
    excerpt: "Сколько стоит iPhone 17 в Белгороде: от чего зависит цена, какие версии памяти и цвета, способы оплаты — наличные, карта, рассрочка, Trade-in.",
    meta_title: "Сколько стоит iPhone 17 в Белгороде — цена 2026",
    meta_description: "Сколько стоит iPhone 17 в Белгороде: цена зависит от памяти и цвета. Наличные, карта, рассрочка и Trade-in. Оригинал с гарантией, доставка, самовывоз.",
    category_id: CAT.iphone,
    tags: ["iPhone 17", "цена", "Белгород"],
    coverFromCategory: "iphone-17",
    content: `<!--tldr--><p><strong>Кратко:</strong> Цена iPhone 17 в Белгороде зависит от объёма памяти и цвета. Доступны оплата наличными (выгоднее всего), картой, рассрочка и Trade-in. Все iPhone — оригинальные, с гарантией. Ниже — от чего складывается стоимость.</p>
<p>Вопрос «<strong>сколько стоит iPhone 17</strong>» — первый при покупке. Цена не фиксированная: она зависит от конфигурации и способа оплаты. Разберём, на что обращать внимание, чтобы купить iPhone 17 в Белгороде по понятной цене.</p>
<h2>От чего зависит цена iPhone 17</h2>
<ul>
<li><strong>Объём памяти.</strong> Чем больше встроенной памяти (256, 512 ГБ), тем выше цена. Память нельзя расширить, поэтому выбирайте с запасом.</li>
<li><strong>Цвет.</strong> Некоторые цвета популярнее и могут отличаться в цене и наличии.</li>
<li><strong>Способ оплаты.</strong> Цена за наличные обычно выгоднее, чем по карте; для рассрочки сумма распределяется на месяцы.</li>
</ul>
<h2>Какую память iPhone 17 брать</h2>
<p>Для большинства пользователей оптимальны 256 ГБ — хватает на фото, видео и приложения на несколько лет. 512 ГБ берут те, кто снимает много 4K-видео или хранит большую медиатеку.</p>
<h2>Способы оплаты и экономия</h2>
<ul>
<li><strong>Наличные</strong> — самая выгодная цена.</li>
<li><strong>Карта</strong> — удобно, цена чуть выше.</li>
<li><strong>Рассрочка</strong> — платёж разбивается на 6/12/24 месяца.</li>
<li><strong>Trade-in</strong> — сдайте старый iPhone и уменьшите итоговую стоимость.</li>
</ul>
<h2>Где купить iPhone 17 в Белгороде</h2>
<p>Забрать iPhone 17 можно самовывозом в Белгороде (Универмаг Белгород, ул. Попова, 36) или заказать доставку по городу. Все аппараты оригинальные, проверяются по серийному номеру, с гарантией.</p>
<h2>Частые вопросы</h2>
<p><strong>Сколько стоит iPhone 17?</strong> Зависит от памяти и цвета — актуальную цену смотрите в каталоге, она всегда обновлена.</p>
<p><strong>Можно ли в рассрочку?</strong> Да, доступна рассрочка на 6, 12 и 24 месяца.</p>
<p><strong>Как сэкономить?</strong> Платите наличными и используйте Trade-in старого телефона.</p>
<p>Актуальные цены iPhone 17 — в разделе <a href="/category/iphone-17">iPhone 17</a>. Про Trade-in читайте на странице <a href="/trade-in">Trade-in</a>.</p>`,
  },
  {
    slug: "imac-mac-mini-belgorod",
    title: "iMac и Mac mini в Белгороде: какой настольный Mac выбрать",
    excerpt: "iMac или Mac mini в Белгороде: чем отличаются настольные компьютеры Apple, кому какой подойдёт и как заказать Mac с гарантией.",
    meta_title: "iMac и Mac mini в Белгороде — какой Mac выбрать",
    meta_description: "iMac или Mac mini в Белгороде: чем отличаются настольные компьютеры Apple, кому какой подойдёт. Оригинал с гарантией, заказ, доставка и самовывоз.",
    category_id: CAT.mac,
    tags: ["iMac", "Mac mini", "Mac", "Белгород"],
    coverFromCategory: "mac",
    content: `<!--tldr--><p><strong>Кратко:</strong> iMac — моноблок «всё в одном» с большим экраном, Mac mini — компактный системный блок под ваш монитор. Оба работают на чипах Apple. Разберём, кому какой настольный Mac подойдёт, и как заказать его в Белгороде.</p>
<p>Когда нужен настольный компьютер Apple, выбор обычно между двумя моделями: <strong>iMac</strong> и <strong>Mac mini</strong>. Оба — на фирменных чипах Apple, тихие и быстрые, но решают разные задачи. Если планируете купить настольный Mac в Белгороде, этот гайд поможет определиться.</p>
<h2>iMac — моноблок «всё в одном»</h2>
<p><strong>iMac</strong> — это компьютер и экран в одном тонком корпусе. Не нужно докупать монитор, клавиатуру и мышь — всё в комплекте и в едином стиле. Подходит для дома и офиса, где важны красивый дисплей и минимум проводов.</p>
<h2>Mac mini — компактный и гибкий</h2>
<p><strong>Mac mini</strong> — маленький системный блок, к которому вы подключаете свой монитор, клавиатуру и мышь. Выгоден, если монитор уже есть или нужен мощный, но незаметный компьютер на рабочем столе.</p>
<h2>iMac или Mac mini — что выбрать</h2>
<ul>
<li><strong>Нужен готовый комплект с экраном</strong> — берите iMac.</li>
<li><strong>Уже есть монитор / хотите сэкономить</strong> — Mac mini.</li>
<li><strong>Важна мобильность</strong> — тогда стоит смотреть в сторону MacBook, а не настольного Mac.</li>
</ul>
<h2>Как купить настольный Mac в Белгороде</h2>
<p>iMac и Mac mini доступны под заказ — поможем подобрать конфигурацию (чип, память, накопитель) под ваши задачи. Все компьютеры Apple оригинальные, с гарантией, с самовывозом в Белгороде (ул. Попова, 36) или доставкой.</p>
<h2>Частые вопросы</h2>
<p><strong>Чем iMac отличается от Mac mini?</strong> iMac — со встроенным экраном, Mac mini — отдельный блок под ваш монитор.</p>
<p><strong>Какой Mac выбрать для работы дома?</strong> Для универсального рабочего места удобнее iMac; если монитор есть — Mac mini.</p>
<p><strong>Можно ли заказать конкретную конфигурацию?</strong> Да, подберём по чипу и памяти — напишите нам.</p>
<p>Смотрите ноутбуки и компьютеры Apple в разделе <a href="/category/mac">Mac</a>. Если нужен ноутбук, читайте гайд <a href="/blog/macbook-air-ili-pro-belgorod">MacBook Air или Pro</a>.</p>`,
  },
];

// Мета-оптимизация невидимых категорий: дополняем формулировки запросов.
const CATEGORY_META: { slug: string; meta_title: string; meta_description: string; seo_append?: string }[] = [
  {
    slug: "gaming-consoles",
    meta_title: "Игровые приставки и PlayStation 5 в Белгороде",
    meta_description: "Купить игровую приставку PlayStation 5 в Белгороде: PS5 Slim, версия с дисководом, геймпады DualSense. Гарантия, доставка по городу, самовывоз.",
    seo_append: "<p>В нашем магазине в Белгороде можно купить игровую приставку PlayStation 5: версии PS5 Slim и с дисководом, а также геймпады DualSense. Все приставки оригинальные, с гарантией, доступны доставка по городу и самовывоз.</p>",
  },
  {
    slug: "samsung",
    meta_title: "Смартфоны Samsung Galaxy в Белгороде — купить",
    meta_description: "Купить смартфон Samsung Galaxy в Белгороде: серии S25, S25 Ultra и S26 Ultra. Оригинал с гарантией, доставка, самовывоз, рассрочка и Trade-in.",
    seo_append: "<p>Купить смартфон Samsung Galaxy в Белгороде — серии Galaxy S25, S25 Ultra и S26 Ultra. Оригинальные аппараты с гарантией, доставка по городу, самовывоз, рассрочка и Trade-in.</p>",
  },
  {
    slug: "airpods",
    meta_title: "Наушники Apple AirPods в Белгороде — купить",
    meta_description: "Купить наушники Apple AirPods в Белгороде: AirPods Pro, AirPods 4, AirPods Max. Оригинал с гарантией, доставка по городу и самовывоз.",
    seo_append: "<p>Наушники Apple AirPods в Белгороде: AirPods Pro, AirPods 4 и AirPods Max. Оригинальные наушники для айфона с гарантией, доставка по городу и самовывоз.</p>",
  },
  {
    slug: "mac",
    meta_title: "Ноутбуки и компьютеры Apple Mac в Белгороде",
    meta_description: "Купить ноутбук Apple в Белгороде: MacBook Air и Pro, а также настольные iMac и Mac mini под заказ. Оригинал с гарантией, доставка и самовывоз.",
    seo_append: "<p>Ноутбуки и компьютеры Apple в Белгороде: MacBook Air и MacBook Pro, настольные iMac и Mac mini под заказ. Оригинальная техника Apple с гарантией, доставка по городу и самовывоз.</p>",
  },
  {
    slug: "watch",
    meta_title: "Смарт-часы Apple Watch в Белгороде — купить",
    meta_description: "Купить смарт-часы Apple Watch в Белгороде: Series, SE и Ultra. Оригинал с гарантией, доставка по городу, самовывоз, рассрочка и Trade-in.",
    seo_append: "<p>Смарт-часы Apple Watch в Белгороде: модели Series, SE и Ultra. Оригинальные умные часы Apple с гарантией, доставка по городу и самовывоз.</p>",
  },
  {
    slug: "dyson",
    meta_title: "Техника Dyson в Белгороде — стайлер, фен, выпрямитель",
    meta_description: "Купить Dyson в Белгороде: стайлер Airwrap, фен Supersonic, выпрямитель Airstrait. Оригинальная техника с гарантией, доставка и самовывоз.",
    seo_append: "<p>Техника Dyson в Белгороде: стайлеры Airwrap, фены Supersonic и выпрямители Airstrait. Оригинальные устройства с гарантией, доставка по городу и самовывоз.</p>",
  },
];

async function coverFor(db: SupabaseClient, categorySlug: string | undefined): Promise<string | null> {
  if (!categorySlug) return null;
  const { data } = await db.from("products").select("image").eq("category_slug", categorySlug).eq("status", "published").not("image", "is", null).limit(1).maybeSingle();
  return (data?.image as string) ?? null;
}

async function main() {
  loadEnv();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  // ── 1) Статьи блога ──
  let posts = 0;
  for (const p of POSTS) {
    const cover = await coverFor(db, p.coverFromCategory);
    const { data: existing } = await db.from("blog_posts").select("id").eq("slug", p.slug).maybeSingle();
    const row = {
      slug: p.slug, title: p.title, excerpt: p.excerpt, content: p.content,
      cover_url: cover, og_image_url: cover, category_id: p.category_id, tags: p.tags,
      status: "published", meta_title: p.meta_title, meta_description: p.meta_description,
      published_at: now, updated_at: now,
    };
    if (existing?.id) {
      const { error } = await db.from("blog_posts").update(row).eq("id", existing.id);
      if (error) { console.warn("update fail", p.slug, error.message); continue; }
      console.log(`↻ обновлён ${p.slug}`);
    } else {
      const { error } = await db.from("blog_posts").insert({ id: randomUUID(), created_at: now, ...row });
      if (error) { console.warn("insert fail", p.slug, error.message); continue; }
      console.log(`✓ опубликован ${p.slug} (cover: ${cover ? "да" : "нет"})`);
    }
    posts++;
  }

  // ── 2) Мета-оптимизация категорий ──
  let cats = 0;
  for (const c of CATEGORY_META) {
    const { data: cur } = await db.from("categories").select("seo_text").eq("slug", c.slug).maybeSingle();
    let seo = (cur?.seo_text as string) ?? "";
    // дописываем абзац один раз (идемпотентно — по маркеру)
    if (c.seo_append && !seo.includes(c.seo_append)) seo = `${seo}\n${c.seo_append}`;
    const { error } = await db.from("categories").update({ meta_title: c.meta_title, meta_description: c.meta_description, seo_text: seo, updated_at: now }).eq("slug", c.slug);
    if (error) { console.warn("cat fail", c.slug, error.message); continue; }
    console.log(`✓ мета категории ${c.slug}`);
    cats++;
  }

  console.log(`\nИтог: статей ${posts}/${POSTS.length}, категорий ${cats}/${CATEGORY_META.length}`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
