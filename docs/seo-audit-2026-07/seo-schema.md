# SEO-аудит: seo-schema — PhoneTrade

_Дата: 2026-07-02. Аудитор: Claude (skill seo-schema v2.2.0). Проверено на живой карточке товара, категории и в коде._

## Что проверяет скил
Обнаружение, валидацию и генерацию Schema.org (JSON-LD как приоритет): наличие `@context`/`@type`, обязательные и рекомендованные поля по типу, абсолютные URL, ISO-даты, отсутствие плейсхолдеров. Отдельно — статус типов на май 2026: какие дают rich-результаты (Product, Offer, BreadcrumbList, Review, Organization, LocalBusiness), какие ретайрнуты (HowTo, SpecialAnnouncement, ClaimReview…), и что **FAQPage rich-результаты полностью отключены 7 мая 2026** (маркап держим только ради AI/LLM-цитируемости, не ради сниппета). Требование Google (дек 2025): для time-sensitive схем (Product/Offer) JSON-LD должен быть в SSR-HTML, не через JS.

## Что у нас уже хорошо
Живая карточка `product/iphone-16e-128gb-white` содержит **6 JSON-LD блоков, все server-side** (не JS-inject) — это ровно то, что требует гайд Google по JS-SEO. Набор типов:

| Тип | Где | Статус |
|---|---|---|
| Product | `product/[id]/page.tsx:63` | ✅ ACTIVE, rich-результат |
| Offer (вложен) | там же | ✅ price+priceCurrency+priceValidUntil+availability+itemCondition+seller@id |
| Brand | там же | ✅ Apple/Samsung/Яндекс/Sony по названию |
| BreadcrumbList | `page.tsx:98` | ✅ 5 ListItem, rich-результат |
| FAQPage | `faq-schema.ts` | ✅ маркап корректен (см. ниже про статус) |
| Store + ElectronicsStore | `(site)/layout.tsx:60` | ✅ массив @type, @id `#organization`, гео, часы, areaServed |
| WebSite + SearchAction | `layout.tsx` (root) | ✅ sitelinks searchbox |
| ItemList (категория) | `category/[slug]/page.tsx` | ✅ до 50 items, numberOfItems |

- **`@id` связка** `#organization` → `Offer.seller` и `publisher` блога — правильная графовая нормализация.
- **JSON-LD экранируется** (`json-ld.ts`: `<`,`>`,`&` → `\u00xx`) — защита от инъекций из БД. Отлично.
- **Offer гардирован по цене** — не рендерится без `price>0` (Offer без price невалиден). Правильно.
- **priceValidUntil** = конец следующего года (`2027-12-31`) — соответствует рекомендации Google.
- **itemCondition** различает Used/New — важно для Б/У линейки.

## Находки / проблемы (конкретно, файл/URL)

### 🟡 FAQPage — держим осознанно, но добавить `inLanguage` и не наращивать ради сниппета
`faq-schema.ts` собирает FAQPage из описания. По статусу скила (deprecated-types-2024-2026.md) **FAQ rich-результаты отключены для всех сайтов 7 мая 2026** — сниппета «вопрос-ответ» больше не будет ни в Google, ни (по факту) как раньше. Это НЕ повод удалять: маркап помогает AI Overviews/LLM резолвить сущности. Рекомендация: (1) не расширять FAQ ради SERP, (2) добавить `inLanguage: "ru"` в FAQPage и Question — помогает AI-движкам. Флаг — Info, не Critical.

### 🟡 Product.description — шаблон вместо уникального текста
`page.tsx:68`: описание в схеме одинаковое на все товары («…купить в Белгороде… гарантия, доставка и самовывоз»). Это то, что читают LLM. Подставить `product.shortDescription || product.metaDescription`. Дубликат см. также в `seo-ecommerce.md`.

### 🟡 Нет `gtin13`/`mpn` в Product
Есть только `sku` (`page.tsx`). Для Apple/Samsung GTIN публичны; их добавление усиливает матчинг в товарных сниппетах Яндекса и Google Merchant. Скил: gtin/mpn — recommended, поднимает schema-score с 50 до 75.

### 🟡 Нет `shippingDetails` и `hasMerchantReturnPolicy` в Offer
Оба — recommended-поля Google для Product rich-результата и обязательны для полноценного Merchant-листинга. У магазина есть страницы `/delivery` и `/warranty` — данные для `OfferShippingDetails` (доставка по Белгороду) и `MerchantReturnPolicy` (14 дней по закону РФ) известны. Поднимает schema-score до 85–90.

### 🟢 ItemList на категории без `ListItem.image`
`category/[slug]/page.tsx`: ItemList отдаёт url+name, но без `image`. Добавление `image` в элементы (главное фото) слегка усиливает товарную галерею. Low.

### 🟢 CollectionPage-обёртка для категории
Категория рендерит BreadcrumbList + ItemList, но не помечена как `CollectionPage`. Не критично, но семантически честнее для листинга.

### ✅ Проверка на deprecated-типы — чисто
HowTo, SpecialAnnouncement, ClaimReview, VehicleListing, Dataset и пр. — НЕ используются. Хорошо.

## Рекомендации

### 🔴 Критично
_Критичных дефектов схемы нет — база уже валидна и покрыта._ Ближайшее к критичному — рассинхрон цены мета↔Offer (описан в `seo-ecommerce.md`), но это данные, а не схема.

### 🟡 Важно
1. Подставить реальное описание в `Product.description` (не шаблон) — `page.tsx:68`.
2. Добавить `gtin13`/`mpn` в Product (после заполнения поля `products.gtin`).
3. Добавить `shippingDetails` (доставка Белгород, самовывоз) и `hasMerchantReturnPolicy` (14 дней, RU) в Offer — данные брать из настроек магазина, а не хардкодить.
4. `inLanguage: "ru"` в FAQPage/Question; FAQ не наращивать ради сниппета.

### 🟢 Nice-to-have
5. Пометить категорию как `CollectionPage`, добавить `image` в ItemList-элементы.
6. `priceSpecification` вместо голого `price` — если понадобится указывать НДС/условия.

## Быстрые победы (за час)
- `Product.description` → `product.shortDescription` (1 строка).
- `inLanguage: "ru"` в FAQPage (1 строка в `faq-schema.ts`).
- Добавить `image` в ItemList-элементы категории (1 строка в `.map`).
- `shippingDetails`/`returnPolicy` — прописать статикой из настроек магазина в Offer (0.5–1 ч).

## Google vs Яндекс (нюансы)
- **FAQPage**: и Google (с мая 2026), и Яндекс — сниппета «вопрос-ответ» по сути нет; держим ради AI/Нейро (Яндекс.Нейро тоже читает разметку). Не расширять.
- **Product/Offer**: Яндексу для товарных сниппетов важнее **фид** (Я.Товары), но валидная Product-схема на странице дублирует сигнал и нужна Google Merchant. GTIN одинаково полезен обеим.
- **LocalBusiness/Store**: и Google (Knowledge Panel), и Яндекс (Бизнес/организации) читают Organization; наш блок с адресом, часами, гео, `sameAs` (VK/TG/WA) и `areaServed` по области — сильный локальный сигнал под топ-1 Белгород.
- **BreadcrumbList/WebSite SearchAction** — поддержаны обоими; уже стоят.
- Отзывы/`aggregateRating` НЕ добавляем (решение владельца, корректно — фейк-отзывы под запретом обеих систем).
