# Архитектура админки PhoneTrade — Промт для Claude Code

> Скопируй этот файл в проект (например, в `docs/admin-architecture.md`) и используй как спецификацию.
> Ниже описана **полная архитектура админ-панели** с подключением Supabase: все разделы, поля, связи с публичным сайтом и схема БД.

---

## 0. КОНТЕКСТ

Публичный сайт PhoneTrade уже сделан и включает:
- Главную (hero-карусель, bento-сетка категорий, новинки iPhone, trade-in блок, 3 шага обмена, 6 преимуществ, блог, полоса брендов, футер)
- Каталог категории (фильтры по модели/цвету/памяти, сортировка, карточки)
- Карточку товара (галерея, выбор памяти, цены наличные/картой, рассрочка, блоки доверия, сопутствующие)
- Корзину и чекаут (физ/юр лицо, СБП/карта/при получении/кредит, самовывоз/курьер, промокод, скидка за наличные)

**Задача админки:** дать менеджеру возможность управлять всем этим контентом, видеть заказы и аналитику, не трогая код.

---

## 1. СТЕК АДМИНКИ

- Next.js 16 App Router, route group `(admin)` → `/admin/*`
- Middleware-гард на проверку сессии (Supabase auth)
- Supabase self-hosted: `@supabase/ssr` (cookie-based auth) + service-role для server actions
- Tailwind v4, shadcn base-nova (та же дизайн-система что и сайт, но плотнее: таблицы, формы)
- react-hook-form + Zod для всех форм
- Recharts 3 для графиков
- Sonner (toast) — уведомления об успехе/ошибках
- Supabase Storage — все изображения (товары, баннеры, посты блога, лого брендов)
- Telegram Bot API + Nodemailer SMTP — уведомления о новых заказах/заявках

---

## 2. РАЗДЕЛЫ АДМИНКИ (структура сайдбара)

```
/admin
├── /                      Обзор (Dashboard)
├── /analytics             Аналитика
├── /orders                Заказы
├── /leads                 Заявки (trade-in, обратный звонок)
├── /catalog
│   ├── /products          Товары (новые + Б/У)
│   ├── /categories        Категории и фильтры
│   ├── /brands            Бренды (полоса над блогом)
│   └── /trade-in-prices   Базовые цены выкупа по моделям
├── /content
│   ├── /hero              Hero-баннер на главной (карусель)
│   ├── /bento             Bento-плитки "Каталог Apple"
│   ├── /trade-in-block    Trade-in промо-блок + 3 шага
│   ├── /advantages        6 преимуществ "Почему выбирают"
│   ├── /blog              Блог (посты + категории)
│   └── /pages             Статические страницы (О компании, Доставка, Гарантия, ...)
├── /promotions
│   ├── /promo-codes       Промокоды
│   └── /discounts         Правила скидок (скидка за наличные, акции)
├── /customers             Клиенты + история заказов
├── /settings
│   ├── /shop              Общие настройки (название, лого, контакты, часы)
│   ├── /navigation        Меню (верхнее, основное, футер)
│   ├── /delivery          Способы получения и зоны доставки
│   ├── /payment           Способы оплаты
│   ├── /seo               Глобальный SEO + sitemap + robots
│   ├── /notifications     Куда и кому слать уведомления
│   ├── /integrations      Telegram, SMTP, эквайринг, метрика
│   ├── /users             Пользователи админки + роли
│   └── /audit-log         Журнал действий
└── /media                 Медиа-библиотека (Supabase Storage)
```

---

## 3. ДЕТАЛЬНОЕ ОПИСАНИЕ РАЗДЕЛОВ

### 3.1. Обзор (`/admin`)

**Что показывает (виджеты дашборда):**
- 4 KPI-карточки сверху: продажи за период (₽), кол-во заказов, средний чек, конверсия (заказы / визиты)
- Переключатель периода: сегодня / 7 дней / 30 дней / квартал / произвольно
- График продаж по дням (Recharts AreaChart, ось X — даты, Y — выручка)
- График заказов по статусам (Donut)
- Топ-5 товаров за период (таблица: товар, продано штук, выручка)
- Топ-5 категорий
- Последние 10 заказов (мини-таблица: №, клиент, сумма, статус, время) → клик ведёт на карточку заказа
- Лента уведомлений: новые заявки trade-in, новые заказы, низкие остатки

### 3.2. Аналитика (`/admin/analytics`)

Углубление дашборда:
- **Продажи**: график по периодам, сравнение с прошлым периодом (% изменения)
- **Товары**: топ продаж, товары без продаж, остатки на минимуме
- **Категории**: распределение продаж по категориям
- **Источники трафика**: UTM-метки (utm_source/medium/campaign), реферры, прямые заходы
- **Воронка**: визиты → просмотр карточки → добавление в корзину → оформление заказа → оплата
- **Page views** (своя таблица tracking): топ-страниц, среднее время на странице
- **Поиск по сайту**: что искали клиенты, какие запросы без результатов (важно для пополнения каталога)
- Экспорт в CSV/Excel

### 3.3. Заказы (`/admin/orders`)

**Список заказов:**
- Колонки: № заказа, дата, клиент (имя/телефон), сумма, способ оплаты, способ получения, статус, действия
- Фильтры: статус, период, способ оплаты, способ получения, поиск по № или телефону
- Сортировка по дате/сумме
- Bulk-actions: смена статуса, экспорт выбранных

**Статусы заказа (state machine):**
```
новый → подтверждён → в сборке → готов к выдаче → выдан (для самовывоза)
                                ↘ передан в доставку → доставлен (для курьера)
                                ↘ отменён
```

**Карточка заказа (drawer или /admin/orders/[id]):**
- Шапка: № заказа, дата создания, текущий статус (с кнопками смены), сумма
- Блок "Клиент": тип (физ/юр), имя, телефон, email, ссылка на профиль клиента
- Блок "Состав заказа": список товаров (фото, название, кол-во, цена, итого), кнопка "+ Добавить товар" (на случай корректировки)
- Блок "Получение": тип (самовывоз/курьер), адрес, желаемое время
- Блок "Оплата": способ, статус оплаты (ожидание/оплачен/возврат), сумма скидки за наличные, промокод
- Блок "Итого": товары, скидка, доставка, итого
- Блок "История": журнал действий (изменение статуса, кто, когда, комментарий)
- Блок "Комментарии менеджера" (внутренние заметки)
- Кнопки: Распечатать счёт, Распечатать чек, Отправить уведомление клиенту, Отменить, Возврат

**Создание заказа вручную** (для звонков):
- Кнопка "+ Новый заказ" наверху списка
- Форма: телефон → поиск клиента или новый, состав корзины (поиск товаров с автодополнением), способ оплаты/получения

**Уведомления:**
- При создании заказа клиентом — автоматически в Telegram чат менеджеров + email
- При смене статуса — опционально клиенту (SMS/email)

### 3.4. Заявки (`/admin/leads`)

Все нецелевые обращения с сайта:
- **Trade-in заявки**: модель, состояние (заполненное клиентом), контакты, оценочная сумма, статус (новая/связались/оценка/принято/отказ)
- **Обратный звонок**: телефон, время для связи
- **Вопрос через FAQ** (если будет форма)
- **Заявка на ремонт** (если будет сервисная форма)

Карточка заявки: контакты, история коммуникации, конвертация в заказ (кнопка "Создать заказ из заявки").

### 3.5. Товары (`/admin/catalog/products`)

**Список товаров:**
- Колонки: фото-миниатюра, название, артикул, категория, цена наличные, цена картой, остаток, статус, бейджи
- Фильтры: категория, статус (опубликован/черновик/архив), наличие, бейджи, тип (новый/Б/У), поиск
- Bulk-actions: смена статуса, смена категории, изменение цен на %, экспорт

**Карточка товара (форма создания/редактирования):**

Разбита на вкладки:

**Вкладка "Основное":**
- Название (`iPhone 17 Pro 256GB Orange`)
- Slug (auto из названия, редактируется)
- Артикул / SKU (`IP17PRO-256-ORANGE`)
- Категория (select из дерева)
- Тип товара: Новый / Б/У (toggle)
- Бейджи (multi-select): Новинка, Без RuStore, Хит, Распродажа, Эксклюзив
- Краткое описание (1-2 строки, показывается в карточке списка)
- Полное описание (rich text editor — TipTap или плейн markdown)

**Вкладка "Цены и наличие":**
- Цена наличными `price_cash` (красная цена на сайте)
- Цена картой/безналом `price_card`
- Старая цена `price_old` (для зачёркивания, если идёт акция)
- Цена в рассрочку от `price_installment_from` (отображается "От 3500 ₽/мес")
- Партнёр рассрочки (Т-Банк / другой)
- Остаток на складе `stock` (число или "уточняйте")
- Минимальный остаток для алёрта `min_stock`
- Гарантия в месяцах `warranty_months` (12+12 у магазина = 12 + 12)
- Чекбокс "Доступен для заказа"

**Вкладка "Варианты" (для товаров с памятью/цветом):**
- Таблица вариантов: каждая строка = комбинация (Память + Цвет)
  - Память (128/256/512/1TB), Цвет (Black/Silver/Sage/Orange/Cloud White...), SKU варианта, цена нал, цена карта, остаток, фото варианта
- Кнопка "+ Добавить вариант"
- Если вариантов нет — товар продаётся как есть

**Вкладка "Галерея":**
- Drag-and-drop загрузка изображений в Supabase Storage (bucket `product-images`)
- Сортировка перетаскиванием
- Главное фото (первое)
- Опционально: фото для конкретного цвета/варианта
- Alt-текст для каждого фото

**Вкладка "Характеристики":**
- Таблица key-value (например: "Чипсет: A19 Pro", "Экран: 6.3 OLED", "Камера: 48 Мп тройная")
- Группировка (Дисплей / Процессор / Камера / Батарея / Связь)

**Вкладка "Состояние" (только для Б/У):**
- Текстовое описание состояния (например, "Ни разу не разбирался, полностью в оригинале, все функции работают")
- Аккумулятор `battery_health` (число 0-100)
- Категория состояния: Идеальное / Хорошее / Удовлетворительное (для фильтра)
- Фото "как есть" (отдельная галерея в дополнение к основной)

**Вкладка "SEO":**
- Meta title
- Meta description
- OG image (auto из главного фото или своя)
- Canonical URL
- Чекбокс "Индексировать"

**Вкладка "Связи":**
- Сопутствующие товары (related_products) — multi-select
- Если не указано — система сама подбирает из той же категории

**Импорт/экспорт:**
- Экспорт всего каталога в CSV/XLSX
- Импорт из CSV с предпросмотром изменений

### 3.6. Категории и фильтры (`/admin/catalog/categories`)

**Дерево категорий:**
- Корневые: iPhone, iPad, Mac, Apple Watch, AirPods, Аксессуары, Б/У техника
- У каждой могут быть подкатегории
- Drag-and-drop сортировка

**Карточка категории:**
- Название, slug, описание (показывается над списком товаров в каталоге)
- Родительская категория (для дерева)
- Изображение (для bento-плитки на главной)
- Иконка (для горизонтальной ленты-промо)
- SEO: meta title, description
- Порядок сортировки
- Статус (опубликована/скрыта)
- **Доступные фильтры (фасеты):** какие фильтры показывать в этой категории
  - Чекбоксы: Модель, Цвет, Память, Состояние, Аккумулятор, Цена, Бейджи
  - Для каждого фильтра — список значений (или авто из товаров категории)

**Связь с публичным сайтом:**
- Категории формируют верхнее меню (iPhone, iPad, Mac, Watch, AirPods, Аксессуары)
- Категории отображаются в bento-сетке на главной
- Фильтры категории — это то, что видит пользователь над списком товаров

### 3.7. Бренды (`/admin/catalog/brands`)

Полоса логотипов брендов над блогом (Beats, JBL, B&W, Garmin, DJI, Sony, Apple, Samsung):
- Название, slug
- Лого (SVG предпочтительно)
- Порядок
- Ссылка (на категорию или внешнюю)
- Статус

### 3.8. Цены выкупа Trade-in (`/admin/catalog/trade-in-prices`)

Таблица: Модель → Базовая цена выкупа в идеальном состоянии → Коэффициенты для состояний (хорошее/удовлетворительное/нерабочее).
Используется в публичной форме калькулятора trade-in на странице `/trade-in`.

### 3.9. Hero-баннер (`/admin/content/hero`)

**Управление каруселью на главной:**
- Список слайдов с превью
- Создание/редактирование слайда:
  - Надзаголовок (`Новинка осени`)
  - Заголовок (`iPhone 17 Pro`)
  - Описание (`Титановый корпус, чип A19 Pro и переработанная камера. От 99 000 ₽ наличными.`)
  - Текст кнопки (`Узнать подробнее`)
  - Ссылка кнопки (URL или товар/категория)
  - Изображение справа (загрузка в Storage)
  - Тема: Тёмный / Светлый
  - Период показа: с / по (опционально, для акций)
  - Порядок
  - Статус (активен/черновик)
- Drag-and-drop сортировка слайдов

### 3.10. Bento-плитки "Каталог Apple" (`/admin/content/bento`)

Крупные плитки на главной (iPhone, Mac, iPad, Apple Watch, Аксессуары):
- Для каждой плитки:
  - Привязка к категории (категория уже даёт заголовок и slug)
  - Кастомный заголовок (если нужно перебить категорийный)
  - Подзаголовок (`MacBook Air и Pro на Apple Silicon`)
  - Кастомное изображение (или auto из категории)
  - Размер плитки: large / medium / small (для bento-раскладки)
  - Тема: Тёмный / Светлый
  - Порядок

### 3.11. Trade-in блок и 3 шага (`/admin/content/trade-in-block`)

Тёмный промо-блок trade-in + секция "Как работает обмен техники":
- Заголовок блока (`Trade-in и выкуп старых устройств`)
- Описание
- Текст кнопки + ссылка
- Изображение
- Три шага (отдельно редактируются):
  - Каждый шаг: номер, заголовок (`Оценка устройства`), описание
  - Иконка (опционально)

### 3.12. Преимущества (`/admin/content/advantages`)

6 преимуществ "Почему выбирают PhoneTrade":
- Список карточек, каждая:
  - Иконка (выбор из lucide или загрузка)
  - Заголовок (`Только оригинал`)
  - Описание
  - Порядок

### 3.13. Блог (`/admin/content/blog`)

**Посты:**
- Список постов с фильтрами (категория, статус, дата, автор)
- Карточка поста:
  - Заголовок, slug
  - Обложка (Storage)
  - Категория (Гаджеты, iPhone, iPad, Mac, Apple Watch)
  - Теги
  - Короткий анонс (для карточки)
  - Контент (rich editor: TipTap с поддержкой картинок, видео, цитат, кода)
  - Автор
  - Дата публикации (можно отложенную)
  - Статус (черновик / опубликован / архив)
  - Счётчик просмотров (read-only)
  - SEO (meta title, description, og image)

**Категории блога:**
- Простая CRUD: название, slug, цвет тега

### 3.14. Статические страницы (`/admin/content/pages`)

CRUD для контентных страниц:
- О компании
- Доставка
- Гарантия
- Постоянным клиентам
- Контакты
- Trade-in (лендинг, отличный от блока на главной)
- Политика конфиденциальности
- Согласие на обработку ПД
- Публичная оферта
- Правила ремонтных работ

Каждая страница: title, slug, контент (rich editor), SEO, статус, дата обновления.

### 3.15. Промокоды (`/admin/promotions/promo-codes`)

- Код (`SUMMER2026`)
- Тип скидки: % / фиксированная сумма / бесплатная доставка
- Размер скидки
- Минимальная сумма заказа
- Период действия (с / по)
- Лимит использований (общий + на одного клиента)
- Применимость: ко всему / к категориям / к товарам / только новые клиенты
- Статус
- Счётчик использований

### 3.16. Скидки и акции (`/admin/promotions/discounts`)

Глобальные правила:
- **Скидка за наличные**: размер (₽ или %) — определяет разницу между `price_cash` и `price_card`. Сейчас фиксированная для всех товаров, но может быть кастомной на товар (поле в карточке товара).
- **Акции**: набор товаров с временной скидкой (старая цена зачёркнутая)
- **Бонусы постоянным клиентам**: накопительная скидка по сумме покупок

### 3.17. Клиенты (`/admin/customers`)

- Список клиентов: имя, телефон, email, кол-во заказов, общая сумма, последний заказ, статус (новый/постоянный/VIP)
- Поиск, фильтры
- Карточка клиента:
  - Контактные данные
  - История заказов
  - Накопленная сумма / бонусы
  - Заметки менеджера
  - Сегмент (для рассылок)

### 3.18. Настройки магазина (`/admin/settings/shop`)

- Название магазина
- Логотип (главное лого + favicon + apple-touch-icon)
- Юр.информация (ИНН, ОГРН, юр.адрес — для оферты и чеков)
- Физический адрес магазина (`Белгород, ул. Попова, 36 (Ун-г Белгород, 1 этаж)`)
- Координаты (lat/lng для встроенной Яндекс.Карты)
- Телефоны (основной + резервный)
- Email
- Часы работы (по дням недели или общее "Ежедневно 10:00–20:00")
- Соцсети (VK, WhatsApp, Telegram — URL и иконки)
- Город (Белгород) и регион доставки

### 3.19. Навигация (`/admin/settings/navigation`)

Три меню:
- **Верхнее меню (тонкая шапка)**: О компании, Блог, Доставка, Гарантия, Trade-in, Постоянным клиентам, Контакты — drag-and-drop порядок, ссылки, видимость
- **Главное меню (основная шапка)**: Все категории, Новинки, Б/У + категорийные пункты (iPhone, iPad, Mac, Watch, AirPods, Аксессуары) — обычно auto из категорий, но можно переопределить
- **Футер**: блоки ссылок с заголовками

### 3.20. Доставка (`/admin/settings/delivery`)

- Способы получения: Самовывоз (бесплатно), Курьер (от X ₽), Почта (опционально)
- Для курьера: зоны доставки (Белгород центр, область) с разной ценой
- Минимальная сумма для бесплатной доставки
- Время доставки (сегодня/завтра — правила)
- Адрес самовывоза (auto из настроек магазина)

### 3.21. Оплата (`/admin/settings/payment`)

Список доступных способов оплаты с тогглом включить/выключить:
- СБП (без комиссии, мгновенно) — провайдер (ЮKassa/Тинькофф)
- Банковская карта (Visa, Mastercard, Мир) — провайдер
- При получении (наличные или карта курьеру)
- Кредит / Рассрочка (Т-Банк) — параметры (мин.сумма, срок)

Для каждого: название, иконка, описание, статус, провайдер, ключи API (зашифровано).

### 3.22. SEO (`/admin/settings/seo`)

- Шаблон title (`%page% | PhoneTrade — Apple в Белгороде`)
- Дефолтное description
- Default OG image
- Sitemap.xml — авто-генерация (триггеры: новый товар/категория/пост → пересборка)
- Robots.txt — редактор
- Schema.org (организация: название, лого, адрес, телефон, часы — для rich snippets)
- 301-редиректы (старый URL → новый)
- 404-страница (что показывать)

### 3.23. Уведомления (`/admin/settings/notifications`)

Триггеры → каналы → получатели:
- **Новый заказ** → Telegram чат менеджеров + Email список
- **Новая заявка trade-in** → Telegram
- **Низкий остаток товара** → Email
- **Заказ оплачен** → Telegram
- **Отмена заказа** → Telegram + email клиенту

Для каждого триггера: шаблон сообщения (с подстановкой переменных), список получателей.

Поля настроек:
- Telegram Bot Token, chat_id-ы
- SMTP host/port/user/pass, from-адрес
- Список email-получателей по типам уведомлений

### 3.24. Интеграции (`/admin/settings/integrations`)

Конфигурация внешних сервисов:
- Эквайринг (ЮKassa / Тинькофф касса) — shop_id, secret_key
- Т-Банк рассрочка — merchant_id
- Яндекс.Метрика — counter_id (вставляется в `<head>`)
- Google Analytics 4 — measurement_id
- Яндекс.Карты API — ключ (для встроенной карты в футере)
- 1C / МойСклад (на будущее, если будет интеграция с учётной системой)

### 3.25. Пользователи админки (`/admin/settings/users`)

- Список пользователей: email, имя, роль, последний вход, статус
- Роли:
  - **Admin** — всё
  - **Manager** — заказы, заявки, клиенты, остатки (без настроек и финансов)
  - **Content** — контент, блог, страницы (без заказов и финансов)
- Приглашение по email
- 2FA (опционально)
- Сброс пароля

### 3.26. Журнал аудита (`/admin/settings/audit-log`)

Лог всех важных действий:
- Кто, что, когда, над чем
- Фильтры по пользователю/действию/типу сущности
- Read-only

### 3.27. Медиа-библиотека (`/admin/media`)

- Все загруженные файлы из Supabase Storage
- Buckets: `product-images`, `hero-slides`, `blog-covers`, `bento-tiles`, `brand-logos`, `og-images`, `general`
- Поиск, фильтры по bucket/типу/дате
- Drag-and-drop загрузка
- Просмотр, копирование URL, удаление (с проверкой использования)

---

## 4. СХЕМА БД (Supabase / PostgreSQL)

### Основные таблицы

```sql
-- Категории
categories (
  id uuid pk,
  slug text unique,
  parent_id uuid fk → categories.id,
  title text,
  description text,
  image_url text,
  icon_url text,
  meta_title text,
  meta_description text,
  available_filters jsonb,    -- ['model', 'color', 'memory', 'condition']
  sort_order int,
  is_published bool,
  created_at, updated_at
)

-- Товары
products (
  id uuid pk,
  slug text unique,
  sku text unique,
  category_id uuid fk → categories.id,
  title text,
  short_description text,
  description text,            -- rich content
  type text,                   -- 'new' | 'used'
  badges text[],               -- ['novinka', 'no_rustore', 'sale']
  price_cash numeric,
  price_card numeric,
  price_old numeric,
  installment_from numeric,
  installment_partner text,    -- 't-bank'
  warranty_months int,
  stock int,
  min_stock int,
  is_available bool,
  status text,                 -- 'draft' | 'published' | 'archived'
  -- для Б/У:
  condition_text text,
  condition_category text,     -- 'perfect' | 'good' | 'fair'
  battery_health int,
  -- характеристики:
  specs jsonb,                 -- {display: "6.3 OLED", chipset: "A19 Pro", ...}
  -- SEO:
  meta_title text,
  meta_description text,
  og_image_url text,
  canonical_url text,
  is_indexable bool,
  -- связи:
  related_product_ids uuid[],
  sort_order int,
  created_at, updated_at, published_at
)

-- Варианты товаров (память + цвет)
product_variants (
  id uuid pk,
  product_id uuid fk → products.id,
  memory text,                 -- '256GB'
  color text,                  -- 'Orange'
  color_hex text,              -- '#FF6B35'
  sku text unique,
  price_cash numeric,
  price_card numeric,
  stock int,
  image_url text,
  sort_order int
)

-- Изображения товаров
product_images (
  id uuid pk,
  product_id uuid fk → products.id,
  variant_id uuid fk → product_variants.id null,
  url text,
  alt text,
  sort_order int,
  is_primary bool
)

-- Бренды (полоса над блогом)
brands (
  id uuid pk,
  slug text unique,
  title text,
  logo_url text,
  link_url text,
  sort_order int,
  is_published bool
)

-- Цены выкупа trade-in
trade_in_prices (
  id uuid pk,
  model text,                  -- 'iPhone 15 Pro 256GB'
  base_price numeric,          -- цена в идеале
  coefficients jsonb,          -- {perfect: 1.0, good: 0.85, fair: 0.6, broken: 0.3}
  updated_at
)

-- Заказы
orders (
  id uuid pk,
  order_number text unique,    -- 'PT-2026-0001'
  customer_id uuid fk → customers.id null,
  customer_type text,          -- 'individual' | 'legal'
  customer_name text,
  customer_phone text,
  customer_email text,
  delivery_method text,        -- 'pickup' | 'courier'
  delivery_address text,
  delivery_date date,
  delivery_cost numeric,
  payment_method text,         -- 'sbp' | 'card' | 'on_delivery' | 'installment'
  payment_status text,         -- 'pending' | 'paid' | 'refunded'
  status text,                 -- 'new' | 'confirmed' | 'packing' | 'ready' | 'shipped' | 'delivered' | 'cancelled'
  promo_code text,
  subtotal numeric,
  discount_cash numeric,
  discount_promo numeric,
  total numeric,
  manager_notes text,
  utm jsonb,                   -- {source, medium, campaign, ...}
  created_at, updated_at
)

order_items (
  id uuid pk,
  order_id uuid fk → orders.id,
  product_id uuid fk → products.id,
  variant_id uuid fk → product_variants.id null,
  title text,                  -- снэпшот названия на момент покупки
  sku text,
  price_cash numeric,
  price_card numeric,
  applied_price numeric,       -- та цена что применилась с учётом способа оплаты
  quantity int,
  total numeric
)

order_status_history (
  id uuid pk,
  order_id uuid fk → orders.id,
  from_status text,
  to_status text,
  changed_by uuid fk → admin_users.id,
  comment text,
  created_at
)

-- Клиенты
customers (
  id uuid pk,
  phone text unique,
  name text,
  email text,
  customer_type text,          -- 'individual' | 'legal'
  legal_info jsonb,            -- для юр.лица: ИНН, КПП, название
  total_orders int,
  total_spent numeric,
  bonuses_balance numeric,
  segment text,                -- 'new' | 'regular' | 'vip'
  notes text,
  first_order_at, last_order_at, created_at
)

-- Заявки (trade-in, обратный звонок, прочее)
leads (
  id uuid pk,
  type text,                   -- 'trade_in' | 'callback' | 'question'
  contact_phone text,
  contact_name text,
  contact_email text,
  payload jsonb,               -- для trade-in: {model, condition, photos, estimated_price}
  status text,                 -- 'new' | 'in_progress' | 'converted' | 'rejected'
  assigned_to uuid fk → admin_users.id,
  notes text,
  source_url text,
  utm jsonb,
  created_at, updated_at
)

-- Промокоды
promo_codes (
  id uuid pk,
  code text unique,
  discount_type text,          -- 'percent' | 'fixed' | 'free_shipping'
  discount_value numeric,
  min_order_amount numeric,
  starts_at, expires_at,
  total_limit int,
  per_customer_limit int,
  used_count int,
  applies_to text,             -- 'all' | 'categories' | 'products'
  applies_to_ids uuid[],
  only_new_customers bool,
  is_active bool,
  created_at
)

-- Hero слайды
hero_slides (
  id uuid pk,
  overline text,
  title text,
  description text,
  button_text text,
  button_link text,
  image_url text,
  theme text,                  -- 'dark' | 'light'
  starts_at, expires_at,
  sort_order int,
  is_published bool
)

-- Bento плитки на главной
bento_tiles (
  id uuid pk,
  category_id uuid fk → categories.id,
  custom_title text,
  subtitle text,
  custom_image_url text,
  size text,                   -- 'large' | 'medium' | 'small'
  theme text,
  sort_order int,
  is_published bool
)

-- Trade-in блок и шаги
trade_in_block (
  id uuid pk,
  block_title text,
  block_description text,
  button_text text,
  button_link text,
  image_url text,
  is_published bool
)

trade_in_steps (
  id uuid pk,
  step_number int,
  title text,
  description text,
  icon text,
  sort_order int
)

-- Преимущества
advantages (
  id uuid pk,
  icon text,                   -- lucide icon name
  title text,
  description text,
  sort_order int,
  is_published bool
)

-- Блог
blog_posts (
  id uuid pk,
  slug text unique,
  title text,
  excerpt text,
  content text,                -- rich content
  cover_url text,
  category_id uuid fk → blog_categories.id,
  tags text[],
  author_id uuid fk → admin_users.id,
  views_count int,
  status text,                 -- 'draft' | 'published' | 'archived'
  meta_title text,
  meta_description text,
  og_image_url text,
  published_at, created_at, updated_at
)

blog_categories (
  id uuid pk,
  slug text unique,
  title text,
  color text,
  sort_order int
)

-- Статические страницы
static_pages (
  id uuid pk,
  slug text unique,
  title text,
  content text,
  meta_title text,
  meta_description text,
  status text,
  updated_at
)

-- Меню
menu_items (
  id uuid pk,
  menu_location text,          -- 'top' | 'main' | 'footer'
  parent_id uuid null,
  title text,
  link_url text,
  link_type text,              -- 'url' | 'category' | 'page'
  link_target_id uuid null,
  sort_order int,
  is_visible bool
)

-- Настройки магазина (одна запись, key-value)
shop_settings (
  key text pk,
  value jsonb
)
-- Примеры ключей: 'general', 'contacts', 'social', 'working_hours', 'delivery_zones', 'payment_methods'

-- SEO глобальный
seo_settings (
  key text pk,
  value jsonb
)

-- Уведомления конфиг
notifications_config (
  trigger text pk,             -- 'new_order' | 'new_lead' | 'low_stock'
  telegram_chat_ids text[],
  email_recipients text[],
  template text,
  is_enabled bool
)

-- Интеграции
integrations (
  key text pk,                 -- 'yookassa' | 'tbank' | 'metrika' | 'ga4'
  config jsonb,                -- ключи и параметры (зашифрованные)
  is_enabled bool
)

-- Редиректы
redirects (
  id uuid pk,
  from_path text unique,
  to_path text,
  status_code int,             -- 301 | 302
  is_active bool
)

-- Админ пользователи
admin_users (
  id uuid pk references auth.users.id,
  email text unique,
  full_name text,
  role text,                   -- 'admin' | 'manager' | 'content'
  is_active bool,
  last_login_at, created_at
)

-- Журнал аудита
admin_audit_log (
  id bigserial pk,
  user_id uuid fk → admin_users.id,
  action text,                 -- 'create' | 'update' | 'delete' | 'login' | 'status_change'
  entity_type text,            -- 'product' | 'order' | 'category' | ...
  entity_id uuid,
  changes jsonb,               -- diff
  ip_address inet,
  user_agent text,
  created_at
)

-- Аналитика просмотров
page_views (
  id bigserial pk,
  path text,
  referrer text,
  utm jsonb,
  session_id text,
  user_agent text,
  country text,
  city text,
  duration_ms int,
  created_at
)

-- Поиск по сайту (что искали)
search_queries (
  id bigserial pk,
  query text,
  results_count int,
  session_id text,
  created_at
)
```

### RLS (Row Level Security)
- Все таблицы — RLS включён
- Анонимный доступ: read-only на опубликованные товары/категории/посты/страницы
- `admin_users` имеют доступ согласно роли (admin = все, manager/content — подмножества)
- Заказы клиента видит сам клиент (по phone+session или после логина)

---

## 5. СВЯЗИ "АДМИНКА → ПУБЛИЧНЫЙ САЙТ"

| Что меняем в админке | Где это видно на сайте |
|---|---|
| Hero-слайды | Карусель на главной |
| Bento-плитки | Сетка "Каталог Apple" на главной |
| Категории | Главное меню, фильтрация в каталоге, bento, footer |
| Бренды | Полоса над блогом |
| Преимущества | Секция "Почему выбирают PhoneTrade" |
| Trade-in блок и шаги | Тёмный блок + "Как работает обмен" |
| Товары | Карточки в категориях, главной, сопутствующих, поиске |
| Варианты товара | Селекторы памяти и цвета на карточке товара |
| Состояние (Б/У) | Текст в карточке Б/У, фильтр в каталоге Б/У |
| Блог посты | Секция "Читай, смотри, действуй" + страница блога |
| Статические страницы | Ссылки в верхнем меню и футере |
| Промокоды | Поле "Использовать промокод" в чекауте |
| Скидка за наличные | Разница между red price и обычной ценой |
| Способы оплаты | Блок "Способ оплаты" в чекауте |
| Способы доставки | Блок "Способ получения" в чекауте |
| Контакты магазина | Шапка, футер, чекаут (адрес самовывоза), карта |
| Соцсети | Иконки в футере |
| SEO | Meta-теги всех страниц, sitemap.xml, robots.txt |
| Меню | Верхняя тонкая шапка, основная шапка, футер |

**Важно про кэш:** все админские мутации должны дёргать `revalidateTag(...)` Next.js для соответствующих тегов кэша, чтобы публичный сайт обновлялся сразу.

Теги кэша по типам:
- `tag:products`, `tag:product:{id}`
- `tag:categories`
- `tag:hero`, `tag:bento`, `tag:advantages`, `tag:trade-in`
- `tag:blog`, `tag:blog-post:{slug}`
- `tag:settings`, `tag:menu`

---

## 6. ДИЗАЙН АДМИНКИ

Та же эстетика что и сайт, но плотнее (это рабочий инструмент):
- Светлая тема по умолчанию, фон `#f5f5f7`, контент на белом
- Сайдбар слева тёмный `#1d1d1f` с белыми иконками (lucide) и активным состоянием
- Таблицы плотные, без лишнего воздуха, sticky-header
- Формы — двухколоночные где можно, label слева/сверху
- Модалки/drawer для быстрых действий, отдельные страницы для сложных форм
- Все кнопки и инпуты — base-nova
- Тосты Sonner снизу
- Хлебные крошки сверху каждой страницы
- Save indicator (автосейв или явная кнопка "Сохранить" в шапке формы)

---

## 7. ПОРЯДОК РАБОТЫ (что строить первым)

**Фаза 1 — Фундамент:**
1. Route group `(admin)`, layout с сайдбаром, middleware-гард
2. Supabase подключение (@supabase/ssr), auth-страница `/admin/login`
3. Таблица `admin_users`, роли, audit log
4. Базовая структура страниц (пустые с заголовками)

**Фаза 2 — Каталог:**
5. Категории (CRUD + дерево)
6. Товары (CRUD, вкладки формы, варианты, галерея)
7. Бренды

**Фаза 3 — Заказы:**
8. Таблица orders + order_items
9. Список и карточка заказа, смена статусов
10. Уведомления в Telegram при новом заказе
11. Заявки (leads)

**Фаза 4 — Контент главной:**
12. Hero, Bento, Advantages, Trade-in block, Steps

**Фаза 5 — Блог и страницы:**
13. Блог посты + категории + rich editor
14. Статические страницы

**Фаза 6 — Настройки:**
15. Shop settings, navigation, delivery, payment
16. SEO, integrations, notifications

**Фаза 7 — Аналитика:**
17. Page views tracking на публичном сайте
18. Dashboard, аналитика
19. Клиенты, промокоды

---

## 8. ВАЖНЫЕ НЮАНСЫ

- **Все формы — server actions** (Next 16 App Router), не client-side fetch
- **Все списки — пагинация на сервере** (Supabase range), не загружать всё разом
- **Изображения — `next/image` с remotePatterns на Supabase Storage домен**
- **Цены — `numeric` в БД, форматирование через `formatPrice()` хелпер**
- **Slug — авто из title транслитерацией, но редактируемый**
- **Дата/время — храним в UTC, показываем в МСК (`Europe/Moscow`)**
- **Загрузка файлов — через signed upload URL Supabase**
- **Удаления — soft delete (поле `deleted_at`) где это критично (товары, заказы), hard delete где не критично (медиа, лиды)**
- **Версионирование контента** опционально для блога/страниц (revisions)
- **Превью изменений** перед публикацией для контентных страниц и постов

---

## 9. ЧТО ОТВЕТИТЬ КОГДА ВСЁ ГОТОВО

После реализации сообщи:
- URL `/admin/login`
- Креды первого admin-пользователя (создай в seed)
- Список нереализованного (если что-то осталось на фазу N+1)
- Скриншоты ключевых страниц через `chrome-devtools` / `playwright`
