# Admin Panel — план реализации и журнал решений

> Рабочий трекер сборки админки PhoneTrade. Живёт рядом со спецификацией
> [`admin-architecture.md`](./admin-architecture.md). Спека — это *что* строим;
> этот файл — *как* строим, *какие решения приняты* и *что уже готово*.
> **Каждая сессия: сначала читай раздел «Прогресс», продолжай с первой невыполненной задачи.**

---

## 1. Understanding Lock (зафиксировано с заказчиком)

- **Что:** полная админ-панель (`/admin/*`, route group `(admin)`), ~27 разделов, 7 фаз, на self-hosted Supabase. Менеджер управляет всем контентом сайта без кода.
- **Зачем:** убрать зависимость контента/каталога/заказов от правок в коде.
- **Для кого:** менеджеры магазина (роли admin / manager / content).
- **Объём сессии:** строим всё (7 фаз), но реалистично — за несколько сессий. Фаза 1 + полный набор миграций + скелет всех разделов делаются первыми, дальше — по трекеру.
- **Non-goals:** не ломать публичный сайт; не вводить вторую дизайн-систему; не трогать прод-БД без ревью миграций.

## 2. Decision Log

| # | Решение | Альтернативы | Почему так |
|---|---------|--------------|-----------|
| D1 | **Аддитивная схема БД.** Живые `categories`/`products`/`orders`/`order_items`/`profiles` не ломаем — расширяем колонками + добавляем новые admin-таблицы. | Полная миграция на uuid-схему спеки. | Прод-сайт читает эти таблицы. Аддитив = ноль простоя, плавный маппинг. |
| D2 | **Миграции: файлы → ревью → применение.** SQL в `supabase/migrations/`, применяем к живой БД (MCP/psql) только после одобрения. | Применять сразу через MCP. | Прод-БД. Не трогаем вслепую. |
| D3 | **UI на `@base-ui-components/react` + токены `globals.css`.** Дизайн-скилы: `minimalist-ui`, `high-end-visual-design`. | shadcn base-nova (как буквально в спеке). | Единая дизайн-система с сайтом, 0 новых UI-зависимостей, требование README. |
| D4 | **Admin-auth = реальный Supabase Auth (email+пароль) через `@supabase/ssr`.** Отдельно от публичного localStorage-мока (`AuthProvider`). | Расширять localStorage-мок. | Админке нужна серверная сессия + RLS по ролям. |
| D5 | **Гард сессии в `middleware.ts`** (обновление cookie) + проверка роли в layout/server actions через `admin_users`. | Только клиентский гард. | Безопасность: публичный сайт защищать нельзя клиентом. |
| D6 | **Все мутации — server actions + `revalidateTag`.** Списки — серверная пагинация (Supabase `range`). | client fetch / загрузка всего. | Спека §8; консистентность кэша сайта. |
| D7 | **Soft-delete** (`deleted_at`) для товаров/заказов; hard-delete для медиа/лидов. | Везде hard-delete. | Спека §8; восстановимость критичных сущностей. |
| D8 | **Storage-бакеты** под изображения: `product-images`, `hero-slides`, `blog-covers`, `bento-tiles`, `brand-logos`, `og-images`, `general`. Загрузка через signed upload URL. | base64 в БД / внешний CDN. | Спека §3.27, §8. |

## 3. Аддитивная реконсиляция схемы

Живые таблицы (НЕ трогаем существующие колонки):

- `categories(slug pk, id, title, image, subtitle, sort)` →
  **+** `parent_slug`, `description`, `icon_url`, `meta_title`, `meta_description`,
  `available_filters jsonb`, `is_published bool default true`, `updated_at`.
- `products(id pk text, …, price_cash int, price_card int, …)` →
  **+** `slug`, `sku`, `short_description`, `type`, `badges text[]`, `price_old`,
  `installment_from`, `installment_partner`, `warranty_months`, `stock`, `min_stock`,
  `is_available`, `status text default 'published'`, `condition_text`,
  `condition_category`, `meta_title`, `meta_description`, `og_image_url`,
  `canonical_url`, `is_indexable bool default true`, `related_product_ids text[]`,
  `updated_at`, `published_at`, `deleted_at`.
  *(существующие `model/color/memory/badge/condition/battery/gallery/specs` остаются — сайт продолжает их читать; новые поля заполняются по мере редактирования)*
- `orders(id pk text, user_id, phone, status, delivery, total, created_at)` →
  **+** `order_number`, `customer_id`, `customer_type`, `customer_name`,
  `customer_email`, `delivery_method`, `delivery_address`, `delivery_date`,
  `delivery_cost`, `payment_method`, `payment_status`, `promo_code`, `subtotal`,
  `discount_cash`, `discount_promo`, `manager_notes`, `utm jsonb`, `updated_at`,
  `deleted_at`. Статус-словарь расширяем (new/confirmed/packing/ready/shipped/delivered/cancelled).
- `order_items(… price_cash)` → **+** `variant_id`, `sku`, `price_card`,
  `applied_price`, `total`.
- `profiles` — без изменений (публичный кабинет).

Новые таблицы (как в спеке §4): `product_variants`, `product_images`, `brands`,
`trade_in_prices`, `order_status_history`, `customers`, `leads`, `promo_codes`,
`hero_slides`, `bento_tiles`, `trade_in_block`, `trade_in_steps`, `advantages`,
`blog_posts`, `blog_categories`, `static_pages`, `menu_items`, `shop_settings`,
`seo_settings`, `notifications_config`, `integrations`, `redirects`, `admin_users`,
`admin_audit_log`, `page_views`, `search_queries`.

**ID-стратегия:** новые таблицы — `uuid default gen_random_uuid()`. Ссылки на
существующие `products.id`/`orders.id` — `text` (под живой формат). FK на категории —
по `slug` (под живой pk).

**RLS:** публичный `select` на опубликованный контент (как сейчас). Запись/чтение
служебных таблиц — только для админов через helper `public.is_admin()` (есть запись в
`admin_users` с `is_active`). Service-role (server actions) обходит RLS.

## 4. Карта файлов (целевая)

```
src/lib/supabase/
  client.ts            # (есть) публичный anon — НЕ трогаем
  server.ts            # (нов) @supabase/ssr серверный клиент (cookies)
  admin.ts             # (нов) service-role клиент для server actions
  middleware.ts        # (нов) updateSession для гарда
  admin-types.ts       # (нов) row<->domain мапперы admin-сущностей
middleware.ts          # (нов, корень) вызывает updateSession, матчер /admin
src/app/(admin)/
  layout.tsx           # каркас: сайдбар + topbar + breadcrumbs, проверка роли
  login/page.tsx       # /admin/login (вне гарда)
  page.tsx             # дашборд
  <раздел>/page.tsx    # все разделы из §2 спеки
src/components/admin/
  AdminSidebar.tsx, AdminTopbar.tsx, Breadcrumbs.tsx, DataTable.tsx,
  ui/ (AdminButton, Input, Select, Switch, Field, …) — плотные admin-варианты
src/lib/admin/
  auth.ts (requireAdmin/role), audit.ts (writeAudit), nav.ts (структура меню)
supabase/migrations/   # нумерованные .sql
```

## 5. Прогресс (обновлять каждую сессию!)

Легенда: ⬜ не начато · 🟦 в работе · ✅ готово · 🧪 нужно ревью/тест

### Фаза 0 — Подготовка
- ✅ Изучены spec + README + CLAUDE.md, зафиксированы решения (D1–D8)
- ✅ Дизайн-док + план в `docs/`
- ✅ Зависимости: `@supabase/ssr`, `react-hook-form`, `zod`, `recharts`, `sonner`, `@hookform/resolvers`; `seed`/`seed:admin` в package.json
- ✅ Миграции `0001..0007` **применены к живой БД** (через MCP `execute_sql`): +26 таблиц, 7 Storage-бакетов, 60 RLS-политик; прод-сайт не затронут (44 товара / 7 категорий читаются)

### Фаза 1 — Фундамент
- ✅ supabase клиенты: `server.ts` (@supabase/ssr cookie), `admin.ts` (service-role)
- ✅ `src/proxy.ts` (Next 16 — бывший middleware) гард сессии, матчер `/admin/:path*`, исключение `/admin/login`
- ✅ Route split: публичные маршруты → `(site)`, админка → `admin/(panel)` (URL не изменились); root layout минимизирован
- ✅ Admin layout: тёмный сайдбар `AdminSidebar`, topbar+breadcrumbs `AdminTopbar`, shell `AdminShell` (sonner Toaster), примитивы `components/admin/ui.tsx`
- ✅ `/admin/login` (email+пароль, Supabase Auth, RHF+zod, server action `signInAction`)
- ✅ `admin_users` + роли + helper `requireAdmin()`/`getAdminUser()` + гейтинг навигации по роли (`nav.ts`)
- ✅ audit-log helper `writeAudit()` + запись login/logout
- ✅ Стаб-страницы всех 26 разделов + дашборд с live-счётчиками (graceful до миграций)
- ✅ `npm run build` зелёный; гард проверен (`/admin` → 307 `/admin/login`); полный логин→дашборд проверен в браузере (`.screenshots/admin-login.png`, `admin-dashboard.png`)
- ✅ Первый admin создан: `owner@phonetrade.ru` (роль admin). Пароль выдан заказчику — сменить после входа в разделе «Пользователи» (Фаза 6)

### Фаза 2 — Каталог ✅
- ✅ Общая инфра: form-примитивы, table, ListControls (поиск/фильтр/пагинация), DeleteButton, ImageField + upload-action, slug-util, adminMutation (audit+revalidate)
- ✅ Категории (CRUD + дерево + lock slug + guard на удаление) · ✅ Бренды (CRUD + logo upload) · ✅ Товары (список с фильтрами/пагинацией + форма с вкладками + soft-delete)
- ✅ Публичные геттеры фильтруют status=published + deleted_at is null
- ⬜ Варианты товара (память/цвет) и мульти-галерея — следующий заход

### Фаза 3 — Заказы (в основном готово)
- ✅ Заказы: список (фильтры/поиск/пагинация) + карточка (состав, клиент, доставка/оплата, итого) + state-machine статусов + order_status_history + заметки
- ✅ Leads: список (фильтры) + карточка (контакты, payload, смена статуса, заметки, удаление)
- ✅ Telegram-helper (`lib/admin/telegram.ts`) + уведомление при отмене заказа
- ⬜ Ручное создание заказа · ⬜ конвертация lead→заказ · ⬜ запись заказов из корзины в БД (+ Telegram при новом заказе)

### Фаза 4 — Контент главной ✅ (кроме trade-in публичной отрисовки)
- ✅ Hero, Advantages, Trade-in блок+шаги, **Bento-плитки** — все CRUD в админке
- ✅ Публичная отрисовка из БД с фолбэком (`src/lib/content.ts`): Hero, Advantages (WhyAndFaq), Brands (BrandMarquee) — пустые таблицы → дефолтный контент
- ⬜ TradeInPromo/TradeInSteps и Bento публично из БД (пока хардкод-дефолты)

### Фаза 5 — Блог и страницы ✅
- ✅ Статические страницы (CRUD + статус + SEO) + публичный роут `(site)/[slug]` (закрывает /about, /delivery, /warranty…)
- ✅ Блог: категории + посты (CRUD) + **TipTap rich-editor** (`components/admin/RichEditor.tsx`) + публичные `(site)/blog` и `(site)/blog/[slug]`

### Фаза 6 — Настройки ✅
- ✅ Магазин, Пользователи, Медиа, Журнал аудита
- ✅ delivery, payment, SEO, integrations (секреты по ключам), notifications (триггеры), navigation (меню CRUD)

### Фаза 7 — Аналитика ✅ (кроме скидок)
- ✅ Промокоды (CRUD) · ✅ Клиенты (список + карточка)
- ✅ page_views трекинг на сайте (`PageViewTracker`) · ✅ графики (Recharts): дашборд «Выручка 30 дней», аналитика «Просмотры по дням» + топ-страниц + поиск
- ✅ Скидки/акции (settings key 'discounts')

## 5b. Heavy-блок — ВЫПОЛНЕНО
- ✅ Варианты товара (память/цвет) + мульти-галерея: вкладки в форме товара (edit) + `variant-actions.ts` (product_variants/product_images)
- ✅ Ручное создание заказа `/admin/orders/new` + «Создать заказ из заявки» (lead→order, prefill)
- ✅ Запись заказов из корзины в БД + Telegram при новом заказе (`lib/cart/order-actions.ts` `placeOrder`, вызывается из `CartShell`; localStorage-история сохранена)
- ✅ Публичная отрисовка из БД: Hero, Advantages, Brands, **Trade-in блок+шаги**, Блог, статические страницы, контакты шапки/футера (seed:content залил данные)
- ⏳ Bento на главной берёт категории из БД (таблица bento_tiles доступна в админке, но домашний BentoCategories пока по категориям) — опционально
- ⏳ **Реальный Supabase Auth публичного кабинета** — требует SMS-провайдера для входа по телефону (не настроен). Сейчас localStorage-мок (`AuthProvider`); таблицы profiles/orders готовы. Альтернатива — вход по email+паролю; нужно решение заказчика.

## 5c. Сиды контента
- `npm run seed:content` — заливает hero/advantages/brands/trade-in/блог/страницы/настройки (идемпотентно). Источник «реальных» данных для публичного сайта.

## 6. Заметки для применения миграций к проду

Применять после ревью одним из:
- MCP: `mcp__phonetrade-supabase__apply_migration` (по файлу).
- psql: `ssh root@31.129.97.8 "docker exec -i supabase-db psql -U postgres -d postgres" < supabase/migrations/NNNN.sql`.

После схемы: пересеять/дозаполнить новые поля, создать Storage-бакеты, завести первого
admin (`supabase.auth.admin.createUser` + строка в `admin_users`).
