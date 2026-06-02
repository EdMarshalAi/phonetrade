# Промт для Claude Code — Модуль маркетинговых рассылок PhoneTrade

> Скопируй в проект (`docs/email-marketing.md`) и используй как промт.
> Цель — собрать раздел «Рассылки» в админке: кампании (ручные), 7 триггеров (автоматические), 8 готовых шаблонов, 7 сегментов, аналитика.

---

## 0. ЦЕЛЬ И КОНТЕКСТ

В админке под разделом «Промо» появляется новый раздел **«Рассылки»**. SMTP уже подключен (используем его). Email уже обязателен при регистрации/восстановлении пароля — это база для рассылок.

**Что делаем:**
1. **Ручные кампании** — менеджер сам отправляет письма по сегментам (анонсы, акции)
2. **7 триггерных сценариев** — автоматические письма по событиям
3. **8 готовых шаблонов** с подстановкой текста и картинок (БЕЗ drag-and-drop редактора)
4. **7 предустановленных сегментов** клиентов (без конструктора)
5. **База подписчиков** с управлением согласиями
6. **Аналитика** рассылок

**Что НЕ делаем сейчас:**
- ❌ Drag-and-drop редактор писем
- ❌ Конструктор кастомных сегментов
- ❌ Интеграция с транзакционными сервисами (UniSender/Mailgun) — оставляем абстракцию `EmailSender` для будущего переключения
- ❌ Импорт старой базы (нет её)

---

## 1. ОБЯЗАТЕЛЬНЫЕ СКИЛЫ И MCP

Перед каждой фазой `view` и применяй:

| Что делаем | Скилы |
|---|---|
| Любой UI | `frontend-design`, `frontend-dev-guidelines`, `hig-foundations`, `hig-patterns`, `ui-ux-pro-max`, `core-components`, `shadcn`, `baseline-ui`, `tailwind-design-system` |
| Списки кампаний и триггеров | + `kpi-dashboard-design` (для аналитических плиток) |
| Превью шаблонов | + `responsive-design`, `email-design-patterns` если есть |
| Финальная проверка | `ui-visual-validator`, `ui-refactor` |

**MCP:**
- `magic` — для генерации визуальных шаблонов писем (8 шаблонов, 2-3 варианта каждого)
- `chrome-devtools` — финальная проверка админки, скриншоты

---

## 2. АРХИТЕКТУРА БД

### 2.1. Новые таблицы

```sql
-- Шаблоны писем
create table if not exists email_templates (
  id uuid pk default gen_random_uuid(),
  slug text not null unique,                -- 'welcome', 'abandoned_cart_1', 'birthday'
  name text not null,                       -- 'Приветственное письмо'
  category text not null,                   -- 'transactional' | 'marketing' | 'trigger'
  
  -- Содержимое
  subject text not null,                    -- тема письма (с подстановкой {{var}})
  preview_text text,                        -- превью-текст в почте (под темой)
  html_content text not null,               -- HTML тело
  text_content text,                        -- plain-text версия для bounce-fallback
  
  -- Переменные шаблона
  variables jsonb default '[]',             -- ['customer.name', 'order.number', ...] для валидации
  
  -- Метаданные
  is_system bool default false,             -- системный шаблон (нельзя удалить)
  is_active bool default true,
  thumbnail_url text,                       -- скриншот превью для админки
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by uuid references admin_users(id) null
);

-- Кампании (ручные рассылки)
create table if not exists email_campaigns (
  id uuid pk default gen_random_uuid(),
  name text not null,                       -- внутреннее имя для менеджера
  template_id uuid references email_templates(id),
  
  -- Кому отправляем
  segment_slug text,                        -- 'all' | 'active' | 'vip' | 'dormant' | ...
  recipient_count int default 0,            -- снапшот количества при отправке
  
  -- Кастомизация шаблона для этой кампании
  subject_override text,
  preview_text_override text,
  content_overrides jsonb,                  -- {hero_image_url: '...', cta_text: '...', body_text: '...'}
  
  -- Расписание
  status text default 'draft' check (
    status in ('draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed')
  ),
  scheduled_at timestamptz,
  sent_at timestamptz,
  
  -- Метаданные
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references admin_users(id) null
);

-- Триггерные сценарии (конфигурация)
create table if not exists email_triggers (
  id uuid pk default gen_random_uuid(),
  slug text not null unique,                -- 'abandoned_cart_1h', 'welcome_1', ...
  name text not null,
  description text,
  
  -- Логика запуска
  event_type text not null,                 -- 'cart_abandoned' | 'order_placed' | 'order_delivered' | 'user_registered' | 'birthday' | 'days_after_purchase'
  delay_minutes int not null default 0,     -- задержка между событием и отправкой
  
  -- Какой шаблон отправлять
  template_id uuid references email_templates(id) not null,
  
  -- Цепочка (для multi-step триггеров типа welcome series)
  parent_trigger_id uuid references email_triggers(id) null,
  step_in_chain int default 1,
  
  -- Условия отправки (jsonb для гибкости)
  conditions jsonb default '{}',            -- { product_category: 'iphone', min_order_amount: 50000, etc. }
  
  -- Лимиты
  send_in_quiet_hours bool default false,   -- разрешить отправку в 22-08
  cooldown_hours int default 0,             -- минимум часов между двумя отправками одному клиенту
  max_sends_per_user int default 1,         -- сколько раз максимум одному клиенту
  
  -- Статус
  is_active bool default true,
  
  -- Метаданные
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by uuid references admin_users(id) null
);

-- Лог всех отправленных писем
create table if not exists email_sends_log (
  id bigserial pk,
  
  -- Что отправили
  campaign_id uuid references email_campaigns(id) null,
  trigger_id uuid references email_triggers(id) null,
  template_id uuid references email_templates(id),
  
  -- Кому
  customer_id uuid references customers(id) null,
  recipient_email text not null,
  recipient_name text,
  
  -- Что именно (снапшоты)
  subject text not null,
  body_html text,                           -- финальный HTML с подставленными переменными
  
  -- Статусы
  status text not null default 'queued' check (
    status in ('queued', 'sending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed')
  ),
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  failure_reason text,
  
  -- Аналитика
  open_count int default 0,                 -- сколько раз открыто (трекер)
  click_count int default 0,
  
  created_at timestamptz default now()
);

create index idx_email_sends_customer on email_sends_log(customer_id, created_at desc);
create index idx_email_sends_status on email_sends_log(status);
create index idx_email_sends_campaign on email_sends_log(campaign_id);
create index idx_email_sends_trigger on email_sends_log(trigger_id);
create index idx_email_sends_recent on email_sends_log(created_at desc);

-- Сегменты клиентов (предустановленные, динамические)
-- НЕ создаём отдельную таблицу — сегменты вычисляются SQL-функциями
-- См. раздел 5

-- Очередь отправки (для триггеров с задержкой)
create table if not exists email_queue (
  id bigserial pk,
  trigger_id uuid references email_triggers(id),
  customer_id uuid references customers(id) null,
  recipient_email text not null,
  template_id uuid references email_templates(id),
  variables jsonb,                          -- готовые переменные для подстановки
  
  scheduled_at timestamptz not null,        -- когда отправить
  attempts int default 0,
  max_attempts int default 3,
  
  status text default 'pending' check (
    status in ('pending', 'processing', 'sent', 'failed', 'cancelled')
  ),
  failure_reason text,
  processed_at timestamptz,
  
  -- Дедупликация (один триггер один раз для одной сущности)
  dedup_key text,                           -- 'cart:abc123:abandoned_1h'
  
  created_at timestamptz default now()
);

create index idx_email_queue_pending on email_queue(scheduled_at) where status = 'pending';
create unique index idx_email_queue_dedup on email_queue(dedup_key) where dedup_key is not null;

-- Логи открытий и кликов (для tracking pixel и redirect-ссылок)
create table if not exists email_tracking (
  id bigserial pk,
  send_id bigint references email_sends_log(id) on delete cascade,
  event_type text not null check (event_type in ('open', 'click', 'unsubscribe')),
  url text,                                 -- для клика
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);

create index idx_tracking_send on email_tracking(send_id);
```

### 2.2. RLS

- Все таблицы — read/write только для `owner`, `admin`, `manager`
- `email_sends_log` — клиент может видеть **свои** письма по `customer_id` через личный кабинет (опционально, см. раздел 9)
- `email_tracking` — read только админка

---

## 3. EMAILSENDER АБСТРАКЦИЯ

Создай `src/lib/email/sender.ts`:

```ts
type SendOptions = {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
  metadata?: { sendId?: number; templateSlug?: string; };
};

interface EmailSender {
  send(options: SendOptions): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendBatch(batch: SendOptions[]): Promise<Array<{ success: boolean; messageId?: string; error?: string }>>;
}

// Реализация через SMTP (nodemailer)
export class SmtpEmailSender implements EmailSender {
  constructor(private config: { host: string; port: number; user: string; pass: string; from: string }) {}
  
  async send(options: SendOptions) {
    // ... через nodemailer
    // Добавляет tracking pixel в HTML если trackOpens
    // Заменяет все href ссылки на /api/email/track-click?send_id=X&url=... если trackClicks
  }
  
  async sendBatch(batch: SendOptions[]) {
    // Отправка пачками с задержкой (не больше 30 писем в минуту по умолчанию)
  }
}

// Будущая реализация для UniSender Go (заглушка пока)
export class UnisenderGoEmailSender implements EmailSender {
  // ... когда понадобится
}

// Фабрика
export function getEmailSender(): EmailSender {
  const provider = process.env.EMAIL_PROVIDER ?? 'smtp';
  if (provider === 'smtp') {
    return new SmtpEmailSender({
      host: process.env.SMTP_HOST!,
      port: parseInt(process.env.SMTP_PORT!),
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
      from: process.env.SMTP_FROM!,
    });
  }
  throw new Error(`Unknown email provider: ${provider}`);
}
```

Использование во всём коде:

```ts
import { getEmailSender } from '@/lib/email/sender';

const sender = getEmailSender();
await sender.send({
  to: customer.email,
  subject: 'Ваш заказ #ORD-2026-1024 подтверждён',
  html: renderedTemplate,
});
```

Когда захочешь переключиться на UniSender — просто меняешь `EMAIL_PROVIDER=unisender_go` в `.env`, остальной код не трогается.

---

## 4. ШАБЛОНЫ ПИСЕМ (8 готовых)

### 4.1. Подход

**НЕ делаем drag-and-drop редактор.** Делаем 8 готовых HTML-шаблонов с **подстановкой через переменные**. Менеджер может изменить:
- Тему письма
- Превью-текст
- Заголовки и тексты (через `<textarea>`)
- Картинки (загрузка через `<input type="file">` в Supabase Storage или вставка URL)
- Цены / промокоды (поля)

**Структура шаблона:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    /* Inline-стили обязательно (большинство почтовиков срезают <style>) */
    /* Apple-эстетика: серый фон #f5f5f7, контент белый, акцент чёрный */
  </style>
</head>
<body style="margin: 0; background: #f5f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 32px;">
    <!-- Логотип -->
    <div style="text-align: center; padding: 16px 0;">
      <img src="https://phonetrade.ru/logo-email.png" alt="PhoneTrade" width="120">
    </div>
    
    <!-- {{HERO_BLOCK}} -->
    <!-- {{BODY_BLOCK}} -->
    <!-- {{CTA_BLOCK}} -->
    
    <!-- Футер -->
    <div style="text-align: center; padding: 24px 0; border-top: 1px solid #e5e5e7; margin-top: 32px;">
      <p style="font-size: 12px; color: #86868b;">
        PhoneTrade · Универмаг Белгород, ул. Попова 36<br>
        +7 904 098-88-77 · phonetrade.ru
      </p>
      <p style="font-size: 12px; color: #86868b;">
        Если письма больше не нужны — <a href="{{unsubscribe_url}}" style="color: #86868b;">отписаться</a>
      </p>
    </div>
  </div>
</body>
</html>
```

### 4.2. Список 8 шаблонов

Создать через миграцию + сидинг:

| Slug | Название | Категория | Когда используется |
|---|---|---|---|
| `welcome_1` | Приветственное | trigger | Регистрация (сразу) |
| `welcome_2` | Помощь в выборе | trigger | +2 дня после регистрации |
| `welcome_3` | Trade-in реклама | trigger | +5 дней после регистрации |
| `order_confirmation` | Подтверждение заказа | transactional | После оформления |
| `order_shipped` | Заказ отправлен | transactional | Смена статуса на shipped |
| `abandoned_cart_1` | Брошенная корзина — напоминание | trigger | +1 час после abandon |
| `abandoned_cart_2` | Брошенная корзина — с подборкой | trigger | +24 часа |
| `abandoned_cart_3` | Брошенная корзина — с промокодом | trigger | +72 часа |
| `review_request` | Просьба об отзыве | trigger | +7 дней после получения |
| `cross_sell_iphone` | Аксессуары к iPhone | trigger | +5 дней после покупки iPhone |
| `birthday` | С днём рождения | trigger | За 7 дней / в день |
| `campaign_promo` | Универсальный промо | marketing | Для ручных кампаний |
| `campaign_newsletter` | Новости и новинки | marketing | Для ручных кампаний |
| `campaign_minimal` | Минималистичное | marketing | Для важных сообщений |

(8 уникальных типов, но шаблонов получается 14 строк — это нормально, welcome-серия = 3 шт., брошенная корзина = 3 шт.)

### 4.3. Переменные

Поддерживаемые переменные (доступны во всех шаблонах):

```
Клиент:
  {{customer.name}} - имя
  {{customer.email}} - email
  {{customer.first_name}} - имя без фамилии

Заказ:
  {{order.number}} - ORD-2026-1024
  {{order.total}} - 96 000 ₽
  {{order.items_count}} - 3
  {{order.items}} - HTML-список товаров с фото
  {{order.tracking_number}} - трек-номер
  {{order.tracking_url}} - ссылка трекинга

Корзина:
  {{cart.items}} - HTML-список товаров
  {{cart.total}} - сумма
  {{cart.url}} - ссылка возврата к корзине

Промокод:
  {{promo.code}} - SAVE10
  {{promo.discount}} - 10% / 1000 ₽
  {{promo.valid_until}} - до 31.12.2026

Магазин:
  {{shop.name}} - PhoneTrade
  {{shop.phone}} - +7 904 098-88-77
  {{shop.address}} - Универмаг Белгород, ул. Попова 36
  {{shop.url}} - https://phonetrade.ru

Служебные:
  {{unsubscribe_url}} - обязательная ссылка отписки
  {{view_in_browser_url}} - открыть в браузере
```

### 4.4. Через `magic` MCP

Сгенерируй визуально 2-3 варианта каждого из 14 шаблонов (можно по группам — 1 вариант "welcome" покрывает все 3 шага, отличаются текстом). Стиль:

- Чистый белый фон контента
- Серый фон body (#f5f5f7)
- Чёрный CTA-кнопка с белым текстом, `rounded-full`
- Шрифт SF Pro Display / system-ui
- Никаких градиентов, теней, радуг
- Hero — крупное фото товара или абстракция в Apple-стиле
- Body — 1-2 коротких абзаца + CTA
- Footer — реквизиты + отписка

Покажи мне варианты, я согласую — потом верстаешь финальные.

### 4.5. Inline-стили обязательно

Все стили **внутри тегов через `style="..."`**, не в `<style>` секции. Большинство почтовиков (Gmail, Outlook, Mail.ru, Я.Почта) срезают `<style>` или поддерживают только частично.

Использовать инструмент `juice` или сделать функцию `inlineStyles()` которая прогоняет HTML через CSS-inliner перед отправкой.

---

## 5. СЕГМЕНТЫ (7 предустановленных)

Реализуем как **SQL views** или функции, не отдельной таблицей. Динамически вычисляются при использовании.

```sql
-- 1. Все подписчики
create or replace view segment_all_subscribers as
select c.id, c.email, c.name
from customers c
join data_consents dc on dc.customer_id = c.id
where dc.consent_type = 'marketing' 
  and dc.revoked_at is null;

-- 2. Активные покупатели (заказ за 90 дней)
create or replace view segment_active_buyers as
select distinct c.id, c.email, c.name
from customers c
join data_consents dc on dc.customer_id = c.id
join orders o on o.customer_id = c.id
where dc.consent_type = 'marketing' and dc.revoked_at is null
  and o.created_at >= now() - interval '90 days'
  and o.status not in ('cancelled', 'refunded');

-- 3. VIP (3+ заказа или сумма >200к)
create or replace view segment_vip as
select c.id, c.email, c.name
from customers c
join data_consents dc on dc.customer_id = c.id
where dc.consent_type = 'marketing' and dc.revoked_at is null
  and (
    (select count(*) from orders o where o.customer_id = c.id and o.status not in ('cancelled', 'refunded')) >= 3
    or
    (select coalesce(sum(o.total), 0) from orders o where o.customer_id = c.id and o.status not in ('cancelled', 'refunded')) >= 200000
  );

-- 4. Спящие (нет заказов 6+ месяцев)
create or replace view segment_dormant as
select c.id, c.email, c.name
from customers c
join data_consents dc on dc.customer_id = c.id
where dc.consent_type = 'marketing' and dc.revoked_at is null
  and (
    not exists (select 1 from orders o where o.customer_id = c.id)
    or
    (select max(o.created_at) from orders o where o.customer_id = c.id) < now() - interval '6 months'
  );

-- 5. Новички (регистрация <30 дней, ещё нет заказа)
create or replace view segment_newcomers as
select c.id, c.email, c.name
from customers c
join data_consents dc on dc.customer_id = c.id
where dc.consent_type = 'marketing' and dc.revoked_at is null
  and c.created_at >= now() - interval '30 days'
  and not exists (select 1 from orders o where o.customer_id = c.id);

-- 6. С iPhone (купили iPhone — для trade-in реактивации через год)
create or replace view segment_iphone_owners as
select distinct c.id, c.email, c.name
from customers c
join data_consents dc on dc.customer_id = c.id
join orders o on o.customer_id = c.id
join order_items oi on oi.order_id = o.id
join products p on p.id = oi.product_id
join categories cat on cat.id = p.category_id
where dc.consent_type = 'marketing' and dc.revoked_at is null
  and cat.slug like 'iphone%'
  and o.status not in ('cancelled', 'refunded');

-- 7. Брошенные корзины (есть незавершённая корзина за 30 дней)
create or replace view segment_cart_abandoners as
select distinct c.id, c.email, c.name
from customers c
join data_consents dc on dc.customer_id = c.id
join carts cart on cart.customer_id = c.id
where dc.consent_type = 'marketing' and dc.revoked_at is null
  and cart.updated_at >= now() - interval '30 days'
  and cart.status = 'abandoned';
```

В админке менеджер при создании кампании выбирает сегмент из списка → показывается количество получателей в реальном времени.

---

## 6. ТРИГГЕРЫ — 7 ВАЖНЕЙШИХ

### 6.1. Архитектура запуска

**Принцип:** событие происходит → server-side создаётся запись в `email_queue` с `scheduled_at` = когда отправить. Cron-задание (раз в минуту) забирает записи `where scheduled_at <= now() and status = 'pending'`, формирует письмо, отправляет через `EmailSender`, обновляет статус.

**События-источники** прописываются в коде в нужных местах:

```ts
// После оформления заказа
await enqueueTrigger({
  triggerSlug: 'order_confirmation',
  customerId: order.customer_id,
  recipientEmail: order.email,
  variables: { order, customer },
  scheduledAt: new Date(),  // сразу
  dedupKey: `order:${order.id}:confirmation`,
});

// После регистрации
await enqueueTrigger({
  triggerSlug: 'welcome_1',
  customerId: user.id,
  recipientEmail: user.email,
  scheduledAt: new Date(),
});
await enqueueTrigger({
  triggerSlug: 'welcome_2',
  scheduledAt: addDays(new Date(), 2),
});
await enqueueTrigger({
  triggerSlug: 'welcome_3',
  scheduledAt: addDays(new Date(), 5),
});

// При abandon корзины (определяется cron-ом: корзина не обновлялась > 1 часа и не оформлена)
// ...
```

### 6.2. Список 7 триггеров

#### 1. Брошенная корзина (3-шаговая цепочка)

**Детект:** корзина не обновлялась 1 час, есть товары, не оформлен заказ, у клиента есть email + согласие на маркетинг.

**Cron:** каждые 10 минут проходит по `carts` и enqueue-ит триггеры.

- **Шаг 1** (`abandoned_cart_1h`) — через 1 час: «Вы оставили товары в корзине», кнопка «Вернуться к корзине», шаблон `abandoned_cart_1`
- **Шаг 2** (`abandoned_cart_24h`) — через 24 часа (если не оформлен): «Эти товары ждут вас» + подборка похожих, шаблон `abandoned_cart_2`
- **Шаг 3** (`abandoned_cart_72h`) — через 72 часа: «Последний шанс! Промокод CART10 на 1000 ₽», шаблон `abandoned_cart_3`

**Cooldown:** одна цепочка на корзину. Если клиент оформил заказ — все последующие триггеры этой цепочки отменяются (`update email_queue set status = 'cancelled' where dedup_key like 'cart:{cart_id}:%'`).

#### 2. Подтверждение заказа

**Событие:** статус заказа изменился на `paid` или `confirmed`.

**Триггер:** `order_confirmation` — сразу.

**Транзакционное!** Отправляется **независимо от согласия на маркетинг** (это часть оказания услуги по 152-ФЗ). В шаблоне НЕ нужна ссылка отписки от маркетинга (отписаться от транзакционных нельзя).

**Содержимое:** номер заказа, состав (товары + цены), сумма, способ оплаты, способ получения (самовывоз/доставка), адрес магазина или адрес доставки, контакт менеджера.

#### 3. Заказ отправлен / готов к выдаче

**Событие:** статус заказа изменился на `shipped` или `ready_for_pickup`.

**Триггер:** `order_shipped` — сразу.

**Транзакционное.**

**Содержимое:** «Ваш заказ #ORD-2026-1024 готов!», трек-номер (если есть), ссылка на отслеживание (СДЭК/Boxberry).

#### 4. Welcome-серия (3 письма)

**Событие:** регистрация нового пользователя.

**Триггеры:**
- `welcome_1` — сразу: «Добро пожаловать!», что есть в магазине, ссылка на каталог
- `welcome_2` — через 2 дня: «Помощь в выборе iPhone» — гид по моделям
- `welcome_3` — через 5 дней: «Trade-in: сдай старый — получи скидку», ссылка на /trade-in

**Cooldown:** только новым пользователям, повторно не запускается.

**Cancel:** если клиент отписался от маркетинга в первые дни — остальные письма серии отменяются.

#### 5. Запрос отзыва

**Событие:** заказ доставлен (статус `delivered`) или клиент забрал из магазина (статус `completed`).

**Триггер:** `review_request` — через 7 дней.

**Содержимое:** «Понравилась покупка?», просьба оставить отзыв с ссылками на Я.Карты и 2ГИС, плюс на сайт.

#### 6. Cross-sell к iPhone

**Событие:** заказ доставлен **и в составе есть iPhone**.

**Триггер:** `cross_sell_iphone` — через 5 дней.

**Содержимое:** «Защитите ваш iPhone», подборка чехлов, защитных стёкол, AppleCare (если есть в каталоге). Только для покупателей iPhone.

#### 7. День рождения

**Событие:** у клиента в профиле указан день рождения, и он скоро (cron каждый день в 9:00 проверяет).

**Триггеры:**
- За 7 дней до ДР: «Скоро ваш день рождения! Подарок ждёт», промокод BDAY10 на 10%
- В день рождения: «С днём рождения!»

**Cooldown:** раз в год.

### 6.3. Условия "тихого времени"

Все триггеры (кроме транзакционных #2, #3) **не отправляются** между 22:00 и 8:00 по локальному времени Белгорода (GMT+3). Если время отправки попадает в этот промежуток — `scheduled_at` сдвигается на 8:00 следующего утра.

В админке у каждого триггера переключатель «Можно отправлять в тихие часы» (по умолчанию выкл).

### 6.4. Лимит писем на пользователя

**Максимум 3 маркетинговых письма в неделю** одному клиенту (не считая транзакционных). При превышении — следующие триггерные письма откладываются на следующую неделю или отменяются (зависит от приоритета триггера).

Реализация — функция `canSendMarketingEmailTo(customerId)`:

```sql
create or replace function can_send_marketing_email(p_customer_id uuid)
returns bool
language sql
stable
as $$
  select count(*) < 3
  from email_sends_log esl
  join email_templates et on et.id = esl.template_id
  where esl.customer_id = p_customer_id
    and et.category in ('marketing', 'trigger')
    and esl.created_at >= now() - interval '7 days'
    and esl.status in ('sent', 'delivered', 'opened', 'clicked');
$$;
```

Транзакционные (категория `transactional`) этой проверкой не ограничиваются.

---

## 7. UI В АДМИНКЕ

### 7.1. Расположение

В сайдбаре после раздела **«Промо»** добавить **«Рассылки»** с подразделами:

```
📨 Рассылки
   ├ Обзор (главная страница раздела)
   ├ Кампании
   ├ Триггеры
   ├ Шаблоны
   ├ База подписчиков
   └ Аналитика
```

### 7.2. Обзор `/admin/marketing/overview`

Дашборд раздела с быстрыми метриками:

```
┌──────────────────────────────────────────────────────────┐
│ Рассылки                                                  │
│                                                           │
│ ┌──────────┬──────────┬──────────┬──────────┐           │
│ │ Подпис-  │ Отправ-  │ Open     │ Click    │           │
│ │ чиков    │ лено за  │ rate за  │ rate за  │           │
│ │ всего    │ месяц    │ месяц    │ месяц    │           │
│ │   324    │  1 247   │  42.3%   │  8.7%    │           │
│ │  ↑ 12%   │  ↑ 5%    │  ↑ 2.1%  │  ↓ 0.4%  │           │
│ └──────────┴──────────┴──────────┴──────────┘           │
│                                                           │
│ Активные триггеры                  [Управление →]         │
│ ────────────────────────                                  │
│ ✓ Брошенная корзина (цепочка) ─── отправлено 87 за месяц │
│ ✓ Подтверждение заказа     ─── 156 за месяц              │
│ ✓ Welcome-серия             ─── 42 за месяц              │
│ ✗ День рождения             ─── не активен               │
│ ...                                                       │
│                                                           │
│ Последние кампании               [Все кампании →]         │
│ ──────────────────────                                    │
│ ┌──────────────────────────┬────────┬────────┬────────┐ │
│ │ Название                 │ Отпр.  │ Open % │ Click% │ │
│ ├──────────────────────────┼────────┼────────┼────────┤ │
│ │ iPhone 17 в наличии      │  324   │  48.2% │  12.3% │ │
│ │ Black Friday 2026        │  280   │  52.1% │  18.7% │ │
│ └──────────────────────────┴────────┴────────┴────────┘ │
│                                                           │
│ [+ Создать кампанию]  [⚙️ Настроить триггеры]            │
└──────────────────────────────────────────────────────────┘
```

### 7.3. Кампании `/admin/marketing/campaigns`

Список + кнопка создать. Аналогично страницам товаров/заказов.

**Создание кампании — визард в 3 шага:**

```
Шаг 1 из 3 — Кому
┌──────────────────────────────────────────────┐
│ Выберите сегмент получателей:                │
│                                              │
│ ○ Все подписчики          (324 чел.)         │
│ ○ Активные покупатели     (87 чел.)          │
│ ◉ VIP-клиенты             (12 чел.)          │
│ ○ Спящие                  (54 чел.)          │
│ ○ Новички                 (43 чел.)          │
│ ○ С iPhone                (28 чел.)          │
│ ○ Брошенные корзины       (18 чел.)          │
│                                              │
│ Будет отправлено: 12 писем                   │
│                                              │
│                          [Назад] [Далее →]   │
└──────────────────────────────────────────────┘

Шаг 2 из 3 — Что
┌──────────────────────────────────────────────┐
│ Выберите шаблон:                             │
│                                              │
│ [Превью] Универсальный промо      [Выбрать]  │
│ [Превью] Новости и новинки        [Выбрать]  │
│ [Превью] Минималистичное          [Выбрать]  │
│                                              │
│ ───────────────                              │
│                                              │
│ Тема письма:                                 │
│ [iPhone 17 Pro Max в новом цвете_________]   │
│                                              │
│ Превью-текст (показывается в почте):         │
│ [Только что привезли Cosmic Orange________]  │
│                                              │
│ Hero-картинка: [📷 Загрузить]                │
│ Заголовок: [Новый цвет уже в магазине_____]  │
│ Текст: [textarea с описанием______________]  │
│ Кнопка: [Текст: Смотреть] [URL: /catalog]   │
│                                              │
│ [Тест на свой email]  [Назад] [Далее →]      │
└──────────────────────────────────────────────┘

Шаг 3 из 3 — Когда
┌──────────────────────────────────────────────┐
│ ◉ Отправить сейчас                           │
│ ○ Запланировать                              │
│   Дата: [____]  Время: [____]                │
│                                              │
│ Будет отправлено 12 писем.                   │
│ Тема: «iPhone 17 Pro Max в новом цвете»      │
│                                              │
│ [Превью письма]   [Назад] [Отправить ▼]      │
└──────────────────────────────────────────────┘
```

**После отправки** — страница статуса с прогресс-баром (отправлено N из M), потом статистика.

### 7.4. Триггеры `/admin/marketing/triggers`

Список 7 предустановленных триггеров:

```
┌────────────────────────────────────────────────────────┐
│ Триггерные рассылки                                    │
│                                                        │
│ ┌──────────────────────────────┬────────┬─────────┐  │
│ │ Триггер                      │ Статус │ Действие│  │
│ ├──────────────────────────────┼────────┼─────────┤  │
│ │ 🛒 Брошенная корзина          │   ✓    │ ⚙️ ⋯    │  │
│ │   3 письма: 1ч → 24ч → 72ч   │        │         │  │
│ │   Отправлено: 87 за месяц    │        │         │  │
│ │   Open rate: 38%             │        │         │  │
│ ├──────────────────────────────┼────────┼─────────┤  │
│ │ ✅ Подтверждение заказа       │   ✓    │ ⚙️      │  │
│ │   Транзакционное · сразу     │        │         │  │
│ │   Отправлено: 156 за месяц   │        │         │  │
│ ├──────────────────────────────┼────────┼─────────┤  │
│ │ 📦 Заказ отправлен            │   ✓    │ ⚙️      │  │
│ │ 👋 Welcome-серия (3 шага)     │   ✓    │ ⚙️ ⋯    │  │
│ │ ⭐ Запрос отзыва (+7 дней)    │   ✓    │ ⚙️      │  │
│ │ 🛡️ Cross-sell к iPhone       │   ✓    │ ⚙️      │  │
│ │ 🎂 День рождения              │   ✗    │ ⚙️      │  │
│ └──────────────────────────────┴────────┴─────────┘  │
└────────────────────────────────────────────────────────┘
```

Клик на триггер → drawer с настройками:
- Toggle активности
- Шаблон (выбор)
- Задержка (для гибких триггеров)
- Условия (для условных — например cross-sell только для iPhone)
- Tихие часы (вкл/выкл)
- Просмотр статистики (отправлено / открыто / кликнуто / конверсия в заказ)
- Кнопка «Тест-отправка на свой email»

### 7.5. Шаблоны `/admin/marketing/templates`

Список 14 готовых шаблонов с превью-картинкой.

**Редактирование шаблона:**

```
┌─────────────────────────────────────────────────────┐
│ ← Welcome — приветственное (welcome_1)              │
│                                                     │
│ Категория: Триггер · Welcome серия                  │
│                                                     │
│ Тема письма:                                        │
│ [Добро пожаловать в PhoneTrade, {{customer.name}}!] │
│                                                     │
│ Превью-текст:                                       │
│ [Спасибо за регистрацию — рассказываем о магазине_] │
│                                                     │
│ ─────────────────────────                           │
│ Содержимое письма:                                  │
│                                                     │
│ Заголовок: [Здравствуйте, {{customer.name_______}}] │
│ Подзаголовок: [Спасибо что зарегистрировались____]  │
│                                                     │
│ Hero-картинка: [📷 phonetrade-welcome.jpg] [Заменить]│
│                                                     │
│ Основной текст:                                     │
│ ┌──────────────────────────────────────────────┐  │
│ │ PhoneTrade — магазин Apple-техники в...      │  │
│ │ ...                                           │  │
│ └──────────────────────────────────────────────┘  │
│                                                     │
│ Кнопка:                                             │
│ Текст: [Смотреть каталог]                           │
│ URL: [/catalog]                                     │
│                                                     │
│ ─────────────────────────                           │
│ Превью                                              │
│ [Десктоп ◉] [Мобайл ○]                              │
│                                                     │
│ [HTML-превью письма с подставленными данными]      │
│                                                     │
│ [Тест-отправка] [Сохранить]                         │
└─────────────────────────────────────────────────────┘
```

**Превью**: рендерит шаблон с тестовыми данными (Иван Иванов, тестовый заказ), показывает в iframe. Toggle между desktop/mobile.

**Подсветка переменных:** в `<textarea>` подсвечиваются `{{customer.name}}` и т.д. — например через `react-textarea-autosize` + регулярки. Или просто список доступных переменных в правом сайдбаре с кнопкой «вставить» (копирует в буфер).

### 7.6. База подписчиков `/admin/marketing/subscribers`

Список всех клиентов с активным согласием на маркетинг.

**Колонки:**
- Имя
- Email
- Дата подписки
- Источник (регистрация / форма в подвале / при оформлении заказа)
- Статус (активен / отписался / bounced)
- Активность (последнее открытие / последний клик)
- Сегменты (бейджи)

**Действия:**
- Поиск, фильтры
- Экспорт CSV (для отчётности)
- Bulk-actions: добавить в сегмент (нет в нашей версии), отписать (для запросов на удаление)

### 7.7. Аналитика `/admin/marketing/analytics`

Расширенная статистика:
- График отправок по дням (line chart)
- Open rate / Click rate / Bounce rate по дням
- Топ-кампаний по конверсии в заказ
- Эффективность триггеров (отправлено / конверсия / выручка)
- Анализ отписок (когда, после какого письма)

---

## 8. ОТПИСКА И СОГЛАСИЯ

### 8.1. Ссылка отписки

В каждом маркетинговом письме обязательная ссылка:
```
{{unsubscribe_url}} → /unsubscribe?token=xxx
```

Token — JWT с `customer_id` и подписью, валидный 30 дней (обновляется при каждой отправке).

### 8.2. Страница `/unsubscribe`

```
┌────────────────────────────────────────────┐
│ Отписка от рассылок                        │
│                                            │
│ Вы отписались от маркетинговых писем.      │
│                                            │
│ Транзакционные письма (подтверждения       │
│ заказов и т.п.) будут приходить как        │
│ обычно — они часть оказания услуги.        │
│                                            │
│ Передумали? [Подписаться обратно]          │
│                                            │
│ Жалоба на спам или другая проблема?        │
│ Напишите info@phonetrade.ru                │
└────────────────────────────────────────────┘
```

При клике — `data_consents.revoked_at = now()` для типа `marketing`, все pending записи в `email_queue` для этого customer_id с категорией marketing/trigger → status = 'cancelled'.

### 8.3. Авторегистрация подписок при оформлении заказа

При чекауте есть **отдельная галочка** «Хочу получать акции и новинки» (из М1). Если поставлена — запись в `data_consents` с типом `marketing`. По умолчанию **снята**.

При регистрации — аналогично.

### 8.4. Подтверждение (Double opt-in) — опционально

После того как клиент поставил галочку «Хочу получать акции» — отправляется письмо «Подтвердите подписку» с кнопкой «Подтверждаю». Только после клика в БД записывается активное согласие.

**Это золотой стандарт** для рассылок, но **усложняет UX** (клиент должен дважды подтвердить). 

Для start — **без double opt-in**, согласие через галочку считается достаточным. Если в будущем будут проблемы со спам-фильтрами — включим (опция в настройках).

---

## 9. КЛИЕНТ В ЛИЧНОМ КАБИНЕТЕ (опционально)

В `/account/preferences` или `/account/privacy` (из М1) — блок «Рассылки»:

- Toggle «Получать маркетинговые рассылки» — включён/выключен (привязан к `data_consents`)
- Список последних 10 писем (`email_sends_log`) — может быть полезно для прозрачности
- Кнопка «Полностью отписаться» (то же что unsubscribe link)

---

## 10. CRON-ЗАДАЧИ

### 10.1. Обработка очереди (раз в минуту)

```ts
// /api/cron/process-email-queue (Vercel Cron или Supabase Edge Function)
export async function processEmailQueue() {
  const { data: pending } = await supabase
    .from('email_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at')
    .limit(20);  // батч по 20
  
  for (const item of pending ?? []) {
    try {
      await supabase.from('email_queue').update({ status: 'processing' }).eq('id', item.id);
      
      // Проверки
      if (!await isInQuietHours(item) || trigger.send_in_quiet_hours) {
        // Проверка лимита 3 в неделю
        if (await canSendMarketingEmailTo(item.customer_id)) {
          // Проверка что customer не отписался
          if (await hasMarketingConsent(item.customer_id)) {
            // Отправка
            const result = await sender.send({ ... });
            // Запись в email_sends_log
            // Обновление статуса в email_queue → 'sent'
          } else {
            // status = 'cancelled', reason = 'no_consent'
          }
        } else {
          // Перенести на через 24 часа
          await supabase.from('email_queue').update({
            scheduled_at: addHours(now, 24),
            status: 'pending',
          }).eq('id', item.id);
        }
      } else {
        // Перенести на 8:00 следующего дня
      }
    } catch (e) {
      // attempts++, если > max_attempts → status = 'failed'
    }
  }
}
```

### 10.2. Детект брошенных корзин (раз в 10 минут)

```ts
export async function detectAbandonedCarts() {
  // Корзины с товарами, не обновлявшиеся 1+ час, не имеющие активного заказа
  const { data: abandoned } = await supabase
    .from('carts')
    .select('*, customer:customers(*)')
    .lt('updated_at', subHours(new Date(), 1).toISOString())
    .gt('updated_at', subHours(new Date(), 2).toISOString())  // в пределах 2 часов от последнего обновления — чтобы не пропустить
    .gt('items_count', 0);
  
  for (const cart of abandoned ?? []) {
    if (!cart.customer?.email) continue;
    if (!await hasMarketingConsent(cart.customer.id)) continue;
    
    await enqueueTrigger({
      triggerSlug: 'abandoned_cart_1h',
      customerId: cart.customer.id,
      recipientEmail: cart.customer.email,
      variables: { cart, customer: cart.customer },
      scheduledAt: new Date(),
      dedupKey: `cart:${cart.id}:abandoned_1h`,
    });
    
    // Шаги 2 и 3 enqueue-ятся сразу с разными scheduled_at
    await enqueueTrigger({
      triggerSlug: 'abandoned_cart_24h',
      scheduledAt: addHours(new Date(), 23),  // через 23 часа (24 от первого события)
      dedupKey: `cart:${cart.id}:abandoned_24h`,
      // ...
    });
    
    await enqueueTrigger({
      triggerSlug: 'abandoned_cart_72h',
      scheduledAt: addHours(new Date(), 71),
      dedupKey: `cart:${cart.id}:abandoned_72h`,
    });
  }
}
```

### 10.3. Дни рождения (раз в день в 9:00)

```ts
export async function processBirthdays() {
  // За 7 дней
  const { data: in7days } = await supabase.rpc('get_customers_birthday_in_days', { days: 7 });
  for (const customer of in7days) {
    await enqueueTrigger({
      triggerSlug: 'birthday_7days_before',
      customerId: customer.id,
      scheduledAt: new Date(),
      dedupKey: `birthday:${customer.id}:${new Date().getFullYear()}:before`,
    });
  }
  
  // В день
  const { data: today } = await supabase.rpc('get_customers_birthday_today');
  for (const customer of today) {
    await enqueueTrigger({
      triggerSlug: 'birthday_today',
      customerId: customer.id,
      scheduledAt: new Date(),
      dedupKey: `birthday:${customer.id}:${new Date().getFullYear()}:today`,
    });
  }
}
```

### 10.4. Очистка старых логов (раз в неделю)

`email_sends_log` старше 1 года → архивируется или удаляется. То же для `email_tracking`.

---

## 11. ПОРЯДОК РАБОТЫ

1. **Архитектура и план** — `design-orchestration` если есть
2. **Миграции БД** (раздел 2)
3. **EmailSender абстракция** (раздел 3) — SMTP через nodemailer
4. **Через `magic` MCP** — 2-3 варианта каждого из 14 шаблонов, пришли мне на согласование
5. **Сидинг шаблонов** в БД после моего согласования
6. **SQL views для сегментов** (раздел 5)
7. **Сидинг 7 триггеров** в БД с дефолтными настройками (все активны кроме `birthday`)
8. **Server actions:**
   - `createCampaign`, `sendCampaign`, `previewCampaign`, `testSendCampaign`
   - `updateTrigger`, `toggleTrigger`, `testTrigger`
   - `updateTemplate`, `previewTemplate`
   - `getSegmentSize(slug)`, `getSegmentRecipients(slug)`
   - `enqueueTrigger(options)` — основная функция запуска
   - `processEmailQueue()` — cron-задача
   - `unsubscribe(token)` — обработка отписки
9. **Cron-задачи** (раздел 10) через Vercel Cron или Supabase Edge Functions
10. **Wiring событий в существующий код:**
    - Server action создания заказа → `enqueueTrigger('order_confirmation')`
    - Server action регистрации → `enqueueTrigger('welcome_1/2/3')`
    - Server action смены статуса заказа → `enqueueTrigger('order_shipped')` при `shipped/ready_for_pickup`
    - Server action доставки заказа → `enqueueTrigger('review_request', delay=7d)`, `enqueueTrigger('cross_sell_iphone', delay=5d)` если есть iPhone
11. **UI админки** (раздел 7):
    - Обзор
    - Кампании (визард)
    - Триггеры (список + drawer настройки)
    - Шаблоны (список + редактор)
    - База подписчиков
    - Аналитика
12. **Страница `/unsubscribe`** (раздел 8.2)
13. **В личном кабинете** — блок «Рассылки» в `/account/privacy` (раздел 9)
14. **Тест-сценарии:**
    - Регистрация → проверить что welcome_1 отправлен сразу, welcome_2 через 2 дня, welcome_3 через 5 дней
    - Оформление заказа → подтверждение пришло, в БД статус 'sent'
    - Добавление товара в корзину, выход → через 1 час пришло первое письмо о брошенной корзине
    - Отписка → следующие маркетинговые письма не приходят
    - 4-е маркетинговое письмо за неделю → отложено или отменено
    - Письмо в 23:00 → отправилось в 8:00 следующего дня
15. **Финальная проверка через `chrome-devtools` / `playwright`** — скриншоты админки на 375/768/1280px, Lighthouse ≥ 90
16. **`ui-visual-validator` + `ui-refactor`**
17. **Отчёт мне** — скриншоты раздела, скриншоты примеров писем (тест на свой email), известные ограничения

---

## 12. КРИТЕРИИ ПРИЁМКИ

**Архитектура:**
- ✅ Все таблицы созданы с RLS
- ✅ EmailSender абстракция работает через SMTP
- ✅ 14 шаблонов в БД, через `magic` сгенерированы и согласованы со мной
- ✅ 7 сегментов работают (SQL views возвращают актуальный список)
- ✅ 7 триггеров сконфигурированы

**Триггеры:**
- ✅ Брошенная корзина — 3 письма по таймингу 1ч/24ч/72ч
- ✅ Подтверждение заказа отправляется сразу после оформления
- ✅ Заказ отправлен — при смене статуса
- ✅ Welcome-серия — 3 письма после регистрации (сразу/2д/5д)
- ✅ Запрос отзыва — через 7 дней после доставки
- ✅ Cross-sell — через 5 дней после покупки iPhone
- ✅ День рождения — за 7 дней + в сам день

**Кампании:**
- ✅ Визард создания работает (3 шага)
- ✅ Можно выбрать сегмент, шаблон, кастомизировать тему/картинку/текст
- ✅ Тест-отправка работает
- ✅ Запланированная отправка работает
- ✅ Статистика после отправки

**Шаблоны:**
- ✅ 14 готовых шаблонов с возможностью редактирования темы, превью-текста, контента
- ✅ Превью на десктопе и мобильном
- ✅ Все стили inline (тестировал в Gmail/Mail.ru/Я.Почта)
- ✅ Корректная подстановка переменных {{...}}

**Сегменты:**
- ✅ 7 предустановленных сегментов
- ✅ Размер сегмента видно в реальном времени при выборе

**Лимиты и юр-часть:**
- ✅ Не больше 3 маркетинговых писем в неделю одному клиенту
- ✅ Тихие часы 22-08 уважаются (кроме транзакционных)
- ✅ Ссылка отписки в каждом маркетинговом письме
- ✅ Отписка работает (страница /unsubscribe, токен валиден)
- ✅ Транзакционные письма приходят независимо от согласия (152-ФЗ)
- ✅ Без согласия `marketing` в `data_consents` — маркетинговые/триггерные не отправляются

**UI:**
- ✅ Раздел «Рассылки» в сайдбаре под «Промо»
- ✅ Обзор с метриками работает
- ✅ Все 6 подразделов созданы
- ✅ Adaptive 375/768/1280
- ✅ Apple-эстетика, серая палитра, чёрный акцент
- ✅ Sonner-тосты на действиях

**Технические:**
- ✅ Cron-задачи работают (очередь, корзины, дни рождения)
- ✅ Tracking pixel считает открытия
- ✅ Click-tracking через redirect работает
- ✅ Bounced/Failed обрабатываются (повтор через час до 3 попыток)
- ✅ Lighthouse Performance ≥ 90
- ✅ Никаких console errors

---

## 13. ВАЖНЫЕ НЮАНСЫ

- **Не отправлять без согласия:** перед каждой маркетинговой/триггерной отправкой — проверка `hasMarketingConsent(customer_id)`. Если согласия нет — `email_queue.status = 'cancelled'` с reason.
- **Транзакционные ≠ маркетинговые:** письма категории `transactional` (подтверждение заказа, трек) отправляются всегда, без согласия и без ссылки отписки. Они часть оказания услуги по 152-ФЗ.
- **Все ссылки в письмах с UTM:** автоматически добавлять `?utm_source=email&utm_medium=email&utm_campaign={slug}` — для аналитики в Я.Метрике.
- **Tracking pixel:** прозрачный 1×1 GIF по адресу `/api/email/track-open?send_id=X`. При запросе обновляется `email_sends_log.opened_at` и `open_count`. **Важно:** многие почтовики проксируют изображения (Gmail proxy) — open rate будет завышен у iOS Mail и реалистичнее у Gmail.
- **Click tracking:** все ссылки в HTML обернуть в `/api/email/click?send_id=X&url=encodeURIComponent(originalUrl)`. При клике — запись в `email_tracking`, потом 302 redirect на оригинальный URL.
- **Bounce handling:** если SMTP вернул bounce — записать `bounced_at`. После 3 bounce подряд — пометить email как `is_bounced = true` в `customers`, больше не отправлять.
- **Спам-комплейнты:** если можем получить feedback loop от почтовика — обработка как отписка (`revoked_at`).
- **Rate limiting SMTP:** твой SMTP-провайдер скорее всего имеет лимит (например, Я.Почта — 500 писем в день, Gmail SMTP — 500, Mail.ru SMTP — 60 в час). Учитывай это: cron-задача отправляет не больше N писем за минуту (настройка в `.env`).
- **Тестирование:** ОБЯЗАТЕЛЬНО проверить в Gmail, Я.Почте, Mail.ru, Outlook, Apple Mail. Inline-стили + таблицы для вёрстки + fallback-шрифты — иначе верстка поедет.
- **Не делать html `<form>` в письмах:** не работает в большинстве почтовиков. Только кнопки-ссылки.
- **Картинки на CDN:** все изображения в письмах — с публичного URL (Supabase Storage). Не вкладывать как attachment.
- **Локализация дат:** в письмах даты на русском: «15 мая 2026, 14:23». Использовать `date-fns/locale/ru`.
- **Превью-текст важен:** короткий текст (50-90 символов) который виден в почтовике под темой. Сильно влияет на open rate. Если не задан — почтовик возьмёт первые слова из тела, что часто выглядит уродливо.
- **Не отправлять с no-reply@:** клиенты часто отвечают на письма. Адрес отправителя должен быть мониторящимся (например `info@phonetrade.ru`). Менеджер должен периодически проверять входящие.
