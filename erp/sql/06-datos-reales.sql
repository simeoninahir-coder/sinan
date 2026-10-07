-- =====================================================================
-- SINAN ERP · 06 - DATOS REALES (desde Sinan_Finanzas_2026_v2.xlsx)
-- ¡ATENCIÓN! Borra todos los datos actuales (los de ejemplo) y carga
-- los reales del Excel: productos, stock, insumos, clientas, ventas,
-- gastos y proveedores. La configuración de la marca no se toca.
-- =====================================================================

truncate table
  pedido_items, pedidos, movimientos_stock, stock, productos, clientes,
  evento_tareas, evento_colaboradores, movimientos_financieros, eventos,
  proveedores, publicaciones, ideas_contenido, pilares_contenido,
  metricas_instagram, tareas, personas, insumos, cliente_interacciones, consultas,
  objetivos_mkt, campanas
restart identity cascade;

-- Ayudante temporal: crea un pedido presencial entregado
create or replace function public._real_pedido(p_fecha date, p_cliente text, p_medio text)
returns bigint language sql set search_path = public as $$
insert into pedidos (fecha, cliente_id, canal, estado, medio_pago, envio_metodo, preparado_at, entregado_at, cobrado_at, creado, actualizado)  values (p_fecha, (select id from clientes where nombre = p_cliente), 'Presencial', 'Completado', p_medio, 'En mano (presencial)',          p_fecha + time '12:00', p_fecha + time '12:00', p_fecha + time '12:00', p_fecha + time '12:00', p_fecha + time '12:00')
  returning id;
$$;

-- Ayudante temporal: agrega un producto al pedido, con la ganancia exacta del Excel
create or replace function public._real_item(p_pedido bigint, p_producto text, p_color text, p_cantidad int, p_precio numeric, p_ganancia numeric)
returns void language sql set search_path = public as $$
  insert into pedido_items (pedido_id, producto_id, descripcion, color, cantidad, precio_unitario, costo_unitario)
  select p_pedido, id, nombre, p_color, p_cantidad, p_precio, round(p_precio - p_ganancia / p_cantidad, 2)
    from productos where nombre = p_producto;
$$;

-- Ayudante temporal: stock inicial
create or replace function public._real_entrada(p_fecha date, p_producto text, p_color text, p_cantidad int, p_motivo text)
returns void language sql set search_path = public as $$
  insert into movimientos_stock (fecha, producto_id, color, tipo, cantidad, motivo)
  values (p_fecha, (select id from productos where nombre = p_producto), p_color, 'entrada', p_cantidad, p_motivo);
$$;

do $$
declare
  v bigint;
begin
  -- ---------- Configuración ----------
  update configuracion set stock_minimo_defecto = 2 where id = 1;

  -- ---------- Productos (hoja INVENTARIO) ----------
  -- costo = Costo Total (costo base + gasto extra) · precio = Precio Venta
  insert into productos (codigo, nombre, categoria, colores, costo, precio, estado, foto_url, descripcion) values
  ('B001',          'Bolso Kala',                         'Bolsos',     '{}',              27130, 39612.51, 'Activo', null, null),
  ('B002',          'Bolso Cielo',                        'Bolsos',     '{}',              20130, 36284.32, 'Activo', 'assets/productos/bolso-cielo-1.jpg', 'Dos compartimentos con cierre, espacio para zapatillas y bolsillos.'),
  ('B003',          'Bolso Rufina',                       'Bolsos',     '{Violeta}',       23330, 33828.50, 'Activo', 'assets/productos/bolso-rufina-1.jpg', 'Bolso deportivo de nylon, 32 litros, plegable.'),
  ('T001',          'Tote Bag Lienzo',                    'Bolsos',     '{}',               5000,  8210.00, 'Activo', 'assets/productos/tote-bag-cherry.jpg', 'Lienzo natural con estampa.'),
  ('BN000',         'Bandolera Anitta',                   'Carteras',   '{}',              13000, 25797.20, 'Activo', 'assets/productos/bandolera-anita-1.jpg', null),
  ('MB001',         'Mini bag Lucy',                      'Carteras',   '{Rojo}',          16000, 24217.60, 'Activo', 'assets/productos/mini-bag-lucy-1.jpg', null),
  ('CV001 / CV002', 'Cartera Venice',                     'Carteras',   '{Blanco,Negro}',  21000, 28415.10, 'Activo', 'assets/productos/cartera-venice-negro-1.jpg', null),
  ('M001',          'Mochila Zafira',                     'Mochilas',   '{}',              17030, 30149.91, 'Activo', 'assets/productos/mochila-zafira-1.jpg', 'Tela de avión ultra liviana.'),
  ('M002',          'Mochila Ivana',                      'Mochilas',   '{}',              36900, 51903.54, 'Activo', null, null),
  ('M003',          'Mochila Lira',                       'Mochilas',   '{}',              33000, 47830.20, 'Activo', 'assets/productos/mochila-lira-negro-1.jpg', null),
  ('BL001 / BL002', 'Billetera Kaira',                    'Billeteras', '{Negro,Celeste}',  8790, 14433.18, 'Activo', 'assets/productos/billetera-kaira-1.jpg', null),
  ('BL003',         'Billetera Pocket',                   'Billeteras', '{Fucsia}',        12650, 18740.97, 'Activo', 'assets/productos/billetera-pocket-0.jpg', 'Eco cuero con cierre.'),
  ('BL004',         'Billetera Kira',                     'Billeteras', '{}',               8790, 14433.18, 'Activo', 'assets/productos/billetera-kira-1.jpg', 'Nylon resistente y súper liviana.'),
  ('L001',          'Llavero Lua (perrita con cadena)',   'Llaveros',   '{Fucsia}',         3750,  5435.25, 'Activo', 'assets/productos/llavero-lua-1.jpg', null),
  ('L002',          'Llavero Doni',                       'Llaveros',   '{}',               3900,  5652.66, 'Activo', 'assets/productos/llavero-doni-1.jpg', null),
  ('L003',          'Llavero Panchi',                     'Llaveros',   '{}',               3180,  5051.43, 'Activo', null, null),
  ('SC003',         'Scrunchie de Satén',                 'Accesorios', '{Negro}',          1600,  2969.60, 'Activo', null, null),
  ('FS001',         'Funda de Satén',                     'Accesorios', '{Negro}',          4500,  8352.00, 'Activo', 'assets/productos/funda-saten-1.jpg', null),
  ('A001',          'Arito corazón',                      'Accesorios', '{Dorado}',         5400,  7826.76, 'Activo', null, null),
  ('N002',          'Neceser',                            'Accesorios', '{Rosa}',           5400,  8577.90, 'Activo', 'assets/productos/neceser-1.jpg', null),
  ('N003 / N004',   'Neceser Lua',                        'Accesorios', '{Negro,Beige}',   11110, 15554.00, 'Activo', 'assets/productos/neceser-negro-1.jpg', 'Neceser 3 en 1 de poliéster y PVC.'),
  ('MD00',          'Medias elemento',                    'Medias',     '{}',               1940,  3977.00, 'Activo', null, null),
  ('SSPM',          'Scrunchie de Satén x mayor',         'Por mayor',  '{}',               1925,  2790.10, 'Activo', null, 'Venta por mayor, por encargo.'),
  ('FSPM',          'Funda de Satén x mayor',             'Por mayor',  '{}',               4625,  6475.00, 'Activo', null, 'Venta por mayor, por encargo.'),
  (null,            'Cofias simples',                     'Por mayor',  '{}',               4006,  5608.40, 'Activo', null, 'Venta por mayor, por encargo.'),
  ('SSPM',          'Scrunchie de Satén PREMIUM x mayor', 'Por mayor',  '{}',               2775,  4022.09, 'Activo', null, 'Venta por mayor, por encargo.'),
  ('FSPM',          'Funda de Satén PREMIUM x mayor',     'Por mayor',  '{}',               5425,  7595.00, 'Activo', null, 'Venta por mayor, por encargo.'),
  (null,            'Cofias simples PREMIUM',             'Por mayor',  '{}',               4006,  5608.40, 'Activo', null, 'Venta por mayor, por encargo.');

  -- ---------- Stock inicial ----------
  -- Se carga lo que había antes de las ventas (Stock Actual del Excel + lo vendido),
  -- así después de cargar las ventas queda exactamente el "Stock Actual" del Excel.
  perform _real_entrada('2026-03-01', 'Bolso Kala', 'Único', 1, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Bolso Cielo', 'Único', 2, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Bolso Rufina', 'Violeta', 3, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Tote Bag Lienzo', 'Único', 3, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Bandolera Anitta', 'Único', 1, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Mini bag Lucy', 'Rojo', 2, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Cartera Venice', 'Blanco', 2, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Cartera Venice', 'Negro', 5, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Mochila Zafira', 'Único', 1, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Mochila Ivana', 'Único', 1, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Mochila Lira', 'Único', 2, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Billetera Kaira', 'Negro', 2, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Billetera Kaira', 'Celeste', 1, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Billetera Pocket', 'Fucsia', 2, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Billetera Kira', 'Único', 2, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Llavero Lua (perrita con cadena)', 'Fucsia', 2, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Llavero Doni', 'Único', 2, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Llavero Panchi', 'Único', 2, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Funda de Satén', 'Negro', 3, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Arito corazón', 'Dorado', 1, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Neceser', 'Rosa', 1, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Neceser Lua', 'Negro', 2, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Neceser Lua', 'Beige', 2, 'Stock inicial (Excel)');
  perform _real_entrada('2026-03-01', 'Medias elemento', 'Único', 39, 'Stock inicial (Excel)');
  perform _real_entrada('2026-07-29', 'Scrunchie de Satén x mayor', 'Único', 12, 'Compra por mayor (pedido Tía Ana)');
  perform _real_entrada('2026-07-29', 'Funda de Satén x mayor', 'Único', 12, 'Compra por mayor (pedido Tía Ana)');

  -- Los productos por mayor se venden por encargo: mínimo 0 = no avisa "sin stock"
  update stock set minimo = 0 where producto_id in (select id from productos where categoria = 'Por mayor');

  -- ---------- Proveedores (de las hojas INSUMOS y GASTOS) ----------
  insert into proveedores (nombre, que_provee, contacto, notas) values
  ('Papelera sb nacional', 'Moñitos, bolsitas, bolsas de friselina', null, null),
  ('Papelera r3 y Luro',   'Bolsas de papel y de tela, cajitas', null, null),
  ('Terra Bolsas',         'Bolsas Sinan', null, null),
  ('Cecilia',              'Stickers, cierra bolsas, tarjetas con frase', 'Por WhatsApp', null),
  ('Victoria',             'Mini stickers de regalo', 'Por WhatsApp', null),
  ('Luz',                  'Tarjetas para aritos', null, null),
  ('Imprenta Rafaela',     'Stickers Sinan', null, null),
  ('Ween',                 'Stickers para eventos', null, null);

  -- ---------- Insumos y packaging (hoja INSUMOS) ----------
  insert into insumos (codigo, nombre, tipo, stock, costo_unitario, proveedor_id, observaciones)
  select i.codigo, i.nombre, i.tipo, i.stock, i.costo, (select id from proveedores where nombre = i.prov), i.obs
    from (values
      ('INS-MOÑ', 'Moñitos',                          'Regalo',     5,  50::numeric, 'Papelera sb nacional', '2 de los grandes'),
      ('P001',    'Bolsa de papel medianitas',        'Packaging',  2, 400, 'Papelera r3 y Luro', null),
      ('P002',    'Bolsas de tela mediana',           'Packaging',  2, 380, 'Papelera r3 y Luro', null),
      ('P003',    'Bolsas de papel extra grande',     'Packaging',  6, 500, 'Papelera r3 y Luro', null),
      ('P004',    'Cajitas',                          'Packaging',  2, 400, 'Papelera r3 y Luro', null),
      ('P005',    'Bolsas Sinan',                     'Packaging',  8, null, 'Terra Bolsas', null),
      ('P006',    'Bolsas 10x15',                     'Packaging', 85,  15, 'Papelera sb nacional', 'Bolsita para arito'),
      ('P007',    'Bolsas medianas',                  'Packaging', 22,  20, 'Papelera sb nacional', 'Bolsita para scrunchie'),
      ('P008',    'Sticker redondo',                  'Packaging', 19,  50, 'Cecilia', null),
      ('P009',    'Sticker regalo',                   'Packaging',  0, 350, 'Cecilia', null),
      ('P010',    'Mini sticker regalo',              'Packaging',  9,  55, 'Victoria', null),
      ('P011',    'Tarjeta arito',                    'Packaging', 10,  70, 'Luz', null),
      ('P012',    'Sticker Sinan',                    'Packaging',  6,  66, 'Imprenta Rafaela', 'Sticker sn'),
      ('P013',    'Cierra bolsa',                     'Packaging', 20, 130, 'Cecilia', null),
      ('P014',    'Tarjeta frase',                    'Packaging', 15, 220, 'Cecilia', null),
      ('P015',    'Bolsa de friselina medianitas',    'Packaging',  1, 500, 'Papelera sb nacional', 'Comprada el 08/08/2026'),
      ('P016',    'Bolsa de friselina grandes',       'Packaging',  6, 1100, 'Papelera sb nacional', 'Comprada el 08/08/2026'),
      ('P017',    'Bolsa de friselina chiquitas',     'Packaging',  8, 300, 'Papelera sb nacional', 'Comprada el 08/08/2026')
    ) as i(codigo, nombre, tipo, stock, costo, prov, obs);

  -- ---------- Clientas (de la hoja VENTAS) ----------
  insert into clientes (nombre, canal_origen)
  select n, 'Presencial' from unnest(array[
    'Carlos suegro', 'Tía Cole', 'Tía María', 'Ceci', 'Sonia Logística', 'Lorena Logística', 'Yanina Gómez',
    'Abuela Alicia', 'Giovanna', 'Silvana', 'Rocío prima', 'Griselda', 'Camila Kung fu', 'Tía Ana']) as n;

  -- ---------- Evento real ----------
  insert into eventos (nombre, fecha, hora, lugar, descripcion, precio_entrada, cupos, inscriptos, presupuesto, estado)
  values ('Primer encuentro Sinan', '2026-09-19', '10:00', 'Plaza Altos de Laferrere, Gregorio de Laferrere',
          'Un espacio para mujeres que quieran moverse, conocerse y compartir una linda mañana juntas. Ejercicios funcionales al aire libre. Gratuito, cupos limitados.',
          0, 0, 0, 0, 'Realizado');

  -- ---------- Ventas (hoja VENTAS) ----------
  -- Las filas del mismo día y misma clienta quedan en un solo pedido.
  v := _real_pedido('2026-03-12', 'Carlos suegro', 'Transferencia');    perform _real_item(v, 'Bolso Cielo', 'Único', 1, 36284.32, 16154.33);
  v := _real_pedido('2026-03-18', 'Tía Cole', 'Transferencia');         perform _real_item(v, 'Arito corazón', 'Dorado', 1, 7826.76, 2426.76);
  v := _real_pedido('2026-03-20', 'Tía María', 'Transferencia');        perform _real_item(v, 'Medias elemento', 'Único', 1, 3977, 2037);
  v := _real_pedido('2026-03-20', 'Ceci', 'Transferencia');             perform _real_item(v, 'Medias elemento', 'Único', 2, 3977, 2763.17);
  v := _real_pedido('2026-03-23', 'Tía María', 'Efectivo');             perform _real_item(v, 'Medias elemento', 'Único', 2, 3977, 2763.17);
  v := _real_pedido('2026-03-25', 'Sonia Logística', 'Transferencia');  perform _real_item(v, 'Medias elemento', 'Único', 1, 3977, 1381.58);
  v := _real_pedido('2026-03-27', 'Lorena Logística', 'Transferencia'); perform _real_item(v, 'Medias elemento', 'Único', 1, 3977, 1381.58);
  v := _real_pedido('2026-04-05', 'Yanina Gómez', 'Transferencia');     perform _real_item(v, 'Llavero Panchi', 'Único', 1, 5051.43, 1871.43);
  v := _real_pedido('2026-04-07', 'Sonia Logística', 'Transferencia');  perform _real_item(v, 'Llavero Panchi', 'Único', 1, 5051.43, 1871.43);
  v := _real_pedido('2026-04-08', 'Abuela Alicia', 'Efectivo');         perform _real_item(v, 'Billetera Kaira', 'Celeste', 1, 14433.18, 5643.18);
  v := _real_pedido('2026-04-11', 'Giovanna', 'Efectivo');              perform _real_item(v, 'Medias elemento', 'Único', 2, 4071.58, 2763.17);
  v := _real_pedido('2026-05-01', 'Sonia Logística', 'Transferencia');  perform _real_item(v, 'Medias elemento', 'Único', 1, 3977, 1381.58);
  v := _real_pedido('2026-05-03', 'Lorena Logística', 'Efectivo');      perform _real_item(v, 'Medias elemento', 'Único', 1, 3977, 1381.58);
  v := _real_pedido('2026-05-13', 'Sonia Logística', 'Transferencia');  perform _real_item(v, 'Medias elemento', 'Único', 2, 3977, 2763.17);
  v := _real_pedido('2026-05-17', 'Silvana', 'Transferencia');          perform _real_item(v, 'Bolso Kala', 'Único', 1, 39612.51, 12482.51);
  v := _real_pedido('2026-05-19', 'Rocío prima', 'Transferencia');      perform _real_item(v, 'Funda de Satén', 'Negro', 1, 8352, 3852);
  v := _real_pedido('2026-05-28', 'Griselda', 'Transferencia');         perform _real_item(v, 'Billetera Kira', 'Único', 1, 14433.18, 5643.18);
                                                                         perform _real_item(v, 'Medias elemento', 'Único', 2, 3977, 2763.17);
  v := _real_pedido('2026-06-21', 'Tía María', 'Efectivo');             perform _real_item(v, 'Medias elemento', 'Único', 1, 3977, 2037);
  v := _real_pedido('2026-06-22', 'Sonia Logística', 'Efectivo');       perform _real_item(v, 'Medias elemento', 'Único', 2, 3977, 4074);
  v := _real_pedido('2026-07-08', 'Camila Kung fu', 'Transferencia');   perform _real_item(v, 'Bolso Rufina', 'Violeta', 1, 33828.50, 10498.50);
                                                                         perform _real_item(v, 'Medias elemento', 'Único', 1, 3977, 2037);
  v := _real_pedido('2026-07-30', 'Tía Ana', 'Transferencia');          perform _real_item(v, 'Scrunchie de Satén x mayor', 'Único', 12, 2790.10, 10381.14);
                                                                         perform _real_item(v, 'Funda de Satén x mayor', 'Único', 12, 6475, 22200);
  v := _real_pedido('2026-09-10', 'Lorena Logística', 'Transferencia'); perform _real_item(v, 'Medias elemento', 'Único', 1, 3977, 2037);
  v := _real_pedido('2026-09-11', 'Abuela Alicia', 'Transferencia');    perform _real_item(v, 'Medias elemento', 'Único', 1, 3977, 2037);
  v := _real_pedido('2026-09-14', 'Sonia Logística', 'Transferencia');  perform _real_item(v, 'Medias elemento', 'Único', 2, 3977, 4074);
  v := _real_pedido('2026-09-29', 'Sonia Logística', 'Transferencia');  perform _real_item(v, 'Medias elemento', 'Único', 2, 3977, 4074);

  -- Controles: si algo no coincide con el Excel, se cancela todo
  if (select count(*) from pedido_items) <> 28 or (select sum(cantidad) from pedido_items) <> 58 then
    raise exception 'Control: no se cargaron las 28 ventas / 58 unidades del Excel';
  end if;
  if exists (select 1 from pedidos where cliente_id is null) then
    raise exception 'Control: hay ventas sin clienta';
  end if;

  -- La fecha de "última actualización" de cada pedido es la de la venta
  update pedidos set actualizado = fecha + time '12:00';

  -- ---------- Gastos (hoja GASTOS) ----------
  insert into movimientos_financieros (fecha, tipo, categoria, descripcion, monto, medio_pago, proveedor_id, evento_id) values
  ('2026-05-05', 'egreso', 'Regalo aniversario', '4 golosinas (sapito)', 1200, 'Transferencia', null, null),
  ('2026-08-08', 'egreso', 'Papelería', 'Bolsas de friselina de distintas medidas', 9500, 'Transferencia',
     (select id from proveedores where nombre = 'Papelera sb nacional'), null),
  ('2026-09-11', 'egreso', 'Eventos', 'Stickers para el evento', 4800, 'Transferencia',
     (select id from proveedores where nombre = 'Ween'), (select id from eventos where nombre = 'Primer encuentro Sinan'));

  -- ---------- Equipo ----------
  insert into personas (nombre, rol, activa) values ('Pame', 'Dueña', true);
end $$;

-- Borramos los ayudantes temporales
drop function if exists public._real_pedido(date, text, text);
drop function if exists public._real_item(bigint, text, text, int, numeric, numeric);
drop function if exists public._real_entrada(date, text, text, int, text);
