# SEO-аудит: seo-images — PhoneTrade

_Дата: 2026-07-02. Аудитор: Claude (skill seo-images v2.2.0). Проверено на живой карточке товара и в коде._

## Что проверяет скил
Оптимизацию изображений для SEO и производительности: alt-тексты (10–125 симв., описательные, без стаффинга), размеры файлов по тирам, форматы (AVIF/WebP > JPEG/PNG), responsive (`srcset`/`sizes`), lazy-loading (ниже фолда — да, LCP-картинку — НЕТ), `fetchpriority="high"` на LCP, `decoding="async"` на остальных, CLS-защита (`width`/`height`/`aspect-ratio`), говорящие имена файлов, CDN, IPTC/XMP-метаданные и (для AI-картинок) IPTC `DigitalSourceType: TrainedAlgorithmicMedia` — требование Google Merchant Center.

## Что у нас уже хорошо
- **Next Image + AVIF/WebP**: `next.config.ts` → `images.formats: ["image/avif","image/webp"]`. На живой карточке `<img>` отдаёт `_next/image?url=...` — авто-конвертация и `srcSet` по DPR работают.
- **Responsive**: у всех картинок есть `sizes` (карточка `25vw/50vw`, галерея `55vw/90vw`, тумбы `80px`) — `ProductCard.tsx:119`, `ProductGallery.tsx:44,71`.
- **CLS-защита**: Next `fill` + контейнер `aspect-square` фиксирует место → нет сдвига макета. Хорошо.
- **Alt-тексты содержательные и с гео**: `${product.title} — купить в Белгороде, фото N` (`ProductCard.tsx:117`, `ProductGallery.tsx:44,69`). Уникальны на товар, с ключом + локацией. Длина в норме (не стаффинг).
- **`decoding="async"`** проставлен Next на не-LCP картинки (подтверждено в живом HTML).
- **CDN/Storage**: картинки только из Supabase Storage (`giwehapapi.beget.app`), не из `/public` — соответствует правилу проекта; отдаются через Next-оптимизатор.
- **Тумбы галереи** правильно `loading="lazy"` (ниже/сбоку от LCP) — подтверждено в HTML.
- **Имена файлов говорящие**: `iphone-16e-128gb-white-128gb.jpg` — с ключами, hyphen-case. Хорошо.

## Находки / проблемы (конкретно, файл/URL)

### 🔴 На LCP-картинке галереи НЕТ `fetchpriority="high"`
Живой HTML главной картинки: `<img alt="iPhone 16e … PhoneTrade" decoding="async" ...>` — **нет `fetchpriority`, нет `loading`**. В коде стоит `priority` (`ProductGallery.tsx:75`), но в отрисованном HTML `fetchpriority="high"` отсутствует (`grep fetchpriority prod.html` = 0). LCP-картинка товара — это главный элемент LCP на странице; без приоритета браузер грузит её в общей очереди → медленнее LCP, а LCP входит в Core Web Vitals (сигнал и Google, и Яндекса). Причина, вероятно, в поведении Next 16 при `fill`+`priority` внутри `AnimatePresence`/`motion.div` (обёртка ломает проброс атрибута). Нужно проверить и, если Next не проставляет — добавить `fetchpriority="high"` явно на первый кадр.

### 🟡 Галерея — «карусель через opacity»: все кадры в DOM, LCP-кандидатов несколько
В `ProductCard` все фото рендерятся слоями (`opacity-100/0`), в галерее — `AnimatePresence mode="wait"` (в DOM один кадр). На карточках каталога это множит `<img>` (13 img на товарной странице). Не критично (lazy спасает), но на страницах листинга с 20+ карточками это десятки картинок — стоит убедиться, что все, кроме первого экрана, `loading="lazy"` (Next это делает по умолчанию, кроме `priority`).

### 🟡 IPTC/XMP-метаданные в файлах Storage не заполнены (Creator/Copyright)
Скил: IPTC Creator/Credit/Copyright — display-фактор в Google Images (не ранжирование), даёт брендовую атрибуцию в выдаче картинок. Файлы в Storage залиты как есть (импорт с площадок), без `By-line`/`CopyrightNotice="PhoneTrade"`. Для товарных фото это Low, но брендовая атрибуция в Я.Картинках/Google Images — приятный бонус.

### 🟡 Часть фото товаров — с площадок-конкурентов (не наши студийные)
По CLAUDE.md фото частично скачаны у конкурентов (`fill-missing-photos.ts`). Риск: (1) одинаковые картинки у нескольких магазинов → слабее в поиске картинок; (2) на них может быть чужой watermark/EXIF. Стоит выборочно проверить EXIF/watermark на импортированных фото.

### 🟢 AI-баннеры email/OG без IPTC `DigitalSourceType`
Баннеры писем (`email/headers/*.png`) и (ранее) OG-баннер сгенерированы AI (nano-banana). Для email нерелевантно (не в фиде), но если AI-картинка попадёт в товарный фид Merchant/Я.Товары — требуется IPTC `TrainedAlgorithmicMedia`, иначе дисапрув. Сейчас в фиде только реальные фото товаров, так что риск нулевой — просто держать в уме при генерации product-фото через AI.

## Рекомендации

### 🔴 Критично
1. **Вернуть `fetchpriority="high"` на LCP-картинку товара.** Проверить, почему Next не проставляет при `priority` внутри `motion.div`; при необходимости — рендерить первый кадр обычным `<Image priority>` без motion-обёртки на первой отрисовке или добавить атрибут вручную. Это прямой выигрыш по LCP на всех 300+ карточках товара.

### 🟡 Важно
2. Убедиться, что на страницах листинга картинки ниже первого экрана реально `lazy` (Next по умолчанию — да; проверить, что нигде не стоит лишний `priority`).
3. Выборочно проверить импортированные фото на чужой watermark/EXIF; при наличии — перезалить/зачистить метаданные (`exiftool -all=`).

### 🟢 Nice-to-have
4. Пакетно вписать IPTC/XMP `By-line`/`Credit`/`CopyrightNotice="PhoneTrade"` в файлы Storage (`exiftool` batch) — брендовая атрибуция в поиске картинок.
5. При будущей AI-генерации product-фото — сразу инжектить IPTC `DigitalSourceType: trainedAlgorithmicMedia`.

## Быстрые победы (за час)
- Пофиксить `fetchpriority` на LCP-картинке галереи (главный CWV-выигрыш).
- Прогнать `exiftool` по 5–10 импортированным фото — проверить чужой watermark/EXIF.
- (Опц.) batch-инъекция `CopyrightNotice`/`By-line="PhoneTrade"` в Storage-фото.

## Google vs Яндекс (нюансы)
- **LCP/CWV**: и Google (Core Web Vitals, порог LCP 2.5с), и **Яндекс** (учитывает скорость и «Вебмастер → Скорость») штрафуют медленную загрузку. `fetchpriority` на LCP — общий выигрыш; для Яндекса, где приоритет по ТЗ, — обязателен.
- **Поиск по картинкам**: Яндекс.Картинки — заметный источник товарного трафика в РФ; alt+имя файла+контекст страницы (у нас всё есть) важнее метаданных. Google Images аналогично; IPTC — только display.
- **AVIF/WebP**: поддержаны обоими; Next отдаёт по Accept — ОК.
- **AI-лейбл `DigitalSourceType`** — требование именно Google Merchant Center (feed-layer). Для Яндекс.Товаров явного требования нет, но лейбл не вредит. Актуально только если появятся AI-фото товаров в фиде (сейчас нет).
