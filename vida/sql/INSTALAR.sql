-- =====================================================================
-- MI VIDA — estructura de la base (Supabase, proyecto "mi-vida")
-- Cada fila es de quien la creó: las reglas (RLS) hacen que cada
-- persona vea y toque solo lo suyo.
-- =====================================================================

create table proyectos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nombre text not null,
  color text not null default '#E8DFF5',
  orden int not null default 0,
  archivado boolean not null default false,
  creado_en timestamptz not null default now()
);

create table objetivos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  titulo text not null,
  descripcion text,
  proyecto_id uuid references proyectos on delete set null,
  terminado boolean not null default false,
  creado_en timestamptz not null default now()
);

-- Una tarea en la bandeja puede no tener fecha. Para salir de la bandeja
-- necesita proyecto, fecha y prioridad.
create table tareas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  titulo text not null,
  notas text,
  proyecto_id uuid references proyectos on delete set null,
  objetivo_id uuid references objetivos on delete set null,
  fecha date,
  prioridad text check (prioridad in ('importante', 'puede_esperar')),
  en_bandeja boolean not null default true,
  reprogramaciones int not null default 0,
  hecha boolean not null default false,
  hecha_en timestamptz,
  soltada boolean not null default false,
  soltada_en timestamptz,
  creado_en timestamptz not null default now(),
  constraint tarea_completa_fuera_de_bandeja
    check (en_bandeja or (fecha is not null and prioridad is not null))
);

create table habitos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nombre text not null,
  detalle text,
  -- 'simple' = tildar | 'gratitud' = se cumple al escribir | 'frase' = leer la frase del día
  tipo text not null default 'simple' check (tipo in ('simple', 'gratitud', 'frase')),
  version_corta text,           -- ej: "Versión corta: 5 min" (también cuenta)
  orden int not null default 0,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table habito_registros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  habito_id uuid not null references habitos on delete cascade,
  fecha date not null,
  corta boolean not null default false,
  unique (habito_id, fecha)
);

create table gratitudes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  fecha date not null,
  items text[] not null default '{}',
  unique (user_id, fecha)
);

create table frases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  texto text not null,
  creado_en timestamptz not null default now()
);

-- Bloques y recordatorios que se repiten.
-- regla: {"freq":"semanal","dias":[1,4],"cada":1,"desde":"2026-10-26"}
--        {"freq":"mensual","semana":-1,"dia":1}   (última semana, lunes)
--        {"freq":"mensual","dia_mes":15}
create table recurrentes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  titulo text not null,
  notas text,
  proyecto_id uuid references proyectos on delete set null,
  tipo text not null default 'bloque' check (tipo in ('bloque', 'recordatorio')),
  regla jsonb not null,
  hora time,
  duracion_min int,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table aprendizajes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  titulo text not null,
  estado text not null default 'espera' check (estado in ('actual', 'espera', 'terminado')),
  orden int not null default 0,
  empezado_en date,
  terminado_en date,
  creado_en timestamptz not null default now()
);
-- Solo UNA cosa "aprendiendo ahora" por persona.
create unique index un_solo_aprendizaje_actual on aprendizajes (user_id) where estado = 'actual';

create table aprendizaje_notas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  aprendizaje_id uuid not null references aprendizajes on delete cascade,
  texto text not null,
  creado_en timestamptz not null default now()
);

create table revisiones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  semana_inicio date not null,          -- lunes de la semana revisada
  perdida_tiempo text,
  prioridades text[] not null default '{}',  -- las 3 de la semana que viene
  tareas_hechas int,
  habitos_cumplidos int,
  creado_en timestamptz not null default now(),
  unique (user_id, semana_inicio)
);

-- Índices para las columnas user_id y referencias más consultadas
create index on proyectos (user_id);
create index on objetivos (user_id);
create index on objetivos (proyecto_id);
create index on tareas (user_id, fecha);
create index on tareas (proyecto_id);
create index on tareas (objetivo_id);
create index on habitos (user_id);
create index on habito_registros (user_id, fecha);
create index on gratitudes (user_id);
create index on frases (user_id);
create index on recurrentes (user_id);
create index on recurrentes (proyecto_id);
create index on aprendizajes (user_id);
create index on aprendizaje_notas (aprendizaje_id);
create index on aprendizaje_notas (user_id);
create index on revisiones (user_id);

-- Reglas: cada persona solo ve y modifica lo suyo
do $$
declare t text;
begin
  foreach t in array array['proyectos','objetivos','tareas','habitos','habito_registros',
    'gratitudes','frases','recurrentes','aprendizajes','aprendizaje_notas','revisiones']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "solo lo mio" on %I for all to authenticated
      using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;
