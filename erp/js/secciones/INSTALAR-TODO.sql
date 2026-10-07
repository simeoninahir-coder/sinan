-- SINAN ERP · INSTALACIÓN COMPLETA (01 + 02 + 03 + 04 datos de ejemplo + 07 + 08)













alter table pedidos add column if not exists historico boolean not null default false;
