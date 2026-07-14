begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_not_blank check (length(btrim(name)) between 1 and 100),
  constraint categories_name_unique unique (name),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint categories_slug_unique unique (slug),
  constraint categories_sort_order_nonnegative check (sort_order >= 0)
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on update cascade on delete restrict,
  name text not null,
  slug text not null,
  description text,
  price numeric(12, 2) not null,
  image_url text,
  is_available boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_items_name_not_blank check (length(btrim(name)) between 1 and 160),
  constraint menu_items_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint menu_items_slug_unique unique (slug),
  constraint menu_items_price_nonnegative check (price >= 0),
  constraint menu_items_sort_order_nonnegative check (sort_order >= 0),
  constraint menu_items_image_url_not_blank check (image_url is null or length(btrim(image_url)) > 0)
);

create sequence private.order_number_seq as bigint start with 1 increment by 1 no cycle;

create function private.next_order_number()
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  select 'POM-' || to_char(now() at time zone 'Africa/Nairobi', 'YYYY') || '-' || lpad(nextval('private.order_number_seq')::text, 5, '0');
$$;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null default private.next_order_number(),
  client_order_token uuid not null,
  request_hash bytea not null,
  customer_name text not null,
  phone text not null,
  order_type text not null,
  delivery_area text,
  address text,
  landmark text,
  notes text,
  subtotal numeric(12, 2) not null,
  payment_method text not null default 'cash_on_delivery',
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_order_number_unique unique (order_number),
  constraint orders_client_order_token_unique unique (client_order_token),
  constraint orders_order_number_format check (order_number ~ '^POM-[0-9]{4}-[0-9]{5,}$'),
  constraint orders_customer_name_not_blank check (length(btrim(customer_name)) between 1 and 120),
  constraint orders_phone_format check (phone ~ '^(09[0-9]{8}|\+2519[0-9]{8})$'),
  constraint orders_order_type_valid check (order_type in ('delivery', 'takeaway')),
  constraint orders_delivery_fields_valid check (
    (order_type = 'delivery' and nullif(btrim(delivery_area), '') is not null and nullif(btrim(address), '') is not null)
    or
    (order_type = 'takeaway' and delivery_area is null and address is null and landmark is null)
  ),
  constraint orders_customer_field_lengths check (
    length(coalesce(delivery_area, '')) <= 120
    and length(coalesce(address, '')) <= 500
    and length(coalesce(landmark, '')) <= 200
    and length(coalesce(notes, '')) <= 1000
  ),
  constraint orders_subtotal_nonnegative check (subtotal >= 0),
  constraint orders_payment_method_valid check (payment_method = 'cash_on_delivery'),
  constraint orders_status_valid check (status in ('new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'))
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on update cascade on delete restrict,
  menu_item_id uuid references public.menu_items(id) on update cascade on delete set null,
  product_name text not null,
  unit_price numeric(12, 2) not null,
  quantity integer not null,
  line_total numeric(12, 2) generated always as (unit_price * quantity) stored,
  created_at timestamptz not null default now(),
  constraint order_items_product_name_not_blank check (length(btrim(product_name)) between 1 and 160),
  constraint order_items_unit_price_nonnegative check (unit_price >= 0),
  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_quantity_reasonable check (quantity <= 99),
  constraint order_items_line_total_nonnegative check (line_total >= 0),
  constraint order_items_order_menu_unique unique (order_id, menu_item_id)
);

create index categories_active_sort_idx on public.categories (is_active, sort_order, id);
create index menu_items_category_id_idx on public.menu_items (category_id);
create index menu_items_is_available_idx on public.menu_items (is_available);
create index menu_items_is_featured_idx on public.menu_items (is_featured) where is_featured;
create index menu_items_public_sort_idx on public.menu_items (category_id, sort_order, id) where is_available;
create index orders_status_idx on public.orders (status);
create index orders_created_at_idx on public.orders (created_at desc);
create index order_items_order_id_idx on public.order_items (order_id);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger categories_set_updated_at
before update on public.categories
for each row execute function private.set_updated_at();

create trigger menu_items_set_updated_at
before update on public.menu_items
for each row execute function private.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function private.set_updated_at();

comment on table public.order_items is 'Immutable order-time product name and price snapshots.';
comment on column public.orders.request_hash is 'SHA-256 of normalized create_order input, used to reject mismatched idempotency-token reuse.';

commit;
