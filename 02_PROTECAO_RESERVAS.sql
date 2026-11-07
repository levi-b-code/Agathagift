-- EXECUTAR DEPOIS DE 01_RESERVA_PRESENCIAL.sql
-- Bloqueia chamadas diretas de visitantes: somente Edge Function com service_role pode criar reservas.
revoke all on function public.create_reservation(text,text,jsonb) from public, anon, authenticated;
grant execute on function public.create_reservation(text,text,jsonb) to service_role;

-- Registro mínimo de limites de uso, sem guardar endereço IP ou telefone em claro.
create table if not exists public.reservation_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  phone_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists reservation_attempts_ip_idx on public.reservation_attempts(ip_hash,created_at desc);
create index if not exists reservation_attempts_phone_idx on public.reservation_attempts(phone_hash,created_at desc);
alter table public.reservation_attempts enable row level security;
revoke all on public.reservation_attempts from public, anon, authenticated;

-- Chamado somente pelo service_role. Bloqueio serializa verificações concorrentes.
create or replace function public.check_reservation_limit(p_ip_hash text,p_phone_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_ip_count integer; v_phone_count integer;
begin
  if auth.role() <> 'service_role' then raise exception 'Não autorizado'; end if;
  if length(p_ip_hash) <> 64 or length(p_phone_hash) <> 64 then raise exception 'Hash inválido'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_ip_hash,0));
  perform pg_advisory_xact_lock(hashtextextended(p_phone_hash,1));
  select count(*) into v_ip_count from public.reservation_attempts
    where ip_hash=p_ip_hash and created_at > now()-interval '30 minutes';
  select count(*) into v_phone_count from public.reservation_attempts
    where phone_hash=p_phone_hash and created_at > now()-interval '24 hours';
  if v_ip_count >= 3 or v_phone_count >= 2 then return false; end if;
  insert into public.reservation_attempts(ip_hash,phone_hash) values(p_ip_hash,p_phone_hash);
  return true;
end $$;
revoke all on function public.check_reservation_limit(text,text) from public, anon, authenticated;
grant execute on function public.check_reservation_limit(text,text) to service_role;

-- Reservas expiradas: transação e restauração de estoque. Executar periodicamente pelo pg_cron.
create or replace function public.expire_reservations()
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; i record; v_count integer := 0;
begin
  if auth.role() <> 'service_role' and session_user <> 'postgres' then
    raise exception 'Não autorizado';
  end if;
  for r in select id from public.orders where status='reserved'
    and created_at < now()-interval '24 hours' order by created_at for update skip locked loop
    for i in select product_id,quantity from public.order_items where order_id=r.id order by product_id loop
      if i.product_id is not null then
        update public.products set stock=stock+i.quantity,updated_at=now() where id=i.product_id;
        if found then
          insert into public.stock_movements(product_id,quantity_change,reason)
          values(i.product_id,i.quantity,'Expiração da reserva '||r.id::text);
        end if;
      end if;
    end loop;
    update public.orders set status='expired' where id=r.id;
    v_count := v_count+1;
  end loop;
  delete from public.reservation_attempts where created_at < now()-interval '48 hours';
  return v_count;
end $$;
revoke all on function public.expire_reservations() from public, anon, authenticated;
grant execute on function public.expire_reservations() to service_role;

-- Agendamento: habilite a extensão pg_cron no Supabase antes de executar o bloco abaixo.
-- Depois execute, UMA ÚNICA VEZ:
-- select cron.schedule('agatha-expire-reservations','*/15 * * * *',
--   'select public.expire_reservations()');
-- Confira em Database > Cron Jobs se o agendamento foi criado e está ativo.
