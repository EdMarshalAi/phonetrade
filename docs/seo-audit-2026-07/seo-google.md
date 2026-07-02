# SEO-аудит: seo-google — PhoneTrade

> Дата: 2026-07-02. Скил `seo-google` v2.2.0 — прямой доступ к Google-API:
> Search Console, PageSpeed Insights v5, CrUX (25 недель истории), Indexing API v3, GA4.
> Все API бесплатные; нужен Google Cloud проект с API-ключом и/или service account.

## Что проверяет/делает скил

Мост между crawl-аудитом и **реальными полевыми данными Google**: фактические метрики Chrome-пользователей (CrUX), реальный статус индексации (URL Inspection), поисковая эффективность (GSC: клики/показы/CTR/позиция), органический трафик (GA4). Тиры доступа: Tier 0 (API-key: pagespeed, crux, nlp) → Tier 1 (+service account: gsc, inspect, sitemaps, index) → Tier 2 (+GA4) → Tier 3 (+Ads: keywords/volume).

Полезные для нас команды: `pagespeed`/`crux`/`crux-history` (Core Web Vitals по реальным юзерам), `gsc` (quick-win детект — запросы на позиции 4–10 с высокими показами), `inspect`/`inspect-batch` (реальная индексация), `sitemaps` (статус карты).

## Как применить к нам

**Что уже есть:** Google Search Console верифицирован (метатег `google-site-verification`, ресурс URL-префикс), sitemap отправлен (~430 URL), Bing тоже. Значит Tier 1 доступен, как только заведём service account с доступом к GSC-ресурсу.

**Чего НЕ хватает для скила:** нет Google Cloud проекта с API-ключом + service account в `~/.config/claude-seo/google-api.json`. Пока не заведён — скил работает только через ручной GSC-веб-интерфейс, не программно. Для нас это опционально: приоритет — Яндекс, GSC-веб уже даёт основное.

### Что настроить в Google (по приоритету для PhoneTrade)

**1. Google Search Console — использовать по максимуму (уже подключён) 🟡**
- Отчёт «Эффективность»: найти quick-wins — запросы на позициях 4–10 с высокими показами (скил детектит их автоматически через `gsc`). Для нас это гео-Apple запросы, где мы на грани топ-3.
- «Индексирование страниц»: проверить, все ли 317 товаров + категории + блог в индексе Google (после залива 12.06 и в Google могли быть колебания, хоть и меньше яндексовских).
- «Sitemaps»: убедиться, что 430 URL обработаны без ошибок.
- URL Inspection для 5 новых гэп-статей (от 25.06) → запросить индексацию (в Google это моментально, в отличие от Яндекса).

**2. Core Web Vitals / PageSpeed / CrUX 🟡**
- **CrUX field data** — реальные LCP/INP/CLS белгородских пользователей. У нас Next Image (avif/webp), `output: standalone`, ISR — лабораторно должно быть хорошо, но полевые данные надо проверить (мобильный трафик, слабые сети).
- `crux-history` — 25 недель тренда: не деградировали ли CWV после включения Next-оптимизатора картинок (в памяти была тревога «картинки умерли» — оказалась ложной, но полевой тренд подтвердит).
- **INP** (не FID!) — на карточках товара с интерактивом (`ProductBuyPanel`, переключатели цвет/память/SIM) — проверить, не тормозит ли ввод.

**3. Google Merchant Center / Rich Results 🟡🔴**
- **Free Listings в Google Shopping** — товары могут появляться бесплатно. Требование: Product structured data в **серверном HTML** (у нас SSR — ✅), с обязательными полями `name`, `image`, `price`, `priceCurrency`, `availability` (✅ есть в `product/[id]/page.tsx`).
- **ПРОБЕЛ:** в нашем Offer НЕТ `shippingDetails` (OfferShippingDetails) и `hasMerchantReturnPolicy` (MerchantReturnPolicy). Google их требует для Merchant-eligibility и показывает в rich-сниппете. Добавить — быстрая победа с высоким эффектом для Google Shopping.
- **aggregateRating** отсутствует (решение владельца — отзывы не делаем). Это ограничивает rich-сниппет со звёздами, но осознанно. ОК.
- Проверить каждый тип схемы в Rich Results Test (search.google.com/test/rich-results): Product, BreadcrumbList, Organization/LocalBusiness, Article, FAQPage.
  - **Внимание по FAQPage:** Google 7 мая 2026 полностью убрал FAQ rich results из SERP (для всех сайтов). FAQPage больше НЕ даёт сниппет в Google — но сохраняет ценность для AI/LLM-цитируемости и для Яндекса. Не удалять, но и не ждать от него звёздочек в Google.

**4. Indexing API — НЕ для нас ⚠️**
- Indexing API v3 официально только для JobPosting и BroadcastEvent/VideoObject. Для товарных страниц использовать нельзя (Google проигнорирует/оштрафует за нецелевое использование). Индексацию товаров гнать через Sitemap + URL Inspection, не через Indexing API.

**5. GA4 (Tier 2) — опционально 🟢**
- У нас своя аналитика (`page_views` с фильтром ботов). GA4 дал бы канал «Organic Search» отдельно, но дублирует. Заводить только если нужна сверка с Google-данными.

## Рекомендации

### 🔴 Критично
- **Добавить `shippingDetails` + `hasMerchantReturnPolicy` в Product/Offer** — иначе товары не проходят в Google Merchant free listings и теряют rich-сниппет доставки/возврата. У нас доставка по Белгороду + самовывоз ул. Попова 36 — данные реальные, есть что положить в схему.

### 🟡 Важно
- Прогнать все типы схемы через Rich Results Test — после залива 12.06 могли появиться ошибки валидации (особенно если дубль FAQPage реален).
- Использовать GSC «Эффективность» для quick-wins (позиции 4–10) — это самый дешёвый рост в Google.
- Запросить индексацию 5 новых гэп-статей через URL Inspection (в Google — моментально).
- Проверить CrUX (реальные CWV, особенно INP на карточках и мобильный LCP).

### 🟢 Nice-to-have
- Завести Google Cloud service account → включить программный `seo-google` (авто quick-win детект, batch-inspection 430 URL, CWV-отчёты).
- CrUX-history для контроля тренда CWV после релизов.

## Быстрые победы
1. **Rich Results Test** на 1 карточку товара + главную — за 5 минут видно все ошибки схемы (после залива критично).
2. URL Inspection → «Запросить индексацию» для 5 гэп-статей от 25.06.
3. GSC «Эффективность» → отсортировать по показам, фильтр позиция 4–10 → список quick-win страниц.

## Google vs Яндекс
- Это **Google-специфичный** скил — прямого влияния на Яндекс нет. Но 3 вещи работают на оба движка: (а) `shippingDetails`/`returnPolicy` в схеме Яндекс тоже читает; (б) CWV — фактор и у Google, и у Яндекса; (в) чистая индексация в GSC = здоровье сайта в целом.
- **Разделение усилий:** Яндекс — через Яндекс.Вебмастер (см. `seo-dataforseo.md`, раздел про бесплатные альтернативы); Google — через этот скил. Merchant free-listings и Rich Results — чисто Google-выигрыш, но настраивается один раз и не мешает Яндексу.
- **Не путать индексацию:** для Google — URL Inspection (моментально); для Яндекса — «Переобход страниц» в Вебмастере (медленнее, лимиты).
