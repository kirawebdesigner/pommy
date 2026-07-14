begin;

alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table private.admin_users enable row level security;

create policy categories_public_read
on public.categories for select
to anon, authenticated
using (is_active);

create policy categories_admin_read
on public.categories for select
to authenticated
using ((select public.is_admin()));

create policy menu_items_public_read
on public.menu_items for select
to anon, authenticated
using (
  is_available
  and exists (
    select 1 from public.categories c
    where c.id = menu_items.category_id and c.is_active
  )
);

create policy menu_items_admin_read
on public.menu_items for select
to authenticated
using ((select public.is_admin()));

create policy orders_admin_read
on public.orders for select
to authenticated
using ((select public.is_admin()));

create policy orders_admin_status_update
on public.orders for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy order_items_admin_read
on public.order_items for select
to authenticated
using ((select public.is_admin()));

revoke all on schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all sequences in schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

revoke all on table public.categories, public.menu_items, public.orders, public.order_items from public, anon, authenticated;
revoke all on function public.create_order(text, text, text, jsonb, uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;
revoke all on function public.admin_dashboard() from public, anon, authenticated;
revoke all on function public.admin_list_orders(text, integer, integer, text) from public, anon, authenticated;
revoke all on function public.admin_get_order(uuid) from public, anon, authenticated;
revoke all on function public.admin_update_order_status(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_list_menu_items() from public, anon, authenticated;
revoke all on function public.admin_list_categories() from public, anon, authenticated;
revoke all on function public.admin_update_menu_item(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.admin_update_category(uuid, jsonb) from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on table public.categories, public.menu_items to anon, authenticated;
grant execute on function public.create_order(text, text, text, jsonb, uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_dashboard() to authenticated;
grant execute on function public.admin_list_orders(text, integer, integer, text) to authenticated;
grant execute on function public.admin_get_order(uuid) to authenticated;
grant execute on function public.admin_update_order_status(uuid, text) to authenticated;
grant execute on function public.admin_list_menu_items() to authenticated;
grant execute on function public.admin_list_categories() to authenticated;
grant execute on function public.admin_update_menu_item(uuid, jsonb) to authenticated;
grant execute on function public.admin_update_category(uuid, jsonb) to authenticated;

alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema private revoke execute on functions from public;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema private revoke all on tables from anon, authenticated;

comment on policy orders_admin_read on public.orders is 'Defense in depth; direct table privileges remain revoked and admin reads use RPCs.';

commit;
