/**
 * Curated, factual cleanup of the five primary commercial category pages.
 * This is intentionally not a generator: every text is reviewed and reflects
 * the live July 2026 assortment. Existing values are stored in admin_audit_log
 * before applying, so the operation is reversible.
 *
 * Dry run:
 *   npx tsx --env-file=.env.local scripts/seo-normalize-money-pages.ts
 *
 * Apply:
 *   npx tsx --env-file=.env.local scripts/seo-normalize-money-pages.ts --apply --expected=5
 */
import { createClient } from "@supabase/supabase-js";
import { pingIndexNow } from "../src/lib/seo/indexnow";

type CategoryPatch = {
  description: string;
  meta_title: string;
  meta_description: string;
  seo_text: string;
};

const PATCHES: Record<string, CategoryPatch> = {
  iphone: {
    description: "Новые iPhone: актуальные серии, цены и наличие. Поможем сравнить модели и оформить Trade-in.",
    meta_title: "Купить iPhone в Белгороде — цены и гарантия",
    meta_description: "Новые iPhone в Белгороде: сравните серии, память, цвета и цены. Проверка при получении, гарантия магазина, Trade-in, рассрочка, доставка и самовывоз.",
    seo_text: `<h2>Какой iPhone купить в Белгороде</h2>
<p>На этой странице собраны новые iPhone, которые доступны для покупки в PhoneTrade. Фильтры помогают выбрать серию, память, цвет и тип SIM, а в каждой карточке указаны текущая цена и статус наличия. Если нужен более доступный вариант, отдельно посмотрите <a href="/used">проверенные Б/У iPhone</a> с данными о состоянии и аккумуляторе.</p>
<h2>Чем отличаются актуальные серии</h2>
<ul>
<li><strong>iPhone 17 Pro и Pro Max</strong> — модели для тех, кому важны производительность, камеры и экран ProMotion; Pro Max отличается увеличенным дисплеем и автономностью.</li>
<li><strong>iPhone 17 и iPhone Air</strong> — актуальные модели для повседневных задач; Air делает акцент на тонком и лёгком корпусе.</li>
<li><strong>iPhone 16, 15, 14 и 13</strong> — более доступные поколения с разным балансом цены, камеры и запаса производительности.</li>
</ul>
<p>Выбор памяти зависит от сценария: 128 ГБ обычно достаточно для приложений и облачного хранения, 256 ГБ удобнее для фото и видео, а 512 ГБ и 1 ТБ подходят для больших локальных медиатек. Менеджер поможет сравнить конкретные конфигурации без переплаты за ненужные характеристики.</p>
<h2>Покупка, Trade-in и получение</h2>
<p>Перед оплатой можно проверить устройство, комплектность и серийный номер. Срок гарантии и условия обслуживания указываются в карточке и документах к покупке. Доступны самовывоз из Универмага «Белгород» на ул. Попова, 36, доставка, рассрочка и <a href="/trade-in">Trade-in</a>. Итоговая оценка старого устройства зависит от модели и состояния.</p>`,
  },
  ipad: {
    description: "iPad 11, mini и Pro: актуальные конфигурации для учёбы, работы и творчества.",
    meta_title: "Купить iPad в Белгороде — модели, цены, гарантия",
    meta_description: "iPad в Белгороде: базовый iPad 11, iPad mini 7 и iPad Pro 11/13. Сравните память, связь и цены; гарантия магазина, доставка и самовывоз.",
    seo_text: `<h2>Как выбрать iPad</h2>
<p>В каталоге PhoneTrade представлены базовый iPad 11, компактный iPad mini 7 и iPad Pro с экранами 11 и 13 дюймов. В карточках указаны текущие цены, память, тип подключения и наличие конкретной конфигурации.</p>
<ul>
<li><strong>iPad 11</strong> подходит для учёбы, видеосвязи, документов и просмотра контента.</li>
<li><strong>iPad mini 7</strong> удобен в дороге, для чтения, заметок и работы одной рукой.</li>
<li><strong>iPad Pro 11/13</strong> рассчитан на требовательные творческие и профессиональные приложения, многозадачность и работу с большим экраном.</li>
</ul>
<h2>Память, Wi-Fi и Cellular</h2>
<p>Для документов и потокового видео обычно достаточно базовой памяти. Для рисунков, монтажа и больших файлов разумнее выбирать 256 или 512 ГБ. Wi-Fi-версия подходит для дома и офиса; Cellular полезен, если планшету нужен мобильный интернет без раздачи с телефона. Совместимость со стилусом и клавиатурой зависит от модели — её лучше проверить до покупки.</p>
<h2>Проверка и получение в Белгороде</h2>
<p>Перед выдачей проверяем комплектность и основные функции устройства. Срок гарантии указан в карточке и документах. Заказ можно забрать на ул. Попова, 36 или оформить доставку по Белгороду; доступные способы оплаты показываются при оформлении.</p>`,
  },
  mac: {
    description: "MacBook Air и Pro на Apple Silicon: актуальные конфигурации, цены и наличие.",
    meta_title: "Купить MacBook в Белгороде — Air и Pro, цены",
    meta_description: "MacBook в Белгороде: Air 13/15 на M3 и M4, MacBook Pro 16 на M4 Pro. Сравните память, SSD и цены; гарантия магазина, доставка и самовывоз.",
    seo_text: `<h2>MacBook Air или MacBook Pro</h2>
<p>Сейчас в каталоге представлены MacBook Air 13 и 15 дюймов на чипах M3/M4 и MacBook Pro 16 на M4 Pro. Актуальная цена и наличие показываются в карточке каждой конфигурации — без обещания, что любая версия постоянно лежит на складе.</p>
<ul>
<li><strong>MacBook Air 13</strong> — компактный вариант для учёбы, офиса, поездок и повседневной работы.</li>
<li><strong>MacBook Air 15</strong> даёт больше рабочего пространства при сохранении тонкого корпуса и бесшумной работы.</li>
<li><strong>MacBook Pro 16</strong> подходит для монтажа, разработки и других длительных задач, где важны производительность и расширенные порты.</li>
</ul>
<h2>Как выбрать память и SSD</h2>
<p>16 ГБ объединённой памяти — практичная отправная точка для многозадачности. Объём SSD выбирают по рабочим файлам: 256 ГБ подходит при активном использовании облака, 512 ГБ удобнее для фото, видео и проектов. Перед покупкой стоит проверить раскладку клавиатуры, комплект поставки и нужные разъёмы.</p>
<h2>Гарантия и помощь после покупки</h2>
<p>Условия и срок гарантии фиксируются в карточке и документах к заказу. В магазине можно проверить устройство, настроить macOS и перенести основные данные. Доступны самовывоз на ул. Попова, 36 и доставка по Белгороду.</p>`,
  },
  watch: {
    description: "Apple Watch Series, SE и Ultra: сравнение размеров, функций, цен и наличия.",
    meta_title: "Купить Apple Watch в Белгороде — цены и модели",
    meta_description: "Apple Watch в Белгороде: Series 11, SE 3, Ultra 2 и Ultra 3. Сравните размер, ремешок, функции и цены; гарантия магазина, доставка и самовывоз.",
    seo_text: `<h2>Какие Apple Watch выбрать</h2>
<p>В каталоге представлены Apple Watch Series 11, SE 3, Ultra 2 и Ultra 3 в разных размерах и комплектациях с ремешками. Наличие относится к конкретной карточке: одинаковая модель в другом цвете или размере может иметь другой статус.</p>
<ul>
<li><strong>Apple Watch SE</strong> — базовые функции активности, уведомлений и тренировок по более доступной цене.</li>
<li><strong>Apple Watch Series</strong> — универсальный вариант с расширенными функциями дисплея и здоровья.</li>
<li><strong>Apple Watch Ultra</strong> — увеличенный защищённый корпус, длительная автономность и функции для спорта и навигации.</li>
</ul>
<h2>Размер корпуса и совместимость</h2>
<p>Меньший корпус удобнее на узком запястье, больший даёт более крупный текст и элементы управления. Для настройки часов нужен совместимый iPhone и актуальная версия iOS. Доступность отдельных функций может зависеть от модели, региона и версии программного обеспечения — это проверяется до покупки.</p>
<h2>Покупка в Белгороде</h2>
<p>В магазине можно проверить экран, кнопки, комплект и сопряжение с iPhone. Срок гарантии указан в карточке и документах. Доступны самовывоз на ул. Попова, 36 и доставка по Белгороду.</p>`,
  },
  airpods: {
    description: "AirPods 4, AirPods Pro 3 и AirPods Max USB-C: цены, различия и наличие.",
    meta_title: "Купить AirPods в Белгороде — модели и цены",
    meta_description: "AirPods в Белгороде: AirPods 4, AirPods Pro 3 и AirPods Max USB-C. Сравните шумоподавление, посадку и цены; гарантия магазина и проверка.",
    seo_text: `<h2>Какие AirPods выбрать</h2>
<p>В каталоге доступны AirPods 4, AirPods Pro 3 и полноразмерные AirPods Max с USB-C. Текущая цена и наличие указаны отдельно для каждой модели и цвета.</p>
<ul>
<li><strong>AirPods 4</strong> — компактные вкладыши; есть версия без активного шумоподавления и версия ANC.</li>
<li><strong>AirPods Pro 3</strong> — внутриканальная посадка, активное шумоподавление и сменные амбушюры.</li>
<li><strong>AirPods Max</strong> — полноразмерная конструкция для тех, кому важны охватывающая посадка и продолжительное прослушивание.</li>
</ul>
<h2>Как проверить перед покупкой</h2>
<p>Стоит проверить серийный номер, сопряжение с iPhone, работу обоих наушников, микрофонов, кейса и режимов шумоподавления. Комплектность и условия гарантии фиксируются при продаже. Гарантийное обращение начинается с диагностики; дальнейшее решение принимается по её результату и условиям гарантии.</p>
<h2>Доставка и самовывоз</h2>
<p>Заказ можно получить в магазине PhoneTrade на ул. Попова, 36 или оформить доставку по Белгороду. Если важны конкретный цвет или версия, ориентируйтесь на статус в карточке либо уточните его перед поездкой.</p>`,
  },
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY обязательны");
  }

  const apply = process.argv.includes("--apply");
  const expectedArg = process.argv.find((arg) => arg.startsWith("--expected="));
  const expected = expectedArg ? Number.parseInt(expectedArg.split("=")[1] ?? "", 10) : null;
  const slugs = Object.keys(PATCHES);
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await db
    .from("categories")
    .select("slug,description,meta_title,meta_description,seo_text")
    .in("slug", slugs)
    .eq("is_published", true);
  if (error) throw error;

  const rows = data ?? [];
  const missing = slugs.filter((slug) => !rows.some((row) => row.slug === slug));
  const changedRows = rows.filter((row) => {
    const patch = PATCHES[row.slug];
    return patch && (
      row.description !== patch.description
      || row.meta_title !== patch.meta_title
      || row.meta_description !== patch.meta_description
      || row.seo_text !== patch.seo_text
    );
  });
  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    candidates: rows.length,
    changed: changedRows.length,
    slugs,
    missing,
  }, null, 2));

  if (!apply) {
    console.log(changedRows.length === 0
      ? "Нормализация уже применена."
      : "Изменений нет. Для применения добавьте --apply --expected=<changed>.");
    return;
  }
  if (changedRows.length === 0) {
    console.log("Нормализация уже применена: целевые страницы совпадают с проверенными версиями.");
    return;
  }
  if (missing.length > 0 || !Number.isInteger(expected) || expected !== changedRows.length) {
    throw new Error(`Защитная проверка не пройдена: expected=${expected}, changed=${changedRows.length}, missing=${missing.join(",") || "—"}`);
  }

  const changedAt = new Date().toISOString();
  const backup = Object.fromEntries(changedRows.map((row) => [row.slug, {
    description: row.description,
    meta_title: row.meta_title,
    meta_description: row.meta_description,
    seo_text: row.seo_text,
  }]));
  const changedSlugs = changedRows.map((row) => row.slug);

  for (const slug of changedSlugs) {
    const { error: updateError } = await db
      .from("categories")
      .update({ ...PATCHES[slug], updated_at: changedAt })
      .eq("slug", slug)
      .eq("is_published", true);
    if (updateError) throw updateError;
  }

  const { error: auditError } = await db.from("admin_audit_log").insert({
    user_id: null,
    action: "bulk_update",
    entity_type: "category",
    entity_id: "seo-recovery-2026-07-money-pages",
    changes: {
      reason: "replace boilerplate and unverifiable availability claims with useful factual buying guidance",
      slugs: changedSlugs,
      backup,
      changed_at: changedAt,
    },
  });
  if (auditError) throw auditError;

  await pingIndexNow(["/", ...changedSlugs.map((slug) => `/category/${slug}`)]);
  console.log(`Готово: нормализованы ${changedSlugs.length} money-pages; backup записан в audit log.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
