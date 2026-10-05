/* =====================================================================
   UTILIDADES · formatos de pesos, fechas y pequeñas ayudas
   ===================================================================== */
(function () {
  const U = {};

  // $ 12.500 (sin decimales). Negativos: -$ 12.500
  U.pesos = (n) => {
    const v = Math.round(Number(n) || 0);
    const txt = Math.abs(v).toLocaleString('es-AR', { maximumFractionDigits: 0 });
    return (v < 0 ? '-$ ' : '$ ') + txt;
  };

  // Números con punto de miles: 1.250
  U.numero = (n) => (n === null || n === undefined || n === '') ? '—'
    : Number(n).toLocaleString('es-AR', { maximumFractionDigits: 1 });

  U.porcentaje = (n) => (n === null || n === undefined || !isFinite(n)) ? '—'
    : Number(n).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' %';

  // '2026-10-05' -> '05/10/2026'
  U.fecha = (iso) => {
    if (!iso) return '—';
    const [a, m, d] = String(iso).slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
  };

  // Fecha de hoy en formato '2026-10-05' (hora local)
  U.hoy = () => U.isoDeFecha(new Date());
  U.isoDeFecha = (f) => {
    const p = (x) => String(x).padStart(2, '0');
    return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}`;
  };
  // Convierte '2026-10-05' a Date local (sin problemas de zona horaria)
  U.fechaDeIso = (iso) => {
    const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number);
    return new Date(a, m - 1, d);
  };
  // Días desde hoy hasta la fecha (negativo si ya pasó)
  U.diasHasta = (iso) => Math.round((U.fechaDeIso(iso) - U.fechaDeIso(U.hoy())) / 86400000);

  // '2026-10' de una fecha
  U.mes = (iso) => String(iso || '').slice(0, 7);
  U.MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  U.nombreMes = (ym, corto) => {
    const [a, m] = ym.split('-').map(Number);
    const n = U.MESES[m - 1];
    return corto ? n.slice(0, 3) + ' ' + String(a).slice(2) : n.charAt(0).toUpperCase() + n.slice(1) + ' ' + a;
  };
  // Lista de los últimos N meses ('2026-05', ..., '2026-10')
  U.ultimosMeses = (n) => {
    const r = []; const d = new Date(); d.setDate(1);
    for (let i = n - 1; i >= 0; i--) {
      const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
      r.push(U.isoDeFecha(x).slice(0, 7));
    }
    return r;
  };

  // Escapa texto para meterlo en HTML sin riesgos
  U.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Normaliza texto para buscar (sin tildes ni mayúsculas)
  U.normalizar = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  // Margen de ganancia en % sobre el precio de venta
  U.margen = (precio, costo) => {
    precio = Number(precio) || 0; costo = Number(costo) || 0;
    return precio > 0 ? ((precio - costo) / precio) * 100 : null;
  };

  // Agrupa una lista por una clave
  U.agrupar = (lista, fn) => lista.reduce((acc, x) => {
    const k = fn(x); (acc[k] = acc[k] || []).push(x); return acc;
  }, {});
  U.sumar = (lista, fn) => lista.reduce((s, x) => s + (Number(fn(x)) || 0), 0);
  U.porId = (lista) => Object.fromEntries(lista.map((x) => [x.id, x]));

  // Fotos: las rutas 'assets/...' son de la web de Sinan (una carpeta más arriba)
  U.urlFoto = (url) => {
    if (!url) return '';
    if (/^(https?:|data:|blob:|\/)/.test(url)) return url;
    return '../' + url;
  };

  window.U = U;
})();
