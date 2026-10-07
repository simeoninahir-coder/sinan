-- =====================================================================
-- SINAN ERP · 07 - VERSIÓN 4: pasos del pedido, envíos, responsables
--                  y embudo de consultas (clientes potenciales)
-- No borra datos. Se puede volver a correr.
-- =====================================================================

-- ---------- Pedidos: pasos (preparar → entregar → cobrar), envío y responsables ----------
alter table pedidos add column if not exists preparado_at  timestamptz;
alter table pedidos add column if not exists entregado_at  timestamptz;
alter table pedidos add column if not exists cobrado_at    timestamptz;
alter table pedidos add column if not exists envio_metodo  text;
alter table pedidos add column if not exists envio_detalle text;
alter table pedidos add column if not exists responsable_id bigint references personas(id) on delete set null;
alter table pedidos add column if not exists cargado_por   text;

-- Los estados viejos pasan a pasos (sin tocar el stock ni la fecha de actualización)
alter table pedidos drop constraint if exists pedidos_estado_check;
alter table pedidos disable trigger user;
update pedidos set
  preparado_at = case when estado in ('Enviado','Entregado') then coalesce(preparado_at, fecha + time '12:00') else preparado_at end,
  entregado_at = case when estado in ('Enviado','Entregado') then coalesce(entregado_at, fecha + time '12:00') else entregado_at end,
  cobrado_at   = case when estado in ('Pagado','Entregado') then coalesce(cobrado_at, fecha + time '12:00') else cobrado_at end
 where estado in ('Preparando','Enviado','Entregado','Pagado');

-- La etapa se calcula sola a partir de los pasos (salvo "Cancelado")
create or replace function etapa_pedido(p_prep timestamptz, p_entr timestamptz, p_cobr timestamptz)
returns text language sql immutable set search_path = public as $$
  select case
    when p_prep is null then 'Por preparar'
    when p_entr is null then 'Por entregar'
    when p_cobr is null then 'Por cobrar'
    else 'Completado' end;
$$;

update pedidos set estado = etapa_pedido(preparado_at, entregado_at, cobrado_at) where estado <> 'Cancelado';
alter table pedidos enable trigger user;

alter table pedidos alter column estado set default 'Por preparar';
alter table pedidos add constraint pedidos_estado_check
  check (estado in ('Por preparar','Por entregar','Por cobrar','Completado','Cancelado'));

create or replace function trg_pedidos_etapa()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.estado is distinct from 'Cancelado' then
    new.estado := etapa_pedido(new.preparado_at, new.entregado_at, new.cobrado_at);
  end if;
  return new;
end $$;

drop trigger if exists pedidos_etapa on pedidos;
create trigger pedidos_etapa
  before insert or update on pedidos
  for each row execute function trg_pedidos_etapa();

-- guardar_pedido ahora también guarda pasos, envío y responsables
create or replace function guardar_pedido(p_pedido jsonb, p_items jsonb)
returns bigint language plpgsql set search_path = public as $$
declare
  v_id     bigint;
  v_costos jsonb := '{}';
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido tiene que tener al menos un producto';
  end if;

  if coalesce(p_pedido->>'id', '') = '' then
    insert into pedidos (fecha, cliente_id, canal, estado, medio_pago, evento_id, descuento, envio, notas,
                         preparado_at, entregado_at, cobrado_at, envio_metodo, envio_detalle, responsable_id, cargado_por)
    values (
      coalesce((p_pedido->>'fecha')::date, current_date),
      nullif(p_pedido->>'cliente_id', '')::bigint,
      coalesce(p_pedido->>'canal', 'Presencial'),
      case when p_pedido->>'estado' = 'Cancelado' then 'Cancelado' else 'Por preparar' end,
      nullif(p_pedido->>'medio_pago', ''),
      nullif(p_pedido->>'evento_id', '')::bigint,
      coalesce(nullif(p_pedido->>'descuento', '')::numeric, 0),
      coalesce(nullif(p_pedido->>'envio', '')::numeric, 0),
      p_pedido->>'notas',
      nullif(p_pedido->>'preparado_at', '')::timestamptz,
      nullif(p_pedido->>'entregado_at', '')::timestamptz,
      nullif(p_pedido->>'cobrado_at', '')::timestamptz,
      nullif(p_pedido->>'envio_metodo', ''),
      nullif(p_pedido->>'envio_detalle', ''),
      nullif(p_pedido->>'responsable_id', '')::bigint,
      nullif(p_pedido->>'cargado_por', '')
    ) returning id into v_id;
  else
    v_id := (p_pedido->>'id')::bigint;
    select coalesce(jsonb_object_agg(producto_id || '|' || color, costo_unitario), '{}')
      into v_costos from pedido_items where pedido_id = v_id and producto_id is not null;
    delete from pedido_items where pedido_id = v_id;   -- devuelve el stock de los ítems viejos
    update pedidos set
      fecha          = coalesce((p_pedido->>'fecha')::date, fecha),
      cliente_id     = nullif(p_pedido->>'cliente_id', '')::bigint,
      canal          = coalesce(p_pedido->>'canal', canal),
      estado         = case when p_pedido->>'estado' = 'Cancelado' then 'Cancelado' else 'Por preparar' end,
      medio_pago     = nullif(p_pedido->>'medio_pago', ''),
      evento_id      = nullif(p_pedido->>'evento_id', '')::bigint,
      descuento      = coalesce(nullif(p_pedido->>'descuento', '')::numeric, 0),
      envio          = coalesce(nullif(p_pedido->>'envio', '')::numeric, 0),
      notas          = p_pedido->>'notas',
      preparado_at   = nullif(p_pedido->>'preparado_at', '')::timestamptz,
      entregado_at   = nullif(p_pedido->>'entregado_at', '')::timestamptz,
      cobrado_at     = nullif(p_pedido->>'cobrado_at', '')::timestamptz,
      envio_metodo   = nullif(p_pedido->>'envio_metodo', ''),
      envio_detalle  = nullif(p_pedido->>'envio_detalle', ''),
      responsable_id = nullif(p_pedido->>'responsable_id', '')::bigint
    where id = v_id;
    if not found then raise exception 'No existe el pedido #%', v_id; end if;
  end if;

  insert into pedido_items (pedido_id, producto_id, descripcion, color, cantidad, precio_unitario, costo_unitario)
  select v_id,
         p.id,
         coalesce(p.nombre, i->>'descripcion'),
         coalesce(nullif(i->>'color', ''), 'Único'),
         (i->>'cantidad')::int,
         coalesce(nullif(i->>'precio_unitario', '')::numeric, p.precio, 0),
         coalesce((v_costos->>(p.id || '|' || coalesce(nullif(i->>'color', ''), 'Único')))::numeric, p.costo, 0)
    from jsonb_array_elements(p_items) as i
    left join productos p on p.id = nullif(i->>'producto_id', '')::bigint;

  return v_id;
end $$;

revoke execute on function guardar_pedido(jsonb, jsonb) from public, anon;
grant  execute on function guardar_pedido(jsonb, jsonb) to authenticated;

-- ---------- Embudo de consultas (clientes potenciales) ----------
create table if not exists consultas (
  id               bigint generated by default as identity primary key,
  fecha            date not null default current_date,
  nombre           text not null,
  contacto         text,
  canal            text,
  producto_id      bigint references productos(id) on delete set null,
  producto_texto   text,
  color            text,
  cantidad         int not null default 1,
  presupuesto      numeric(12,2),
  etapa            text not null default 'Nueva' check (etapa in ('Nueva','Presupuesto','Ganada','Perdida')),
  presupuesto_at   timestamptz,
  cerrada_at       timestamptz,
  motivo_perdida   text,
  detalle_perdida  text,
  notas            text,
  responsable_id   bigint references personas(id) on delete set null,
  cliente_id       bigint references clientes(id) on delete set null,
  pedido_id        bigint references pedidos(id) on delete set null,
  creado           timestamptz not null default now(),
  actualizado      timestamptz not null default now()
);
create index if not exists idx_consultas_etapa on consultas(etapa);

alter table consultas enable row level security;
drop policy if exists "solo usuarios logueados" on consultas;
create policy "solo usuarios logueados" on consultas for all to authenticated using (true) with check (true);
revoke all on consultas from anon;
grant select, insert, update, delete on consultas to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke usage, select on all sequences in schema public from anon;
