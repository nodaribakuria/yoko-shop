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

-- Only accounts explicitly listed here can publish or manage store products.
-- Add the shop owner's account after signing up; see README.md.
create table if not exists public.store_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.store_admins enable row level security;
grant select on public.store_admins to authenticated;
revoke insert, update, delete on public.store_admins from anon, authenticated;

drop policy if exists "Admins can read own membership" on public.store_admins;
create policy "Admins can read own membership" on public.store_admins
  for select to authenticated using (auth.uid() = user_id);

alter table public.products enable row level security;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

drop policy if exists "Anyone can view products" on public.products;
create policy "Anyone can view products" on public.products
  for select to anon, authenticated using (true);

drop policy if exists "Users add their own products" on public.products;
drop policy if exists "Store admins add products" on public.products;
create policy "Store admins add products" on public.products
  for insert to authenticated with check (
    auth.uid() = user_id and exists (
      select 1 from public.store_admins where user_id = auth.uid()
    )
  );

drop policy if exists "Users edit their own products" on public.products;
drop policy if exists "Store admins edit their own products" on public.products;
create policy "Store admins edit their own products" on public.products
  for update to authenticated using (
    auth.uid() = user_id and exists (
      select 1 from public.store_admins where user_id = auth.uid()
    )
  ) with check (
    auth.uid() = user_id and exists (
      select 1 from public.store_admins where user_id = auth.uid()
    )
  );

drop policy if exists "Users delete their own products" on public.products;
drop policy if exists "Store admins delete their own products" on public.products;
create policy "Store admins delete their own products" on public.products
  for delete to authenticated using (
    auth.uid() = user_id and exists (
      select 1 from public.store_admins where user_id = auth.uid()
    )
  );

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  shipping_address text not null,
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  total numeric(10,2) not null check (total > 0),
  status text not null default 'ახალი' check (status in ('ახალი', 'დამუშავებაში', 'გაგზავნილი', 'დასრულებული', 'გაუქმებული')),
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;
grant select, insert on public.orders to authenticated;
revoke update, delete on public.orders from anon, authenticated;

drop policy if exists "Customers create their own orders" on public.orders;
create policy "Customers create their own orders" on public.orders
  for insert to authenticated with check (auth.uid() = user_id and status = 'ახალი');

drop policy if exists "Customers and store admins read orders" on public.orders;
create policy "Customers and store admins read orders" on public.orders
  for select to authenticated using (
    auth.uid() = user_id or exists (
      select 1 from public.store_admins where user_id = auth.uid()
    )
  );

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
drop policy if exists "Store admins upload product images" on storage.objects;
create policy "Store admins upload product images" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (select 1 from public.store_admins where user_id = auth.uid())
  );

drop policy if exists "Users delete from their own folder" on storage.objects;
drop policy if exists "Store admins delete product images" on storage.objects;
create policy "Store admins delete product images" on storage.objects
  for delete to authenticated using (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (select 1 from public.store_admins where user_id = auth.uid())
  );
