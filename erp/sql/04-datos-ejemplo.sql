-- =====================================================================
-- SINAN ERP · 04 - DATOS DE EJEMPLO
-- Productos reales de Sinan + clientes, ventas, eventos, etc. inventados
-- para poder probar el sistema. Los COSTOS son estimados: cambialos por
-- los reales desde la sección Productos.
-- Solo se cargan si la tabla de productos está vacía (no duplica nada).
-- Para borrarlos: usar 05-borrar-datos-ejemplo.sql
-- =====================================================================

-- Ayudante temporal: arma un pedido a partir de nombres de producto
create or replace function public._seed_pedido(
  p_fecha date, p_cliente text, p_canal text, p_estado text, p_items jsonb,
  p_envio numeric default 0, p_descuento numeric default 0, p_evento text default null)
returns bigint language plpgsql set search_path = public as $$
declare
  v_items jsonb := '[]';
  e jsonb;
begin
  for e in select * from jsonb_array_elements(p_items) loop
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'producto_id', (select id from productos where nombre = e->>0),
      'color', e->>1,
      'cantidad', (e->>2)::int));
  end loop;
  return guardar_pedido(jsonb_build_object(
    'fecha', p_fecha,
    'cliente_id', (select id from clientes where nombre = p_cliente),
    'canal', p_canal, 'estado', p_estado,
    'envio', p_envio, 'descuento', p_descuento,
    'evento_id', (select id from eventos where nombre = p_evento)), v_items);
end $$;

-- Ayudante temporal: entrada de stock
create or replace function public._seed_entrada(p_fecha date, p_producto text, p_color text, p_cantidad int, p_motivo text)
returns void language sql set search_path = public as $$
  insert into movimientos_stock (fecha, producto_id, color, tipo, cantidad, motivo)
  values (p_fecha, (select id from productos where nombre = p_producto), p_color, 'entrada', p_cantidad, p_motivo);
$$;

do $$
begin
  if exists (select 1 from productos) then
    raise notice 'Ya hay productos cargados: no se cargan los datos de ejemplo.';
    return;
  end if;

  -- ---------- Configuración ----------
  update configuracion set
    nombre_marca = 'Sinan',
    frase = 'Movete a tu ritmo',
    descripcion = 'Accesorios que se adaptan a tu ritmo, especiales para mujeres que buscan comodidad y bienestar.',
    instagram = '@sinan.bags',
    whatsapp = '+54 9 11 2672-4433',
    web = 'https://sinan.mitiendanube.com',
    ciudad = 'Buenos Aires, Argentina',
    stock_minimo_defecto = 2
  where id = 1;

  -- ---------- Productos (los reales de la web) ----------
  insert into productos (nombre, categoria, descripcion, colores, precio, costo, estado, foto_url) values
  ('Billetera Kaira',      'Billeteras', 'Material sintético resistente, diseño moderno en relieve. Compacta y práctica.', '{Negro,Celeste}', 14500, 6800,  'Activo', 'assets/productos/billetera-kaira-1.jpg'),
  ('Billetera Kira',       'Billeteras', 'Nylon resistente y súper liviana. Chiquita y cómoda para el día a día.',       '{}',              14500, 6500,  'Activo', 'assets/productos/billetera-kira-1.jpg'),
  ('Billetera Pocket',     'Billeteras', 'Eco cuero con cierre. Seis compartimientos para tarjetas y dos para billetes.', '{}',              18900, 8900,  'Activo', 'assets/productos/billetera-pocket-0.jpg'),
  ('Bolso Cielo',          'Bolsos',     'Dos compartimentos con cierre, espacio para zapatillas y bolsillos.',           '{}',              36700, 17500, 'Activo', 'assets/productos/bolso-cielo-1.jpg'),
  ('Tote Bag Cherry',      'Bolsos',     'Lienzo natural con estampa "You are a cherry on top".',                         '{}',              8300,  3600,  'Activo', 'assets/productos/tote-bag-cherry.jpg'),
  ('Bolso Rufina',         'Bolsos',     'Bolso deportivo de nylon, 32 litros, plegable. Violeta liso.',                  '{Violeta}',       37500, 18000, 'Activo', 'assets/productos/bolso-rufina-1.jpg'),
  ('Mochila Zafira',       'Mochilas',   'Tela de avión ultra liviana. Bolsillo interno, externo y laterales.',           '{}',              30000, 14000, 'Activo', 'assets/productos/mochila-zafira-1.jpg'),
  ('Mochila Lira',         'Mochilas',   'Compartimiento con separador, bolsillo frontal y dos laterales. Forrada.',      '{Beige,Negro}',   47900, 23000, 'Activo', 'assets/productos/mochila-lira-negro-1.jpg'),
  ('Bandolera Anita',      'Carteras',   'Bandolera cómoda para llevar lo esencial.',                                     '{}',              25900, 12000, 'Activo', 'assets/productos/bandolera-anita-1.jpg'),
  ('Cartera Venice',       'Carteras',   'Cartera para salidas y momentos especiales. En oferta.',                        '{Blanco,Negro}',  28000, 13500, 'Activo', 'assets/productos/cartera-venice-negro-1.jpg'),
  ('Mini bag Lucy',        'Carteras',   'Mini bag práctica y liviana. En oferta.',                                       '{}',              24000, 11500, 'Activo', 'assets/productos/mini-bag-lucy-1.jpg'),
  ('Llavero Doni',         'Llaveros',   'Detalles que hacen la diferencia.',                                             '{}',              5600,  2200,  'Activo', 'assets/productos/llavero-doni-1.jpg'),
  ('Llavero Lua',          'Llaveros',   'Detalles que hacen la diferencia.',                                             '{}',              5600,  2200,  'Activo', 'assets/productos/llavero-lua-1.jpg'),
  ('Neceser',              'Accesorios', 'Neceser práctico para el día a día.',                                           '{}',              8500,  3800,  'Activo', 'assets/productos/neceser-1.jpg'),
  ('Neceser Lua',          'Accesorios', 'Neceser 3 en 1 de poliéster y PVC súper resistente. Ideal para regalar.',       '{Rosa,Celeste,Negro}', 15500, 7000, 'Activo', 'assets/productos/neceser-celeste-1.jpg'),
  ('Funda de satén',       'Accesorios', 'Funda de almohada de satén, cuida tu pelo mientras dormís.',                    '{}',              8000,  3200,  'Activo', 'assets/productos/funda-saten-1.jpg'),
  ('Medias Offline',       'Medias',     'Medias suaves con diseño Offline.',                                             '{}',              4000,  1500,  'Activo', 'assets/productos/medias-offline-1.jpg'),
  ('Medias Osito Corazón', 'Medias',     'Medias suaves con osito y corazón.',                                            '{}',              4000,  1500,  'Activo', 'assets/productos/medias-osito-corazon-1.jpg'),
  ('Medias Soff',          'Medias',     'Suaves, hipoalergénicas y con puntera reforzada. Varios colores con rayitas.',  '{}',              4000,  1500,  'Activo', 'assets/productos/medias-soff-1.png');

  -- ---------- Stock inicial (compras) ----------
  perform _seed_entrada('2026-05-02', 'Billetera Kaira', 'Negro', 3, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Billetera Kaira', 'Celeste', 2, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Billetera Kira', 'Único', 3, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Billetera Pocket', 'Único', 3, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Bolso Cielo', 'Único', 3, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Tote Bag Cherry', 'Único', 6, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Bolso Rufina', 'Violeta', 4, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Mochila Zafira', 'Único', 3, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Mochila Lira', 'Beige', 2, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Mochila Lira', 'Negro', 3, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Bandolera Anita', 'Único', 2, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Cartera Venice', 'Blanco', 2, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Cartera Venice', 'Negro', 2, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Mini bag Lucy', 'Único', 4, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Llavero Doni', 'Único', 4, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Llavero Lua', 'Único', 4, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Neceser', 'Único', 2, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Neceser Lua', 'Rosa', 2, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Neceser Lua', 'Celeste', 2, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Neceser Lua', 'Negro', 3, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Funda de satén', 'Único', 3, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Medias Offline', 'Único', 1, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Medias Osito Corazón', 'Único', 3, 'Compra inicial');
  perform _seed_entrada('2026-05-02', 'Medias Soff', 'Único', 10, 'Compra inicial');
  perform _seed_entrada('2026-08-01', 'Medias Soff', 'Único', 6, 'Reposición');

  -- Los productos caros se venden de a uno: mínimo 1 en vez del general (2)
  update stock set minimo = 1
   where producto_id in (select id from productos
                          where nombre in ('Bolso Cielo','Mochila Lira','Mochila Zafira','Bandolera Anita','Cartera Venice','Bolso Rufina'));

  -- ---------- Clientes (inventados) ----------
  insert into clientes (nombre, telefono, email, instagram, canal_origen, ciudad, notas) values
  ('Lucía Fernández',  '11 5321-4410', 'lucia.fernandez@mail.com', '@lufernandez', 'Instagram', 'CABA',          'Le encantan los bolsos grandes.'),
  ('Valentina Gómez',  '11 6012-3398', 'valegomez@mail.com',       '@vale.gomez',  'Instagram', 'Vicente López', null),
  ('Carla Ruiz',       '11 4788-2201', 'carla.ruiz@mail.com',      null,           'Web',       'La Plata',      'Prefiere envío por Andreani.'),
  ('Florencia Díaz',   '11 3345-9087', 'flor.diaz@mail.com',       '@flordiaz',    'Instagram', 'CABA',          null),
  ('Martina López',    '11 2290-7765', null,                       '@martulopez',  'WhatsApp',  'Quilmes',       null),
  ('Sofía Martínez',   '11 6677-1123', 'sofi.martinez@mail.com',   '@sofimartinez','Web',       'Rosario',       'Clienta frecuente.'),
  ('Camila Pereyra',   '11 5098-6634', null,                       '@cami.pereyra','Evento',    'CABA',          'La conocimos en el primer encuentro.'),
  ('Julieta Romero',   '11 4402-8890', 'juli.romero@mail.com',     '@juliromero',  'Instagram', 'San Isidro',    null),
  ('Agustina Sosa',    '11 3876-5512', 'agus.sosa@mail.com',       null,           'Web',       'Córdoba',       null),
  ('Paula Herrera',    '11 2765-4309', null,                       '@pauherrera',  'Otro',      'CABA',          'Vino recomendada por Lucía.'),
  ('Micaela Torres',   '11 6543-2198', 'mica.torres@mail.com',     '@micatorres',  'Instagram', 'Tigre',         null),
  ('Rocío Álvarez',    '11 4123-7765', null,                       '@rochi.alvarez','Instagram','Lanús',         null);

  -- ---------- Proveedores (inventados) ----------
  insert into proveedores (nombre, que_provee, contacto, telefono, email, instagram, tiempo_entrega, condiciones_pago, notas) values
  ('Marroquinería del Once',   'Bolsos, mochilas y carteras',          'Rubén',   '11 4961-2200', 'ventas@marroquineriaonce.com', null,              '7 a 10 días',  '50% seña, 50% al retirar', 'Pedido mínimo 10 unidades.'),
  ('Accesorios del Sur',       'Billeteras, neceseres y llaveros',     'Analía',  '11 4302-7781', 'pedidos@accesoriosdelsur.com',  '@accesoriosdelsur','5 días',       'Transferencia contra entrega', null),
  ('Medias Lindas Mayorista',  'Medias',                               'Graciela','11 4867-3390', null,                            '@medias.lindas',  '3 días',       'Efectivo o transferencia', 'Hace descuento por docena.'),
  ('Packaging Express',        'Bolsas, cajas, papel de seda, etiquetas','Diego',  '11 5566-1209', 'hola@packagingexpress.com',     '@packaging.express','10 días',     'Pago anticipado', null),
  ('Gráfica Norte',            'Tarjetas, stickers y flyers',          'Sole',    '11 3021-4456', 'graficanorte@mail.com',         null,              '4 días hábiles','50% seña', null);

  -- ---------- Eventos ----------
  insert into eventos (nombre, fecha, hora, lugar, descripcion, precio_entrada, cupos, inscriptos, presupuesto, estado, resultado) values
  ('Primer encuentro Sinan', '2026-09-19', '17:00', 'Café Botánico, Palermo', 'Encuentro con clientas: merienda, charla sobre bienestar y sorteo.', 8000, 20, 18, 120000, 'Realizado',
   'Muy buena convocatoria (18 de 20). Se vendieron medias y accesorios. Repetir en primavera con más cupos.'),
  ('Desayuno Día de la Madre', '2026-10-17', '10:00', 'Espacio Verde, Belgrano', 'Desayuno para venir con mamá, con regalos y descuentos especiales.', 12000, 25, 14, 150000, 'Confirmado', null),
  ('Feria de Primavera', '2026-11-14', '11:00', 'Mercado de Diseño, San Telmo', 'Puesto en feria de diseño independiente.', 0, 0, 0, 80000, 'Planificando', null);

  insert into evento_tareas (evento_id, tarea, responsable, hecha)
  select e.id, t.tarea, t.resp, t.hecha
    from eventos e
    join (values
      ('Primer encuentro Sinan', 'Reservar el lugar', 'Pame', true),
      ('Primer encuentro Sinan', 'Publicar flyer en Instagram', 'Lola', true),
      ('Primer encuentro Sinan', 'Comprar regalos para el sorteo', 'Pame', true),
      ('Primer encuentro Sinan', 'Armar mesa de productos', 'Pame', true),
      ('Desayuno Día de la Madre', 'Señar el espacio', 'Pame', true),
      ('Desayuno Día de la Madre', 'Confirmar menú con la pastelería', 'Pame', true),
      ('Desayuno Día de la Madre', 'Publicar invitación y abrir inscripción', 'Lola', true),
      ('Desayuno Día de la Madre', 'Armar bolsitas de regalo', 'Pame', false),
      ('Desayuno Día de la Madre', 'Coordinar fotos del evento', 'Mica', false),
      ('Desayuno Día de la Madre', 'Llevar posnet / QR de pago', 'Pame', false),
      ('Feria de Primavera', 'Inscribirse en la feria', 'Pame', false),
      ('Feria de Primavera', 'Conseguir mesa y mantel', 'Pame', false)
    ) as t(evento, tarea, resp, hecha) on t.evento = e.nombre;

  insert into evento_colaboradores (evento_id, nombre, rol, contacto, aporte)
  select e.id, c.nombre, c.rol, c.contacto, c.aporte
    from eventos e
    join (values
      ('Primer encuentro Sinan', 'Café Botánico', 'Lugar', '@cafebotanico', 'Espacio y merienda'),
      ('Primer encuentro Sinan', 'Mica', 'Fotografía', '11 5555-0101', 'Fotos del evento'),
      ('Desayuno Día de la Madre', 'Dulce Abril', 'Pastelería', '@dulceabril', 'Desayuno para 25 personas'),
      ('Desayuno Día de la Madre', 'Mica', 'Fotografía', '11 5555-0101', 'Fotos del evento')
    ) as c(evento, nombre, rol, contacto, aporte) on c.evento = e.nombre;

  -- ---------- Ventas (al guardarlas se descuenta el stock solo) ----------
  perform _seed_pedido('2026-05-06', 'Lucía Fernández', 'Instagram', 'Entregado', '[["Bolso Cielo","Único",1]]');
  perform _seed_pedido('2026-05-12', 'Valentina Gómez', 'WhatsApp',  'Entregado', '[["Medias Soff","Único",2],["Medias Offline","Único",1]]');
  perform _seed_pedido('2026-05-20', 'Carla Ruiz',      'Web',       'Entregado', '[["Mochila Zafira","Único",1]]', 4500);
  perform _seed_pedido('2026-05-28', 'Florencia Díaz',  'Instagram', 'Entregado', '[["Billetera Kaira","Negro",1],["Llavero Lua","Único",1]]');
  perform _seed_pedido('2026-06-03', 'Martina López',   'Instagram', 'Entregado', '[["Mochila Lira","Negro",1]]');
  perform _seed_pedido('2026-06-10', 'Sofía Martínez',  'Web',       'Entregado', '[["Cartera Venice","Negro",1]]', 4500);
  perform _seed_pedido('2026-06-18', 'Lucía Fernández', 'WhatsApp',  'Entregado', '[["Neceser Lua","Rosa",1],["Funda de satén","Único",1]]');
  perform _seed_pedido('2026-06-25', 'Camila Pereyra',  'Instagram', 'Entregado', '[["Bandolera Anita","Único",1]]');
  perform _seed_pedido('2026-07-02', 'Julieta Romero',  'Instagram', 'Entregado', '[["Bolso Rufina","Violeta",1]]');
  perform _seed_pedido('2026-07-09', 'Agustina Sosa',   'Web',       'Entregado', '[["Billetera Pocket","Único",1],["Medias Osito Corazón","Único",1]]', 4500);
  perform _seed_pedido('2026-07-15', 'Valentina Gómez', 'Instagram', 'Entregado', '[["Mini bag Lucy","Único",1]]');
  perform _seed_pedido('2026-07-22', 'Paula Herrera',   'Otro',      'Entregado', '[["Tote Bag Cherry","Único",2]]');
  perform _seed_pedido('2026-07-30', 'Carla Ruiz',      'WhatsApp',  'Entregado', '[["Billetera Kira","Único",1],["Llavero Doni","Único",1]]');
  perform _seed_pedido('2026-08-05', 'Micaela Torres',  'Instagram', 'Entregado', '[["Mochila Lira","Beige",1]]');
  perform _seed_pedido('2026-08-12', 'Sofía Martínez',  'Instagram', 'Entregado', '[["Neceser Lua","Celeste",1],["Medias Soff","Único",2]]', 0, 1500);
  perform _seed_pedido('2026-08-19', 'Florencia Díaz',  'Web',       'Entregado', '[["Bolso Cielo","Único",1]]', 4500);
  perform _seed_pedido('2026-08-27', 'Rocío Álvarez',   'Instagram', 'Cancelado', '[["Mochila Zafira","Único",1]]');
  perform _seed_pedido('2026-09-02', 'Martina López',   'WhatsApp',  'Entregado', '[["Cartera Venice","Blanco",1]]');
  perform _seed_pedido('2026-09-08', 'Julieta Romero',  'Instagram', 'Entregado', '[["Neceser","Único",1],["Billetera Kaira","Celeste",1]]');
  perform _seed_pedido('2026-09-19', 'Agustina Sosa',   'Evento',    'Entregado', '[["Medias Soff","Único",3]]', 0, 0, 'Primer encuentro Sinan');
  perform _seed_pedido('2026-09-19', 'Paula Herrera',   'Evento',    'Entregado', '[["Llavero Lua","Único",1],["Llavero Doni","Único",1]]', 0, 0, 'Primer encuentro Sinan');
  perform _seed_pedido('2026-09-19', 'Camila Pereyra',  'Evento',    'Entregado', '[["Funda de satén","Único",1],["Neceser Lua","Negro",1]]', 0, 0, 'Primer encuentro Sinan');
  perform _seed_pedido('2026-09-24', 'Lucía Fernández', 'Instagram', 'Entregado', '[["Bolso Rufina","Violeta",1]]');
  perform _seed_pedido('2026-09-29', 'Micaela Torres',  'Web',       'Enviado',   '[["Mochila Zafira","Único",1]]', 4500);
  perform _seed_pedido('2026-10-01', 'Valentina Gómez', 'Instagram', 'Pagado',    '[["Billetera Kaira","Negro",1],["Medias Soff","Único",1]]');
  perform _seed_pedido('2026-10-03', 'Rocío Álvarez',   'WhatsApp',  'Preparando','[["Mini bag Lucy","Único",1]]');
  perform _seed_pedido('2026-10-04', 'Sofía Martínez',  'Instagram', 'Pendiente', '[["Mochila Lira","Negro",1]]');
  perform _seed_pedido('2026-10-05', 'Carla Ruiz',      'Web',       'Pendiente', '[["Tote Bag Cherry","Único",1],["Medias Osito Corazón","Único",1]]', 4500);

  -- Fechas de carga y última actualización realistas (para las alertas)
  update pedidos set creado = fecha::timestamptz + interval '12 hours',
                     actualizado = case when estado in ('Entregado','Cancelado') then fecha + 4 else fecha + 1 end;

  -- ---------- Finanzas (gastos y otros ingresos) ----------
  insert into movimientos_financieros (fecha, tipo, categoria, descripcion, monto, medio_pago, evento_id, proveedor_id) values
  ('2026-05-02', 'egreso', 'Mercadería',  'Compra inicial bolsos, mochilas y carteras', 280000, 'Transferencia', null, (select id from proveedores where nombre = 'Marroquinería del Once')),
  ('2026-05-02', 'egreso', 'Mercadería',  'Compra inicial billeteras, neceseres y llaveros', 120000, 'Transferencia', null, (select id from proveedores where nombre = 'Accesorios del Sur')),
  ('2026-05-02', 'egreso', 'Mercadería',  'Compra inicial medias', 22500, 'Efectivo', null, (select id from proveedores where nombre = 'Medias Lindas Mayorista')),
  ('2026-05-08', 'egreso', 'Packaging',   'Bolsas, papel de seda y etiquetas', 25000, 'Transferencia', null, (select id from proveedores where nombre = 'Packaging Express')),
  ('2026-05-15', 'egreso', 'Diseño e imprenta', 'Tarjetas de agradecimiento y stickers', 12000, 'Transferencia', null, (select id from proveedores where nombre = 'Gráfica Norte')),
  ('2026-05-31', 'egreso', 'Comisiones',  'Comisiones Mercado Pago mayo', 3900, 'Mercado Pago', null, null),
  ('2026-06-05', 'egreso', 'Publicidad',  'Promoción en Instagram', 15000, 'Tarjeta', null, null),
  ('2026-06-10', 'egreso', 'Servicios',   'Canva Pro', 7000, 'Tarjeta', null, null),
  ('2026-06-30', 'egreso', 'Comisiones',  'Comisiones Mercado Pago junio', 5100, 'Mercado Pago', null, null),
  ('2026-07-05', 'egreso', 'Publicidad',  'Promoción en Instagram', 15000, 'Tarjeta', null, null),
  ('2026-07-10', 'egreso', 'Servicios',   'Canva Pro', 7000, 'Tarjeta', null, null),
  ('2026-07-20', 'egreso', 'Envíos',      'Envíos Andreani julio', 9800, 'Transferencia', null, null),
  ('2026-07-31', 'egreso', 'Comisiones',  'Comisiones Mercado Pago julio', 4300, 'Mercado Pago', null, null),
  ('2026-08-01', 'egreso', 'Mercadería',  'Reposición medias Soff', 9000, 'Efectivo', null, (select id from proveedores where nombre = 'Medias Lindas Mayorista')),
  ('2026-08-05', 'egreso', 'Publicidad',  'Promoción en Instagram', 15000, 'Tarjeta', null, null),
  ('2026-08-10', 'egreso', 'Servicios',   'Canva Pro', 7000, 'Tarjeta', null, null),
  ('2026-08-14', 'egreso', 'Packaging',   'Cajas para regalo', 18000, 'Transferencia', null, (select id from proveedores where nombre = 'Packaging Express')),
  ('2026-08-31', 'egreso', 'Comisiones',  'Comisiones Mercado Pago agosto', 3600, 'Mercado Pago', null, null),
  ('2026-09-05', 'egreso', 'Publicidad',  'Promoción del primer encuentro', 20000, 'Tarjeta', (select id from eventos where nombre = 'Primer encuentro Sinan'), null),
  ('2026-09-10', 'egreso', 'Servicios',   'Canva Pro', 7000, 'Tarjeta', null, null),
  ('2026-09-17', 'egreso', 'Eventos',     'Merienda y espacio - Café Botánico', 60000, 'Transferencia', (select id from eventos where nombre = 'Primer encuentro Sinan'), null),
  ('2026-09-18', 'egreso', 'Eventos',     'Decoración y regalos para el sorteo', 28000, 'Efectivo', (select id from eventos where nombre = 'Primer encuentro Sinan'), null),
  ('2026-09-19', 'ingreso','Entradas de eventos', 'Entradas primer encuentro (18 × $ 8.000)', 144000, 'Mercado Pago', (select id from eventos where nombre = 'Primer encuentro Sinan'), null),
  ('2026-09-30', 'egreso', 'Comisiones',  'Comisiones Mercado Pago septiembre', 6200, 'Mercado Pago', null, null),
  ('2026-10-02', 'egreso', 'Eventos',     'Seña espacio desayuno Día de la Madre', 30000, 'Transferencia', (select id from eventos where nombre = 'Desayuno Día de la Madre'), null),
  ('2026-10-03', 'ingreso','Entradas de eventos', 'Entradas vendidas desayuno (14 × $ 12.000)', 168000, 'Mercado Pago', (select id from eventos where nombre = 'Desayuno Día de la Madre'), null),
  ('2026-10-05', 'egreso', 'Publicidad',  'Promoción Día de la Madre', 18000, 'Tarjeta', null, null);

  -- ---------- Contenido ----------
  insert into pilares_contenido (nombre, descripcion, color) values
  ('Producto',               'Mostrar los productos, sus detalles y cómo se usan.', '#477ab3'),
  ('Bienestar y movimiento', 'Moverse a tu ritmo: rutinas, comodidad, autocuidado.', '#9cc9e8'),
  ('Detrás de escena',       'Cómo se elige, se arma y se empaca cada pedido.', '#12364e'),
  ('Comunidad',              'Reseñas, fotos de clientas y eventos.', '#c9a27e');

  insert into publicaciones (fecha, red, formato, pilar_id, titulo, texto, estado, link, alcance, me_gusta, comentarios, guardados)
  select p.fecha::date, p.red, p.formato, (select id from pilares_contenido where nombre = p.pilar), p.titulo, p.texto, p.estado, null, p.alcance, p.mg, p.com, p.gu
    from (values
      ('2026-09-03', 'Instagram', 'Carrusel', 'Producto',               'Todo lo que entra en la Mochila Lira', 'Te mostramos todo lo que podés llevar 🎒', 'Publicada', 2350, 186, 14, 41),
      ('2026-09-08', 'Instagram', 'Reel',     'Bienestar y movimiento', 'Mañana a mi ritmo', 'Una mañana tranqui con el Bolso Cielo.', 'Publicada', 5120, 402, 23, 88),
      ('2026-09-12', 'Instagram', 'Historia', 'Comunidad',              'Cuenta regresiva primer encuentro', null, 'Publicada', 980, null, null, null),
      ('2026-09-16', 'Instagram', 'Post',     'Detrás de escena',       'Así preparamos cada pedido', 'Papel de seda, tarjetita y mucho amor.', 'Publicada', 1890, 154, 9, 12),
      ('2026-09-21', 'Instagram', 'Carrusel', 'Comunidad',              'Fotos del primer encuentro', '¡Gracias a todas las que vinieron! 💙', 'Publicada', 3410, 298, 31, 25),
      ('2026-09-27', 'Instagram', 'Reel',     'Producto',               'Medias Soff: elegí tu color', null, 'Publicada', 2780, 210, 18, 30),
      ('2026-10-01', 'Instagram', 'Post',     'Comunidad',              'Invitación desayuno Día de la Madre', 'Reservá tu lugar para venir con mamá.', 'Publicada', 2100, 175, 20, 16),
      ('2026-10-07', 'Instagram', 'Carrusel', 'Producto',               'Guía de regalos Día de la Madre', 'Ideas para cada mamá.', 'Programada', null, null, null, null),
      ('2026-10-10', 'Instagram', 'Reel',     'Bienestar y movimiento', 'Rutina de domingo con la Mochila Zafira', null, 'En preparación', null, null, null, null),
      ('2026-10-14', 'Instagram', 'Historia', 'Detrás de escena',       'Armando las bolsitas del desayuno', null, 'Idea', null, null, null, null),
      ('2026-10-18', 'Instagram', 'Post',     'Comunidad',              'Feliz día a todas las mamás', null, 'Programada', null, null, null, null),
      ('2026-10-24', 'TikTok',    'Reel',     'Producto',               'Qué hay en mi Bolso Rufina', null, 'Idea', null, null, null, null)
    ) as p(fecha, red, formato, pilar, titulo, texto, estado, alcance, mg, com, gu);

  insert into ideas_contenido (titulo, descripcion, pilar_id, formato, prioridad, usada)
  select i.titulo, i.descr, (select id from pilares_contenido where nombre = i.pilar), i.formato, i.prio, i.usada
    from (values
      ('Antes y después de organizar la cartera', 'Mostrar cómo cambia todo con el Neceser Lua.', 'Producto', 'Reel', 'Alta', false),
      ('Clientas contando para qué usan su Sinan', 'Pedir videos cortitos a clientas.', 'Comunidad', 'Reel', 'Alta', false),
      ('5 tips para cuidar tu espalda con la mochila', null, 'Bienestar y movimiento', 'Carrusel', 'Media', false),
      ('Cómo elijo los productos', 'Contar la historia de la marca.', 'Detrás de escena', 'Post', 'Media', false),
      ('Sorteo con marca amiga', 'Buscar una marca de bienestar para sortear juntas.', 'Comunidad', 'Post', 'Baja', false),
      ('Unboxing de un pedido', null, 'Detrás de escena', 'Reel', 'Media', true)
    ) as i(titulo, descr, pilar, formato, prio, usada);

  insert into metricas_instagram (fecha, seguidores, alcance, interacciones, visitas_perfil, clics_link, notas) values
  ('2026-05-01',  820,  9800,  610,  740,  52, null),
  ('2026-06-01',  905, 12400,  780,  910,  71, 'Empezamos a pautar.'),
  ('2026-07-01',  980, 13900,  845, 1020,  80, null),
  ('2026-08-01', 1060, 15100,  910, 1150,  94, null),
  ('2026-09-01', 1185, 19800, 1320, 1610, 132, 'Pico por el primer encuentro.');

  -- ---------- Equipo ----------
  insert into personas (nombre, rol, email, telefono, activa) values
  ('Pame', 'Dueña · ventas, compras y eventos', null, null, true),
  ('Lola', 'Community manager (freelance)', 'lola.cm@mail.com', '11 5555-0202', true),
  ('Mica', 'Fotografía (freelance)', 'mica.foto@mail.com', '11 5555-0101', true);

  insert into tareas (titulo, descripcion, persona_id, area, prioridad, fecha_limite, estado)
  select t.titulo, t.descr, (select id from personas where nombre = t.persona), t.area, t.prio, t.fecha::date, t.estado
    from (values
      ('Pedir reposición de Billetera Kaira', 'Quedan pocas unidades de los dos colores.', 'Pame', 'Compras', 'Alta', '2026-10-08', 'Pendiente'),
      ('Despachar pedido de Rocío', 'Mini bag Lucy por WhatsApp.', 'Pame', 'Ventas', 'Alta', '2026-10-06', 'En curso'),
      ('Armar guía de regalos Día de la Madre', null, 'Lola', 'Contenido', 'Alta', '2026-10-06', 'En curso'),
      ('Sesión de fotos productos nuevos', 'Neceser Lua y Bolso Rufina.', 'Mica', 'Contenido', 'Media', '2026-10-12', 'Pendiente'),
      ('Cargar costos reales de todos los productos', null, 'Pame', 'Administración', 'Media', '2026-10-15', 'Pendiente'),
      ('Inscribirse en la Feria de Primavera', null, 'Pame', 'Eventos', 'Media', '2026-10-20', 'Pendiente'),
      ('Responder reseñas de septiembre', null, 'Lola', 'Contenido', 'Baja', '2026-09-30', 'Hecha')
    ) as t(titulo, descr, persona, area, prio, fecha, estado);
end $$;

-- Borramos los ayudantes temporales
drop function if exists public._seed_pedido(date, text, text, text, jsonb, numeric, numeric, text);
drop function if exists public._seed_entrada(date, text, text, int, text);
