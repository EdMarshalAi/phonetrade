-- 0009_category_home_and_seo.sql
-- Категории: вывод на главной (флаг + лимит товаров) и SEO-текст внизу страницы.
alter table public.categories add column if not exists show_on_home boolean not null default false;
alter table public.categories add column if not exists home_limit   int     not null default 8;
alter table public.categories add column if not exists seo_text     text;
