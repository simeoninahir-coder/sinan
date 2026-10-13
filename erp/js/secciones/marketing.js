/* =====================================================================
   SECCIÓN · MARKETING
   Estrategia, objetivos, campañas, calendario de publicaciones,
   banco de ideas, pilares de contenido y métricas de Instagram.
   ===================================================================== */
(function () {
  // ---------- Ficha de publicación (como una página de Notion) ----------
  // En el calendario cada publicación se ve como "REEL: tema", "HISTORIA: tema"…
  const PREFIJO = /^\s*(post|carrusel|reel|historia|historias|video|mail)\s*:\s*/i;
  const etiquetaPub = (p) => `${String(p.formato || '').toUpperCase()}: ${p.titulo}`;
  const TIPOS = ['Mensaje', 'Anuncio', 'Detrás de escena', 'Colaboración', 'Beneficio exclusivo', 'Hype final', 'Víspera', 'Evento en vivo'];
  const SEMANAS =['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Lanzamiento', 'Recta final', 'Después del evento'];
  const svg = (d) => `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONO = {
    opcion: svg('<circle cx="12" cy="12" r="9"/><path d="m8.5 10.5 3.5 3.5 3.5-3.5"/>'),
    fecha: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
    lista: svg('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r=".9"/><circle cx="4.5" cy="12" r=".9"/><circle cx="4.5" cy="18" r=".9"/>'),
    link: svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>')
  };

  function abrirPublicacion(fila, valores, pilares, alGuardar) {
    const v = { estado: 'Idea', fecha: U.hoy(), formato: 'Historia', canal: 'Instagram', ...(fila || valores || {}) };
    const opciones = (lista, actual, vacio = true) => (vacio ? '<option value="">Vacío</option>' : '') + lista.map((o) => {
      const [valor, texto] = typeof o === 'object' ? [o.valor, o.texto] : [o, o];
      return `<option value="${U.esc(valor)}" ${String(valor) === String(actual ?? '') ? 'selected' : ''}>${U.esc(texto)}</option>`;
    }).join('');
    const prop = (icono, nombre, control) => `<div class="prop"><span class="prop-nombre">${ICONO[icono]}${nombre}</span><div class="prop-valor">${control}</div></div>`;
    const metrica = (campo, nombre) => `<label class="campo"><span class="campo-etiqueta">${nombre}</span>
      <input name="${campo}" type="number" min="0" step="1" inputmode="numeric" value="${v[campo] ?? ''}"></label>`;
    const hayMetricas = ['alcance', 'me_gusta', 'comentarios', 'guardados'].some((c) => v[c] != null);

    const form = document.createElement('form');
    form.className = 'ficha';
    form.innerHTML = `
      <div class="ficha-titulo">
        <span class="ficha-prefijo"></span>
        <textarea name="titulo" rows="1" required placeholder="Tema" aria-label="Tema">${U.esc(String(v.titulo || '').replace(PREFIJO, ''))}</textarea>
      </div>
      ${prop('opcion', 'Estado', `<select name="estado">${opciones(N.ESTADOS_PUBLICACION, v.estado, false)}</select>`)}
      ${prop('fecha', 'Fecha', `<input name="fecha" type="date" required value="${U.esc(String(v.fecha || '').slice(0, 10))}">`)}
      ${prop('opcion', 'Formato', `<select name="formato">${opciones(N.FORMATOS, v.formato, false)}</select>`)}
      ${prop('lista', 'Objetivo', `<select name="objetivo">${opciones(N.OBJETIVOS_CONTENIDO, v.objetivo)}</select>`)}
      ${prop('opcion', 'Pilar', `<select name="pilar_id">${opciones(pilares.map((p) => ({ valor: p.id, texto: p.nombre })), v.pilar_id)}</select>`)}
      ${prop('opcion', 'Semana', `<input name="semana" list="semanas-pub" placeholder="Vacío" value="${U.esc(v.semana || '')}">
        <datalist id="semanas-pub">${SEMANAS.map((s) => `<option value="${U.esc(s)}">`).join('')}</datalist>`)}
      ${prop('opcion', 'Canal', `<select name="canal">${opciones(N.CANALES_CONTENIDO, v.canal, false)}</select>`)}
      ${prop('lista', 'Tipo', `<input name="tipo" list="tipos-pub" placeholder="Vacío" value="${U.esc(v.tipo || '')}">
        <datalist id="tipos-pub">${TIPOS.map((s) => `<option value="${U.esc(s)}">`).join('')}</datalist>`)}
      ${prop('link', 'Link', `<input name="link" type="url" placeholder="Vacío (pegalo cuando se publique)" value="${U.esc(v.link || '')}">`)}
      <h3 class="ficha-seccion">Guion</h3>
      <textarea name="texto" class="ficha-guion" placeholder="Escribí el guion: qué se muestra, qué se dice, el texto de cada slide…">${U.esc(v.texto || '')}</textarea>
      <details class="ficha-resultados" ${hayMetricas ? 'open' : ''}>
        <summary>Resultados (cuando ya se publicó)</summary>
        <div class="ficha-metricas">${metrica('alcance', 'Alcance')}${metrica('me_gusta', 'Me gusta')}${metrica('comentarios', 'Comentarios')}${metrica('guardados', 'Guardados')}</div>
      </details>
      <p class="form-error" hidden></p>
      <div class="acciones-form">
        ${fila ? '<button type="button" class="boton boton-secundario ficha-borrar" data-borrar>Eliminar</button>' : ''}
        <button type="button" class="boton boton-secundario" data-cancelar>Cancelar</button>
        <button type="submit" class="boton">Guardar</button>
      </div>`;
    const m = UI.modal({ titulo: fila ? 'Publicación' : 'Nueva publicación', contenido: form, ancho: 'ficha' });
    const titulo = form.elements.titulo;
    const prefijo = form.querySelector('.ficha-prefijo');
    const crecer = (t) => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; };
    const actualizarPrefijo = () => { prefijo.textContent = form.elements.formato.value.toUpperCase() + ':'; };
    const marcarVacios = () => form.querySelectorAll('.prop-valor select').forEach((s) => s.classList.toggle('vacio', !s.value));
    actualizarPrefijo(); marcarVacios();
    requestAnimationFrame(() => { crecer(titulo); crecer(form.elements.texto); });
    form.elements.formato.addEventListener('change', actualizarPrefijo);
    form.addEventListener('change', marcarVacios);
    titulo.addEventListener('input', () => {
      // Si escribe "REEL: algo" en el tema, se toma como formato y queda solo el tema
      const pre = titulo.value.match(PREFIJO);
      if (pre) {
        const f = N.FORMATOS.find((x) => x.toLowerCase() === pre[1].toLowerCase().replace(/s$/, ''));
        if (f) { form.elements.formato.value = f; actualizarPrefijo(); }
        titulo.value = titulo.value.replace(PREFIJO, '');
      }
      crecer(titulo);
    });
    titulo.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
    form.elements.texto.addEventListener('input', (e) => crecer(e.target));
    if (!fila && window.innerWidth > 760) titulo.focus();
    form.querySelector('[data-cancelar]').onclick = m.cerrar;
    const borrar = form.querySelector('[data-borrar]');
    if (borrar) borrar.onclick = async () => {
      if (!(await UI.confirmar(`Se va a eliminar "${etiquetaPub(fila)}".`))) return;
      try { await DB.borrar('publicaciones', fila.id); UI.aviso('Publicación eliminada'); m.cerrar(); if (alGuardar) alGuardar(); } catch (e) { UI.error(e); }
    };
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = form.querySelector('.form-error'); err.hidden = true;
      if (!form.reportValidity()) return;
      const val = (c) => form.elements[c].value.trim() || null;
      const num = (c) => (form.elements[c].value === '' ? null : Number(form.elements[c].value));
      const d = {
        titulo: titulo.value.replace(PREFIJO, '').trim(), estado: val('estado'), fecha: val('fecha'), formato: val('formato'),
        objetivo: val('objetivo'), pilar_id: num('pilar_id'), semana: val('semana'), canal: val('canal'), tipo: val('tipo'), link: val('link'), texto: val('texto'),
        alcance: num('alcance'), me_gusta: num('me_gusta'), comentarios: num('comentarios'), guardados: num('guardados')
      };
      const boton = form.querySelector('[type=submit]'); boton.disabled = true; boton.classList.add('cargando');
      try {
        if (fila) await DB.actualizar('publicaciones', fila.id, d); else await DB.crear('publicaciones', d);
        UI.aviso('Publicación guardada');
        m.cerrar();
        if (alGuardar) alGuardar();
      } catch (ex) { err.textContent = ex.message || String(ex); err.hidden = false; } finally { boton.disabled = false; boton.classList.remove('cargando'); }
    });
  }

  // ---------- Calendario mensual ----------
  function pestanaCalendario(cuerpo) {
    let mes = U.mes(U.hoy());
    // Filtro por canal (se recuerda en este navegador). Lo de "Ambos" aparece en los dos.
    let canal = 'Todo';
    try { canal = localStorage.getItem('filtroCanalContenido') || 'Todo'; } catch (e) { /* sin almacenamiento */ }
    const FILTROS = ['Todo', 'Instagram', 'Canal WA'];
    const pasaFiltro = (p, c) => c === 'Todo' || p.canal === c || p.canal === 'Ambos';
    async function dibujar() {
      const [pubs, pilares] = await Promise.all([DB.listar('publicaciones', { orden: 'fecha' }), DB.listar('pilares_contenido')]);
      const pil = U.porId(pilares);
      const delMes = pubs.filter((p) => U.mes(p.fecha) === mes);
      const porDia = U.agrupar(delMes.filter((p) => pasaFiltro(p, canal)),(p) => p.fecha.slice(0, 10));
      const [a, m] = mes.split('-').map(Number);
      const primero = new Date(a, m - 1, 1);
      const offset = (primero.getDay() + 6) % 7; // lunes = 0
      const diasMes = new Date(a, m, 0).getDate();
      const celdas = [];
      for (let i = 0; i < offset; i++) celdas.push('<div class="cal-dia fuera" aria-hidden="true"></div>');
      for (let d = 1; d <= diasMes; d++) {
        const iso = `${mes}-${String(d).padStart(2, '0')}`;
        const lista = porDia[iso] || [];
        celdas.push(`<div class="cal-dia ${iso === U.hoy() ? 'hoy' : ''}" data-dia="${iso}" role="button" tabindex="0" aria-label="${U.fecha(iso)}: ${lista.length} publicaciones">
          <span class="cal-num">${d}</span>
          ${lista.map((p) => `<button type="button" class="cal-pub ${p.estado === 'Publicada' ? 'publicada' : ''}" data-pub="${p.id}" data-canal="${U.esc(p.canal || 'Instagram')}"
             style="--pilar:${U.esc(pil[p.pilar_id]?.color || '#477ab3')}" title="${U.esc(etiquetaPub(p))} · ${U.esc(p.canal || 'Instagram')} · ${U.esc(p.estado)}">${U.esc(etiquetaPub(p))}</button>`).join('')}
        </div>`);
      }
      cuerpo.innerHTML = `
        <div class="cal-cabecera">
          <button type="button" class="boton boton-secundario boton-chico" data-mes="-1" aria-label="Mes anterior">←</button>
          <h2>${U.nombreMes(mes)}</h2>
          <button type="button" class="boton boton-secundario boton-chico" data-mes="1" aria-label="Mes siguiente">→</button>
        </div>
        <div class="filtro-canal" role="group" aria-label="Ver por canal">
          <span class="filtro-canal-texto">Ver:</span>
          ${FILTROS.map((f) => `<button type="button" class="${canal === f ? 'activo' : ''}" data-filtro-canal="${f}" aria-pressed="${canal === f}">${f}<span>${delMes.filter((p) => pasaFiltro(p, f)).length}</span></button>`).join('')}
        </div>
        <div class="calendario">
          ${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => `<div class="cal-dia-nombre">${d}</div>`).join('')}
          ${celdas.join('')}
        </div>
        <p class="muted chico separado">Tocá un día para agregar una publicación. ${pilares.map((p) => `<span class="chip-color"><i style="background:${U.esc(p.color)}"></i>${U.esc(p.nombre)}</span>`).join('')}</p>`;
      cuerpo.querySelectorAll('[data-filtro-canal]').forEach((b) => b.onclick = () => {
        canal = b.dataset.filtroCanal;
        try { localStorage.setItem('filtroCanalContenido', canal); } catch (e) { /* sin almacenamiento */ }
        dibujar();
      });
      // Nueva publicación en un día: toma el canal que se está viendo
      const nueva = (fecha) => abrirPublicacion(null, { fecha, canal: canal === 'Todo' ? 'Instagram' : canal, formato: canal === 'Canal WA' ? 'Mensaje' : 'Historia' }, pilares, dibujar);
      cuerpo.querySelectorAll('[data-mes]').forEach((b) => b.onclick = () => {
        const f = new Date(a, m - 1 + Number(b.dataset.mes), 1); mes = U.isoDeFecha(f).slice(0, 7); dibujar();
      });
      // Día vacío: nueva publicación. Día con publicaciones: lista para elegir (más cómodo en el celular)
      const abrirDia = (el) => {
        const lista = porDia[el.dataset.dia] || [];
        if (!lista.length) return nueva(el.dataset.dia);
        const m = UI.modal({
          titulo: U.fecha(el.dataset.dia), ancho: 'chico',
          contenido: `<ul class="lista-simple">${lista.map((p) => `<li><span class="chip-color"><i style="background:${U.esc(pil[p.pilar_id]?.color || '#477ab3')}"></i></span>
              <div class="crece">${U.esc(etiquetaPub(p))}<small>${U.esc(p.canal)} · ${U.esc(p.estado)}${p.semana ? " · " + U.esc(p.semana) : ""}</small></div>
              <button type="button" class="boton-texto" data-ver="${p.id}">Abrir</button></li>`).join('')}</ul>
            <div class="acciones-form"><button type="button" class="boton" data-otra>+ Otra publicación este día</button></div>`
        });
        m.cuerpo.addEventListener('click', (e) => {
          const v = e.target.closest('[data-ver]');
          if (v) { m.cerrar(); abrirPublicacion(lista.find((p) => p.id === Number(v.dataset.ver)), null, pilares, dibujar); }
          if (e.target.closest('[data-otra]')) { m.cerrar(); nueva(el.dataset.dia); }
        });
      };
      cuerpo.querySelector('.calendario').addEventListener('click', (e) => {
        const pub = e.target.closest('[data-pub]');
        if (pub) return abrirPublicacion(pubs.find((p) => p.id === Number(pub.dataset.pub)), null, pilares, dibujar);
        const dia = e.target.closest('[data-dia]'); if (dia) abrirDia(dia);
      });
      cuerpo.querySelector('.calendario').addEventListener('keydown', (e) => {
        const dia = e.target.closest('[data-dia]'); if (dia && e.target === dia && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); abrirDia(dia); }
      });
    }
    return dibujar();
  }

  // ---------- Lista de publicaciones ----------
  function pestanaPublicaciones(cuerpo) {
    Seccion.crud({
      contenedor: cuerpo, tabla: 'publicaciones', nombre: 'publicación', textoNuevo: 'Nueva publicación',
      async cargar() {
        const [filas, pilares] = await Promise.all([DB.listar('publicaciones', { orden: 'fecha', asc: false }), DB.listar('pilares_contenido')]);
        return { filas, extra: { pilares, pil: U.porId(pilares) } };
      },
      buscar: (p) => [p.titulo, p.texto, p.canal, p.tipo, p.formato].join(' '),
      filtros: [
        { id: 'estado', etiqueta: 'Estado', opciones: N.ESTADOS_PUBLICACION, valor: (p) => p.estado },
        { id: 'pilar', etiqueta: 'Pilar', opciones: (f, x) => x.pilares.map((p) => ({ valor: p.id, texto: p.nombre })), valor: (p) => p.pilar_id },
        { id: 'canal', etiqueta: 'Canal', opciones: N.CANALES_CONTENIDO, valor: (p) => p.canal },
        { id: 'objetivo', etiqueta: 'Objetivo', opciones: N.OBJETIVOS_CONTENIDO, valor: (p) => p.objetivo },
        { id: 'formato', etiqueta: 'Formato', opciones: N.FORMATOS, valor: (p) => p.formato }
      ],
      columnas: [
        { titulo: 'Publicación', valor: (p) => `<b style="font-weight:500">${U.esc(etiquetaPub(p))}</b><br><small class="muted">${U.esc(p.canal)}${p.tipo ? ' · ' + U.esc(p.tipo) : ''}${p.objetivo ? ' · ' + U.esc(p.objetivo) : ''}${p.semana ? ' · ' + U.esc(p.semana) : ''}</small>` },
        { titulo: 'Fecha', valor: (p) => U.fecha(p.fecha) },
        { titulo: 'Pilar', valor: (p, x) => x.pil[p.pilar_id] ? `<span class="chip-color"><i style="background:${U.esc(x.pil[p.pilar_id].color)}"></i>${U.esc(x.pil[p.pilar_id].nombre)}</span>` : '—' },
        { titulo: 'Estado', valor: (p) => UI.etiqueta(p.estado, N.tonoPublicacion(p.estado)) },
        { titulo: 'Alcance', clase: 'num', valor: (p) => U.numero(p.alcance) },
        { titulo: 'Interacciones', clase: 'num', valor: (p) => (p.me_gusta || p.comentarios || p.guardados) ? U.numero((p.me_gusta || 0) + (p.comentarios || 0) + (p.guardados || 0)) : '—' }
      ],
      editar: (fila, x, recargar) => abrirPublicacion(fila, null, x.pilares, recargar)
    });
  }

  // ---------- Banco de ideas ----------
  function pestanaIdeas(cuerpo) {
    Seccion.crud({
      contenedor: cuerpo, tabla: 'ideas_contenido', nombre: 'idea', textoNuevo: 'Nueva idea', orden: 'creado', asc: false,
      async cargar() {
        const [filas, pilares] = await Promise.all([DB.listar('ideas_contenido', { orden: 'creado', asc: false }), DB.listar('pilares_contenido')]);
        return { filas, extra: { pilares, pil: U.porId(pilares) } };
      },
      buscar: (i) => [i.titulo, i.descripcion, i.formato].join(' '),
      filtros: [
        { id: 'usada', etiqueta: 'Estado', opciones: [{ valor: 'false', texto: 'Sin usar' }, { valor: 'true', texto: 'Ya usadas' }], valor: (i) => String(i.usada) },
        { id: 'prio', etiqueta: 'Prioridad', opciones: N.PRIORIDADES, valor: (i) => i.prioridad }
      ],
      columnas: [
        { titulo: 'Idea', valor: (i) => `<b style="font-weight:500">${U.esc(i.titulo)}</b>${i.descripcion ? `<br><small class="muted">${U.esc(i.descripcion)}</small>` : ''}` },
        { titulo: 'Pilar', valor: (i, x) => U.esc(x.pil[i.pilar_id]?.nombre || '—') },
        { titulo: 'Formato', valor: (i) => U.esc(i.formato || '—') + (i.objetivo ? `<br><small class="muted">${U.esc(i.objetivo)}</small>` : '') },
        { titulo: 'Prioridad', valor: (i) => UI.etiqueta(i.prioridad, N.tonoPrioridad(i.prioridad)) },
        { titulo: 'Estado', valor: (i) => i.usada ? UI.etiqueta('Usada', 'ok') : UI.etiqueta('Sin usar', 'neutro') }
      ],
      campos: (fila, x) => [
        { campo: 'titulo', etiqueta: 'Idea', requerido: true, ancho: 'completo' },
        { campo: 'pilar_id', etiqueta: 'Pilar', tipo: 'select', numerico: true, opciones: x.pilares.map((p) => ({ valor: p.id, texto: p.nombre })) },
        { campo: 'formato', etiqueta: 'Formato', tipo: 'select', opciones: N.FORMATOS },
        { campo: 'objetivo', etiqueta: 'Objetivo', tipo: 'select', opciones: N.OBJETIVOS_CONTENIDO },
        { campo: 'prioridad', etiqueta: 'Prioridad', tipo: 'select', opciones: N.PRIORIDADES, vacio: false, defecto: 'Media' },
        { campo: 'usada', etiqueta: '¿Ya se usó?', tipo: 'si_no', textoSi: 'Sí, ya la usé' },
        { campo: 'descripcion', etiqueta: 'Detalle', tipo: 'area' }
      ],
      accionesExtra: (i) => i.usada ? '' : `<button type="button" class="boton-texto" data-accion="usar" title="Pasar al calendario">→ Calendario</button>`,
      alAccion: {
        usar: (i, x, recargar) => abrirPublicacion(null, { titulo: i.titulo, texto: i.descripcion, pilar_id: i.pilar_id, objetivo: i.objetivo, formato: i.formato || 'Post', estado: 'En preparación' }, x.pilares,
          async () => { await DB.actualizar('ideas_contenido', i.id, { usada: true }); recargar(); })
      }
    });
  }

  // ---------- Pilares ----------
  function pestanaPilares(cuerpo) {
    Seccion.crud({
      contenedor: cuerpo, tabla: 'pilares_contenido', nombre: 'pilar',
      async cargar() {
        const [filas, pubs] = await Promise.all([DB.listar('pilares_contenido'), DB.listar('publicaciones')]);
        const hoy = U.hoy();
        const proximas = pubs.filter((p) => p.fecha.slice(0, 10) >= hoy);
        const cuenta = (lista) => U.agrupar(lista, (p) => p.pilar_id);
        return { filas, extra: { todas: cuenta(pubs), proximas: cuenta(proximas), totalProx: proximas.length } };
      },
      columnas: [
        { titulo: 'Pilar', valor: (p) => `<span class="chip-color"><i style="background:${U.esc(p.color)}"></i><b style="font-weight:500">${U.esc(p.nombre)}</b></span>` },
        { titulo: 'De qué se trata', valor: (p) => U.esc(p.descripcion || '—') },
        { titulo: 'Publicaciones', clase: 'num', valor: (p, x) => U.numero((x.todas[p.id] || []).length) },
        { titulo: 'Próximas', clase: 'num', valor: (p, x) => {
          const n = (x.proximas[p.id] || []).length;
          return x.totalProx ? `${n} <small class="muted">(${Math.round(n * 100 / x.totalProx)}%)</small>` : '—';
        } }
      ],
      buscar: (p) => p.nombre + ' ' + (p.descripcion || ''),
      campos: [
        { campo: 'nombre', etiqueta: 'Nombre', requerido: true },
        { campo: 'color', etiqueta: 'Color en el calendario', tipo: 'color' },
        { campo: 'descripcion', etiqueta: 'De qué se trata', tipo: 'area' }
      ],
      mensajeBorrar: () => 'Las publicaciones e ideas de este pilar quedan sin pilar.'
    });
  }

  // ---------- Métricas de Instagram ----------
  function pestanaMetricas(cuerpo) {
    Seccion.crud({
      contenedor: cuerpo, tabla: 'metricas_instagram', nombre: 'registro', textoNuevo: 'Cargar métricas del mes', orden: 'fecha', asc: false,
      resumen: (filas) => {
        if (!filas.length) return '';
        const orden = [...filas].sort((a, b) => a.fecha.localeCompare(b.fecha));
        const ult = orden[orden.length - 1]; const ant = orden[orden.length - 2];
        return `<div class="grilla grilla-2">
          <div class="grilla grilla-2">
            ${UI.numeroDestacado('Seguidores', U.numero(ult.seguidores), ant ? `${ult.seguidores - ant.seguidores >= 0 ? '+' : ''}${U.numero(ult.seguidores - ant.seguidores)} vs. mes anterior` : '')}
            ${UI.numeroDestacado('Alcance', U.numero(ult.alcance), U.nombreMes(U.mes(ult.fecha)))}
            ${UI.numeroDestacado('Interacciones', U.numero(ult.interacciones))}
            ${UI.numeroDestacado('Clics al link', U.numero(ult.clics_link))}
          </div>
          <section class="tarjeta"><h3>Evolución de seguidores</h3>
            ${UI.grafico.columnas(orden.slice(-12).map((x) => ({ etiqueta: U.nombreMes(U.mes(x.fecha), true), valor: x.seguidores })), { formato: U.numero })}
          </section></div>`;
      },
      buscar: (x) => U.nombreMes(U.mes(x.fecha)) + ' ' + (x.notas || ''),
      columnas: [
        { titulo: 'Mes', valor: (x) => U.nombreMes(U.mes(x.fecha)) },
        { titulo: 'Seguidores', clase: 'num', valor: (x) => U.numero(x.seguidores) },
        { titulo: 'Alcance', clase: 'num', valor: (x) => U.numero(x.alcance) },
        { titulo: 'Interacciones', clase: 'num', valor: (x) => U.numero(x.interacciones) },
        { titulo: 'Visitas al perfil', clase: 'num', valor: (x) => U.numero(x.visitas_perfil) },
        { titulo: 'Clics al link', clase: 'num', valor: (x) => U.numero(x.clics_link) }
      ],
      campos: [
        { campo: 'fecha', etiqueta: 'Mes (cualquier día del mes)', tipo: 'fecha', requerido: true, defecto: () => U.hoy().slice(0, 8) + '01' },
        { campo: 'seguidores', etiqueta: 'Seguidores', tipo: 'numero', min: 0, paso: 1, requerido: true },
        { campo: 'alcance', etiqueta: 'Alcance', tipo: 'numero', min: 0, paso: 1 },
        { campo: 'interacciones', etiqueta: 'Interacciones', tipo: 'numero', min: 0, paso: 1 },
        { campo: 'visitas_perfil', etiqueta: 'Visitas al perfil', tipo: 'numero', min: 0, paso: 1 },
        { campo: 'clics_link', etiqueta: 'Clics al link', tipo: 'numero', min: 0, paso: 1 },
        { campo: 'notas', etiqueta: 'Notas', tipo: 'area' }
      ],
      preparar: (d) => ({ ...d, fecha: d.fecha.slice(0, 8) + '01' })
    });
  }

  // ---------- Estrategia (el "plan" de marketing) ----------
  async function pestanaEstrategia(cuerpo) {
    const [est, pilares, objetivos, campanas, metricas] = await Promise.all([
      DB.obtener('estrategia_mkt', 1), DB.listar('pilares_contenido'), DB.listar('objetivos_mkt'),
      DB.listar('campanas'), DB.listar('metricas_instagram', { orden: 'fecha', asc: false })
    ]);
    const campos = [
      { campo: 'objetivo_general', etiqueta: 'Objetivo principal', tipo: 'area', filas: 2, placeholder: 'Ej: que más mujeres conozcan Sinan y vuelvan a comprar' },
      { campo: 'publico_objetivo', etiqueta: 'Público objetivo (a quién le hablamos)', tipo: 'area', filas: 3, placeholder: 'Edad, zona, qué hace, qué le importa, qué problema le resolvemos…' },
      { campo: 'propuesta_valor', etiqueta: 'Propuesta de valor', tipo: 'area', filas: 2, placeholder: 'Por qué elegir Sinan y no otra marca' },
      { campo: 'diferenciales', etiqueta: 'Diferenciales', tipo: 'area', filas: 2 },
      { campo: 'tono', etiqueta: 'Tono de comunicación', tipo: 'area', filas: 2, placeholder: 'Cercano, cálido, motivador…' },
      { campo: 'canales', etiqueta: 'Canales y frecuencia', tipo: 'area', filas: 2, placeholder: 'Ej: Instagram 3 posts + historias diarias, WhatsApp, ferias…' },
      { campo: 'competencia', etiqueta: 'Competencia y referentes', tipo: 'area', filas: 2 },
      { campo: 'notas', etiqueta: 'Notas', tipo: 'area', filas: 2 }
    ];
    const ult = metricas[0];
    cuerpo.innerHTML = `
      <div class="grilla grilla-4">
        ${UI.numeroDestacado('Seguidores', ult ? U.numero(ult.seguidores) : '—', ult ? U.nombreMes(U.mes(ult.fecha)) : 'cargalos en Métricas')}
        ${UI.numeroDestacado('Campañas activas', campanas.filter((c) => c.estado === 'Activa').length, `${campanas.filter((c) => c.estado === 'Planificada').length} planificadas`)}
        ${UI.numeroDestacado('Objetivos logrados', `${objetivos.filter((o) => o.estado === 'Logrado').length} / ${objetivos.length}`)}
        ${UI.numeroDestacado('Pilares de contenido', pilares.length, pilares.map((p) => U.esc(p.nombre)).join(' · ') || 'definilos en Pilares')}
      </div>
      <form class="formulario tarjeta separado form-estrategia">
        <div class="tarjeta-cabecera"><h2>Estrategia de marketing</h2><span class="muted chico">${est && est.actualizado ? 'Actualizada ' + U.fecha(est.actualizado.slice(0, 10)) : ''}</span></div>
        <div class="grilla-form">${campos.map((c) => UI.campoHTML(c, est || {})).join('')}</div>
        <p class="form-error" hidden></p>
        <div class="acciones-form" style="justify-content:flex-start"><button type="submit" class="boton">Guardar estrategia</button></div>
      </form>`;
    const form = cuerpo.querySelector('form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const b = form.querySelector('[type=submit]'); b.disabled = true; b.classList.add('cargando');
      try {
        const datos = {};
        campos.forEach((c) => { datos[c.campo] = form.elements[c.campo].value.trim() || null; });
        await DB.actualizar('estrategia_mkt', 1, { ...datos, actualizado: new Date().toISOString() });
        UI.aviso('Estrategia guardada');
      } catch (ex) { const er = form.querySelector('.form-error'); er.textContent = ex.message; er.hidden = false; }
      finally { b.disabled = false; b.classList.remove('cargando'); }
    });
  }

  // ---------- Objetivos medibles ----------
  function pestanaObjetivos(cuerpo) {
    Seccion.crud({
      contenedor: cuerpo, tabla: 'objetivos_mkt', nombre: 'objetivo', orden: 'fecha_limite',
      buscar: (o) => [o.objetivo, o.metrica].join(' '),
      filtros: [{ id: 'estado', etiqueta: 'Estado', opciones: N.ESTADOS_OBJETIVO, valor: (o) => o.estado }],
      columnas: [
        { titulo: 'Objetivo', valor: (o) => `<b style="font-weight:500">${U.esc(o.objetivo)}</b>${o.metrica ? `<br><small class="muted">Se mide con: ${U.esc(o.metrica)}</small>` : ''}` },
        { titulo: 'Avance', valor: (o) => {
          if (!o.meta) return U.numero(o.actual);
          const pct = Math.max(0, Math.min(100, (Number(o.actual) || 0) / o.meta * 100));
          return `<div style="min-width:150px">${U.numero(o.actual)} de ${U.numero(o.meta)} <small class="muted">(${U.porcentaje(pct)})</small>
            <div class="barra-progreso"><span style="width:${pct}%"></span></div></div>`;
        } },
        { titulo: 'Fecha límite', valor: (o) => U.fecha(o.fecha_limite) },
        { titulo: 'Estado', valor: (o) => UI.etiqueta(o.estado, { Logrado: 'ok', 'En curso': 'info', Pendiente: 'neutro', 'No logrado': 'alerta' }[o.estado]) }
      ],
      campos: [
        { campo: 'objetivo', etiqueta: 'Objetivo', requerido: true, ancho: 'completo', placeholder: 'Ej: Llegar a 1.500 seguidores' },
        { campo: 'metrica', etiqueta: 'Cómo se mide', placeholder: 'Ej: seguidores de Instagram' },
        { campo: 'fecha_limite', etiqueta: 'Fecha límite', tipo: 'fecha' },
        { campo: 'meta', etiqueta: 'Meta (número)', tipo: 'numero', min: 0 },
        { campo: 'actual', etiqueta: 'Valor actual', tipo: 'numero', min: 0 },
        { campo: 'estado', etiqueta: 'Estado', tipo: 'select', opciones: N.ESTADOS_OBJETIVO, vacio: false, defecto: 'En curso' }
      ]
    });
  }

  // ---------- Campañas (promos, sorteos, lanzamientos…) ----------
  function pestanaCampanas(cuerpo) {
    Seccion.crud({
      contenedor: cuerpo, tabla: 'campanas', nombre: 'campaña', textoNuevo: 'Nueva campaña', orden: 'fecha_inicio', asc: false,
      async cargar() {
        const [filas, movs, pedidos] = await Promise.all([
          DB.listar('campanas', { orden: 'fecha_inicio', asc: false }), DB.listar('movimientos_financieros'), DB.listar('pedidos')]);
        const validos = pedidos.filter(N.pedidoValido);
        filas.forEach((c) => {
          c._gasto = U.sumar(movs.filter((m) => m.campana_id === c.id && m.tipo === 'egreso'), (m) => m.monto);
          const enPeriodo = c.fecha_inicio ? validos.filter((p) => p.fecha >= c.fecha_inicio && p.fecha <= (c.fecha_fin || c.fecha_inicio)) : [];
          c._ventas = U.sumar(enPeriodo, (p) => p.total);
          c._nVentas = enPeriodo.length;
        });
        return { filas };
      },
      buscar: (c) => [c.nombre, c.tipo, c.canal, c.objetivo, c.resultado].join(' '),
      filtros: [
        { id: 'estado', etiqueta: 'Estado', opciones: N.ESTADOS_CAMPANA, valor: (c) => c.estado },
        { id: 'tipo', etiqueta: 'Tipo', opciones: N.TIPOS_CAMPANA, valor: (c) => c.tipo }
      ],
      columnas: [
        { titulo: 'Campaña', valor: (c) => `<b style="font-weight:500">${U.esc(c.nombre)}</b><br><small class="muted">${[c.tipo, c.canal].filter(Boolean).map(U.esc).join(' · ')}</small>` },
        { titulo: 'Fechas', valor: (c) => c.fecha_inicio ? `${U.fecha(c.fecha_inicio)}${c.fecha_fin && c.fecha_fin !== c.fecha_inicio ? '<br>al ' + U.fecha(c.fecha_fin) : ''}` : '—' },
        { titulo: 'Gasto vs. presupuesto', valor: (c) => c.presupuesto ? `${U.pesos(c._gasto)} <small class="muted">de ${U.pesos(c.presupuesto)}</small>
            <div class="barra-progreso ${c._gasto > c.presupuesto ? 'pasado' : ''}"><span style="width:${Math.min(100, c._gasto / c.presupuesto * 100)}%"></span></div>` : U.pesos(c._gasto) },
        { titulo: 'Ventas en esas fechas', clase: 'num', valor: (c) => c._nVentas ? `${U.pesos(c._ventas)}<br><small class="muted">${c._nVentas} ventas</small>` : '—' },
        { titulo: 'Estado', valor: (c) => UI.etiqueta(c.estado, { Activa: 'ok', Planificada: 'info', Terminada: 'neutro', Cancelada: 'neutro' }[c.estado]) }
      ],
      campos: [
        { campo: 'nombre', etiqueta: 'Nombre', requerido: true, placeholder: 'Ej: Día de la Madre 2026' },
        { campo: 'tipo', etiqueta: 'Tipo', tipo: 'select', opciones: N.TIPOS_CAMPANA },
        { campo: 'fecha_inicio', etiqueta: 'Desde', tipo: 'fecha' },
        { campo: 'fecha_fin', etiqueta: 'Hasta', tipo: 'fecha' },
        { campo: 'canal', etiqueta: 'Canal', sugerencias: N.REDES.concat(['WhatsApp', 'Ferias']) },
        { campo: 'presupuesto', etiqueta: 'Presupuesto', tipo: 'pesos', min: 0, defecto: 0, requerido: true, ayuda: 'El gasto real se carga en Finanzas eligiendo esta campaña.' },
        { campo: 'estado', etiqueta: 'Estado', tipo: 'select', opciones: N.ESTADOS_CAMPANA, vacio: false, defecto: 'Planificada' },
        { campo: 'objetivo', etiqueta: 'Objetivo', tipo: 'area', filas: 2 },
        { campo: 'resultado', etiqueta: 'Cómo salió', tipo: 'area', filas: 2 }
      ],
      mensajeBorrar: () => 'Los gastos asociados quedan en Finanzas pero sin campaña.'
    });
  }

  App.registrar({
    id: 'marketing', titulo: 'Estrategia y contenido', icono: 'contenido', grupo: 'marketing',
    descripcion: 'Estrategia, objetivos, campañas, calendario de contenido y métricas.',
    render(cont) {
      UI.pestanas(cont, [
        { id: 'estrategia', titulo: 'Estrategia', render: pestanaEstrategia },
        { id: 'objetivos', titulo: 'Objetivos', render: pestanaObjetivos },
        { id: 'campanas', titulo: 'Campañas', render: pestanaCampanas },
        { id: 'calendario', titulo: 'Calendario', render: pestanaCalendario },
        { id: 'publicaciones', titulo: 'Publicaciones', render: pestanaPublicaciones },
        { id: 'ideas', titulo: 'Banco de ideas', render: pestanaIdeas },
        { id: 'pilares', titulo: 'Pilares', render: pestanaPilares },
        { id: 'metricas', titulo: 'Métricas de Instagram', render: pestanaMetricas }
      ], 'marketing');
    }
  });
})();
