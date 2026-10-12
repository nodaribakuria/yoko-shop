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
  customer_email text not null default '',
  shipping_address text not null,
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  shipping_fee numeric(10,2) not null default 0 check (shipping_fee >= 0),
  payment_method text not null default 'cash_on_delivery' check (payment_method = 'cash_on_delivery'),
  total numeric(10,2) not null check (total > 0),
  status text not null default 'ახალი' check (status in ('ახალი', 'დამუშავებაში', 'გაგზავნილი', 'დასრულებული', 'გაუქმებული')),
  created_at timestamptz not null default now()
);

-- Server-side price source for the built-in catalog. These prices are
-- rechecked when an order is created, so browser edits cannot change totals.
create table if not exists public.default_order_catalog (
  id bigint primary key,
  name text not null,
  price numeric(10,2) not null check (price > 0),
  active boolean not null default true
);

alter table public.default_order_catalog enable row level security;
revoke all on public.default_order_catalog from anon, authenticated;

insert into public.default_order_catalog (id, name, price) values
  (9, 'DOMINA 1023 — ლაქის ჩექმები', 200),
  (1, 'კლასიკური ტრენჩი', 189),
  (2, 'ყოველდღიური ტოტე', 95),
  (3, 'ქსოვილის პერანგი', 115),
  (4, 'მინიმალისტური საათი', 149),
  (5, 'რბილი ნაქსოვი სვიტერი', 139),
  (6, 'ყავის ჭიქა — Terra', 38),
  (7, 'სათვალე Soleil', 72),
  (8, 'სურნელოვანი სანთელი', 45)
on conflict (id) do update set name = excluded.name, price = excluded.price, active = true;

-- Clothing added from the owner's supplied product photos. Keep these prices
-- in sync with the matching entries in script.js so server totals are trusted.
insert into public.default_order_catalog (id, name, price) values
  (1001, 'გულის პრინტიანი ფუმფულა ხალათი', 59),
  (1002, 'ლურჯი ფუმფულა ჰუდი-ხალათი', 65),
  (1003, 'შავი ფუმფულა ჰუდი-ხალათი', 65),
  (1004, 'ძაღლების პრინტიანი ხალათი', 55),
  (1005, 'წითელ-შავი კუბოკრული ხალათი', 59),
  (1006, 'ვარდისფერი ფლისის ხალათი', 59),
  (1007, 'ვარდისფერი ჰუდი-პონჩო', 55),
  (1008, 'ნაცრისფერი რბილი ხალათი', 65),
  (1009, 'შავი კლასიკური პალტო', 70),
  (1010, 'ლურჯ-ნაცრისფერი ფუმფულა ხალათი', 65)
on conflict (id) do update set name = excluded.name, price = excluded.price, active = true;

-- Extend an existing orders table safely when this setup is run again.
alter table public.orders add column if not exists shipping_fee numeric(10,2) not null default 0 check (shipping_fee >= 0);
alter table public.orders add column if not exists payment_method text not null default 'cash_on_delivery';
alter table public.orders add column if not exists customer_email text not null default '';
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check check (payment_method = 'cash_on_delivery');

alter table public.orders enable row level security;
grant select on public.orders to authenticated;
revoke insert, update, delete on public.orders from anon, authenticated;
grant update (status) on public.orders to authenticated;

drop policy if exists "Customers create their own orders" on public.orders;

drop policy if exists "Customers and store admins read orders" on public.orders;
create policy "Customers and store admins read orders" on public.orders
  for select to authenticated using (
    auth.uid() = user_id or exists (
      select 1 from public.store_admins where user_id = auth.uid()
    )
  );

drop policy if exists "Store admins update order status" on public.orders;
create policy "Store admins update order status" on public.orders
  for update to authenticated using (
    exists (select 1 from public.store_admins where user_id = auth.uid())
  ) with check (
    exists (select 1 from public.store_admins where user_id = auth.uid())
  );

-- One persistent support conversation per customer, independent of orders.
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references auth.users(id) on delete cascade,
  customer_name text not null default '',
  customer_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('customer', 'admin')),
  body text not null default '',
  attachment_path text,
  constraint support_chat_messages_body_check check (
    length(body) <= 2000 and (length(btrim(body)) > 0 or attachment_path is not null)
  ),
  created_at timestamptz not null default now()
);

alter table public.support_chat_messages add column if not exists attachment_path text;
alter table public.support_chat_messages alter column body set default '';
alter table public.support_chat_messages drop constraint if exists support_chat_messages_body_check;
alter table public.support_chat_messages add constraint support_chat_messages_body_check check (
  length(body) <= 2000 and (length(btrim(body)) > 0 or attachment_path is not null)
);

alter table public.chat_conversations enable row level security;
alter table public.support_chat_messages enable row level security;
revoke all on public.chat_conversations from public, anon, authenticated;
revoke all on public.support_chat_messages from public, anon;
grant select on public.chat_conversations to authenticated;
grant select, insert on public.support_chat_messages to authenticated;
revoke update, delete on public.support_chat_messages from public, anon, authenticated;

drop policy if exists "Customers and admins read chat conversations" on public.chat_conversations;
create policy "Customers and admins read chat conversations" on public.chat_conversations
  for select to authenticated using (
    customer_id = auth.uid() or exists (
      select 1 from public.store_admins a where a.user_id = auth.uid()
    )
  );

drop policy if exists "Chat participants read support messages" on public.support_chat_messages;
create policy "Chat participants read support messages" on public.support_chat_messages
  for select to authenticated using (
    exists (
      select 1 from public.chat_conversations c
      where c.id = conversation_id
        and (c.customer_id = auth.uid() or exists (
          select 1 from public.store_admins a where a.user_id = auth.uid()
        ))
    )
  );

drop policy if exists "Chat participants send support messages" on public.support_chat_messages;
create policy "Chat participants send support messages" on public.support_chat_messages
  for insert to authenticated with check (
    sender_id = auth.uid() and (
      (sender_role = 'customer' and exists (
        select 1 from public.chat_conversations c
        where c.id = conversation_id and c.customer_id = auth.uid()
      ))
      or (sender_role = 'admin' and exists (
        select 1 from public.chat_conversations c
        join public.store_admins a on a.user_id = auth.uid()
        where c.id = conversation_id
      ))
    )
    and (attachment_path is null or attachment_path like conversation_id::text || '/' || auth.uid()::text || '/%')
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-attachments', 'chat-attachments', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Chat participants upload attachments" on storage.objects;
create policy "Chat participants upload attachments" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'chat-attachments'
    and exists (
      select 1 from public.chat_conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (c.customer_id = auth.uid() or exists (
          select 1 from public.store_admins a where a.user_id = auth.uid()
        ))
        and (storage.foldername(name))[2] = auth.uid()::text
    )
  );

drop policy if exists "Chat participants read attachments" on storage.objects;
create policy "Chat participants read attachments" on storage.objects
  for select to authenticated using (
    bucket_id = 'chat-attachments'
    and exists (
      select 1 from public.chat_conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (c.customer_id = auth.uid() or exists (
          select 1 from public.store_admins a where a.user_id = auth.uid()
        ))
    )
  );

create or replace function public.get_or_create_chat_conversation()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_customer_id uuid := auth.uid();
  v_conversation_id uuid;
  v_customer_name text;
  v_customer_email text;
begin
  if v_customer_id is null then
    raise exception 'Sign in is required to open chat';
  end if;
  select coalesce(u.raw_user_meta_data->>'full_name', ''), coalesce(u.email, '')
    into v_customer_name, v_customer_email
    from auth.users u where u.id = v_customer_id;
  insert into public.chat_conversations (customer_id, customer_name, customer_email)
  values (v_customer_id, coalesce(v_customer_name, ''), coalesce(v_customer_email, ''))
  on conflict (customer_id) do nothing;
  select id into v_conversation_id
    from public.chat_conversations where customer_id = v_customer_id;
  return v_conversation_id;
end;
$$;
revoke all on function public.get_or_create_chat_conversation() from public, anon;
grant execute on function public.get_or_create_chat_conversation() to authenticated;

create or replace function public.touch_chat_conversation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.chat_conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;
drop trigger if exists support_chat_message_updates_conversation on public.support_chat_messages;
create trigger support_chat_message_updates_conversation
  after insert on public.support_chat_messages
  for each row execute function public.touch_chat_conversation();

create index if not exists support_chat_messages_conversation_created_idx
  on public.support_chat_messages (conversation_id, created_at);

-- Orders are submitted through this function, which derives names, prices,
-- shipping and total from the server-side catalog and the products table.
create or replace function public.place_order(
  p_customer_name text,
  p_customer_phone text,
  p_shipping_address text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_item jsonb;
  v_product_id bigint;
  v_quantity integer;
  v_name text;
  v_price numeric(10,2);
  v_subtotal numeric(10,2) := 0;
  v_shipping numeric(10,2);
  v_order_items jsonb := '[]'::jsonb;
  v_order_id uuid;
begin
  if v_user_id is null then
    raise exception 'Sign in is required to place an order';
  end if;
  if length(btrim(coalesce(p_customer_name, ''))) not between 2 and 120
    or length(btrim(coalesce(p_customer_phone, ''))) not between 5 and 40
    or length(btrim(coalesce(p_shipping_address, ''))) not between 5 and 500 then
    raise exception 'Please provide valid contact and delivery details';
  end if;
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'The order items must be a list';
  end if;
  if jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'The order must contain between 1 and 50 items';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) as entry(value) loop
    if coalesce(v_item->>'id', '') !~ '^[0-9]{1,18}$'
      or coalesce(v_item->>'quantity', '') !~ '^[1-9][0-9]?$' then
      raise exception 'Invalid product or quantity';
    end if;
    v_product_id := (v_item->>'id')::bigint;
    v_quantity := (v_item->>'quantity')::integer;

    select p.name, p.price into v_name, v_price
      from public.products p where p.id = v_product_id;
    if not found then
      select c.name, c.price into v_name, v_price
        from public.default_order_catalog c
        where c.id = v_product_id and c.active;
    end if;
    if v_name is null or v_price is null then
      raise exception 'This product is no longer available';
    end if;

    v_subtotal := v_subtotal + v_price * v_quantity;
    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_product_id,
      'name', v_name,
      'unit_price', v_price,
      'quantity', v_quantity
    ));
    v_name := null;
    v_price := null;
  end loop;

  v_shipping := case when v_subtotal >= 150 then 0 else 10 end;
  select u.email into v_email from auth.users u where u.id = v_user_id;

  insert into public.orders (
    user_id, customer_name, customer_phone, customer_email,
    shipping_address, items, shipping_fee, payment_method, total
  ) values (
    v_user_id, btrim(p_customer_name), btrim(p_customer_phone), coalesce(v_email, ''),
    btrim(p_shipping_address), v_order_items, v_shipping, 'cash_on_delivery', v_subtotal + v_shipping
  ) returning id into v_order_id;

  insert into public.chat_conversations (customer_id, customer_name, customer_email)
  values (v_user_id, btrim(p_customer_name), coalesce(v_email, ''))
  on conflict (customer_id) do nothing;

  return v_order_id;
end;
$$;

revoke all on function public.place_order(text, text, text, jsonb) from public, anon;
grant execute on function public.place_order(text, text, text, jsonb) to authenticated;

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
