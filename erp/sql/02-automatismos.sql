-- =====================================================================
-- SINAN ERP · 02 - AUTOMATISMOS
-- Cosas que la base hace sola:
--   · Mantener el stock al día con cada entrada / salida / venta
--   · Calcular el total de cada pedido
--   · Devolver el stock si un pedido se cancela o se borra
--   · Crear las filas de stock de cada color al cargar un producto
-- =====================================================================

-- Cuánto suma o resta un movimiento
create or replace function delta_movimiento(p_tipo text, p_cantidad int)
returns int language sql immutable set search_path = public as $$
  select case p_tipo when 'salida' then -p_cantidad else p_cantidad end;
$$;

-- Suma (o resta) unidades al stock de un producto/color
create or replace function aplicar_stock(p_producto bigint, p_color text, p_delta int, p_crear boolean)
returns void language plpgsql set search_path = public as $$
begin
  update stock set cantidad = cantidad + p_delta
   where producto_id = p_producto and color = p_color;
  if not found and p_crear then
    insert into stock (producto_id, color, cantidad) values (p_producto, p_color, p_delta)
    on conflict (producto_id, color) do update set cantidad = stock.cantidad + excluded.cantidad;
  end if;
end $$;

-- Cada movimiento de stock actualiza la tabla stock
create or replace function trg_movimientos_stock()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op in ('UPDATE','DELETE') then
    perform aplicar_stock(old.producto_id, old.color, -delta_movimiento(old.tipo, old.cantidad), false);
  end if;
  if tg_op in ('INSERT','UPDATE') then
    perform aplicar_stock(new.producto_id, new.color, delta_movimiento(new.tipo, new.cantidad), true);
    return new;
  end if;
  return old;
end $$;

drop trigger if exists movimientos_stock_sync on movimientos_stock;
create trigger movimientos_stock_sync
  after insert or update of producto_id, color, tipo, cantidad or delete on movimientos_stock
  for each row execute function trg_movimientos_stock();

-- Cada ítem vendido genera su salida de stock y recalcula el total del pedido
create or replace function trg_pedido_items()
returns trigger language plpgsql set search_path = public as $$
declare
  v_pedido_id bigint;
  v_pedido    pedidos%rowtype;
begin
  if tg_op = 'DELETE' then v_pedido_id := old.pedido_id; else v_pedido_id := new.pedido_id; end if;

  if tg_op in ('UPDATE','DELETE') then
    delete from movimientos_stock where pedido_item_id = old.id;
  end if;

  if tg_op in ('INSERT','UPDATE') then
    select * into v_pedido from pedidos where id = new.pedido_id;
    if new.producto_id is not null and v_pedido.estado <> 'Cancelado' then
      insert into movimientos_stock (fecha, producto_id, color, tipo, cantidad, motivo, pedido_id, pedido_item_id)
      values (v_pedido.fecha, new.producto_id, new.color, 'salida', new.cantidad,
              'Venta · pedido #' || new.pedido_id, new.pedido_id, new.id);
    end if;
  end if;

  update pedidos
     set subtotal = (select coalesce(sum(cantidad * precio_unitario), 0) from pedido_items where pedido_id = v_pedido_id)
   where id = v_pedido_id;
  return null;
end $$;

drop trigger if exists pedido_items_sync on pedido_items;
create trigger pedido_items_sync
  after insert or update or delete on pedido_items
  for each row execute function trg_pedido_items();

-- Marca la fecha de última actualización de un pedido
create or replace function trg_pedidos_actualizado()
returns trigger language plpgsql set search_path = public as $$
begin
  -- si se cambia a mano la fecha de actualización se respeta; si no, se pone "ahora"
  if new.actualizado is not distinct from old.actualizado then
    new.actualizado := now();
  end if;
  return new;
end $$;

drop trigger if exists pedidos_actualizado on pedidos;
create trigger pedidos_actualizado
  before update on pedidos
  for each row execute function trg_pedidos_actualizado();

-- Si un pedido se cancela devuelve el stock; si se "des-cancela" lo vuelve a descontar
create or replace function trg_pedidos_estado()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.estado = 'Cancelado' and old.estado <> 'Cancelado' then
    delete from movimientos_stock where pedido_id = new.id and pedido_item_id is not null;
  elsif old.estado = 'Cancelado' and new.estado <> 'Cancelado' then
    insert into movimientos_stock (fecha, producto_id, color, tipo, cantidad, motivo, pedido_id, pedido_item_id)
    select new.fecha, i.producto_id, i.color, 'salida', i.cantidad, 'Venta · pedido #' || new.id, new.id, i.id
      from pedido_items i
     where i.pedido_id = new.id and i.producto_id is not null;
  end if;
  return null;
end $$;

drop trigger if exists pedidos_estado on pedidos;
create trigger pedidos_estado
  after update of estado on pedidos
  for each row execute function trg_pedidos_estado();

-- Al cargar o editar un producto se crea una fila de stock por cada color
create or replace function trg_productos_colores()
returns trigger language plpgsql set search_path = public as $$
begin
  insert into stock (producto_id, color, cantidad)
  select new.id, c, 0
    from unnest(case when coalesce(array_length(new.colores, 1), 0) = 0
                     then array['Único'] else new.colores end) as c
  on conflict (producto_id, color) do nothing;
  return null;
end $$;

drop trigger if exists productos_colores on productos;
create trigger productos_colores
  after insert or update of colores on productos
  for each row execute function trg_productos_colores();

-- Guarda un pedido completo (cabecera + productos) de una sola vez.
-- Si algo falla no se guarda nada a medias.
create or replace function guardar_pedido(p_pedido jsonb, p_items jsonb)
returns bigint language plpgsql set search_path = public as $$
declare
  v_id bigint;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido tiene que tener al menos un producto';
  end if;

  if coalesce(p_pedido->>'id', '') = '' then
    insert into pedidos (fecha, cliente_id, canal, estado, evento_id, descuento, envio, notas)
    values (
      coalesce((p_pedido->>'fecha')::date, current_date),
      nullif(p_pedido->>'cliente_id', '')::bigint,
      coalesce(p_pedido->>'canal', 'Instagram'),
      coalesce(p_pedido->>'estado', 'Pendiente'),
      nullif(p_pedido->>'evento_id', '')::bigint,
      coalesce(nullif(p_pedido->>'descuento', '')::numeric, 0),
      coalesce(nullif(p_pedido->>'envio', '')::numeric, 0),
      p_pedido->>'notas'
    ) returning id into v_id;
  else
    v_id := (p_pedido->>'id')::bigint;
    delete from pedido_items where pedido_id = v_id;   -- devuelve el stock de los ítems viejos
    update pedidos set
      fecha      = coalesce((p_pedido->>'fecha')::date, fecha),
      cliente_id = nullif(p_pedido->>'cliente_id', '')::bigint,
      canal      = coalesce(p_pedido->>'canal', canal),
      estado     = coalesce(p_pedido->>'estado', estado),
      evento_id  = nullif(p_pedido->>'evento_id', '')::bigint,
      descuento  = coalesce(nullif(p_pedido->>'descuento', '')::numeric, 0),
      envio      = coalesce(nullif(p_pedido->>'envio', '')::numeric, 0),
      notas      = p_pedido->>'notas'
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
         coalesce(p.costo, 0)
    from jsonb_array_elements(p_items) as i
    left join productos p on p.id = nullif(i->>'producto_id', '')::bigint;

  return v_id;
end $$;
