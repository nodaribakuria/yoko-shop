-- Run this in Supabase Dashboard > SQL Editor after creating the project.
create table if not exists public.products (
  id bigint primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null check (category in ('ტანსაცმელი', 'აქსესუარები', 'ნივთები')),
  price numeric(10,2) not null check (price > 0),
  old_price numeric(10,2),
  badge text not null default 'ახალი',
  image_url text not null default '',
  image_path text not null default '',
  alt text not null default '',
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

drop policy if exists "Anyone can view products" on public.products;
create policy "Anyone can view products" on public.products
  for select to anon, authenticated using (true);

drop policy if exists "Users add their own products" on public.products;
create policy "Users add their own products" on public.products
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users edit their own products" on public.products;
create policy "Users edit their own products" on public.products
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete their own products" on public.products;
create policy "Users delete their own products" on public.products
  for delete to authenticated using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public product image reads" on storage.objects;
create policy "Public product image reads" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');

drop policy if exists "Users upload into their own folder" on storage.objects;
create policy "Users upload into their own folder" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users delete from their own folder" on storage.objects;
create policy "Users delete from their own folder" on storage.objects
  for delete to authenticated using (
    bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
