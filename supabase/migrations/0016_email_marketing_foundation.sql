-- 0016: Email-маркетинг — фундамент (Фаза 0). См. docs/email-marketing.md.
--
-- Адаптации под реальную схему PhoneTrade (отличия от исходного промта):
--   • categories по slug (products.category_slug), а НЕ category_id;
--   • RLS через is_admin() (как у integrations);
--   • дропнута пустая заглушка email_templates из 0008 (id text, не использовалась);
--   • сегмент cart_abandoners НЕ создан — нужна персистентная корзина (отд. подпроект);
--   • триггер «день рождения» отложен (нет поля birthday).
--
-- Применено напрямую (self-hosted без supabase_migrations); файл — для воспроизводимости.

drop table if exists public.email_templates cascade;

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, name text not null,
  category text not null check (category in ('transactional','marketing','trigger')),
  subject text not null, preview_text text, html_content text not null, text_content text,
  variables jsonb default '[]'::jsonb, is_system boolean default false, is_active boolean default true,
  thumbnail_url text, created_at timestamptz default now(), updated_at timestamptz default now(),
  updated_by uuid references public.admin_users(id));

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(), name text not null,
  template_id uuid references public.email_templates(id), segment_slug text, recipient_count int default 0,
  subject_override text, preview_text_override text, content_overrides jsonb,
  status text default 'draft' check (status in ('draft','scheduled','sending','sent','cancelled','failed')),
  scheduled_at timestamptz, sent_at timestamptz, created_at timestamptz default now(),
  updated_at timestamptz default now(), created_by uuid references public.admin_users(id));

create table if not exists public.email_triggers (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null, description text,
  event_type text not null, delay_minutes int not null default 0,
  template_id uuid references public.email_templates(id),
  parent_trigger_id uuid references public.email_triggers(id), step_in_chain int default 1,
  conditions jsonb default '{}'::jsonb, send_in_quiet_hours boolean default false,
  cooldown_hours int default 0, max_sends_per_user int default 1, is_active boolean default true,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  updated_by uuid references public.admin_users(id));

create table if not exists public.email_sends_log (
  id bigserial primary key, campaign_id uuid references public.email_campaigns(id),
  trigger_id uuid references public.email_triggers(id), template_id uuid references public.email_templates(id),
  customer_id uuid references public.customers(id), recipient_email text not null, recipient_name text,
  subject text not null, body_html text,
  status text not null default 'queued' check (status in ('queued','sending','sent','delivered','opened','clicked','bounced','complained','failed')),
  sent_at timestamptz, delivered_at timestamptz, opened_at timestamptz, clicked_at timestamptz,
  bounced_at timestamptz, failure_reason text, open_count int default 0, click_count int default 0,
  created_at timestamptz default now());
create index if not exists idx_email_sends_customer on public.email_sends_log(customer_id, created_at desc);
create index if not exists idx_email_sends_status on public.email_sends_log(status);
create index if not exists idx_email_sends_campaign on public.email_sends_log(campaign_id);
create index if not exists idx_email_sends_trigger on public.email_sends_log(trigger_id);
create index if not exists idx_email_sends_recent on public.email_sends_log(created_at desc);

create table if not exists public.email_queue (
  id bigserial primary key, trigger_id uuid references public.email_triggers(id),
  customer_id uuid references public.customers(id), recipient_email text not null,
  template_id uuid references public.email_templates(id), variables jsonb,
  scheduled_at timestamptz not null, attempts int default 0, max_attempts int default 3,
  status text default 'pending' check (status in ('pending','processing','sent','failed','cancelled')),
  failure_reason text, processed_at timestamptz, dedup_key text, created_at timestamptz default now());
create index if not exists idx_email_queue_pending on public.email_queue(scheduled_at) where status = 'pending';
create unique index if not exists idx_email_queue_dedup on public.email_queue(dedup_key) where dedup_key is not null;

create table if not exists public.email_tracking (
  id bigserial primary key, send_id bigint references public.email_sends_log(id) on delete cascade,
  event_type text not null check (event_type in ('open','click','unsubscribe')),
  url text, ip_address inet, user_agent text, created_at timestamptz default now());
create index if not exists idx_tracking_send on public.email_tracking(send_id);

alter table public.customers add column if not exists is_bounced boolean default false;

alter table public.email_templates enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.email_triggers enable row level security;
alter table public.email_sends_log enable row level security;
alter table public.email_queue enable row level security;
alter table public.email_tracking enable row level security;

create policy "email_templates admin" on public.email_templates for all using (public.is_admin()) with check (public.is_admin());
create policy "email_campaigns admin" on public.email_campaigns for all using (public.is_admin()) with check (public.is_admin());
create policy "email_triggers admin" on public.email_triggers for all using (public.is_admin()) with check (public.is_admin());
create policy "email_sends_log admin" on public.email_sends_log for all using (public.is_admin()) with check (public.is_admin());
create policy "email_queue admin" on public.email_queue for all using (public.is_admin()) with check (public.is_admin());
create policy "email_tracking admin" on public.email_tracking for all using (public.is_admin()) with check (public.is_admin());

-- Лимит маркетинговых писем: не больше 3 в неделю одному клиенту.
create or replace function public.can_send_marketing_email(p_customer_id uuid) returns boolean language sql stable as $fn$
  select count(*) < 3 from public.email_sends_log esl
  join public.email_templates et on et.id = esl.template_id
  where esl.customer_id = p_customer_id and et.category in ('marketing','trigger')
    and esl.created_at >= now() - interval '7 days' and esl.status in ('sent','delivered','opened','clicked');
$fn$;

-- Сегменты (6 из 7; cart_abandoners — после персистентной корзины).
create or replace view public.segment_all_subscribers as
  select distinct c.id, c.email, c.name from public.customers c
  join public.data_consents dc on dc.customer_id = c.id
  where dc.consent_type = 'marketing' and dc.revoked_at is null
    and c.email is not null and coalesce(c.is_bounced,false) = false;

create or replace view public.segment_active_buyers as
  select distinct c.id, c.email, c.name from public.customers c
  join public.data_consents dc on dc.customer_id = c.id
  join public.orders o on o.customer_id = c.id
  where dc.consent_type = 'marketing' and dc.revoked_at is null
    and c.email is not null and coalesce(c.is_bounced,false) = false
    and o.created_at >= now() - interval '90 days' and o.status <> 'cancelled';

create or replace view public.segment_vip as
  select c.id, c.email, c.name from public.customers c
  join public.data_consents dc on dc.customer_id = c.id
  where dc.consent_type = 'marketing' and dc.revoked_at is null
    and c.email is not null and coalesce(c.is_bounced,false) = false
    and ((select count(*) from public.orders o where o.customer_id = c.id and o.status <> 'cancelled') >= 3
      or (select coalesce(sum(o.total),0) from public.orders o where o.customer_id = c.id and o.status <> 'cancelled') >= 200000);

create or replace view public.segment_dormant as
  select c.id, c.email, c.name from public.customers c
  join public.data_consents dc on dc.customer_id = c.id
  where dc.consent_type = 'marketing' and dc.revoked_at is null
    and c.email is not null and coalesce(c.is_bounced,false) = false
    and (not exists (select 1 from public.orders o where o.customer_id = c.id)
      or (select max(o.created_at) from public.orders o where o.customer_id = c.id) < now() - interval '6 months');

create or replace view public.segment_newcomers as
  select c.id, c.email, c.name from public.customers c
  join public.data_consents dc on dc.customer_id = c.id
  where dc.consent_type = 'marketing' and dc.revoked_at is null
    and c.email is not null and coalesce(c.is_bounced,false) = false
    and c.created_at >= now() - interval '30 days'
    and not exists (select 1 from public.orders o where o.customer_id = c.id);

create or replace view public.segment_iphone_owners as
  select distinct c.id, c.email, c.name from public.customers c
  join public.data_consents dc on dc.customer_id = c.id
  join public.orders o on o.customer_id = c.id
  join public.order_items oi on oi.order_id = o.id
  join public.products p on p.id = oi.product_id
  where dc.consent_type = 'marketing' and dc.revoked_at is null
    and c.email is not null and coalesce(c.is_bounced,false) = false
    and p.category_slug like 'iphone%' and o.status <> 'cancelled';
