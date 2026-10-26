/* =====================================================================
   CALMA — app para organizar la vida y las tareas.
   Todo en un archivo: datos (Supabase), vistas y acciones.
   ===================================================================== */
(() => {
'use strict';

// Se mira antes de conectar, porque la conexión limpia la dirección al leer el link del mail
const vieneDeRecuperar = location.hash.includes('type=recovery');
const URL_APP = location.href.split('#')[0].split('?')[0];
const sb = window.supabase.createClient(window.CALMA_CONFIG.supabaseUrl, window.CALMA_CONFIG.supabaseKey);
const $app = document.getElementById('app');
const $modal = document.createElement('div');
document.body.appendChild($modal);

const TABLAS = ['proyectos', 'tareas', 'habitos', 'habito_registros', 'gratitudes', 'frases',
  'recurrentes', 'objetivos', 'aprendizajes', 'aprendizaje_notas', 'revisiones'];
const S = { user: null };
TABLAS.forEach((t) => { S[t] = []; });

const PALETA = ['#D4E6F5', '#F6D6DF', '#CFEBDD', '#E8DFF5', '#FBE0C8', '#FAF0C2', '#DDEFC9', '#F5D0C5', '#D9E2EC', '#F3D9F0'];

// Estado de la pantalla
let vista = 'hoy';
let semanaOffset = 0;
let mesOffset = 0;
let diaSel = null;
let segTareas = 'bandeja';
let filtroProyecto = '';
let objetivoSel = null;
let verMasHoy = false;
let gratitudAbierta = false;
let rev = null;
let ultimaCarga = 0;

/* ---------- Fechas ---------- */
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_C = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const DIAS_INI = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const pad = (n) => String(n).padStart(2, '0');
const aStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const aFecha = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const hoy = () => aStr(new Date());
const sumar = (s, n) => { const d = aFecha(s); d.setDate(d.getDate() + n); return aStr(d); };
const dow = (s) => aFecha(s).getDay();
const lunesDe = (s) => sumar(s, -((dow(s) + 6) % 7));
const diasEntre = (a, b) => Math.round((aFecha(b) - aFecha(a)) / 864e5);
const largo = (s) => { const d = aFecha(s); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`; };
const corto = (s) => {
  const h = hoy();
  if (s === h) return 'hoy';
  if (s === sumar(h, 1)) return 'mañana';
  if (s === sumar(h, -1)) return 'ayer';
  const d = aFecha(s);
  return `${DIAS_C[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
};
const fechaLocal = (ts) => aStr(new Date(ts));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- Utilidades ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fuerte(hex) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return `hsl(${Math.round(h)} 38% 58%)`;
}

let toastTimer;
function aviso(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.remove('oculto');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('oculto'), 2600);
}

async function db(consulta) {
  const { data, error } = await consulta;
  if (error) {
    console.error(error);
    aviso('Ups, no se pudo guardar. Revisá la conexión y probá de nuevo.');
    throw error;
  }
  return data;
}
async function insertar(tabla, datos) {
  const fila = await db(sb.from(tabla).insert(datos).select().single());
  S[tabla].push(fila);
  return fila;
}
async function actualizar(tabla, id, datos) {
  const fila = await db(sb.from(tabla).update(datos).eq('id', id).select().single());
  const i = S[tabla].findIndex((x) => x.id === id);
  if (i >= 0) S[tabla][i] = fila;
  return fila;
}
async function borrar(tabla, id) {
  await db(sb.from(tabla).delete().eq('id', id));
  S[tabla] = S[tabla].filter((x) => x.id !== id);
}

/* ---------- Carga y datos iniciales ---------- */
async function cargarTodo() {
  const desde = sumar(hoy(), -400);
  const desdeTs = new Date(aFecha(sumar(hoy(), -365))).toISOString();
  const consultas = TABLAS.map((t) => {
    let q = sb.from(t).select('*');
    if (t === 'habito_registros' || t === 'gratitudes') q = q.gte('fecha', desde);
    if (t === 'tareas') q = q.or(`and(hecha.eq.false,soltada.eq.false),hecha_en.gte."${desdeTs}",soltada_en.gte."${desdeTs}"`);
    return q.limit(5000);
  });
  const res = await Promise.all(consultas);
  res.forEach((r, i) => {
    if (r.error) throw r.error;
    S[TABLAS[i]] = r.data;
  });
  ['proyectos', 'habitos', 'aprendizajes'].forEach((t) => S[t].sort((a, b) => a.orden - b.orden || a.creado_en.localeCompare(b.creado_en)));
  ['tareas', 'frases', 'recurrentes', 'objetivos', 'aprendizaje_notas'].forEach((t) => S[t].sort((a, b) => a.creado_en.localeCompare(b.creado_en)));
  ultimaCarga = Date.now();
}

async function sembrar() {
  const proys = await db(sb.from('proyectos').insert([
    { nombre: 'Óptica LES', color: '#D4E6F5', orden: 1 },
    { nombre: 'SINAN', color: '#F6D6DF', orden: 2 },
    { nombre: 'Gimena Novillo Espacio', color: '#CFEBDD', orden: 3 },
    { nombre: 'Estudios', color: '#E8DFF5', orden: 4 },
    { nombre: 'Personal', color: '#FBE0C8', orden: 5 }
  ]).select());
  const id = (n) => proys.find((p) => p.nombre === n).id;
  const lunes = lunesDe(hoy());
  // Al cargar varias filas juntas, todas tienen que traer las mismas columnas
  const lote = (base, filas) => filas.map((f) => ({ ...base, ...f }));
  await Promise.all([
    db(sb.from('habitos').insert(lote({ detalle: null, tipo: 'simple', version_corta: null }, [
      { nombre: 'Leer 20-30 min', detalle: 'En cualquier momento del día', version_corta: 'Versión corta: 5 min', orden: 1 },
      { nombre: 'Agradecer', detalle: '1 a 3 cosas de hoy', tipo: 'gratitud', orden: 2 },
      { nombre: 'Leer mi frase del día', tipo: 'frase', orden: 3 }
    ]))),
    db(sb.from('frases').insert([
      { texto: 'No tengo que hacer todo hoy. Solo lo de hoy.' },
      { texto: 'Lo que está anotado ya no me ocupa la cabeza.' },
      { texto: 'Paso a paso también se llega.' }
    ])),
    db(sb.from('aprendizajes').insert(lote({ estado: 'espera', empezado_en: null }, [
      { titulo: 'Portugués', estado: 'actual', orden: 0, empezado_en: hoy() },
      { titulo: 'Auditoría', orden: 1 },
      { titulo: 'Hablar mejor en público', orden: 2 }
    ]))),
    db(sb.from('recurrentes').insert(lote({ tipo: 'bloque', notas: null }, [
      { titulo: 'Portugués', notas: '20-30 min con mis apuntes', proyecto_id: id('Estudios'), regla: { freq: 'semanal', dias: [2, 4], cada: 1, desde: lunes }, hora: '19:00', duracion_min: 30 },
      { titulo: 'Sinan: mejoras en la página y el ERP', proyecto_id: id('SINAN'), regla: { freq: 'semanal', dias: [3], cada: 1, desde: lunes }, hora: '10:00', duracion_min: 90 },
      { titulo: 'Sinan: estrategia de contenido', proyecto_id: id('SINAN'), regla: { freq: 'semanal', dias: [1], cada: 1, desde: lunes }, hora: '10:00', duracion_min: 60 },
      { titulo: 'Esta semana es semana de edición de LES', tipo: 'recordatorio', proyecto_id: id('Óptica LES'), regla: { freq: 'mensual', semana: -1, dia: 1 }, hora: '09:00', duracion_min: 15 },
      { titulo: 'Revisión semanal', notas: 'Abrí Calma y tocá "Revisión semanal"', proyecto_id: id('Personal'), regla: { freq: 'semanal', dias: [0], cada: 1, desde: lunes }, hora: '18:00', duracion_min: 30 }
    ]))),
    db(sb.from('objetivos').insert([
      { titulo: 'Ordenar la estrategia de contenido de Sinan', proyecto_id: id('SINAN') }
    ]))
  ]);
}

/* ---------- Consultas sobre los datos ---------- */
const SIN_PROYECTO = { nombre: 'Sin proyecto', color: '#EEE8E1' };
const proyecto = (id) => S.proyectos.find((p) => p.id === id) || SIN_PROYECTO;
const proyectosActivos = () => S.proyectos.filter((p) => !p.archivado);
const tareasActivas = () => S.tareas.filter((t) => !t.hecha && !t.soltada && !t.en_bandeja);
const enBandeja = () => S.tareas.filter((t) => t.en_bandeja && !t.hecha && !t.soltada);
const ordenTareas = (a, b) =>
  (a.prioridad === 'importante' ? 0 : 1) - (b.prioridad === 'importante' ? 0 : 1) ||
  (a.fecha || '').localeCompare(b.fecha || '') || a.creado_en.localeCompare(b.creado_en);
const tareasDelDia = (f) => S.tareas.filter((t) => t.fecha === f && !t.soltada && !t.en_bandeja)
  .sort((a, b) => Number(a.hecha) - Number(b.hecha) || ordenTareas(a, b));

function fraseDelDia(f) {
  if (!S.frases.length) return null;
  const n = Math.abs(diasEntre('2024-01-01', f));
  return S.frases[n % S.frases.length];
}

const registro = (hid, f) => S.habito_registros.find((r) => r.habito_id === hid && r.fecha === f);
function racha(hid) {
  const dias = new Set(S.habito_registros.filter((r) => r.habito_id === hid).map((r) => r.fecha));
  let d = hoy();
  if (!dias.has(d)) d = sumar(d, -1);
  let n = 0;
  while (dias.has(d)) { n++; d = sumar(d, -1); }
  return n;
}

function ocurre(r, f) {
  const g = r.regla || {};
  const d = aFecha(f);
  const wd = d.getDay();
  if (g.freq === 'semanal') {
    if (!(g.dias || []).includes(wd)) return false;
    const cada = Number(g.cada) || 1;
    if (cada === 1) return true;
    const semanas = Math.round(diasEntre(lunesDe(g.desde || fechaLocal(r.creado_en)), lunesDe(f)) / 7);
    return semanas >= 0 && semanas % cada === 0;
  }
  if (g.freq === 'mensual') {
    const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    if (g.dia_mes) return d.getDate() === Math.min(Number(g.dia_mes), ultimo);
    if (wd !== Number(g.dia)) return false;
    if (Number(g.semana) === -1) return d.getDate() + 7 > ultimo;
    return Math.ceil(d.getDate() / 7) === Number(g.semana);
  }
  return false;
}
const recurrentesDelDia = (f) => S.recurrentes.filter((r) => r.activo && ocurre(r, f))
  .sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99'));

const ORDINAL = { 1: 'primer', 2: 'segundo', 3: 'tercer', 4: 'cuarto', '-1': 'último' };
function describirRegla(r) {
  const g = r.regla || {};
  let txt = '';
  if (g.freq === 'semanal') {
    const plural = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
    const ds = [1, 2, 3, 4, 5, 6, 0].filter((x) => (g.dias || []).includes(x)).map((x) => plural[x]);
    const lista = ds.length > 1 ? `${ds.slice(0, -1).join(', ')} y ${ds[ds.length - 1]}` : ds[0] || '';
    const cada = Number(g.cada) || 1;
    txt = cada === 1 ? `Todos los ${lista}` : `Cada ${cada} semanas: ${lista}`;
  } else if (g.freq === 'mensual') {
    txt = g.dia_mes ? `El día ${g.dia_mes} de cada mes` : `El ${ORDINAL[g.semana]} ${DIAS[g.dia]} de cada mes`;
  }
  const partes = [txt];
  if (r.hora) partes.push(r.hora.slice(0, 5));
  if (r.duracion_min && r.tipo === 'bloque') partes.push(`${r.duracion_min} min`);
  return partes.join(' · ');
}

function proximaFecha(r) {
  let f = hoy();
  for (let i = 0; i < 400; i++) { if (ocurre(r, f)) return f; f = sumar(f, 1); }
  return hoy();
}

const RR_DIAS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
function linkGoogle(r) {
  const g = r.regla || {};
  let rrule;
  if (g.freq === 'semanal') rrule = `FREQ=WEEKLY;INTERVAL=${Number(g.cada) || 1};BYDAY=${(g.dias || []).map((x) => RR_DIAS[x]).join(',')}`;
  else if (g.dia_mes) rrule = `FREQ=MONTHLY;BYMONTHDAY=${g.dia_mes}`;
  else rrule = `FREQ=MONTHLY;BYDAY=${g.semana}${RR_DIAS[g.dia]}`;
  const inicio = proximaFecha(r);
  const compacta = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  let dates;
  if (r.hora) {
    const [h, m] = r.hora.split(':').map(Number);
    const a = aFecha(inicio); a.setHours(h, m, 0, 0);
    const b = new Date(a.getTime() + (r.duracion_min || 30) * 60000);
    dates = `${compacta(a)}/${compacta(b)}`;
  } else {
    dates = `${inicio.replace(/-/g, '')}/${sumar(inicio, 1).replace(/-/g, '')}`;
  }
  const p = new URLSearchParams({
    action: 'TEMPLATE', text: r.titulo, dates, ctz: 'America/Argentina/Buenos_Aires',
    details: [r.notas, proyecto(r.proyecto_id).nombre !== SIN_PROYECTO.nombre ? `Proyecto: ${proyecto(r.proyecto_id).nombre}` : '', 'Creado desde Calma'].filter(Boolean).join('\n'),
    recur: `RRULE:${rrule}`
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

const semanaARevisar = () => (dow(hoy()) === 1 ? sumar(lunesDe(hoy()), -7) : lunesDe(hoy()));

/* ---------- Piezas de interfaz ---------- */
const estiloProyecto = (p) => `--color:${p.color};--color-fuerte:${fuerte(p.color)}`;

function itemTarea(t, { fecha = true } = {}) {
  const p = proyecto(t.proyecto_id);
  const roja = t.reprogramaciones > 2 && !t.hecha;
  const vencida = !t.hecha && t.fecha && t.fecha < hoy();
  return `<li class="item ${t.hecha ? 'hecha' : ''} ${roja ? 'roja' : ''}" style="${estiloProyecto(p)}">
    <button class="check ${t.hecha ? 'lleno' : ''}" data-a="toggleTarea" data-id="${t.id}" aria-label="Marcar como hecha">${t.hecha ? '✓' : ''}</button>
    <div class="cuerpo clickable" data-a="editarTarea" data-id="${t.id}">
      <div class="titulo">${t.prioridad === 'importante' ? '<span class="estrella">★</span> ' : ''}${esc(t.titulo)}</div>
      <div class="meta">
        <span>${esc(p.nombre)}</span>
        ${fecha && t.fecha ? `<span class="${vencida ? 'vencida' : ''}">${vencida ? 'era para ' : ''}${corto(t.fecha)}</span>` : ''}
        ${t.reprogramaciones ? `<span>↻ movida ${t.reprogramaciones} ${t.reprogramaciones === 1 ? 'vez' : 'veces'}</span>` : ''}
      </div>
      ${roja ? `<div class="pregunta">¿Esto lo vas a hacer o lo soltamos?</div>
        <div class="botones-chicos">
          <button class="btn chico sec" data-a="loHago" data-id="${t.id}">Lo voy a hacer</button>
          <button class="btn chico peligro" data-a="soltar" data-id="${t.id}">Lo soltamos</button>
        </div>` : ''}
    </div>
  </li>`;
}

function itemRecurrente(r) {
  const p = proyecto(r.proyecto_id);
  return `<li class="item recurrente clickable" style="${estiloProyecto(p)}" data-a="editarRecurrente" data-id="${r.id}">
    <span aria-hidden="true">${r.tipo === 'recordatorio' ? '🔔' : '🕒'}</span>
    <div class="cuerpo">
      <div class="titulo">${esc(r.titulo)}</div>
      <div class="meta"><span>${esc(p.nombre)}</span>${r.hora ? `<span>${r.hora.slice(0, 5)}</span>` : ''}${r.duracion_min && r.tipo === 'bloque' ? `<span>${r.duracion_min} min</span>` : ''}</div>
    </div>
  </li>`;
}

function filaHabito(hb, f) {
  const reg = registro(hb.id, f);
  const n = racha(hb.id);
  const rachaTxt = n ? `🌱 ${n} ${n === 1 ? 'día' : 'días seguidos'}` : '';
  let extra = '';
  if (hb.version_corta && !reg) {
    extra = `<button class="btn chico sec" data-a="habitoCorto" data-id="${hb.id}" data-f="${f}" style="margin-top:6px">${esc(hb.version_corta)}</button>`;
  } else if (reg && reg.corta) {
    extra = `<div class="sub">✓ hiciste la versión corta — también cuenta</div>`;
  }
  if (hb.tipo === 'gratitud') {
    const g = S.gratitudes.find((x) => x.fecha === f);
    const items = (g && g.items) || [];
    if (gratitudAbierta) {
      extra = `<form data-form="gratitud" data-f="${f}" class="gratitud-campos" style="margin-top:8px">
        ${[0, 1, 2].map((i) => `<input type="text" name="g${i}" value="${esc(items[i] || '')}" placeholder="${['Hoy agradezco…', 'También…', 'Y…'][i]}" maxlength="200">`).join('')}
        <div class="fila"><button class="btn chico">Guardar</button><button type="button" class="btn chico fantasma" data-a="cerrarGratitud">Cerrar</button></div>
      </form>`;
    } else {
      extra = items.length
        ? `<div class="sub clickable" data-a="abrirGratitud">${items.map(esc).join(' · ')} <u>editar</u></div>`
        : `<button class="btn chico sec" data-a="abrirGratitud" style="margin-top:6px">Escribir</button>`;
    }
  }
  const check = hb.tipo === 'gratitud'
    ? `<button class="check ${reg ? 'lleno' : ''}" data-a="abrirGratitud" aria-label="Escribir agradecimientos">${reg ? '✓' : ''}</button>`
    : `<button class="check ${reg ? 'lleno' : ''}" data-a="toggleHabito" data-id="${hb.id}" data-f="${f}" aria-label="Marcar hábito">${reg ? '✓' : ''}</button>`;
  return `<div class="habito">
    ${check}
    <div class="cuerpo">
      <div class="fila entre"><b>${esc(hb.nombre)}</b><span class="racha">${rachaTxt}</span></div>
      ${hb.detalle ? `<div class="sub">${esc(hb.detalle)}</div>` : ''}
      ${extra}
    </div>
  </div>`;
}

function chipsProyecto(sel, nombre = 'proyecto_id') {
  return `<input type="hidden" name="${nombre}" value="${sel || ''}">
  <div class="chips">${proyectosActivos().map((p) =>
    `<button type="button" class="chip ${p.id === sel ? 'sel' : ''}" style="--chip:${p.color}" data-a="elegir" data-grupo="${nombre}" data-v="${p.id}">${esc(p.nombre)}</button>`).join('')}</div>`;
}
function chipsOpciones(nombre, opciones, sel) {
  return `<input type="hidden" name="${nombre}" value="${sel ?? ''}">
  <div class="chips">${opciones.map(([v, txt]) =>
    `<button type="button" class="chip ${String(v) === String(sel) ? 'sel' : ''}" data-a="elegir" data-grupo="${nombre}" data-v="${v}">${txt}</button>`).join('')}</div>`;
}

function cabecera(titulo, sub = '') {
  return `<div class="cabecera"><div><h1>${titulo}</h1>${sub ? `<div class="fecha">${sub}</div>` : ''}</div></div>`;
}
function volver(a = 'mas') {
  return `<button class="btn fantasma" data-a="ir" data-v="${a}" style="margin:-6px 0 4px -10px">← Volver</button>`;
}

/* ---------- Vistas ---------- */
const VISTAS = {};

VISTAS.hoy = () => {
  const h = hoy();
  const frase = fraseDelDia(h);
  const pendientes = tareasActivas().filter((t) => t.fecha <= h).sort(ordenTareas);
  const mostrar = verMasHoy ? pendientes : pendientes.slice(0, 3);
  const resto = pendientes.length - 3;
  const hechasHoy = S.tareas.filter((t) => t.hecha && t.hecha_en && fechaLocal(t.hecha_en) === h);
  const recs = recurrentesDelDia(h);
  const nBandeja = enBandeja().length;
  const revPendiente = dow(h) === 0 && !S.revisiones.some((r) => r.semana_inicio === semanaARevisar());
  const habitos = S.habitos.filter((x) => x.activo);
  const prioridades = S.revisiones.find((r) => r.semana_inicio === sumar(lunesDe(h), -7));

  return `${cabecera('Hoy', cap(largo(h)))}
  ${frase ? `<div class="frase-dia">“${esc(frase.texto)}”<small>tu frase de hoy</small></div>` : ''}
  ${revPendiente ? `<div class="aviso-suave"><span>🌿 Es domingo: ¿hacemos la revisión de la semana?</span><button class="btn chico" data-a="ir" data-v="revision">Empezar</button></div>` : ''}
  ${nBandeja ? `<div class="aviso-suave"><span>📥 Tenés ${nBandeja} ${nBandeja === 1 ? 'cosa' : 'cosas'} en la bandeja sin ordenar.</span><button class="btn chico sec" data-a="irBandeja">Ver</button></div>` : ''}

  <h2>Lo importante de hoy</h2>
  ${mostrar.length ? `<ul class="lista">${mostrar.map((t) => itemTarea(t)).join('')}</ul>`
    : `<div class="vacio">${hechasHoy.length ? 'Terminaste lo de hoy. Disfrutá el resto del día 💜' : 'Nada pendiente para hoy. Respirá tranqui.'}</div>`}
  ${resto > 0 && !verMasHoy ? `<button class="btn fantasma" data-a="verMasHoy">Hay ${resto} más para hoy, pero con 3 alcanza. Ver igual</button>` : ''}
  ${verMasHoy && resto > 0 ? `<button class="btn fantasma" data-a="verMasHoy">Mostrar solo 3</button>` : ''}
  ${hechasHoy.length ? `<div class="sub" style="margin-top:6px">✓ Ya hiciste hoy: ${hechasHoy.map((t) => esc(t.titulo)).join(' · ')}</div>` : ''}

  ${recs.length ? `<h2>Bloques y recordatorios de hoy</h2><ul class="lista">${recs.map(itemRecurrente).join('')}</ul>` : ''}

  ${prioridades && prioridades.prioridades.length ? `<div class="prioridades-semana" style="margin-top:20px"><b>Tus 3 de esta semana</b><ol>${prioridades.prioridades.map((p) => `<li>${esc(p)}</li>`).join('')}</ol></div>` : ''}

  <h2>Mis hábitos</h2>
  <div class="tarjeta">${habitos.length ? habitos.map((hb) => filaHabito(hb, h)).join('') : '<div class="vacio">Todavía no hay hábitos.</div>'}</div>`;
};

VISTAS.semana = () => {
  const ini = sumar(lunesDe(hoy()), semanaOffset * 7);
  const fin = sumar(ini, 6);
  const h = hoy();
  const prev = S.revisiones.find((r) => r.semana_inicio === sumar(ini, -7));
  const atrasadas = semanaOffset === 0 ? tareasActivas().filter((t) => t.fecha < ini).sort(ordenTareas) : [];
  const a = aFecha(ini), b = aFecha(fin);
  const titulo = a.getMonth() === b.getMonth()
    ? `${a.getDate()} al ${b.getDate()} de ${MESES[a.getMonth()]}`
    : `${a.getDate()} de ${MESES[a.getMonth()]} al ${b.getDate()} de ${MESES[b.getMonth()]}`;
  let dias = '';
  for (let i = 0; i < 7; i++) {
    const f = sumar(ini, i);
    const ts = tareasDelDia(f);
    const rs = recurrentesDelDia(f);
    dias += `<div class="dia-semana ${f === h ? 'es-hoy' : ''}">
      <div class="nombre-dia"><span>${cap(DIAS[dow(f)])} ${aFecha(f).getDate()}</span><button class="btn fantasma chico" data-a="nuevaTareaFecha" data-f="${f}">+ tarea</button></div>
      ${ts.length || rs.length ? `<ul class="lista">${rs.map(itemRecurrente).join('')}${ts.map((t) => itemTarea(t, { fecha: false })).join('')}</ul>` : '<div class="nada">Libre</div>'}
    </div>`;
  }
  return `${cabecera('Semana')}
  <div class="navegador">
    <button class="icono-btn" data-a="semana" data-v="-1" aria-label="Semana anterior">‹</button>
    <span class="titulo-nav">${titulo}</span>
    <button class="icono-btn" data-a="semana" data-v="1" aria-label="Semana siguiente">›</button>
  </div>
  ${semanaOffset !== 0 ? `<div style="text-align:center;margin:-6px 0 10px"><button class="btn fantasma chico" data-a="semana" data-v="0">Volver a esta semana</button></div>` : ''}
  ${prev && prev.prioridades.length ? `<div class="prioridades-semana"><b>Las 3 prioridades de esta semana</b><ol>${prev.prioridades.map((p) => `<li>${esc(p)}</li>`).join('')}</ol></div>` : ''}
  ${atrasadas.length ? `<div class="dia-semana"><div class="nombre-dia"><span>Quedaron de antes</span></div><ul class="lista">${atrasadas.map((t) => itemTarea(t)).join('')}</ul></div>` : ''}
  ${dias}`;
};

VISTAS.calendario = () => {
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + mesOffset);
  const mes = base.getMonth();
  const primero = aStr(base);
  const ultimo = aStr(new Date(base.getFullYear(), mes + 1, 0));
  const h = hoy();
  if (!diaSel || aFecha(diaSel).getMonth() !== mes) diaSel = mesOffset === 0 ? h : primero;
  let celdas = DIAS_INI.slice(1).concat(DIAS_INI[0]).map((d) => `<div class="cab">${d}</div>`).join('');
  let f = lunesDe(primero);
  while (f <= ultimo || dow(f) !== 1) {
    const marcas = [
      ...recurrentesDelDia(f).map((r) => ({ c: proyecto(r.proyecto_id).color, t: r.titulo })),
      ...tareasDelDia(f).filter((t) => !t.hecha).map((t) => ({ c: proyecto(t.proyecto_id).color, t: t.titulo }))
    ];
    celdas += `<button class="celda ${aFecha(f).getMonth() !== mes ? 'afuera' : ''} ${f === h ? 'hoy' : ''} ${f === diaSel ? 'sel' : ''}" data-a="elegirDia" data-f="${f}">
      <span class="num">${aFecha(f).getDate()}</span>
      <span class="marcas">${marcas.slice(0, 6).map((m) => `<b style="--c:${m.c}"></b>`).join('')}</span>
      ${marcas.slice(0, 3).map((m) => `<span class="etq" style="--c:${m.c}">${esc(m.t)}</span>`).join('')}
      ${marcas.length > 3 ? `<span class="etq" style="--c:transparent">+${marcas.length - 3}</span>` : ''}
    </button>`;
    f = sumar(f, 1);
  }
  const ts = tareasDelDia(diaSel);
  const rs = recurrentesDelDia(diaSel);
  return `${cabecera('Calendario')}
  <div class="navegador">
    <button class="icono-btn" data-a="mes" data-v="-1" aria-label="Mes anterior">‹</button>
    <span class="titulo-nav">${cap(MESES[mes])} ${base.getFullYear()}</span>
    <button class="icono-btn" data-a="mes" data-v="1" aria-label="Mes siguiente">›</button>
  </div>
  <div class="mes">${celdas}</div>
  <div class="fila entre" style="margin:22px 0 10px"><h3>${cap(largo(diaSel))}</h3><button class="btn chico sec" data-a="nuevaTareaFecha" data-f="${diaSel}">+ tarea</button></div>
  ${ts.length || rs.length ? `<ul class="lista">${rs.map(itemRecurrente).join('')}${ts.map((t) => itemTarea(t, { fecha: false })).join('')}</ul>` : '<div class="vacio">Nada para este día.</div>'}`;
};

VISTAS.tareas = () => {
  const seg = `<div class="segmento">
    ${[['bandeja', `Bandeja (${enBandeja().length})`], ['pendientes', 'Pendientes'], ['hechas', 'Hechas y soltadas']].map(([v, t]) =>
      `<button class="${segTareas === v ? 'sel' : ''}" data-a="segTareas" data-v="${v}">${t}</button>`).join('')}
  </div>`;
  let cuerpo = '';
  if (segTareas === 'bandeja') {
    const items = enBandeja();
    cuerpo = `<p class="sub">Anotá acá lo que se te cruce, sin pensar. Después, con calma, le ponés proyecto y fecha.</p>
    <form data-form="bandejaRapida" class="fila" style="flex-wrap:nowrap;margin-bottom:14px">
      <input type="text" name="titulo" placeholder="Algo que no me quiero olvidar…" maxlength="300" autocomplete="off">
      <button class="btn">Anotar</button>
    </form>
    ${items.length ? `<ul class="lista">${items.map((t) => `<li class="item" style="--color:var(--manteca)">
        <button class="check" data-a="toggleTarea" data-id="${t.id}" aria-label="Ya está hecha"></button>
        <div class="cuerpo"><div class="titulo">${esc(t.titulo)}</div><div class="meta"><span>anotada ${corto(fechaLocal(t.creado_en))}</span></div></div>
        <button class="btn chico sec" data-a="editarTarea" data-id="${t.id}">Ordenar</button>
      </li>`).join('')}</ul>` : '<div class="vacio">Bandeja vacía. Todo en su lugar ✨</div>'}`;
  } else if (segTareas === 'pendientes') {
    const filtro = `<div class="chips" style="margin-bottom:14px">
      <button class="chip ${!filtroProyecto ? 'sel' : ''}" data-a="filtroProyecto" data-v="">Todos</button>
      ${proyectosActivos().map((p) => `<button class="chip ${filtroProyecto === p.id ? 'sel' : ''}" style="--chip:${p.color}" data-a="filtroProyecto" data-v="${p.id}">${esc(p.nombre)}</button>`).join('')}
    </div>`;
    const ts = tareasActivas().filter((t) => !filtroProyecto || t.proyecto_id === filtroProyecto)
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || ordenTareas(a, b));
    cuerpo = filtro + (ts.length ? `<ul class="lista">${ts.map((t) => itemTarea(t)).join('')}</ul>` : '<div class="vacio">No hay tareas pendientes acá.</div>');
  } else {
    const hechas = S.tareas.filter((t) => t.hecha).sort((a, b) => (b.hecha_en || '').localeCompare(a.hecha_en || '')).slice(0, 60);
    const soltadas = S.tareas.filter((t) => t.soltada && !t.hecha).sort((a, b) => (b.soltada_en || '').localeCompare(a.soltada_en || ''));
    cuerpo = `<h3>Hechas</h3><div style="height:8px"></div>
    ${hechas.length ? `<ul class="lista">${hechas.map((t) => itemTarea(t)).join('')}</ul>` : '<div class="vacio">Todavía nada. Ya va a haber 💪</div>'}
    <h2>Soltadas</h2><p class="sub">Cosas que decidiste no hacer. Si cambiás de idea, las recuperás.</p>
    ${soltadas.length ? `<ul class="lista">${soltadas.map((t) => `<li class="item" style="${estiloProyecto(proyecto(t.proyecto_id))}">
        <div class="cuerpo"><div class="titulo">${esc(t.titulo)}</div><div class="meta"><span>${esc(proyecto(t.proyecto_id).nombre)}</span></div></div>
        <button class="btn chico sec" data-a="recuperar" data-id="${t.id}">Recuperar</button></li>`).join('')}</ul>` : '<div class="vacio">Nada soltado.</div>'}`;
  }
  return cabecera('Tareas') + seg + cuerpo;
};

VISTAS.mas = () => {
  const actual = S.aprendizajes.find((a) => a.estado === 'actual');
  const opciones = [
    ['habitos', '🌱', 'Hábitos', 'Rachas y edición', '#CFEBDD'],
    ['frases', '💬', 'Mis frases', `${S.frases.length} guardadas`, '#F6D6DF'],
    ['gratitud', '🙏', 'Diario de gratitud', 'Todo lo que agradeciste', '#FAF0C2'],
    ['repetidos', '🕒', 'Bloques y recordatorios', 'Lo que se repite', '#D4E6F5'],
    ['objetivos', '🎯', 'Objetivos', 'Metas grandes', '#FBE0C8'],
    ['aprendiendo', '📚', 'Aprendiendo ahora', actual ? esc(actual.titulo) : 'Elegí una cosa', '#E8DFF5'],
    ['revision', '🌿', 'Revisión semanal', 'Los domingos', '#DDEFC9'],
    ['proyectos', '🎨', 'Proyectos', 'Nombres y colores', '#F3D9F0']
  ];
  return `${cabecera('Más')}
  <div class="grilla-mas">${opciones.map(([v, ico, t, s, c]) =>
    `<button style="--chip:${c}" data-a="ir" data-v="${v}"><span class="ico">${ico}</span><b>${t}</b><span class="sub">${s}</span></button>`).join('')}</div>
  <div style="text-align:center;margin-top:30px">
    <div class="sub">${esc(S.user.email)}</div>
    <button class="btn fantasma" data-a="salir">Cerrar sesión</button>
  </div>`;
};

VISTAS.habitos = () => {
  const h = hoy();
  const lista = S.habitos.filter((x) => x.activo).map((hb) => {
    let puntos = '';
    for (let i = 13; i >= 0; i--) {
      const r = registro(hb.id, sumar(h, -i));
      puntos += `<i class="${r ? (r.corta ? 'corta' : 'si') : ''}" title="${corto(sumar(h, -i))}"></i>`;
    }
    const n = racha(hb.id);
    return `<div class="tarjeta">
      <div class="fila entre"><h3>${esc(hb.nombre)}</h3><button class="icono-btn" data-a="editarHabito" data-id="${hb.id}" aria-label="Editar">✏️</button></div>
      ${hb.detalle ? `<div class="sub">${esc(hb.detalle)}</div>` : ''}
      ${hb.version_corta ? `<div class="sub">También cuenta: ${esc(hb.version_corta)}</div>` : ''}
      <div class="puntos">${puntos}</div>
      <div class="sub" style="margin-top:6px">${n ? `🌱 Racha: ${n} ${n === 1 ? 'día' : 'días seguidos'}` : 'Sin racha todavía — hoy puede ser el primer día'}</div>
    </div>`;
  }).join('');
  return `${volver()}${cabecera('Hábitos', 'Últimos 14 días')}
  ${lista || '<div class="vacio">No hay hábitos.</div>'}
  <button class="btn ancho" data-a="nuevoHabito">+ Nuevo hábito</button>
  <p class="sub" style="text-align:center;margin-top:10px">Verde: lo hiciste · Amarillo: versión corta</p>`;
};

VISTAS.frases = () => `${volver()}${cabecera('Mis frases', 'La app te muestra una distinta cada día')}
  <form data-form="nuevaFrase" style="margin-bottom:16px">
    <textarea name="texto" placeholder="Una frase linda para mí…" maxlength="500" style="min-height:70px"></textarea>
    <button class="btn" style="margin-top:8px">Guardar frase</button>
  </form>
  ${S.frases.length ? `<ul class="lista">${S.frases.slice().reverse().map((fr) => `<li class="item" style="--color:var(--rosa)">
    <div class="cuerpo"><div class="titulo">“${esc(fr.texto)}”</div></div>
    <button class="icono-btn" data-a="editarFrase" data-id="${fr.id}" aria-label="Editar">✏️</button></li>`).join('')}</ul>` : '<div class="vacio">Todavía no guardaste frases.</div>'}`;

VISTAS.gratitud = () => {
  const entradas = S.gratitudes.filter((g) => g.items.length).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const hb = S.habitos.find((x) => x.tipo === 'gratitud' && x.activo);
  return `${volver()}${cabecera('Diario de gratitud')}
  ${hb ? `<div class="tarjeta">${filaHabito(hb, hoy())}</div>` : ''}
  ${entradas.length ? entradas.map((g) => `<div class="tarjeta"><div class="sub">${cap(largo(g.fecha))}</div>
    <ul style="margin:6px 0 0;padding-left:20px">${g.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('')
    : '<div class="vacio">Acá van a quedar guardados tus agradecimientos de cada día.</div>'}`;
};

VISTAS.repetidos = () => {
  const lista = S.recurrentes.slice().sort((a, b) => Number(b.activo) - Number(a.activo)).map((r) => {
    const p = proyecto(r.proyecto_id);
    return `<div class="tarjeta" style="border-left:6px solid ${p.color}${r.activo ? '' : ';opacity:.55'}">
      <div class="fila entre"><h3>${r.tipo === 'recordatorio' ? '🔔' : '🕒'} ${esc(r.titulo)}</h3><button class="icono-btn" data-a="editarRecurrente" data-id="${r.id}" aria-label="Editar">✏️</button></div>
      <div class="sub">${esc(p.nombre)} · ${describirRegla(r)}${r.activo ? '' : ' · en pausa'}</div>
      ${r.notas ? `<div style="margin-top:6px;font-size:.92rem">${esc(r.notas)}</div>` : ''}
      <div class="sub" style="margin-top:6px">Próxima vez: ${corto(proximaFecha(r))}</div>
      <a class="btn chico sec" style="display:inline-block;margin-top:10px;text-decoration:none" href="${linkGoogle(r)}" target="_blank" rel="noopener">📆 Agregar a Google Calendar</a>
    </div>`;
  }).join('');
  return `${volver()}${cabecera('Bloques y recordatorios', 'Lo que se repite solo')}
  <p class="sub">Aparecen solos en Hoy, Semana y Calendario. Con “Agregar a Google Calendar” se crean allá con la misma repetición, así te llegan las notificaciones al celu.</p>
  ${lista || '<div class="vacio">Nada todavía.</div>'}
  <button class="btn ancho" data-a="nuevoRecurrente">+ Nuevo bloque o recordatorio</button>`;
};

function progresoObjetivo(o) {
  const ts = S.tareas.filter((t) => t.objetivo_id === o.id && !t.soltada);
  const hechas = ts.filter((t) => t.hecha).length;
  return { total: ts.length, hechas, pct: ts.length ? Math.round((hechas / ts.length) * 100) : 0 };
}

VISTAS.objetivos = () => {
  const activos = S.objetivos.filter((o) => !o.terminado);
  const terminados = S.objetivos.filter((o) => o.terminado);
  const tarjeta = (o) => {
    const p = proyecto(o.proyecto_id);
    const pr = progresoObjetivo(o);
    return `<div class="tarjeta clickable" style="border-left:6px solid ${p.color}" data-a="verObjetivo" data-id="${o.id}">
      <h3>${esc(o.titulo)}</h3><div class="sub">${esc(p.nombre)}</div>
      <div class="barra"><div style="width:${pr.pct}%"></div></div>
      <div class="sub">${pr.total ? `${pr.hechas} de ${pr.total} tareas · ${pr.pct}%` : 'Todavía sin tareas adentro'}</div>
    </div>`;
  };
  return `${volver()}${cabecera('Objetivos', 'Metas grandes, en pasos chicos')}
  ${activos.map(tarjeta).join('') || '<div class="vacio">Sin objetivos por ahora.</div>'}
  <button class="btn ancho" data-a="nuevoObjetivo">+ Nuevo objetivo</button>
  ${terminados.length ? `<h2>Logrados 🎉</h2>${terminados.map(tarjeta).join('')}` : ''}`;
};

VISTAS.objetivo = () => {
  const o = S.objetivos.find((x) => x.id === objetivoSel);
  if (!o) { vista = 'objetivos'; return VISTAS.objetivos(); }
  const p = proyecto(o.proyecto_id);
  const pr = progresoObjetivo(o);
  const ts = S.tareas.filter((t) => t.objetivo_id === o.id && !t.soltada)
    .sort((a, b) => Number(a.hecha) - Number(b.hecha) || (a.fecha || '').localeCompare(b.fecha || ''));
  return `${volver('objetivos')}
  <div class="fila entre"><h1>${esc(o.titulo)}</h1><button class="icono-btn" data-a="editarObjetivo" data-id="${o.id}" aria-label="Editar">✏️</button></div>
  <div class="sub">${esc(p.nombre)}</div>
  ${o.descripcion ? `<p>${esc(o.descripcion)}</p>` : ''}
  <div class="barra"><div style="width:${pr.pct}%"></div></div>
  <div class="sub">${pr.hechas} de ${pr.total} tareas · ${pr.pct}%</div>
  <h2>Tareas</h2>
  ${ts.length ? `<ul class="lista">${ts.map((t) => itemTarea(t)).join('')}</ul>` : '<div class="vacio">Sumale el primer pasito.</div>'}
  <button class="btn ancho" data-a="tareaObjetivo" data-id="${o.id}">+ Agregar tarea</button>
  <div style="text-align:center;margin-top:18px">
    <button class="btn fantasma" data-a="terminarObjetivo" data-id="${o.id}">${o.terminado ? 'Volver a abrir este objetivo' : '¡Lo logré! Marcar como cumplido'}</button>
  </div>`;
};

VISTAS.aprendiendo = () => {
  const actual = S.aprendizajes.find((a) => a.estado === 'actual');
  const espera = S.aprendizajes.filter((a) => a.estado === 'espera');
  const terminados = S.aprendizajes.filter((a) => a.estado === 'terminado').sort((a, b) => (b.terminado_en || '').localeCompare(a.terminado_en || ''));
  const notas = actual ? S.aprendizaje_notas.filter((n) => n.aprendizaje_id === actual.id).slice().reverse() : [];
  return `${volver()}${cabecera('Aprendiendo ahora', 'Una sola cosa a la vez')}
  ${actual ? `<div class="aprendiendo-ahora">
      <div class="sub">Ahora estoy aprendiendo</div>
      <div class="que">${esc(actual.titulo)}</div>
      ${actual.empezado_en ? `<div class="sub">Desde el ${largo(actual.empezado_en)}</div>` : ''}
      <form data-form="notaAprendizaje" data-id="${actual.id}" style="margin-top:12px">
        <textarea name="texto" placeholder="¿Qué aprendí o avancé hoy?" maxlength="2000" style="min-height:70px"></textarea>
        <button class="btn chico" style="margin-top:8px">Guardar nota de avance</button>
      </form>
      ${notas.map((n) => `<div class="nota"><small>${corto(fechaLocal(n.creado_en))}</small>${esc(n.texto)}</div>`).join('')}
      <button class="btn sec ancho" style="margin-top:16px" data-a="pasarSiguiente">Terminé / Pasar al siguiente</button>
    </div>`
    : `<div class="aprendiendo-ahora"><div class="que">Nada por ahora</div><div class="sub">${espera.length ? 'Elegí una de la lista de espera para empezar.' : 'Sumá algo a la lista de espera.'}</div></div>`}

  <h2>Lista de espera</h2>
  <p class="sub">Quedan anotadas acá, tranquilas. No compiten con lo que estás aprendiendo.</p>
  ${espera.length ? `<ul class="lista">${espera.map((a, i) => `<li class="item" style="--color:var(--cielo)">
    <div class="cuerpo"><div class="titulo">${i + 1}. ${esc(a.titulo)}</div></div>
    ${actual ? '' : `<button class="btn chico" data-a="empezarAprendizaje" data-id="${a.id}">Empezar</button>`}
    <button class="icono-btn" data-a="moverEspera" data-id="${a.id}" data-v="-1" aria-label="Subir" ${i === 0 ? 'disabled' : ''}>↑</button>
    <button class="icono-btn" data-a="moverEspera" data-id="${a.id}" data-v="1" aria-label="Bajar" ${i === espera.length - 1 ? 'disabled' : ''}>↓</button>
    <button class="icono-btn" data-a="borrarAprendizaje" data-id="${a.id}" aria-label="Sacar">✕</button>
  </li>`).join('')}</ul>` : '<div class="vacio">La lista de espera está vacía.</div>'}
  <form data-form="nuevoAprendizaje" class="fila" style="flex-wrap:nowrap;margin-top:8px">
    <input type="text" name="titulo" placeholder="Algo que quiero aprender algún día" maxlength="200">
    <button class="btn">Sumar</button>
  </form>
  ${terminados.length ? `<h2>Ya aprendí 🎓</h2><ul class="lista">${terminados.map((a) => `<li class="item" style="--color:var(--menta)"><div class="cuerpo"><div class="titulo">${esc(a.titulo)}</div><div class="meta">${a.terminado_en ? `<span>terminado ${corto(a.terminado_en)}</span>` : ''}</div></div></li>`).join('')}</ul>` : ''}`;
};

VISTAS.proyectos = () => `${volver()}${cabecera('Proyectos')}
  <ul class="lista">${S.proyectos.map((p) => `<li class="item clickable" style="${estiloProyecto(p)}${p.archivado ? ';opacity:.5' : ''}" data-a="editarProyecto" data-id="${p.id}">
    <div class="cuerpo"><div class="titulo">${esc(p.nombre)}</div><div class="meta"><span>${tareasActivas().filter((t) => t.proyecto_id === p.id).length} pendientes</span>${p.archivado ? '<span>archivado</span>' : ''}</div></div><span>✏️</span></li>`).join('')}</ul>
  <button class="btn ancho" data-a="nuevoProyecto">+ Nuevo proyecto</button>`;

/* ---------- Revisión semanal ---------- */
function datosSemana(ini) {
  const fin = sumar(ini, 6);
  const enRango = (f) => f >= ini && f <= fin;
  const hechas = S.tareas.filter((t) => t.hecha && t.hecha_en && enRango(fechaLocal(t.hecha_en)));
  const habitos = S.habitos.filter((x) => x.activo).map((hb) => ({
    hb, n: S.habito_registros.filter((r) => r.habito_id === hb.id && enRango(r.fecha)).length
  }));
  return { fin, hechas, habitos, cumplidos: habitos.reduce((s, x) => s + x.n, 0) };
}

VISTAS.revision = () => {
  if (!rev) {
    const ini = semanaARevisar();
    const previa = S.revisiones.find((r) => r.semana_inicio === ini);
    rev = { paso: 0, ini, perdida: previa?.perdida_tiempo || '', prioridades: previa?.prioridades?.slice() || [] };
  }
  const { ini } = rev;
  const d = datosSemana(ini);
  const barra = `<div class="pasos">${[1, 2, 3, 4].map((i) => `<i class="${rev.paso >= i ? 'ok' : ''}"></i>`).join('')}</div>`;
  const nav = (sig = 'Siguiente') => `<div class="fila entre" style="margin-top:22px">
    <button class="btn fantasma" data-a="revPaso" data-v="-1">← Atrás</button>
    <button class="btn" data-a="revPaso" data-v="1">${sig}</button></div>`;

  if (rev.paso === 0) {
    const historial = S.revisiones.slice().sort((a, b) => b.semana_inicio.localeCompare(a.semana_inicio));
    return `${volver()}${cabecera('Revisión semanal', `Semana del ${aFecha(ini).getDate()} de ${MESES[aFecha(ini).getMonth()]}`)}
    <div class="tarjeta"><p style="margin-top:0">Son 4 pasitos cortos, unos 10 minutos. Mirás qué hiciste, decidís qué hacer con lo pendiente, anotás qué te hizo perder tiempo y elegís tus 3 prioridades.</p>
    <button class="btn ancho" data-a="revPaso" data-v="1">Empezar</button></div>
    ${historial.length ? `<h2>Revisiones anteriores</h2>${historial.map((r) => `<div class="tarjeta">
      <div class="sub">Semana del ${aFecha(r.semana_inicio).getDate()} de ${MESES[aFecha(r.semana_inicio).getMonth()]} · ${r.tareas_hechas ?? 0} tareas · ${r.habitos_cumplidos ?? 0} hábitos</div>
      ${r.perdida_tiempo ? `<div style="margin-top:6px"><b>Perdí tiempo en:</b> ${esc(r.perdida_tiempo)}</div>` : ''}
      ${r.prioridades.length ? `<div style="margin-top:6px"><b>Prioridades:</b> ${r.prioridades.map(esc).join(' · ')}</div>` : ''}
    </div>`).join('')}` : ''}`;
  }
  if (rev.paso === 1) {
    return `${barra}<h1>Qué hice esta semana</h1>
    <div class="fila" style="gap:24px;margin:18px 0">
      <div><div class="numero-grande">${d.hechas.length}</div><div class="sub">tareas hechas</div></div>
      <div><div class="numero-grande">${d.cumplidos}</div><div class="sub">hábitos cumplidos</div></div>
    </div>
    ${d.hechas.length ? `<ul class="lista">${d.hechas.map((t) => itemTarea(t, { fecha: false })).join('')}</ul>` : '<div class="vacio">Esta semana no marcaste tareas. Está bien: también se descansa.</div>'}
    <h2>Hábitos</h2>
    <div class="tarjeta">${d.habitos.map((x) => `<div class="fila entre" style="padding:6px 0"><span>${esc(x.hb.nombre)}</span><b>${x.n} de 7</b></div>`).join('')}</div>
    ${nav()}`;
  }
  if (rev.paso === 2) {
    const pend = tareasActivas().filter((t) => t.fecha <= d.fin).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const lunesQueViene = sumar(ini, 7);
    const nb = enBandeja().length;
    return `${barra}<h1>Qué quedó pendiente</h1>
    <p class="sub">Para cada una: ¿le ponés nueva fecha o la soltás? Soltar también es decidir.</p>
    ${pend.length ? pend.map((t) => {
      const p = proyecto(t.proyecto_id);
      return `<div class="tarjeta" style="border-left:6px solid ${p.color}${t.reprogramaciones > 2 ? ';background:var(--rojo-fondo)' : ''}">
        <b>${esc(t.titulo)}</b><div class="sub">${esc(p.nombre)} · era para ${corto(t.fecha)}${t.reprogramaciones ? ` · movida ${t.reprogramaciones} ${t.reprogramaciones === 1 ? 'vez' : 'veces'}` : ''}</div>
        ${t.reprogramaciones > 2 ? '<div class="pregunta" style="color:var(--rojo-texto);font-weight:700;margin-top:4px">¿Esto lo vas a hacer o lo soltamos?</div>' : ''}
        <div class="fila" style="margin-top:10px;flex-wrap:nowrap">
          <input type="date" id="rp-${t.id}" value="${lunesQueViene}" style="flex:1">
          <button class="btn chico" data-a="revReprogramar" data-id="${t.id}">Reprogramar</button>
        </div>
        <div class="fila" style="margin-top:8px">
          <button class="btn chico peligro" data-a="soltar" data-id="${t.id}">Soltar</button>
          <button class="btn chico sec" data-a="toggleTarea" data-id="${t.id}">Ya la hice</button>
        </div>
      </div>`;
    }).join('') : '<div class="vacio">No quedó nada pendiente. ¡Qué bien! 🌿</div>'}
    ${nb ? `<div class="aviso-suave"><span>📥 Además tenés ${nb} en la bandeja. Podés ordenarlas después desde Tareas.</span></div>` : ''}
    ${nav()}`;
  }
  if (rev.paso === 3) {
    const anteriores = S.revisiones.filter((r) => r.perdida_tiempo && r.semana_inicio !== ini)
      .sort((a, b) => b.semana_inicio.localeCompare(a.semana_inicio)).slice(0, 8);
    return `${barra}<h1>¿Qué me hizo perder tiempo esta semana?</h1>
    <p class="sub">Sin juzgarte. Es para ir viendo patrones con el tiempo.</p>
    <textarea id="rev-perdida" maxlength="2000" placeholder="Por ejemplo: pensar demasiado antes de arrancar, el celular, decir que sí a todo…">${esc(rev.perdida)}</textarea>
    ${anteriores.length ? `<h2>Lo que fuiste anotando antes</h2>${anteriores.map((r) => `<div class="nota" style="background:#fff"><small>semana del ${aFecha(r.semana_inicio).getDate()}/${aFecha(r.semana_inicio).getMonth() + 1}</small>${esc(r.perdida_tiempo)}</div>`).join('')}` : ''}
    ${nav()}`;
  }
  if (rev.paso === 4) {
    const prox = sumar(ini, 7);
    const sugerencias = tareasActivas().filter((t) => t.prioridad === 'importante' && t.fecha >= prox && t.fecha <= sumar(prox, 6))
      .concat(tareasActivas().filter((t) => t.prioridad === 'importante' && t.fecha < prox))
      .slice(0, 6);
    return `${barra}<h1>Mis 3 prioridades de la semana que viene</h1>
    <p class="sub">Solo 3. Lo demás puede esperar.</p>
    ${[0, 1, 2].map((i) => `<input type="text" id="rev-p${i}" value="${esc(rev.prioridades[i] || '')}" placeholder="Prioridad ${i + 1}" maxlength="200" style="margin-bottom:8px">`).join('')}
    ${sugerencias.length ? `<div class="etiqueta" style="margin-top:10px">Ideas (tus tareas importantes): tocá para sumar</div>
      <div class="chips">${sugerencias.map((t) => `<button class="chip" style="--chip:${proyecto(t.proyecto_id).color}" data-a="revSugerencia" data-v="${esc(t.titulo)}">${esc(t.titulo)}</button>`).join('')}</div>` : ''}
    ${nav('Terminar revisión')}`;
  }
  return `<div class="tarjeta" style="text-align:center;padding:30px 20px">
    <div style="font-size:2.4rem">🌿</div><h1>Semana cerrada</h1>
    <p>Todo está anotado y en su lugar. Tus 3 prioridades te esperan en Hoy y en Semana desde el lunes.</p>
    <button class="btn" data-a="finRevision">Listo</button></div>`;
};

/* ---------- Pantalla de ingreso ---------- */
const campoClave = (autocompletar) => `<label class="campo"><span>Contraseña</span>
  <div class="fila" style="flex-wrap:nowrap">
    <input type="password" name="clave" required minlength="6" autocomplete="${autocompletar}" autocapitalize="none" autocorrect="off" spellcheck="false">
    <button type="button" class="btn chico sec" data-a="verClave">Ver</button>
  </div></label>`;

function renderIngreso(msg = '', email = '') {
  $app.innerHTML = `<div class="ingreso">
    <img class="logo" src="iconos/icono-192.png" alt="">
    <h1>Calma</h1>
    <p class="intro">Todo anotado, todo en su lugar.</p>
    <form data-form="ingresar">
      <label class="campo"><span>Tu mail</span><input type="email" name="email" value="${esc(email)}" required autocomplete="email" autocapitalize="none" autocorrect="off" spellcheck="false"></label>
      ${campoClave('current-password')}
      ${msg ? `<div class="aviso-suave">${msg}</div>` : ''}
      <button class="btn ancho" name="modo" value="entrar">Entrar</button>
      <button type="button" class="btn fantasma ancho" data-a="olvideClave">¿Te olvidaste la contraseña?</button>
      <button class="btn sec ancho" name="modo" value="crear" style="margin-top:10px">Es mi primera vez: crear cuenta</button>
    </form>
  </div>`;
}

function renderNuevaClave() {
  $app.innerHTML = `<div class="ingreso">
    <img class="logo" src="iconos/icono-192.png" alt="">
    <h1>Contraseña nueva</h1>
    <p class="intro">Elegí una contraseña que te acuerdes (mínimo 6 caracteres).</p>
    <form data-form="nuevaClave">
      ${campoClave('new-password')}
      <button class="btn ancho">Guardar y entrar</button>
    </form>
  </div>`;
}

/* ---------- Dibujar ---------- */
const NAV = [['hoy', '🌤', 'Hoy'], ['semana', '📅', 'Semana'], ['calendario', '🗓', 'Calendario'], ['tareas', '📥', 'Tareas'], ['mas', '✨', 'Más']];
const SECCION_DE = { habitos: 'mas', frases: 'mas', gratitud: 'mas', repetidos: 'mas', objetivos: 'mas', objetivo: 'mas', aprendiendo: 'mas', revision: 'mas', proyectos: 'mas' };
let vistaAnterior = null;

function render() {
  if (!S.user) return renderIngreso();
  const y = window.scrollY;
  const activa = SECCION_DE[vista] || vista;
  $app.innerHTML = `<main>${VISTAS[vista]()}</main>
  <nav class="abajo">${NAV.map(([v, ico, t]) => `<button class="${activa === v ? 'activo' : ''}" data-a="ir" data-v="${v}"><span class="ico">${ico}</span>${t}</button>`).join('')}</nav>
  <button class="fab" data-a="capturar" aria-label="Anotar algo rápido">+</button>`;
  window.scrollTo(0, vistaAnterior === vista ? y : 0);
  vistaAnterior = vista;
}

/* ---------- Ventanas emergentes ---------- */
let modalCtx = {};
function abrirModal(html, ctx = {}) {
  modalCtx = ctx;
  $modal.innerHTML = `<div class="fondo-modal" data-a="fondoModal"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
  actualizarCondicionales();
  const primero = $modal.querySelector('[autofocus]');
  if (primero) setTimeout(() => primero.focus(), 60);
}
function cerrarModal() { $modal.innerHTML = ''; modalCtx = {}; }
function actualizarCondicionales() {
  $modal.querySelectorAll('[data-si]').forEach((el) => {
    const [grupo, valor] = el.dataset.si.split('=');
    const input = $modal.querySelector(`input[name="${grupo}"]`);
    el.classList.toggle('oculto', !input || !valor.split('|').includes(input.value));
  });
}
const valorModal = (n) => { const el = $modal.querySelector(`[name="${n}"]`); return el ? el.value.trim() : ''; };

function editorTarea(t, preset = {}) {
  const v = {
    titulo: t?.titulo ?? preset.titulo ?? '',
    proyecto_id: t?.proyecto_id ?? preset.proyecto_id ?? '',
    fecha: t?.fecha ?? preset.fecha ?? '',
    prioridad: t?.prioridad ?? 'puede_esperar',
    objetivo_id: t?.objetivo_id ?? preset.objetivo_id ?? '',
    notas: t?.notas ?? ''
  };
  const objetivos = S.objetivos.filter((o) => !o.terminado || o.id === v.objetivo_id);
  const ordenando = t && t.en_bandeja;
  abrirModal(`<h2>${ordenando ? 'Ordenar tarea' : t ? 'Editar tarea' : 'Nueva tarea'}</h2>
    <label class="campo"><span>¿Qué hay que hacer?</span><input type="text" name="titulo" value="${esc(v.titulo)}" maxlength="300" ${t ? '' : 'autofocus'}></label>
    <div class="campo" style="margin-bottom:14px"><span class="etiqueta">Proyecto</span>${chipsProyecto(v.proyecto_id)}</div>
    <div class="campo" style="margin-bottom:14px"><span class="etiqueta">Fecha límite (obligatoria)</span>
      <div class="chips" style="margin-bottom:8px">
        <button type="button" class="chip" data-a="fechaRapida" data-v="0">Hoy</button>
        <button type="button" class="chip" data-a="fechaRapida" data-v="1">Mañana</button>
        <button type="button" class="chip" data-a="fechaRapida" data-v="lunes">Próximo lunes</button>
        <button type="button" class="chip" data-a="fechaRapida" data-v="7">En una semana</button>
      </div>
      <input type="date" name="fecha" value="${v.fecha}">
    </div>
    <div class="campo" style="margin-bottom:14px"><span class="etiqueta">Prioridad</span>${chipsOpciones('prioridad', [['importante', '★ Importante'], ['puede_esperar', 'Puede esperar']], v.prioridad)}</div>
    ${objetivos.length ? `<label class="campo"><span>¿Es parte de un objetivo? (opcional)</span><select name="objetivo_id"><option value="">No</option>${objetivos.map((o) => `<option value="${o.id}" ${o.id === v.objetivo_id ? 'selected' : ''}>${esc(o.titulo)}</option>`).join('')}</select></label>` : ''}
    <label class="campo"><span>Notas (opcional)</span><textarea name="notas" maxlength="2000" style="min-height:60px">${esc(v.notas)}</textarea></label>
    <div id="errores-tarea" class="falta"></div>
    <button class="btn ancho" data-a="guardarTarea">${ordenando ? 'Guardar y sacar de la bandeja' : 'Guardar'}</button>
    ${t ? `<div class="fila entre" style="margin-top:12px">
      <button class="btn fantasma" data-a="soltar" data-id="${t.id}">Soltar esta tarea</button>
      <button class="btn fantasma" data-a="borrarTarea" data-id="${t.id}" style="color:var(--rojo-texto)">Borrar</button></div>` : ''}
    <button class="btn fantasma ancho" data-a="cerrarModal">Cancelar</button>`, { tarea: t, sinContar: preset.sinContar });
}

function editorRecurrente(r) {
  const g = r?.regla || { freq: 'semanal', dias: [], cada: 1 };
  const modo = g.freq === 'semanal' ? 'semanal' : g.dia_mes ? 'mes_dia' : 'mes_semana';
  abrirModal(`<h2>${r ? 'Editar' : 'Nuevo'} bloque o recordatorio</h2>
    <label class="campo"><span>Nombre</span><input type="text" name="titulo" value="${esc(r?.titulo || '')}" maxlength="200" ${r ? '' : 'autofocus'}></label>
    <div class="campo" style="margin-bottom:14px"><span class="etiqueta">Tipo</span>${chipsOpciones('tipo', [['bloque', '🕒 Bloque de tiempo'], ['recordatorio', '🔔 Recordatorio']], r?.tipo || 'bloque')}</div>
    <div class="campo" style="margin-bottom:14px"><span class="etiqueta">Proyecto</span>${chipsProyecto(r?.proyecto_id || '')}</div>
    <div class="campo" style="margin-bottom:14px"><span class="etiqueta">¿Cada cuánto?</span>${chipsOpciones('modo', [['semanal', 'Ciertos días de la semana'], ['mes_semana', 'Una semana del mes'], ['mes_dia', 'Un día fijo del mes']], modo)}</div>
    <div data-si="modo=semanal" class="campo" style="margin-bottom:14px">
      <span class="etiqueta">¿Qué días?</span>
      <input type="hidden" name="dias" value="${(g.dias || []).join(',')}">
      <div class="chips">${[1, 2, 3, 4, 5, 6, 0].map((x) => `<button type="button" class="chip ${(g.dias || []).includes(x) ? 'sel' : ''}" data-a="toggleDia" data-v="${x}">${DIAS_C[x]}</button>`).join('')}</div>
      <label class="campo" style="margin-top:10px"><span>Repetir</span><select name="cada">
        ${[1, 2, 3, 4].map((n) => `<option value="${n}" ${Number(g.cada || 1) === n ? 'selected' : ''}>${n === 1 ? 'Todas las semanas' : `Cada ${n} semanas`}</option>`).join('')}
      </select></label>
    </div>
    <div data-si="modo=mes_semana" class="fila" style="margin-bottom:14px;flex-wrap:nowrap">
      <select name="semana">${[[1, 'El primer'], [2, 'El segundo'], [3, 'El tercer'], [4, 'El cuarto'], [-1, 'El último']].map(([v, t]) => `<option value="${v}" ${Number(g.semana ?? -1) === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <select name="dia">${[1, 2, 3, 4, 5, 6, 0].map((x) => `<option value="${x}" ${Number(g.dia ?? 1) === x ? 'selected' : ''}>${DIAS[x]}</option>`).join('')}</select>
    </div>
    <div data-si="modo=mes_semana" class="sub" style="margin:-6px 0 14px">Tip: “el último lunes” sirve para avisos tipo “esta semana es semana de edición”.</div>
    <label data-si="modo=mes_dia" class="campo"><span>Día del mes</span><input type="number" name="dia_mes" min="1" max="31" value="${g.dia_mes || 1}"></label>
    <div class="fila" style="flex-wrap:nowrap">
      <label class="campo" style="flex:1"><span>Hora</span><input type="time" name="hora" value="${r?.hora ? r.hora.slice(0, 5) : '10:00'}"></label>
      <label class="campo" style="flex:1" data-si="tipo=bloque"><span>Duración (min)</span><input type="number" name="duracion_min" min="5" max="600" step="5" value="${r?.duracion_min || 30}"></label>
    </div>
    <label class="campo"><span>Notas o apuntes (opcional)</span><textarea name="notas" maxlength="2000" style="min-height:60px">${esc(r?.notas || '')}</textarea></label>
    <div id="errores-rec" class="falta"></div>
    <button class="btn ancho" data-a="guardarRecurrente">Guardar</button>
    ${r ? `<div class="fila entre" style="margin-top:12px">
      <button class="btn fantasma" data-a="pausarRecurrente" data-id="${r.id}">${r.activo ? 'Pausar' : 'Reactivar'}</button>
      <button class="btn fantasma" data-a="borrarRecurrente" data-id="${r.id}" style="color:var(--rojo-texto)">Borrar</button></div>` : ''}
    <button class="btn fantasma ancho" data-a="cerrarModal">Cancelar</button>`, { recurrente: r });
}

/* ---------- Acciones ---------- */
const A = {};

A.ir = ({ v }) => { vista = v; if (v === 'revision') rev = null; if (v === 'hoy') verMasHoy = false; render(); };
A.irBandeja = () => { vista = 'tareas'; segTareas = 'bandeja'; render(); };
A.semana = ({ v }) => { semanaOffset = v === '0' ? 0 : semanaOffset + Number(v); render(); };
A.mes = ({ v }) => { mesOffset += Number(v); diaSel = null; render(); };
A.elegirDia = ({ f }) => { diaSel = f; render(); };
A.segTareas = ({ v }) => { segTareas = v; render(); };
A.filtroProyecto = ({ v }) => { filtroProyecto = v; render(); };
A.verMasHoy = () => { verMasHoy = !verMasHoy; render(); };
A.cerrarModal = () => cerrarModal();
A.fondoModal = (_, el, e) => { if (e.target === el) cerrarModal(); };

A.elegir = ({ grupo, v }, el) => {
  const input = $modal.querySelector(`input[name="${grupo}"]`);
  input.value = v;
  el.parentElement.querySelectorAll('.chip').forEach((c) => c.classList.toggle('sel', c === el));
  actualizarCondicionales();
};
A.toggleDia = ({ v }, el) => {
  const input = $modal.querySelector('input[name="dias"]');
  const dias = new Set(input.value ? input.value.split(',') : []);
  if (dias.has(v)) dias.delete(v); else dias.add(v);
  input.value = [...dias].join(',');
  el.classList.toggle('sel', dias.has(v));
};
A.fechaRapida = ({ v }) => {
  const h = hoy();
  let f;
  if (v === 'lunes') f = sumar(lunesDe(h), 7);
  else f = sumar(h, Number(v));
  $modal.querySelector('input[name="fecha"]').value = f;
};

// Tareas
A.capturar = () => {
  abrirModal(`<h2>Anotar algo</h2>
    <p class="sub" style="margin-top:-4px">Sin pensar: va a la bandeja y lo ordenás después.</p>
    <form data-form="captura">
      <input type="text" name="titulo" placeholder="¿Qué se te cruzó?" maxlength="300" autocomplete="off" autofocus>
      <div id="captura-ok" class="sub" style="min-height:22px;margin-top:6px"></div>
      <button class="btn ancho">Guardar en la bandeja</button>
    </form>
    <button class="btn sec ancho" style="margin-top:10px" data-a="capturaConFecha">Ponerle fecha ahora</button>
    <button class="btn fantasma ancho" data-a="cerrarModal">Cerrar</button>`);
};
A.capturaConFecha = () => editorTarea(null, { titulo: valorModal('titulo') });
A.nuevaTareaFecha = ({ f }) => editorTarea(null, { fecha: f });
A.tareaObjetivo = ({ id }) => editorTarea(null, { objetivo_id: id, proyecto_id: S.objetivos.find((o) => o.id === id)?.proyecto_id || '' });
A.editarTarea = ({ id }) => editorTarea(S.tareas.find((t) => t.id === id));
A.loHago = async ({ id }) => {
  const t = await actualizar('tareas', id, { reprogramaciones: 0 });
  render();
  aviso('¡Bien! Elegí una fecha que sea real 💜');
  editorTarea(t, { sinContar: true });
};

A.guardarTarea = async () => {
  const datos = {
    titulo: valorModal('titulo'),
    proyecto_id: valorModal('proyecto_id') || null,
    fecha: valorModal('fecha') || null,
    prioridad: valorModal('prioridad') || 'puede_esperar',
    objetivo_id: valorModal('objetivo_id') || null,
    notas: valorModal('notas') || null,
    en_bandeja: false
  };
  const faltan = [];
  if (!datos.titulo) faltan.push('qué hay que hacer');
  if (!datos.proyecto_id) faltan.push('el proyecto');
  if (!datos.fecha) faltan.push('la fecha');
  if (faltan.length) { $modal.querySelector('#errores-tarea').textContent = `Falta ${faltan.join(', ')}. Sin fecha no se guarda 🙂`; return; }
  const t = modalCtx.tarea;
  if (t) {
    if (!t.en_bandeja && t.fecha && datos.fecha > t.fecha && !modalCtx.sinContar) datos.reprogramaciones = t.reprogramaciones + 1;
    await actualizar('tareas', t.id, datos);
  } else {
    await insertar('tareas', datos);
  }
  cerrarModal();
  render();
  aviso(datos.reprogramaciones > 2 ? 'Guardada. Ojo: ya la moviste varias veces.' : 'Guardada ✓');
};
A.toggleTarea = async ({ id }) => {
  const t = S.tareas.find((x) => x.id === id);
  const hecha = !t.hecha;
  await actualizar('tareas', id, { hecha, hecha_en: hecha ? new Date().toISOString() : null });
  render();
  if (hecha) aviso('¡Hecho! ✓');
};
A.soltar = async ({ id }) => {
  await actualizar('tareas', id, { soltada: true, soltada_en: new Date().toISOString() });
  cerrarModal();
  render();
  aviso('Soltada. Una cosa menos en la cabeza 🍃');
};
A.recuperar = async ({ id }) => {
  await actualizar('tareas', id, { soltada: false, soltada_en: null, reprogramaciones: 0 });
  render();
  aviso('Recuperada: está otra vez en pendientes');
};
A.borrarTarea = async ({ id }) => {
  if (!confirm('¿Borrar esta tarea para siempre?')) return;
  await borrar('tareas', id);
  cerrarModal();
  render();
};

// Hábitos
A.toggleHabito = async ({ id, f }) => {
  const r = registro(id, f);
  if (r) await borrar('habito_registros', r.id);
  else await insertar('habito_registros', { habito_id: id, fecha: f });
  render();
};
A.habitoCorto = async ({ id, f }) => {
  if (!registro(id, f)) await insertar('habito_registros', { habito_id: id, fecha: f, corta: true });
  render();
  aviso('Versión corta: ¡también cuenta! 🌱');
};
A.abrirGratitud = () => { gratitudAbierta = true; render(); const i = document.querySelector('[name="g0"]'); if (i) i.focus(); };
A.cerrarGratitud = () => { gratitudAbierta = false; render(); };
A.nuevoHabito = () => editorHabito(null);
A.editarHabito = ({ id }) => editorHabito(S.habitos.find((h) => h.id === id));
function editorHabito(hb) {
  abrirModal(`<h2>${hb ? 'Editar' : 'Nuevo'} hábito</h2>
    <label class="campo"><span>Nombre</span><input type="text" name="nombre" value="${esc(hb?.nombre || '')}" maxlength="100" ${hb ? '' : 'autofocus'}></label>
    <label class="campo"><span>Detalle (opcional)</span><input type="text" name="detalle" value="${esc(hb?.detalle || '')}" maxlength="200" placeholder="Ej: en cualquier momento del día"></label>
    ${hb?.tipo && hb.tipo !== 'simple' ? '' : `<label class="campo"><span>Versión corta que también cuenta (opcional)</span><input type="text" name="version_corta" value="${esc(hb?.version_corta || '')}" maxlength="100" placeholder="Ej: Versión corta: 5 min"></label>`}
    <button class="btn ancho" data-a="guardarHabito">Guardar</button>
    ${hb ? `<button class="btn fantasma ancho" style="margin-top:10px;color:var(--rojo-texto)" data-a="borrarHabito" data-id="${hb.id}">Sacar este hábito</button>` : ''}
    <button class="btn fantasma ancho" data-a="cerrarModal">Cancelar</button>`, { habito: hb });
}
A.guardarHabito = async () => {
  const datos = { nombre: valorModal('nombre'), detalle: valorModal('detalle') || null };
  if ($modal.querySelector('[name="version_corta"]')) datos.version_corta = valorModal('version_corta') || null;
  if (!datos.nombre) return aviso('Ponele un nombre');
  if (modalCtx.habito) await actualizar('habitos', modalCtx.habito.id, datos);
  else await insertar('habitos', { ...datos, orden: S.habitos.length + 1 });
  cerrarModal(); render();
};
A.borrarHabito = async ({ id }) => {
  if (!confirm('¿Sacar este hábito? Se borra también su historial.')) return;
  await borrar('habitos', id);
  S.habito_registros = S.habito_registros.filter((r) => r.habito_id !== id);
  cerrarModal(); render();
};

// Frases
A.editarFrase = ({ id }) => {
  const fr = S.frases.find((x) => x.id === id);
  abrirModal(`<h2>Editar frase</h2>
    <textarea name="texto" maxlength="500">${esc(fr.texto)}</textarea>
    <button class="btn ancho" style="margin-top:10px" data-a="guardarFrase">Guardar</button>
    <button class="btn fantasma ancho" style="margin-top:10px;color:var(--rojo-texto)" data-a="borrarFrase">Borrar frase</button>
    <button class="btn fantasma ancho" data-a="cerrarModal">Cancelar</button>`, { frase: fr });
};
A.guardarFrase = async () => {
  const texto = valorModal('texto');
  if (!texto) return;
  await actualizar('frases', modalCtx.frase.id, { texto });
  cerrarModal(); render();
};
A.borrarFrase = async () => {
  if (!confirm('¿Borrar esta frase?')) return;
  await borrar('frases', modalCtx.frase.id);
  cerrarModal(); render();
};

// Bloques y recordatorios
A.nuevoRecurrente = () => editorRecurrente(null);
A.editarRecurrente = ({ id }) => editorRecurrente(S.recurrentes.find((r) => r.id === id));
A.guardarRecurrente = async () => {
  const modo = valorModal('modo');
  let regla;
  if (modo === 'semanal') {
    const dias = valorModal('dias').split(',').filter(Boolean).map(Number);
    if (!dias.length) { $modal.querySelector('#errores-rec').textContent = 'Elegí al menos un día.'; return; }
    const previa = modalCtx.recurrente?.regla;
    regla = { freq: 'semanal', dias, cada: Number(valorModal('cada')) || 1, desde: previa?.desde || lunesDe(hoy()) };
  } else if (modo === 'mes_semana') {
    regla = { freq: 'mensual', semana: Number(valorModal('semana')), dia: Number(valorModal('dia')) };
  } else {
    regla = { freq: 'mensual', dia_mes: Math.min(31, Math.max(1, Number(valorModal('dia_mes')) || 1)) };
  }
  const datos = {
    titulo: valorModal('titulo'),
    tipo: valorModal('tipo') || 'bloque',
    proyecto_id: valorModal('proyecto_id') || null,
    regla,
    hora: valorModal('hora') || null,
    duracion_min: Number(valorModal('duracion_min')) || null,
    notas: valorModal('notas') || null
  };
  if (!datos.titulo) { $modal.querySelector('#errores-rec').textContent = 'Ponele un nombre.'; return; }
  if (modalCtx.recurrente) await actualizar('recurrentes', modalCtx.recurrente.id, datos);
  else await insertar('recurrentes', datos);
  cerrarModal(); render();
  aviso('Guardado. Si ya lo tenías en Google Calendar, actualizalo allá también.');
};
A.pausarRecurrente = async ({ id }) => {
  const r = S.recurrentes.find((x) => x.id === id);
  await actualizar('recurrentes', id, { activo: !r.activo });
  cerrarModal(); render();
};
A.borrarRecurrente = async ({ id }) => {
  if (!confirm('¿Borrar este bloque o recordatorio? (Si lo agregaste a Google Calendar, borralo allá también.)')) return;
  await borrar('recurrentes', id);
  cerrarModal(); render();
};

// Objetivos
A.verObjetivo = ({ id }) => { objetivoSel = id; vista = 'objetivo'; render(); };
A.nuevoObjetivo = () => editorObjetivo(null);
A.editarObjetivo = ({ id }) => editorObjetivo(S.objetivos.find((o) => o.id === id));
function editorObjetivo(o) {
  abrirModal(`<h2>${o ? 'Editar' : 'Nuevo'} objetivo</h2>
    <label class="campo"><span>¿Qué querés lograr?</span><input type="text" name="titulo" value="${esc(o?.titulo || '')}" maxlength="200" ${o ? '' : 'autofocus'}></label>
    <div class="campo" style="margin-bottom:14px"><span class="etiqueta">Proyecto</span>${chipsProyecto(o?.proyecto_id || '')}</div>
    <label class="campo"><span>¿Por qué o para qué? (opcional)</span><textarea name="descripcion" maxlength="2000" style="min-height:60px">${esc(o?.descripcion || '')}</textarea></label>
    <button class="btn ancho" data-a="guardarObjetivo">Guardar</button>
    ${o ? `<button class="btn fantasma ancho" style="margin-top:10px;color:var(--rojo-texto)" data-a="borrarObjetivo" data-id="${o.id}">Borrar objetivo</button>` : ''}
    <button class="btn fantasma ancho" data-a="cerrarModal">Cancelar</button>`, { objetivo: o });
}
A.guardarObjetivo = async () => {
  const datos = { titulo: valorModal('titulo'), proyecto_id: valorModal('proyecto_id') || null, descripcion: valorModal('descripcion') || null };
  if (!datos.titulo) return aviso('Ponele un nombre');
  if (modalCtx.objetivo) await actualizar('objetivos', modalCtx.objetivo.id, datos);
  else { const o = await insertar('objetivos', datos); objetivoSel = o.id; vista = 'objetivo'; }
  cerrarModal(); render();
};
A.borrarObjetivo = async ({ id }) => {
  if (!confirm('¿Borrar este objetivo? Sus tareas no se borran, solo quedan sueltas.')) return;
  await borrar('objetivos', id);
  S.tareas.forEach((t) => { if (t.objetivo_id === id) t.objetivo_id = null; });
  cerrarModal(); vista = 'objetivos'; render();
};
A.terminarObjetivo = async ({ id }) => {
  const o = S.objetivos.find((x) => x.id === id);
  await actualizar('objetivos', id, { terminado: !o.terminado });
  render();
  if (!o.terminado) aviso('¡Objetivo cumplido! 🎉');
};

// Aprendiendo ahora
A.pasarSiguiente = async () => {
  const actual = S.aprendizajes.find((a) => a.estado === 'actual');
  const siguiente = S.aprendizajes.find((a) => a.estado === 'espera');
  const pregunta = siguiente ? `¿Terminaste con “${actual.titulo}”? Pasa a “${siguiente.titulo}”.` : `¿Terminaste con “${actual.titulo}”?`;
  if (!confirm(pregunta)) return;
  await actualizar('aprendizajes', actual.id, { estado: 'terminado', terminado_en: hoy() });
  if (siguiente) await actualizar('aprendizajes', siguiente.id, { estado: 'actual', empezado_en: hoy() });
  render();
  aviso(siguiente ? `¡Bien! Ahora: ${siguiente.titulo}` : '¡Terminaste! Tu lista de espera está vacía.');
};
A.empezarAprendizaje = async ({ id }) => {
  await actualizar('aprendizajes', id, { estado: 'actual', empezado_en: hoy() });
  render();
};
A.moverEspera = async ({ id, v }) => {
  const espera = S.aprendizajes.filter((a) => a.estado === 'espera');
  const i = espera.findIndex((a) => a.id === id);
  const j = i + Number(v);
  if (j < 0 || j >= espera.length) return;
  [espera[i], espera[j]] = [espera[j], espera[i]];
  await Promise.all(espera.map((a, k) => (a.orden !== k + 1 ? actualizar('aprendizajes', a.id, { orden: k + 1 }) : null)));
  S.aprendizajes.sort((a, b) => a.orden - b.orden);
  render();
};
A.borrarAprendizaje = async ({ id }) => {
  if (!confirm('¿Sacar de la lista de espera?')) return;
  await borrar('aprendizajes', id);
  render();
};

// Proyectos
A.nuevoProyecto = () => editorProyecto(null);
A.editarProyecto = ({ id }) => editorProyecto(S.proyectos.find((p) => p.id === id));
function editorProyecto(p) {
  const color = p?.color || PALETA[S.proyectos.length % PALETA.length];
  abrirModal(`<h2>${p ? 'Editar' : 'Nuevo'} proyecto</h2>
    <label class="campo"><span>Nombre</span><input type="text" name="nombre" value="${esc(p?.nombre || '')}" maxlength="80" ${p ? '' : 'autofocus'}></label>
    <span class="etiqueta">Color</span>
    <input type="hidden" name="color" value="${color}">
    <div class="chips" style="margin-bottom:18px">${PALETA.map((c) => `<button type="button" class="chip ${c === color ? 'sel' : ''}" style="--chip:${c};width:42px;height:42px;padding:0" data-a="elegir" data-grupo="color" data-v="${c}" aria-label="Color ${c}"></button>`).join('')}</div>
    <button class="btn ancho" data-a="guardarProyecto">Guardar</button>
    ${p ? `<button class="btn fantasma ancho" style="margin-top:10px" data-a="archivarProyecto" data-id="${p.id}">${p.archivado ? 'Volver a usar este proyecto' : 'Archivar (ya no lo uso)'}</button>` : ''}
    <button class="btn fantasma ancho" data-a="cerrarModal">Cancelar</button>`, { proyecto: p });
}
A.guardarProyecto = async () => {
  const datos = { nombre: valorModal('nombre'), color: valorModal('color') };
  if (!datos.nombre) return aviso('Ponele un nombre');
  if (modalCtx.proyecto) await actualizar('proyectos', modalCtx.proyecto.id, datos);
  else await insertar('proyectos', { ...datos, orden: S.proyectos.length + 1 });
  cerrarModal(); render();
};
A.archivarProyecto = async ({ id }) => {
  const p = S.proyectos.find((x) => x.id === id);
  await actualizar('proyectos', id, { archivado: !p.archivado });
  cerrarModal(); render();
};

// Revisión semanal
function guardarCamposRevision() {
  const perdida = document.getElementById('rev-perdida');
  if (perdida) rev.perdida = perdida.value.trim();
  if (document.getElementById('rev-p0')) rev.prioridades = [0, 1, 2].map((i) => document.getElementById(`rev-p${i}`).value.trim()).filter(Boolean);
}
A.revPaso = async ({ v }) => {
  guardarCamposRevision();
  if (rev.paso === 4 && v === '1') {
    const d = datosSemana(rev.ini);
    const fila = await db(sb.from('revisiones').upsert({
      user_id: S.user.id, semana_inicio: rev.ini, perdida_tiempo: rev.perdida || null,
      prioridades: rev.prioridades, tareas_hechas: d.hechas.length, habitos_cumplidos: d.cumplidos
    }, { onConflict: 'user_id,semana_inicio' }).select().single());
    S.revisiones = S.revisiones.filter((r) => r.id !== fila.id).concat(fila);
  }
  rev.paso = Math.max(0, Math.min(5, rev.paso + Number(v)));
  vistaAnterior = null;
  render();
};
A.revReprogramar = async ({ id }) => {
  const f = document.getElementById(`rp-${id}`).value;
  if (!f) return aviso('Elegí una fecha');
  const t = S.tareas.find((x) => x.id === id);
  await actualizar('tareas', id, { fecha: f, reprogramaciones: f > t.fecha ? t.reprogramaciones + 1 : t.reprogramaciones });
  render();
  aviso(`Pasada para el ${corto(f)}`);
};
A.revSugerencia = ({ v }) => {
  const libre = [0, 1, 2].map((i) => document.getElementById(`rev-p${i}`)).find((el) => !el.value.trim());
  if (libre) libre.value = v; else aviso('Ya elegiste 3. Con eso alcanza 💜');
};
A.finRevision = () => { rev = null; vista = 'hoy'; render(); };

A.salir = async () => {
  if (!confirm('¿Cerrar sesión en este dispositivo?')) return;
  await sb.auth.signOut();
  S.user = null;
  renderIngreso();
};

/* ---------- Formularios ---------- */
const F = {};
F.ingresar = async (form, submitter) => {
  const email = form.email.value.trim();
  const password = form.clave.value;
  const btns = form.querySelectorAll('button');
  btns.forEach((b) => { b.disabled = true; });
  try {
    if (submitter && submitter.value === 'crear') {
      const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: URL_APP } });
      if (error) throw error;
      if (data.user && data.user.identities && !data.user.identities.length) {
        renderIngreso('Ese mail ya tiene cuenta. Tocá “Entrar”. Si no te acordás la contraseña, tocá “¿Te olvidaste la contraseña?”.', email);
      } else if (data.session) { S.user = data.user; await entrar(); }
      else renderIngreso('📩 Te mandamos un mail. Tocá el link para confirmar tu cuenta y después volvé acá y tocá “Entrar”. (Si el link abre una página con error, no pasa nada: la cuenta igual queda confirmada.)');
    } else {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      S.user = data.user;
      await entrar();
    }
  } catch (e) {
    const m = String(e.message || e);
    renderIngreso(/confirm/i.test(m) ? 'Falta confirmar tu mail: buscá el mail de confirmación (mirá también en spam).'
      : /invalid/i.test(m) ? 'La contraseña no coincide con la que pusiste al crear la cuenta. Tocá “Ver” para revisar lo que escribiste (ojo con la mayúscula automática del celu), o tocá “¿Te olvidaste la contraseña?”.'
        : /already/i.test(m) ? 'Ese mail ya tiene cuenta. Tocá “Entrar”.'
          : `No se pudo: ${esc(m)}`, email);
  }
};
F.nuevaClave = async (form) => {
  const password = form.clave.value;
  if (password.length < 6) return aviso('Tiene que tener al menos 6 caracteres');
  const { data, error } = await sb.auth.updateUser({ password });
  if (error) { aviso(`No se pudo: ${error.message}`); return; }
  S.user = data.user;
  aviso('¡Listo! Contraseña nueva guardada');
  await entrar();
};
A.salirForzado = async () => {
  await sb.auth.signOut({ scope: 'local' });
  S.user = null;
  renderIngreso();
};
A.verClave = (_, el) => {
  const input = el.closest('form').querySelector('[name="clave"]');
  input.type = input.type === 'password' ? 'text' : 'password';
  el.textContent = input.type === 'password' ? 'Ver' : 'Ocultar';
};
A.olvideClave = async () => {
  const email = document.querySelector('[data-form="ingresar"] [name="email"]').value.trim();
  if (!email) { renderIngreso('Escribí tu mail arriba y después tocá “¿Te olvidaste la contraseña?”.'); return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: URL_APP });
  renderIngreso(error ? `No se pudo mandar el mail: ${esc(error.message)}`
    : '📩 Te mandamos un mail para elegir una contraseña nueva. Abrí el link desde este mismo dispositivo.', email);
};
F.captura = async (form) => {
  const titulo = form.titulo.value.trim();
  if (!titulo) return;
  await insertar('tareas', { titulo, en_bandeja: true });
  form.titulo.value = '';
  form.titulo.focus();
  $modal.querySelector('#captura-ok').textContent = `✓ “${titulo}” quedó en la bandeja. Podés seguir anotando.`;
  render();
};
F.bandejaRapida = async (form) => {
  const titulo = form.titulo.value.trim();
  if (!titulo) return;
  await insertar('tareas', { titulo, en_bandeja: true });
  render();
  const i = document.querySelector('[data-form="bandejaRapida"] input');
  if (i) i.focus();
};
F.gratitud = async (form) => {
  const f = form.dataset.f;
  const items = [0, 1, 2].map((i) => form[`g${i}`].value.trim()).filter(Boolean);
  const fila = await db(sb.from('gratitudes').upsert({ user_id: S.user.id, fecha: f, items }, { onConflict: 'user_id,fecha' }).select().single());
  S.gratitudes = S.gratitudes.filter((g) => g.fecha !== f).concat(fila);
  const hb = S.habitos.find((x) => x.tipo === 'gratitud');
  if (hb) {
    const r = registro(hb.id, f);
    if (items.length && !r) await insertar('habito_registros', { habito_id: hb.id, fecha: f });
    if (!items.length && r) await borrar('habito_registros', r.id);
  }
  gratitudAbierta = false;
  render();
  if (items.length) aviso('Guardado en tu diario 🙏');
};
F.nuevaFrase = async (form) => {
  const texto = form.texto.value.trim();
  if (!texto) return;
  await insertar('frases', { texto });
  render();
  aviso('Frase guardada 💬');
};
F.notaAprendizaje = async (form) => {
  const texto = form.texto.value.trim();
  if (!texto) return;
  await insertar('aprendizaje_notas', { aprendizaje_id: form.dataset.id, texto });
  render();
  aviso('Nota guardada');
};
F.nuevoAprendizaje = async (form) => {
  const titulo = form.titulo.value.trim();
  if (!titulo) return;
  const espera = S.aprendizajes.filter((a) => a.estado === 'espera');
  await insertar('aprendizajes', { titulo, orden: espera.length ? Math.max(...espera.map((a) => a.orden)) + 1 : 1 });
  render();
};

/* ---------- Eventos ---------- */
let ocupado = false;
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  const fn = A[el.dataset.a];
  if (!fn || ocupado) return;
  try {
    const r = fn(el.dataset, el, e);
    if (r && r.then) { ocupado = true; await r; }
  } catch (err) { console.error(err); } finally { ocupado = false; }
});
document.addEventListener('submit', async (e) => {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  if (ocupado) return;
  ocupado = true;
  try { await F[form.dataset.form](form, e.submitter); } catch (err) { console.error(err); } finally { ocupado = false; }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $modal.innerHTML) cerrarModal(); });

// Al volver a la app (por ejemplo, después de usarla en la compu) trae lo último
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !S.user || $modal.innerHTML) return;
  if (Date.now() - ultimaCarga < 30000) { render(); return; }
  try { await cargarTodo(); render(); } catch (err) { console.error(err); }
});

/* ---------- Arranque ---------- */
async function entrar() {
  $app.innerHTML = '<div class="cargando">Preparando tu día…</div>';
  try {
    await cargarTodo();
    if (!S.proyectos.length) { await sembrar(); await cargarTodo(); }
    render();
  } catch (err) {
    console.error(err);
    $app.innerHTML = `<div class="cargando"><div style="text-align:center">No se pudo conectar. Revisá internet y recargá.<br>
      <button class="btn sec" style="margin-top:16px" data-a="salirForzado">Volver a entrar con mi mail</button></div></div>`;
  }
}

(async () => {
  const { data } = await sb.auth.getSession();
  S.user = data.session?.user || null;
  if (S.user && vieneDeRecuperar) renderNuevaClave();
  else if (S.user) await entrar();
  else renderIngreso();
  sb.auth.onAuthStateChange((evento, sesion) => {
    if (evento === 'SIGNED_OUT') { S.user = null; renderIngreso(); }
    else if (evento === 'SIGNED_IN' && !S.user && sesion) { S.user = sesion.user; entrar(); }
  });
})();
})();
