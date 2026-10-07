-- =====================================================================
-- SINAN ERP · 09 - VENTAS HISTÓRICAS 2024-2025
-- Desde "Copia de Sinan finanzas (4).xlsx", hoja Ventas (jul-2024 a jul-2025).
-- Se cargan como históricas: NO descuentan stock (el producto queda como
-- texto, sin vincular al catálogo actual) y en Ventas se ven aparte.
-- Sí cuentan para clientas, reportes y análisis.
-- Solo se cargan una vez (si ya hay históricas, no hace nada).
-- Clientas unificadas con las de 2026 (Sonia, Lorena, Rocío, Cecilia, Sandra);
-- "Abu" = Abuela María y "Abuela" = Abuela Alicia (confirmado por Pame).
-- =====================================================================

alter table pedidos add column if not exists historico boolean not null default false;

-- Ayudante temporal: crea una venta histórica con sus productos
-- p_items: [[descripción, cantidad, total de la línea, ganancia], ...]
create or replace function public._hist(p_fecha date, p_cliente text, p_medio text, p_nota text, p_items jsonb)
returns void language plpgsql set search_path = public as $$
declare
  v_cli bigint;
  v_ped bigint;
  e jsonb;
begin
  select id into v_cli from clientes where nombre = p_cliente;
  if v_cli is null then
    insert into clientes (nombre, canal_origen, notas) values (p_cliente, 'Presencial', 'Clienta del Excel de ventas 2024-2025') returning id into v_cli;
  end if;
  insert into pedidos (fecha, cliente_id, canal, medio_pago, notas, historico, envio_metodo, cargado_por,
                       preparado_at, entregado_at, cobrado_at, creado, actualizado)
  values (p_fecha, v_cli, 'Presencial', p_medio, p_nota, true, 'En mano (presencial)', 'Excel ventas 2024-2025',
          p_fecha + time '12:00', p_fecha + time '12:00', p_fecha + time '12:00', p_fecha + time '12:00', p_fecha + time '12:00')
  returning id into v_ped;
  for e in select * from jsonb_array_elements(p_items) loop
    insert into pedido_items (pedido_id, producto_id, descripcion, color, cantidad, precio_unitario, costo_unitario)
    values (v_ped, null, e->>0, 'Único', (e->>1)::int,
            round((e->>2)::numeric / (e->>1)::int, 2),
            round(((e->>2)::numeric - (e->>3)::numeric) / (e->>1)::int, 2));
  end loop;
end $$;

do $$
begin
  if exists (select 1 from pedidos where historico) then
    raise notice 'Las ventas históricas ya estaban cargadas.';
    return;
  end if;

  perform _hist('2024-07-05', 'Mica Vargas', 'Transferencia', null, '[["Cartera Rihanna",1,20500,10000]]');
  perform _hist('2024-07-01', 'Mili Logística', 'Transferencia', null, '[["Bandolera Anita",1,18800,8250]]');
  perform _hist('2024-07-17', 'Tía Ana', 'Transferencia', null, '[["Mini bag Lucy negra",1,22900,10000]]');
  perform _hist('2024-07-31', 'Marisol', 'Transferencia', null, '[["Fundas de satén blancas",2,11700,6000]]');
  perform _hist('2024-08-12', 'Iara Deleon', 'Transferencia', null, '[["Bolso Zoe impermeable",1,23100,8400]]');
  perform _hist('2024-09-03', 'Miriam', 'Transferencia', null, '[["Bolso Anastasia",1,26100,8500]]');
  perform _hist('2024-09-05', 'Tía Ana', 'Efectivo y transferencia', null, '[["1 docena de fundas y scrunchies",1,75600,22700]]');
  perform _hist('2024-09-10', 'Karina', 'Transferencia', null, '[["1 docena de fundas",1,45000,6000]]');
  perform _hist('2024-09-21', 'Rocío prima', 'Transferencia', null, '[["Tote bag lienzo",1,6500,3100]]');
  perform _hist('2024-10-01', 'Abuela María', 'Efectivo', null, '[["Tote bag lienzo",1,6500,3100]]');
  perform _hist('2024-10-05', 'Irina', 'Transferencia', 'Abonó $ 1.300 para el otro combo', '[["Funda de satén + scrunchie",1,8700,2600]]');
  perform _hist('2024-10-05', 'Karina', 'Transferencia', 'Abonó $ 40.000', '[["14 fundas y media docena de scrunchies",1,75800,26100]]');
  perform _hist('2024-10-19', 'Ragazza', 'Efectivo', null, '[["Bolso Anastasia, funda y scrunchie",1,31860,9190]]');
  perform _hist('2024-10-19', 'Sandra yoga', 'Efectivo', null, '[["Mochila Fiona",1,24600,8000]]');
  perform _hist('2024-10-20', 'Kevin', 'Transferencia', null, '[["Bandolera Anita",1,23400,12000]]');
  perform _hist('2024-11-04', 'Daira', 'Transferencia', null, '[["Cartera Venice negra",2,62000,20000]]');
  perform _hist('2024-11-05', 'Laura', 'Efectivo', null, '[["Mochila Zafira",1,26000,9000]]');
  perform _hist('2024-11-04', 'Griselda', 'Transferencia', null, '[["Billetera Pocket negra",1,15700,4000]]');
  perform _hist('2024-11-16', 'Iara Deleon', 'Transferencia', null, '[["Mini bag Lucy negra",1,24500,8500]]');
  perform _hist('2024-11-07', 'Morena', 'Transferencia', null, '[["Scrunchies",2,5000,2200]]');
  perform _hist('2024-12-20', 'Karina', 'Transferencia', null, '[["2 docenas de fundas de satén",1,112500,28500]]');
  perform _hist('2025-01-08', 'Ceci', 'Transferencia', null, '[["Bolso Cielo",1,35500,11500]]');
  perform _hist('2025-01-18', 'Tía Cole', 'Efectivo', null, '[["Bolso Cielo",1,35500,11500]]');
  perform _hist('2025-01-20', 'Rocío prima', 'Transferencia', null, '[["Neceser y 2 scrunchies",1,13000,7500]]');
  perform _hist('2025-01-27', 'Tía María', 'Efectivo', null, '[["Bolso Cielo",1,35500,11500]]');
  perform _hist('2025-02-05', 'Abuela María', 'Efectivo', null, '[["Scrunchie",2,5400,2400]]');
  perform _hist('2025-02-05', 'Rocío prima', 'Transferencia', null, '[["Arito y scrunchie",1,6600,2640]]');
  perform _hist('2025-02-13', 'Tía María', 'Efectivo', null, '[["Arito y scrunchie",1,6600,2640],["Funda de satén",1,7500,3000]]');
  perform _hist('2025-02-13', 'Tío Emilio', 'Transferencia', null, '[["Arito y scrunchie",1,6600,2640]]');
  perform _hist('2025-03-10', 'Laura', 'Efectivo', null, '[["Tote bag versión 2",1,11000,3500]]');
  perform _hist('2025-05-07', 'Tita', 'Transferencia', null, '[["Billetera",1,17500,4800]]');
  perform _hist('2025-05-15', 'Tía Silvia', 'Transferencia', null, '[["Bolso Serena",1,18800,4300]]');
  perform _hist('2025-05-17', 'Tía Cole', 'Transferencia', null, '[["Arito mariposa",1,4200,1800]]');
  perform _hist('2025-05-30', 'Sandra yoga', 'Transferencia', null, '[["Scrunchie",2,5400,2400]]');
  perform _hist('2025-05-30', 'Lorena Logística', 'Transferencia', null, '[["Scrunchie",2,5400,2400]]');
  perform _hist('2025-05-30', 'Nicolás Pacheco', 'Transferencia', 'Fecha aproximada (en el Excel estaba mal cargada)', '[["Scrunchie",1,2700,1200]]');
  perform _hist('2025-05-30', 'Abuela Alicia', 'Efectivo', null, '[["Arito mariposa",1,4200,1800]]');
  perform _hist('2025-06-07', 'Yanet', 'Efectivo', null, '[["Bolso Cielo",1,35900,11700],["Scrunchie rosa",1,2700,1200]]');
  perform _hist('2025-06-08', 'Giovanna', null, null, '[["Fundas de satén",2,15000,6000]]');
  perform _hist('2025-06-24', 'Sonia Logística', null, null, '[["Scrunchie dorada",1,2700,1200]]');
  perform _hist('2025-06-25', 'Morena', 'Transferencia', null, '[["Scrunchies",3,8100,3600]]');
  perform _hist('2025-06-27', 'Sandra yoga', 'Transferencia', null, '[["Scrunchie dorada",1,2500,1000]]');
  perform _hist('2025-06-29', 'Tía Leila', 'Transferencia', null, '[["Arito argolla dorado",1,6600,2000]]');
  perform _hist('2025-07-05', 'Tía María', 'Efectivo', null, '[["Arito argolla plateado",1,7200,2200],["Arito corazón plateado",1,6600,2000]]');
  perform _hist('2025-07-05', 'Flor (novia de Lucas)', 'Efectivo', null, '[["Arito corazón dorado",1,7500,2300],["Arito flor dorado",1,7900,2500]]');
  perform _hist('2025-07-05', 'Tía Cole', 'Transferencia', null, '[["Arito argolla dorado",1,6600,2000],["Arito argolla plateado",1,7200,2200]]');

  -- Control: las 51 filas del Excel (46 ventas; algunas tienen 2 productos)
  if (select count(*) from pedido_items i join pedidos p on p.id = i.pedido_id where p.historico) <> 51 then
    raise exception 'Control: no se cargaron todas las líneas del Excel';
  end if;
end $$;

drop function if exists public._hist(date, text, text, text, jsonb);
