-- =====================================================================
-- SINAN ERP · 05 - BORRAR DATOS DE EJEMPLO
-- ¡ATENCIÓN! Borra TODOS los datos (productos, ventas, clientes, etc.)
-- y deja el sistema vacío para empezar a usarlo de verdad.
-- La configuración de la marca y tu usuario NO se borran.
-- No se puede deshacer.
-- =====================================================================

truncate table
  pedido_items, pedidos, movimientos_stock, stock, productos, clientes,
  evento_tareas, evento_colaboradores, movimientos_financieros, eventos,
  proveedores, publicaciones, ideas_contenido, pilares_contenido,
  metricas_instagram, tareas, personas, insumos
restart identity cascade;
