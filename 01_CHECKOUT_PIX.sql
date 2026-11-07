-- Executar no SQL Editor do projeto Supabase. Faça backup antes.
-- Pix manual: nenhum pagamento é confirmado automaticamente.
create table if not exists public.store_settings (
  id integer primary key default 1 check (id = 1),
  pix_key text not null default '',
  pix_owner text not null default '',
  payment_message text not null default 'Faça o Pix e aguarde a confirmação do responsável.',
  whatsapp text not null default ''
);
insert into public.store_settings (id) values (1) on conflict (id) do nothing;
alter table public.store_settings enable row level security;
drop policy if exists "Public reads store settings" on public.store_settings;
create policy "Public reads store settings" on public.store_settings for select to anon, authenticated using (id=1);
drop policy if exists "Admins update store settings" on public.store_settings;
create policy "Admins update store settings" on public.store_settings for update to authenticated using (public.is_store_admin()) with check (public.is_store_admin());
-- Somente admins atualizam via aplicação; impedir INSERT/DELETE por clientes.
grant select on public.store_settings to anon, authenticated;
grant update on public.store_settings to authenticated;

create or replace function public.create_pix_order(p_adult_name text, p_adult_phone text, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_item jsonb; v_id uuid; v_qty integer; v_product public.products%rowtype;
  v_order uuid; v_total numeric := 0; v_count integer := 0;
  v_ids uuid[]; v_current uuid; v_expected integer;
begin
  if length(btrim(coalesce(p_adult_name,''))) not between 3 and 80 then raise exception 'Nome do responsável inválido'; end if;
  if length(btrim(coalesce(p_adult_phone,''))) not between 10 and 20 then raise exception 'Telefone inválido'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'Sacola inválida'; end if;
  -- Validate before locking, reject duplicate products and oversized quantities.
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object' or (v_item->>'id') is null or (v_item->>'quantity') !~ '^[0-9]{1,3}$' then
      raise exception 'Item inválido'; end if;
    v_id := (v_item->>'id')::uuid; v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 or v_qty > 100 then raise exception 'Quantidade inválida'; end if;
    v_ids := array_append(v_ids, v_id); v_count := v_count+1;
  end loop;
  select count(distinct x) into v_expected from unnest(v_ids) as x;
  if v_expected <> v_count then raise exception 'Produto duplicado'; end if;
  -- Stable locking order prevents deadlocks between concurrent checkouts.
  foreach v_current in array (select array_agg(x order by x) from unnest(v_ids) as x) loop
    select * into v_product from public.products where id=v_current for update;
    if not found or not v_product.is_active then raise exception 'Produto indisponível'; end if;
    select (value->>'quantity')::integer into v_qty from jsonb_array_elements(p_items) where value->>'id'=v_current::text;
    if v_product.stock < v_qty then raise exception 'Estoque insuficiente para %', v_product.name; end if;
    if v_product.price <= 0 then raise exception 'Preço inválido'; end if;
    v_total := v_total + v_product.price*v_qty;
  end loop;
  insert into public.orders(adult_name,adult_phone,status,total)
    values (btrim(p_adult_name),btrim(p_adult_phone),'pending',v_total) returning id into v_order;
  foreach v_current in array v_ids loop
    select * into v_product from public.products where id=v_current;
    select (value->>'quantity')::integer into v_qty from jsonb_array_elements(p_items) where value->>'id'=v_current::text;
    insert into public.order_items(order_id,product_id,product_name,quantity,unit_price,line_total)
      values(v_order,v_current,v_product.name,v_qty,v_product.price,v_qty*v_product.price);
    update public.products set stock=stock-v_qty,updated_at=now() where id=v_current;
    insert into public.stock_movements(product_id,quantity_change,reason)
      values(v_current,-v_qty,'Reserva do pedido '||v_order::text);
  end loop;
  return jsonb_build_object('id',v_order,'total',v_total,'status','pending');
end $$;
revoke all on function public.create_pix_order(text,text,jsonb) from public;
grant execute on function public.create_pix_order(text,text,jsonb) to anon,authenticated;

create or replace function public.set_pix_order_status(p_order_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old text; v_item record;
begin
  if not public.is_store_admin() then raise exception 'Não autorizado'; end if;
  if p_status not in ('paid','cancelled') then raise exception 'Status inválido'; end if;
  select status into v_old from public.orders where id=p_order_id for update;
  if not found then raise exception 'Pedido não encontrado'; end if;
  if v_old <> 'pending' then raise exception 'Somente pedidos pendentes podem ser alterados'; end if;
  if p_status = 'cancelled' then
    for v_item in select product_id,quantity from public.order_items where order_id=p_order_id order by product_id loop
      if v_item.product_id is not null then
        update public.products set stock=stock+v_item.quantity,updated_at=now() where id=v_item.product_id;
        if found then
          insert into public.stock_movements(product_id,quantity_change,reason)
            values(v_item.product_id,v_item.quantity,'Cancelamento do pedido '||p_order_id::text);
        end if;
      end if;
    end loop;
  end if;
  update public.orders set status=p_status where id=p_order_id;
end $$;
revoke all on function public.set_pix_order_status(uuid,text) from public;
grant execute on function public.set_pix_order_status(uuid,text) to authenticated;
