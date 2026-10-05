/* =====================================================================
   APP · login, menú y navegación entre secciones
   Para sumar una sección nueva:
     1) crear js/secciones/mi-seccion.js con App.registrar({...})
     2) agregar su <script> en index.html
   El menú se arma solo.
   ===================================================================== */
(function () {
  const secciones = [];
  const App = { secciones };

  // Íconos simples (trazos) para el menú
  const ICONOS = {
    inicio: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    productos: '<path d="M6 8h12l-1 12H7z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    inventario: '<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
    insumos: '<path d="M4 8h16v4H4zM5 12v8h14v-8M12 8v12"/><path d="M12 8c-2-3-6-3-6-.5S10 8 12 8zM12 8c2-3 6-3 6-.5S14 8 12 8z"/>',
    ventas: '<path d="M3 4h2l2.5 11h11L21 7H6.2"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>',
    clientes: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    eventos: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    contenido: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".8"/>',
    finanzas: '<path d="M12 2v20"/><path d="M17 6.5c0-1.9-2.2-3-5-3s-5 1.3-5 3.3c0 4.7 10 2.2 10 7 0 2-2.3 3.4-5 3.4s-5.2-1.2-5.2-3.2"/>',
    proveedores: '<path d="M2 7h11v9H2zM13 10h4l4 4v2h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    equipo: '<circle cx="12" cy="7" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/>',
    reportes: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    alertas: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
    configuracion: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    salir: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>'
  };
  App.icono = (nombre) => `<svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[nombre] || ICONOS.inicio}</svg>`;

  // Cada sección se registra con: { id, titulo, descripcion, icono, render(contenedor, parametro) }
  App.registrar = (s) => { secciones.push(s); };

  // Configuración de la marca (se guarda en memoria para no pedirla todo el tiempo)
  let configCache = null;
  App.config = async (forzar) => {
    if (!configCache || forzar) {
      configCache = (await DB.obtener('configuracion', 1)) || { stock_minimo_defecto: 2, frase: 'Movete a tu ritmo', nombre_marca: 'Sinan' };
    }
    return configCache;
  };

  // Ir a una sección: App.ir('ventas') o App.ir('ventas', 'nuevo')
  App.ir = (id, param) => { location.hash = '#/' + id + (param ? '/' + param : ''); };

  function armarMenu() {
    const nav = document.getElementById('menu');
    nav.innerHTML = secciones.map((s) => `
      <a href="#/${s.id}" data-sec="${s.id}">${App.icono(s.icono || s.id)}<span>${U.esc(s.titulo)}</span><b class="insignia" hidden></b></a>`).join('');
    nav.addEventListener('click', () => cerrarMenuMovil());
  }

  // Número rojo al lado de "Alertas"
  App.actualizarInsignias = async () => {
    for (const s of secciones) {
      if (!s.insignia) continue;
      try {
        const n = await s.insignia();
        const b = document.querySelector(`[data-sec="${s.id}"] .insignia`);
        if (b) { b.textContent = n; b.hidden = !n; }
      } catch { /* si falla no pasa nada */ }
    }
  };

  async function mostrarSeccion() {
    const [id, param] = location.hash.replace(/^#\/?/, '').split('/');
    const s = secciones.find((x) => x.id === id) || secciones[0];
    document.querySelectorAll('#menu a').forEach((a) => a.classList.toggle('activa', a.dataset.sec === s.id));
    document.title = `${s.titulo} · Sinan ERP`;
    const cont = document.getElementById('contenido');
    cont.innerHTML = `<header class="cabecera-seccion"><h1>${U.esc(s.titulo)}</h1>${s.descripcion ? `<p>${U.esc(s.descripcion)}</p>` : ''}</header>
      <div class="seccion" id="seccion-${s.id}"><div class="cargando-bloque">Cargando…</div></div>`;
    window.scrollTo(0, 0);
    try { await s.render(cont.querySelector('.seccion'), param); }
    catch (e) { cont.querySelector('.seccion').innerHTML = `<div class="vacio">No se pudo cargar: ${U.esc(e.message)}</div>`; UI.error(e); }
  }

  // ---------- Menú en el celular ----------
  function abrirMenuMovil() { document.body.classList.add('menu-abierto'); }
  function cerrarMenuMovil() { document.body.classList.remove('menu-abierto'); }

  // ---------- Login ----------
  function mostrarLogin(mensaje) {
    document.getElementById('app').hidden = true;
    const login = document.getElementById('pantalla-login');
    login.hidden = false;
    const err = login.querySelector('.form-error');
    if (mensaje) { err.textContent = mensaje; err.hidden = false; } else err.hidden = true;
  }

  let appIniciada = false;
  let saliendo = false;
  async function entrarApp(sesion) {
    document.getElementById('pantalla-login').hidden = true;
    document.getElementById('app').hidden = false;
    document.getElementById('usuario-email').textContent = sesion.user?.email || '';
    if (!appIniciada) {
      appIniciada = true;
      armarMenu();
      window.addEventListener('hashchange', mostrarSeccion);
    }
    mostrarSeccion();
    App.actualizarInsignias();
  }

  async function iniciar() {
    const login = document.getElementById('pantalla-login');
    if (!window.DB) {
      login.hidden = false;
      login.querySelector('form').innerHTML = `<p class="form-error">Falta conectar la base de datos: completá <b>js/config.js</b> con los datos de Supabase.</p>`;
      return;
    }
    document.getElementById('boton-menu').onclick = abrirMenuMovil;
    document.getElementById('velo-menu').onclick = cerrarMenuMovil;
    document.getElementById('boton-salir').onclick = async () => {
      if (await UI.confirmar('¿Querés cerrar la sesión?', { titulo: 'Cerrar sesión', boton: 'Salir', peligro: false })) {
        saliendo = true;
        await DB.auth.salir(); location.hash = ''; mostrarLogin();
        saliendo = false;
      }
    };

    // Botón "Ver" para mostrar la contraseña mientras se escribe
    const ver = document.getElementById('ver-clave');
    if (ver) ver.onclick = () => {
      const c = document.getElementById('login-clave');
      const mostrar = c.type === 'password';
      c.type = mostrar ? 'text' : 'password';
      ver.textContent = mostrar ? 'Ocultar' : 'Ver';
      ver.setAttribute('aria-pressed', mostrar);
    };

    login.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target; const boton = f.querySelector('button');
      boton.disabled = true; boton.classList.add('cargando');
      try {
        // El email siempre en minúsculas y sin espacios (el celu a veces pone mayúscula al principio)
        const r = await DB.auth.entrar(f.email.value.trim().toLowerCase(), f.clave.value);
        f.clave.value = '';
        entrarApp(r.session);
      } catch (ex) { mostrarLogin(ex.message); } finally { boton.disabled = false; boton.classList.remove('cargando'); }
    });

    DB.auth.alCambiar((s) => { if (!s && appIniciada && !saliendo) mostrarLogin('Tu sesión terminó. Volvé a entrar.'); });

    try {
      const sesion = await DB.auth.sesion();
      if (sesion) entrarApp(sesion); else mostrarLogin();
    } catch (e) { mostrarLogin(e.message); }
  }

  document.addEventListener('DOMContentLoaded', iniciar);
  window.App = App;
})();
