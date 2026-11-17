-- =====================================================================
-- SINAN ERP · 17 - INSCRIPTAS COMO CLIENTAS Y REFERENCIAS DEL GUION
-- · evento_inscriptos.cliente_id: cada inscripta queda también en Clientes
--   (las que ya estaban se vinculan o se crean con origen "Evento")
-- · publicaciones.referencias: links o imágenes de referencia del guion
-- No borra datos. Se puede volver a correr.
-- =====================================================================
alter table evento_inscriptos add column if not exists cliente_id bigint references clientes(id) on delete set null;
do $$
declare i record; cid bigint;
begin
  for i in select * from evento_inscriptos where cliente_id is null loop
    select id into cid from clientes where lower(trim(nombre)) = lower(trim(i.nombre)) limit 1;
    if cid is null then
      insert into clientes (nombre, fecha_nacimiento, canal_origen) values (trim(i.nombre), i.fecha_nacimiento, 'Evento') returning id into cid;
    elsif i.fecha_nacimiento is not null then
      update clientes set fecha_nacimiento = coalesce(fecha_nacimiento, i.fecha_nacimiento) where id = cid;
    end if;
    update evento_inscriptos set cliente_id = cid where id = i.id;
  end loop;
end $$;

alter table publicaciones add column if not exists referencias jsonb not null default '[]'::jsonb;
