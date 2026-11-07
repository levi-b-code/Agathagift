-- AGATHA GIFTS - RESERVA PRESENCIAL (SEM PIX)
-- Execute após backup. Mantém as tabelas e os pedidos antigos.
-- Cria novas funções de reserva e desativa as funções públicas de Pix.
-- Antes de publicar, confirme que o SQL foi executado sem erros.

create or replace function public.create_reservation(p_adult_name text, p_adult_phone text, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_item jsonb; v_id uuid; v_qty integer; v_product public.products%rowtype;
  v_order uuid; v_total numeric := 0; v_count integer := 0;
  v_ids uuid[]; v_current uuid; v_expected integer;
begin
  if length(btrim(coalesce(p_adult_name,''))) not between 3 and 80 then raise exception 'Nome do responsável inválido'; end if;
  if length(btrim(coalesce(p_adult_phone,''))) not between 10 and 20 or p_adult_phone !~ '^[0-9+() .-]+$' then raise exception 'Telefone inválido'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'Sacola inválida'; end if;
  -- Validate before locking, reject duplicate products and oversized quantities.
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object' or (v_item->>'id') is null or (v_item->>'quantity') !~ '^[0-9]{1,3}$' then
      raise exception 'Item inválido'; end if;
    if (v_item->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Identificador inválido'; end if;
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
    values (btrim(p_adult_name),btrim(p_adult_phone),'reserved',v_total) returning id into v_order;
  foreach v_current in array v_ids loop
    select * into v_product from public.products where id=v_current;
    select (value->>'quantity')::integer into v_qty from jsonb_array_elements(p_items) where value->>'id'=v_current::text;
    insert into public.order_items(order_id,product_id,product_name,quantity,unit_price,line_total)
      values(v_order,v_current,v_product.name,v_qty,v_product.price,v_qty*v_product.price);
    update public.products set stock=stock-v_qty,updated_at=now() where id=v_current;
    insert into public.stock_movements(product_id,quantity_change,reason)
      values(v_current,-v_qty,'Reserva presencial '||v_order::text);
  end loop;
  return jsonb_build_object('id',v_order,'total',v_total,'status','reserved');
end $$;
revoke all on function public.create_reservation(text,text,jsonb) from public;
grant execute on function public.create_reservation(text,text,jsonb) to anon, authenticated;

create or replace function public.set_reservation_status(p_order_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old text; v_item record;
begin
  if not public.is_store_admin() then raise exception 'Não autorizado'; end if;
  if p_status not in ('collected','cancelled') then raise exception 'Status inválido'; end if;
  select status into v_old from public.orders where id=p_order_id for update;
  if not found then raise exception 'Pedido não encontrado'; end if;
  if v_old <> 'reserved' then raise exception 'Somente reservas presenciais abertas podem ser alteradas'; end if;
  if p_status = 'cancelled' then
    for v_item in select product_id,quantity from public.order_items where order_id=p_order_id order by product_id loop
      if v_item.product_id is not null then
        update public.products set stock=stock+v_item.quantity,updated_at=now() where id=v_item.product_id;
        if found then
          insert into public.stock_movements(product_id,quantity_change,reason)
            values(v_item.product_id,v_item.quantity,'Cancelamento da reserva '||p_order_id::text);
        end if;
      end if;
    end loop;
  end if;
  update public.orders set status=p_status where id=p_order_id;
end $$;
revoke all on function public.set_reservation_status(uuid,text) from public;
grant execute on function public.set_reservation_status(uuid,text) to authenticated;

-- A reserva é anônima e pode ser alvo de automação abusiva. Antes de produção,
-- implementar CAPTCHA validado no servidor, limite de requisições por IP e
-- expiração/cancelamento de reservas abandonadas. Não confiar em CAPTCHA só no JS.
-- Bloqueia as antigas funções de Pix, caso tenham sido instaladas.
do $$ begin
  if to_regprocedure('public.create_pix_order(text,text,jsonb)') is not null then
    execute 'revoke all on function public.create_pix_order(text,text,jsonb) from public, anon, authenticated';
  end if;
  if to_regprocedure('public.set_pix_order_status(uuid,text)') is not null then
    execute 'revoke all on function public.set_pix_order_status(uuid,text) from public, anon, authenticated';
  end if;
end $$;

-- A tabela de configurações antigas permanece preservada para auditoria.
-- Evita que dados antigos de Pix sejam expostos pela API pública.
-- A tabela store_settings é preservada para evitar perda de dados antigos.
do $$ begin
  if to_regclass('public.store_settings') is not null then
    execute 'drop policy if exists "Public reads store settings" on public.store_settings';
    execute 'revoke select on public.store_settings from anon';
    execute 'revoke select on public.store_settings from authenticated';
  end if;
end $$;
