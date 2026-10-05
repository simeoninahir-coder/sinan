-- =====================================================================
-- SINAN ERP · 03 - SEGURIDAD
-- · Row Level Security activado en TODAS las tablas
-- · Solo usuarios logueados pueden leer y escribir
-- · Los visitantes anónimos no tienen acceso a nada
-- · Carpeta "fotos" para las imágenes de productos
-- =====================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'configuracion','productos','stock','clientes','eventos','evento_tareas',
    'evento_colaboradores','pedidos','pedido_items','movimientos_stock','proveedores',
    'movimientos_financieros','pilares_contenido','publicaciones','ideas_contenido',
    'metricas_instagram','personas','tareas','insumos'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "solo usuarios logueados" on public.%I', t);
    execute format('create policy "solo usuarios logueados" on public.%I for all to authenticated using (true) with check (true)', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

grant usage, select on all sequences in schema public to authenticated;
revoke usage, select on all sequences in schema public from anon;

-- Las funciones solo las pueden usar usuarios logueados
revoke execute on function guardar_pedido(jsonb, jsonb)               from public, anon;
revoke execute on function aplicar_stock(bigint, text, int, boolean)  from public, anon;
grant  execute on function guardar_pedido(jsonb, jsonb)               to authenticated;
grant  execute on function aplicar_stock(bigint, text, int, boolean)  to authenticated;

-- ---------- Carpeta de fotos de productos ----------
-- Las fotos se pueden ver con su link (para mostrarlas en pantalla),
-- pero solo un usuario logueado puede subir, cambiar o borrar.
-- (si algo de esta parte falla, el resto igual queda instalado)
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('fotos', 'fotos', true)
  on conflict (id) do nothing;

  drop policy if exists "fotos: ver (logueados)"      on storage.objects;
  drop policy if exists "fotos: subir (logueados)"    on storage.objects;
  drop policy if exists "fotos: cambiar (logueados)"  on storage.objects;
  drop policy if exists "fotos: borrar (logueados)"   on storage.objects;

  create policy "fotos: ver (logueados)"     on storage.objects for select to authenticated using (bucket_id = 'fotos');
  create policy "fotos: subir (logueados)"   on storage.objects for insert to authenticated with check (bucket_id = 'fotos');
  create policy "fotos: cambiar (logueados)" on storage.objects for update to authenticated using (bucket_id = 'fotos');
  create policy "fotos: borrar (logueados)"  on storage.objects for delete to authenticated using (bucket_id = 'fotos');
exception when others then
  raise notice 'No se pudo preparar la carpeta de fotos: %', sqlerrm;
end $$;
