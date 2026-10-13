-- =====================================================================
-- SINAN ERP · 15 - CANAL DE CONTENIDO, VENTAS PRESENCIALES Y CHECKLIST
-- 1) publicaciones.canal (Instagram / Canal WA / Ambos) y publicaciones.tipo
-- 2) Canal de venta "Presencial" se abre en Recomendación / Clienta nueva /
--    Clienta que vuelve (las ventas viejas se clasifican por historial)
-- 3) evento_tareas.descripcion
-- 4) Mensajes del canal de difusión de WhatsApp (oct-nov 2026)
-- No borra datos. Se puede volver a correr.
-- =====================================================================
alter table publicaciones add column if not exists canal text not null default 'Instagram';
alter table publicaciones drop constraint if exists publicaciones_canal_check;
alter table publicaciones add constraint publicaciones_canal_check check (canal in ('Instagram','Canal WA','Ambos'));
alter table publicaciones add column if not exists tipo text;

alter table pedidos drop constraint if exists pedidos_canal_check;
alter table pedidos add constraint pedidos_canal_check check (canal in (
  'Presencial', 'Presencial · Recomendación', 'Presencial · Clienta nueva', 'Presencial · Clienta que vuelve',
  'Feria', 'Evento', 'Instagram', 'WhatsApp', 'Web', 'Otro'));
alter table pedidos alter column canal set default 'Presencial · Clienta nueva';
update pedidos p set canal = case when exists (
    select 1 from pedidos q where q.cliente_id = p.cliente_id and q.estado <> 'Cancelado'
      and (q.fecha < p.fecha or (q.fecha = p.fecha and q.id < p.id)))
  then 'Presencial · Clienta que vuelve' else 'Presencial · Clienta nueva' end
where p.canal = 'Presencial';

alter table evento_tareas add column if not exists descripcion text;

insert into publicaciones (fecha, canal, red, formato, tipo, titulo, objetivo, pilar_id, estado)
select v.fecha::date, v.canal, case when v.canal = 'Canal WA' then 'WhatsApp' else 'Instagram' end, 'Mensaje', v.tipo, v.titulo, v.objetivo,
       (select id from pilares_contenido where nombre = 'Encuentros Sinan' limit 1), 'En preparación'
from (values
  ('2026-10-14', 'Canal WA', 'Mensaje', 'Reactivo el canal + intriga evento', 'Anunciar'),
  ('2026-10-15', 'Ambos', 'Anuncio', 'Fecha oficial evento 21 nov', 'Anunciar'),
  ('2026-10-21', 'Canal WA', 'Detrás de escena', 'Preparativos del evento', 'Conectar'),
  ('2026-10-28', 'Canal WA', 'Colaboración', 'Emprendedora invitada confirmada + sorteo', 'Anunciar'),
  ('2026-11-04', 'Canal WA', 'Beneficio exclusivo', 'Precio especial solo para las del canal', 'Vender'),
  ('2026-11-11', 'Canal WA', 'Hype final', 'Últimos detalles, qué llevar, a qué hora', 'Ayudar'),
  ('2026-11-20', 'Canal WA', 'Víspera', 'Mensaje de antesala al evento', 'Motivar'),
  ('2026-11-21', 'Canal WA', 'Evento en vivo', 'Mensaje desde el lugar + gracias', 'Conectar')
) as v(fecha, canal, tipo, titulo, objetivo)
where not exists (select 1 from publicaciones p where p.titulo = v.titulo and p.fecha = v.fecha::date);

-- Sin canal "Presencial": las ventas en mano son Recomendación / Clienta nueva / Clienta que vuelve
alter table pedidos drop constraint if exists pedidos_canal_check;
update pedidos set canal = case canal when 'Presencial · Recomendación' then 'Recomendación' when 'Presencial · Clienta que vuelve' then 'Clienta que vuelve' else 'Clienta nueva' end where canal like 'Presencial%';
alter table pedidos add constraint pedidos_canal_check check (canal in ('Recomendación', 'Clienta nueva', 'Clienta que vuelve', 'Feria', 'Evento', 'Instagram', 'WhatsApp', 'Web', 'Otro'));
alter table pedidos alter column canal set default 'Clienta nueva';
update clientes set canal_origen = null where canal_origen = 'Presencial';
update consultas set canal = 'Otro' where canal = 'Presencial';
