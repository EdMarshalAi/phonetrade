# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

PhoneTrade — интернет-магазин техники Apple (Белгород, ул. Попова, 36). Строгая Apple-эстетика: серо-чёрная палитра, крупная типографика, сдержанные анимации. UI и контент на русском, цены в рублях. Подробная документация — в `README.md`.

> **Next.js 16 содержит breaking changes** относительно обучающих данных моделей. Перед написанием кода читай гайды в `node_modules/next/dist/docs/` (см. `AGENTS.md`).

## Commands

```bash
npm run dev      # dev-сервер (Turbopack), http://localhost:3000 (или следующий свободный порт)
npm run build    # production-сборка (output: "standalone")
npm run start    # запуск собранной сборки
npm run lint     # ESLint (eslint-config-next)
npm run seed     # залить каталог из моков в Supabase (tsx scripts/seed-supabase.ts)
```

Тестов в проекте нет — тестовый фреймворк не настроен. Импорты — через алиас `@/*` → `src/*`.

Локальный запуск требует `.env.local` (см. `.env.example`) с переменными Supabase — без них слой данных откатывается на моки. **`.env.local` в `.gitignore`, не коммитить.**

## Стек

- **Next.js 16** (App Router, Server Components, `output: "standalone"`) + **React 19** + **TypeScript 5**.
- **Tailwind CSS v4** — конфигурация через `@theme` в `src/app/globals.css`, **без `tailwind.config.js`**.
- UI-примитивы на **@base-ui-components/react** (НЕ Radix). Иконки — `lucide-react`.
- Данные — **@supabase/supabase-js** (self-hosted Supabase, см. «Инфраструктура»).
- Варианты компонентов — `class-variance-authority`; объединение классов — `cn()` (`tailwind-merge` + `clsx`).
- Анимации — `motion`/`framer-motion` 12, обёртка `MotionReveal`.

## Архитектура (big picture)

Понимание этих сквозных решений важнее, чем перечень файлов.

**Слой данных подключён к Supabase (с фолбэком на моки).** Компоненты НИКОГДА не импортируют моки напрямую — только async-геттеры из `src/lib/products.ts` (`getCategories`, `getProductsByCategory`, `getProductById`, `getRelatedProducts`, `getVariantsForProduct` и т.д.). Геттеры читают из Supabase через anon-клиент `src/lib/supabase/client.ts`; при ошибке или без env-переменных откатываются на статические массивы из `src/lib/data/products.ts`. **Мок-данные остаются источником истины** — `npm run seed` заливает их в БД (схема `supabase/schema.sql`). Маппинг строк БД (snake_case) ↔ домен (camelCase) — в `src/lib/supabase/types.ts`. Сохраняй эту границу: новые поля сначала в `data/products.ts` + `Product`, затем в схему/мапперы.

**Админка (`/admin`) — реальный Supabase Auth + RBAC.** Гард `requireAdmin()`, таблица `admin_users` (роли `admin`/`manager`/`content`), все записи через `adminMutation()` (роль + аудит в `admin_audit_log` + `revalidatePath`). Сквозные правила: **все выпадающие — кастомный `Select` из `src/components/admin/form.tsx`** (drop-in нативного `<select>`, меню в **портале с fixed-позицией** — не обрезается `overflow` таблиц), **не** добавлять браузерные `<select>`. Иконки — единый `src/lib/admin/icons.ts` + `IconPicker`. Bento/Trade-in/Преимущества объединены в «Блоки на главной» (`/admin/content/home-blocks`, видимость в `shop_settings.home_blocks`). Даты в таблицах — `whitespace-nowrap`. Подробности — в `README.md` → «Админка».

**Опции/бейджи/фильтры товаров.** Реестр в `shop_settings` (`product_options` — характеристики со справочником значений; `product_badges` — бейджи с bg/fg/tooltip), геттеры `getProductOptions()`/`getProductBadges()` в `content.ts`. Базовые опции (color/memory/sim/condition) пишутся в свои колонки, кастомные — в `products.options jsonb`; бейджи — `products.badges text[]` (несколько). Фильтры категории — `categories.available_filters` (пусто → фолбэк на `category-config.ts`; цена всегда видна). Бейджи на витрине — ТОЛЬКО через единый `ProductBadges` (слева, из реестра, с tooltip), одинаково в карточках и на странице товара; не дублировать старый одиночный `badge`/`isNew`-пилл. Управление: «Товары → Настройки», табы товара «Опции и Бейджи», таб категории «Фильтры».

**Фото товара — единый источник: колонки `products.image` (главное) + `products.gallery` (доп. фото, jsonb-URL, БЕЗ главного).** Витрина и админка показывают `productImages()` = `dedupe([image, ...gallery])` (`src/lib/utils/product-images.ts`); таб «Галерея» в админке читает/пишет ЭТИ ЖЕ колонки (через `variant-actions.ts`), отдельная таблица `product_images` для галереи товара не используется. Точки в `ProductCard` — только при >1 фото и по реальному количеству. **Картинки — только из Storage-бакетов, не из `/public`**: `npm run upload:images` заливает и переписывает `image`+`gallery`+категории/hero/bento на Storage-URL. Не хардкодить относительные `/products/...` пути.

**Дизайн-токены — единственный источник стилей.** Все цвета/радиусы/easing объявлены в `@theme`-блоке `src/app/globals.css` и используются через Tailwind-классы (`bg-ink`, `text-ink-muted`, `border-border/60`, `rounded-2xl`). Не хардкодить hex. Палитра — серый + чёрный (`--color-ink #1d1d1f` = текст и акцент/CTA) + белый; **единственное цветное исключение** — `--color-sale #e30000` (только для цены за наличные). Шрифт — системный Apple + Inter (latin+cyrillic) fallback.

**Server по умолчанию, Client точечно.** Страницы (`src/app/*/page.tsx`) — Server Components: грузят данные через геттеры и задают `generateMetadata()`. `"use client"` только там, где есть интерактив: `Header`, `CatalogShell`, `CartShell`, `ProductCard`, `ProductBuyPanel`.

**Состояние каталога живёт в URL.** Фильтры и сортировка кодируются в search params через хук `src/lib/catalog/use-catalog-filters.ts` (shareable-ссылки). Фасеты извлекаются из данных динамически (`src/lib/catalog/filters.ts` + конфиг на категорию в `category-config.ts`). Пагинация — в локальном стейте (не в URL).

**Авторизация — реальный Supabase Auth (с 31.05.2026), корзина — стейт на клиенте.** `CartShell` держит товары и `CheckoutState` в `useState`. Кабинет (`/auth/login`, `/account`, `/account/orders`) на **реальном Supabase Auth** через `AuthProvider` (cookie-сессия, без localStorage): вход по телефону+паролю (телефон → email аккаунта через RPC `resolve_login_email` по последним 10 цифрам; фолбэк — синтетический `{digits}@phonetrade.local`), регистрация имя+телефон+email+пароль, профиль в `profiles`. **Авторизация SSR-aware:** `getStorefrontUser()` (`src/lib/auth/server-user.ts`, cookie-сессия) передаётся как `initialUser` в `AuthShell` (редирект вошедшего в `/account`) и `TradeInQuiz` (авторизованный не вводит телефон) — клиентский `useAuth()` грузится асинхронно, поэтому критичные ветки берут юзера с сервера. **Единый аккаунт владельца:** `owner@phonetrade.ru` = одновременно админ (`admin_users`, роль developer/full_access) И покупатель (`profiles`, телефон +79803768946) → вход на сайте по телефону не выкидывает из админки (раньше были 2 разных аккаунта на одной сессии). `updateStorefrontProfile` пишет профиль через service-role (мимо RLS). ВАЖНО: хуки в client-компонентах объявлять ДО любых ранних `return` (был React #300 в ProfileSection/AuthShell).

**Структура.** `src/app/` — маршруты `/`, `/category/[slug]`, `/product/[id]`, `/cart`, `/auth/login`, `/account`, `/account/orders`. `src/components/` по доменам: `layout/`, `home/`, `catalog/`, `product/`, `product-detail/`, `cart/`, `account/`, `auth/`, `ui/`, `providers/` (включая `AuthProvider`). `src/lib/` — `data/`, `products.ts`, `supabase/` (`client.ts`, `types.ts`), `catalog/`, `cart/`, `account/orders.ts`, `utils/`.

## Инфраструктура (GitHub, деплой, Supabase, MCP)

**GitHub.** Репозиторий `git@github.com:EdMarshalAi/phonetrade.git` (владелец `EdMarshalAi`), ветка `main`. Пуш по SSH (`ssh git@github.com` авторизован). Коммиты заканчивать `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

**CI/CD — автодеплой по push в `main`.** `.github/workflows/deploy.yml`: `npm ci` → `npm run build` (standalone, с `NEXT_PUBLIC_SUPABASE_*` из секретов + `NEXT_PUBLIC_SITE_URL=https://phonetrade31.ru` прямо в env воркфлоу — не секрет) → `rsync` standalone-бандла на сервер → `pm2 reload`. Проверено end-to-end. Секреты GitHub Actions: `SSH_PRIVATE_KEY` (приватная часть `~/.ssh/beget_phonetrade`; **вставлять только целиком через `cat … | pbcopy`**, иначе `error in libcrypto`), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Host/user/port/path захардкожены в `env:` воркфлоу — SSH-хост остаётся IP `31.129.97.8` (рабочий, домен в SSH не обязателен).

**Сервер и роутинг (домен + HTTPS, с 31.05.2026).** `root@31.129.97.8` (Ubuntu 24.04), ключ `~/.ssh/beget_phonetrade`. Приложение в `/opt/phonetrade` (standalone), PM2 (`ecosystem.config.js`, порт 3000, автозапуск). **Сайт — `https://phonetrade31.ru`** (+ `www`→apex, `http`→`https` 301; по IP `http://31.129.97.8/` тоже работает — default_server). DNS `phonetrade31.ru`/`www` → 31.129.97.8. **nginx владеет :443 через `stream{}` SNI-passthrough** (top-level блок в `/etc/nginx/nginx.conf`; модуль `libnginx-mod-stream`): SNI `giwehapapi.beget.app` → Kong `127.0.0.1:8443` (Kong сам терминирует свой серт — **НЕ трогать**), всё остальное → `127.0.0.1:8444` (nginx HTTPS-терминатор, LE-серт phonetrade31.ru) → сайт :3000. На :80 — редирект на https + ACME (`/var/www/certbot`). LE-серт `phonetrade31.ru`+`www` (certbot webroot, автопродление + `renew_hook = systemctl reload nginx`). Конфиг сайта: `/etc/nginx/sites-available/phonetrade` (бэкапы `.bak.*`). **Порты:** 80 nginx, 443 nginx-stream-SNI, 3000 сайт, 8000 Kong-HTTP, 8443 Kong-HTTPS, 8444 nginx-HTTPS-терминатор. Откат HTTPS: `KONG_HTTPS_PORT=443` + `docker compose up -d kong` + убрать stream-блок.

**Supabase.** Self-hosted Docker-стек в `/opt/beget/supabase` на том же сервере. Публичный API: `https://giwehapapi.beget.app` (не менялся). Kong: HTTPS-порт перевешен **443→8443** (`KONG_HTTPS_PORT=8443` в `/opt/beget/supabase/.env`) — теперь :443 у nginx, который SNI-passthrough'ит Supabase обратно в Kong:8443; HTTP Kong на **8000** (`KONG_HTTP_PORT=8000`). Postgres снаружи через pooler `31.129.97.8:5432`, логин `postgres.your-tenant-id`. Креды — в `/opt/beget/supabase/.env` (и в локальном `.env.local`). Прямое управление БД: `ssh root@31.129.97.8 "docker exec -i supabase-db psql -U postgres -d postgres"`.

**MCP.** Сервер `phonetrade-supabase` в `~/.claude.json` (бинарь `selfhosted-supabase-mcp`, та же схема, что у других проектов; доступен после перезапуска Claude Code) — инструменты `mcp__phonetrade-supabase__*` для работы с БД. ⚠️ Сервер `selfhosted-supabase` (IP `155.212.211.29`) — **другой проект, не трогать**.

## Контент-страницы, поиск, SEO

**Статические страницы — из админки.** `/admin/content/pages` пишет в `static_pages` (slug, title, content-HTML, meta, status). Опубликованная страница сразу отдаётся по `/{slug}` через катч-олл `(site)/[slug]/page.tsx` (`getStaticPage`) — отдельный роут заводить не нужно. Уже есть и работают: `/about`, `/delivery`, `/warranty`, `/trade-in`, `/loyalty`, `/contacts`, `/privacy`, `/offer`, `/consent`, `/service-rules`. `/blog` и `/blog/[slug]` — отдельные роуты (таблицы блога). `/new` (товары `is_new`) и `/used` (Б/У, CatalogShell) — отдельные коллекционные роуты.

**Поиск.** `searchProducts()` (матч по всем словам в title/model/цвете/памяти/категории) → страница `/search?q=` (грид `ProductCard`, пустые состояния). `SearchInput` отправляет на `/search`; запрос логируется в `search_queries` (`trackSearch`) и виден в аналитике «Поведение».

**SEO.** `src/app/sitemap.ts` (ISR `revalidate=3600`) собирает главную, `/catalog`, `/new`, `/used`, `/blog`, все категории, опубликованные товары, **все опубликованные `static_pages`** и посты блога — новая страница из админки попадает в карту автоматически (в течение часа). `src/app/robots.ts` — allow всё, disallow `/admin /account /cart /auth /search`. Базовый URL — `NEXT_PUBLIC_SITE_URL` (фолбэк `https://phonetrade31.ru`).

## Прайс (ценообразование)

**Единый источник цен — раздел `Каталог → Прайс` (`/admin/catalog/pricing`).** Менеджер вводит в товаре закупку (`cost_rub`) + курс закупа (`cost_rate`) → БД считает `cost_usd` (generated). Цены (`price_cash/price_card`, `credit_6m/12m/24m_total+monthly`) пересчитываются **только server-side** по формуле от неокруглённой базы (без каскадных округлений): Postgres-функция `recalculate_all_prices(reason,user,ids?)` и зеркальная `src/lib/pricing/calculate.ts`. Витрина читает готовые поля, ничего не считает. Настройки формулы — синглтон `pricing_settings` (наценки FX/карта/кредиты, округление, мин.маржа, автокурс). `price_override=true` фиксирует цену вручную (формула не трогает). Триггеры пересчёта: сохранение товара (`applyPricing` в `catalog/products/actions.ts`), drawer «Формула»/inline-правка/bulk/импорт (`catalog/pricing/actions.ts` + `io-actions.ts`). История — `product_price_history`. Б/У (`type='used'`) и архив в формулу не входят.

**Курс ЦБ.** `src/lib/pricing/cbr.ts` (cbr-xml-daily JSON + фолбэк cbr.ru XML) → таблица `currency_rates`. Роут `/api/cron/cbr-rate` (защита `CRON_SECRET`) + GitHub Actions `cbr-rate.yml` (ежечасно). Авто-обновление рабочего курса — только при `use_cbr_auto` и скачке ≤5%. **Чтобы включить авто-курс: добавить `CRON_SECRET` в GitHub Secrets и env сервера.** Telegram-триггеры: `pricing_recalc_done`, `pricing_import_done`, `pricing_below_margin`, `cbr_rate_big_change`, `cbr_rate_fetch_failed`. Импорт/экспорт XLSX·CSV — `xlsx`+`papaparse` (server-only). Полная спека — `docs/pricing-module.md`.

## Каталог 2.0, прайс по категориям, контент и фото (сессия 31.05.2026 — важно)

**Прайс — наценка по категориям.** Наценка в `categories.markup_percent` (fallback `pricing_settings.default_markup_percent` — бывш. `fx_markup_percent`), мин.маржа — `categories.min_margin_rub` (в ₽, не %). `recalculate_all_prices()` и зеркальный `src/lib/pricing/calculate.ts` берут наценку из категории товара (по `category_slug`; `calculatePrices(inputs, settings, markupPercent?)`, `applyPricing` тоже). Управление — таблица наценок в модалке «Формула» (`/admin/catalog/pricing`, экшн `updateCategoryPricing`). Колонка «Маржа ₽» подсвечивает < мин/> 1.5×. Старые `fx_markup_percent`/`min_margin_percent` удалены. iPhone = 10% (цены не менялись от апгрейда).

**Каталог двухуровневый — ВСЁ из админки/БД, никакого хардкода.** Категории: `parent_slug` + `sort`. Страница `(site)/category/[slug]` и `/used` берут название/описание/подзаголовок/фильтры/SEO **только из БД** (`categories.title/description/subtitle/available_filters/seo_text`); `CATEGORY_CONFIGS` со страниц убран. Фильтры — строго `available_filters` (нет настройки → нет фильтров; **состояние и аккумулятор — только у Б/У**). Подкатегории — единый ряд чипов с количеством (одинаково на родителе и ребёнке), хлебные крошки на родителя — всё по `parentSlug` (`CatalogShell` props `tabs`/`breadcrumbParent`, `getProductCountsByCategory`). `/used` — виртуальная коллекция (`type='used'`); её мета редактируется через категорию-строку `used` (`is_published=false`).

**Связанные товары (варианты).** `products.variant_group_id` — общая группа, собирается ВРУЧНУЮ в табе «Связанные товары» (`RelatedProductsManager`, двусторонне через `setVariantGroup`). Витрина (`getVariantsForProduct`) строит переключатели цвет/память ТОЛЬКО по группе — **авто-объединения по `model` НЕТ** (у Б/У/техники `model` пуст → раньше слипались iPhone+iPad). Таб «Состояние (Б/У)» убран: состояние/аккумулятор/категория состояния — в табе «Опции и Бейджи». «Состояние» — свободный текст (`condition_text`), «Аккумулятор» — число/ползунок (`battery`); оба выводятся на карточке Б/У.

**Фото — только Storage; скачивать у конкурентов, НЕ хотлинк, НЕ переносить наши.** Бенто-плитка главной: `custom_image_url || category_image` (картинка плитки приоритетнее — редактируется в «Блоки на главной»). Карточка и галерея товара — белый фон + hairline-разделитель. Галерея — `products.gallery` (доп. кадры, БЕЗ главного), на карточке скраб по фото движением мыши. Скрипты: `scripts/import-tech.ts`, `scripts/import-used-acc.ts`, `scripts/iphone-gallery.ts` (доп. ракурсы iPhone с мвидео по source-id из JSON-импортов), `scripts/fill-missing-photos.ts` (фото с конкурентов DNS/MegaFon/re:Store/NiceApple/GBStore в наш Storage), `scripts/regenerate-skus.ts`, `scripts/seo-fill.ts`. Каталог = **317 товаров** (91 новых iPhone + 102 техника + 102 Б/У iPhone + 22 аксессуара). SIM по правилам: eSIM у 17/Air без указания, иначе по названию; `eSIM + SIM` у 16 и старше и всех Б/У (eSIM появился с iPhone XR).

### ЖЁСТКИЕ ПРАВИЛА (НЕ нарушать)
- **НЕ удалять и НЕ создавать товары/категории без явного разрешения** пользователя. Даже на «удали лишние» — сначала показать кандидатов и дождаться «да». Правки существующих товаров (фото, цены, опции, SIM) — можно.
- **Фильтры, описания, мета категорий — строго из админки/БД.** Никаких хардкод-конфигов и мок-данных на витрине.
- **Бенто: приоритет `custom_image_url`**, порядок не менять туда-обратно.
- **SEO-тексты писать через SEO-скилы** (`seo-content-writer`, `seo-meta-optimizer`, `seo-keyword-strategist`, `seo-schema`, `seo-fundamentals`; локальный SEO Белгород: купить/заказать/цена/гарантия/доставка/самовывоз). **Конкурентов в текстах не упоминать.** Цель — топ-1 по Белгороду. Заполнено: `short_description`+`meta_title`+`meta_description` у всех 317 (`seo-fill.ts`); полные HTML-описания (`description_html`) — в работе.

## Не реализовано

Персистентность корзины между сессиями. **Сделано (31.05.2026):** домен + HTTPS (`https://phonetrade31.ru`), реальный Supabase Auth + единый аккаунт владельца, запись заказов из корзины в БД, поиск. Детальный статус — в `README.md` → «Статус реализации».

## CRM, статусы заказов, режим тех.работ (сессия 31.05.2026 — важно)

**Единый реестр «Клиенты» (`customers`).** Любой, кто оставил номер (заказ, заявка trade-in/звонок/152-ФЗ, регистрация), попадает в `customers` через RPC `upsert_customer(p_phone,p_name,p_email,p_user_id,p_add_order_total)` (матч по **последним 10 цифрам** телефона — 8/+7 не двоят; синтетические `*@phonetrade.local` в email не пишет). Источники зовут RPC: `placeOrder`, `submitTradeInQuiz`, `submitDataRequest`, `registerStorefront`, `updateStorefrontProfile`, ручной заказ. Связи: `orders.customer_id`, `orders.user_id` (ставится при оформлении), `leads.customer_id`, `customers.user_id` (привязка к ЛК). Карточка клиента (`/admin/customers/[id]`) — табы Заказы/Обращения/Трейдин + признак регистрации + согласия (оферта/ПД/маркетинг из `data_consents`). Списки Клиенты/Заявки/Заказы — кликабельные строки (`ListRow`/`ListCard`), переход в карточку и обратно. Экспорт клиентов (`/admin/customers` → «Экспорт»): все / с кабинетом / с согласием на рассылку → CSV. Полное удаление заказов (с вычетом из статистики клиента и из ЛК), клиентов, заявок.

**Статусы заказов — настраиваемые.** Единый конфиг в `shop_settings.order_statuses` (фолбэк `DEFAULT_ORDER_STATUSES` в `src/lib/orders/statuses.ts`): `{key,label,customerLabel,color(HEX)}`. Геттер `getOrderStatusConfig()` (server). Настройка — `/admin/settings/orders` (доступна **только из раздела «Заказы»** — кнопка «Настройки»; в сайдбаре настроек пункта НЕТ): drag-n-drop порядок, выбор цвета **как в Hero** (`<input type=color>` + HEX), добавление/удаление. Смена статуса в карточке заказа — **выпадающий список со всеми статусами** (без жёсткой state-machine). ЛК показывает реальный статус с `customerLabel` и цветом (бейдж — inline-стиль `statusBadgeStyle(hex)`); старый 3-state `mapStatus` удалён. Бейджи статусов одинаковые в списке/карточке заказа и в ЛК.

**Режим тех.работ.** `shop_settings.general.maintenance`: посетители видят заглушку, вошедший админ (по `getAdminUser()` в `(site)/layout.tsx`) — обычный сайт + красная плашка сверху «закрыт для посетителей» со ссылкой выключить.

**Навигация админки:** «Бренды» — в разделе «Контент» (бегущая строка); «Скидки и акции» убраны из «Промо»; «Статусы заказов» в сайдбаре настроек НЕ дублируются.
