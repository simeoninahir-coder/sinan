-- =====================================================================
-- SINAN ERP · 08 - PRODUCTOS E INSUMOS QUE NO SE VUELVEN A REPONER
-- Si se_repone = false, no aparecen en "Para reponer" ni en las alertas.
-- No borra datos. Se puede volver a correr.
-- =====================================================================
alter table productos add column if not exists se_repone boolean not null default true;
alter table insumos   add column if not exists se_repone boolean not null default true;
