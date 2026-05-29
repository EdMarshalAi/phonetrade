-- 0007_storage.sql
-- Storage-бакеты для изображений (спека §3.27). Публичный read, запись —
-- через server actions (service-role обходит RLS). Идемпотентно.

insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('hero-slides',    'hero-slides',    true),
  ('blog-covers',    'blog-covers',    true),
  ('bento-tiles',    'bento-tiles',    true),
  ('brand-logos',    'brand-logos',    true),
  ('og-images',      'og-images',      true),
  ('general',        'general',        true)
on conflict (id) do nothing;

-- Публичное чтение объектов из этих бакетов (бакеты public=true это и так дают,
-- но политика делает доступ явным и переживает смену public-флага).
drop policy if exists "admin buckets public read" on storage.objects;
create policy "admin buckets public read" on storage.objects
  for select using (
    bucket_id in ('product-images','hero-slides','blog-covers','bento-tiles','brand-logos','og-images','general')
  );

-- Запись/удаление — только активные админы (на случай клиентских загрузок;
-- server actions всё равно идут под service-role).
drop policy if exists "admin buckets admin write" on storage.objects;
create policy "admin buckets admin write" on storage.objects
  for all using (public.is_admin()) with check (public.is_admin());
