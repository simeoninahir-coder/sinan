/* =====================================================================
   SECCIÓN · MARKETING
   Estrategia, objetivos, campañas, calendario de publicaciones,
   banco de ideas, pilares de contenido y métricas de Instagram.
   ===================================================================== */
(function () {
  const camposPublicacion = (pilares) => [
    { campo: 'titulo', etiqueta: 'Título / idea', requerido: true, ancho: 'completo' },
    { campo: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: U.hoy },
    { campo: 'estado', etiqueta: 'Estado', tipo: 'select', opciones: N.ESTADOS_PUBLICACION, vacio: false, defecto: 'Idea' },
    { campo: 'red', etiqueta: 'Red', tipo: 'select', opciones: N.REDES, vacio: false, defecto: 'Instagram' },
    { campo: 'formato', etiqueta: 'Formato', tipo: 'select', opciones: N.FORMATOS, vacio: false, defecto: 'Post' },
    { campo: 'pilar_id', etiqueta: 'Pilar', tipo: 'select', numerico: true, opciones: pilares.map((p) => ({ valor: p.id, texto: p.nombre })) },
    { campo: 'link', etiqueta: 'Link (cuando se publica)', tipo: 'url' },
    { campo: 'texto', etiqueta: 'Texto / copy', tipo: 'area' },
    { campo: 'alcance', etiqueta: 'Alcance', tipo: 'numero', min: 0, paso: 1 },
    { campo: 'me_gusta', etiqueta: 'Me gusta', tipo: 'numero', min: 0, paso: 1 },
    { campo: 'comentarios', etiqueta: 'Comentarios', tipo: 'numero', min: 0, paso: 1 },
    { campo: 'guardados', etiqueta: 'Guardados', tipo: 'numero', min: 0, paso: 1 }
  ];

  function abrirPublicacion(fila, valores, pilares, alGuardar) {
    UI.formularioModal({
      titulo: fila ? 'Editar publicación' : 'Nueva publicación',
      campos: camposPublicacion(pilares), valores: fila || valores || {},
      alGuardar: async (d) => {
        if (fila) await DB.actualizar('publicaciones', fila.id, d); else await DB.crear('publicaciones', d);
        UI.aviso('Publicación guardada');
        alGuardar && alGuardar();
      }
    });
  }

  // ---------- Calendario mensual ----------
  function pestanaCalendario(cuerpo) {
    let mes = U.mes(U.hoy());
    async function dibujar() {
      const [pubs, pilares] = await Promise.all([DB.listar('publicaciones', { orden: 'fecha' }), DB.listar('pilares_contenido')]);
      const pil = U.porId(pilares);
      const porDia = U.agrupar(pubs.filter((p) => U.mes(p.fecha) === mes), (p) => p.fecha.slice(0, 10));
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
          ${lista.map((p) => `<button type="button" class="cal-pub ${p.estado === 'Publicada' ? 'publicada' : ''}" data-pub="${p.id}"
             style="--pilar:${U.esc(pil[p.pilar_id]?.color || '#477ab3')}" title="${U.esc(p.titulo)} · ${U.esc(p.formato)} · ${U.esc(p.estado)}">${U.esc(p.titulo)}</button>`).join('')}
        </div>`);
      }
      cuerpo.innerHTML = `
        <div class="cal-cabecera">
          <button type="button" class="boton boton-secundario boton-chico" data-mes="-1" aria-label="Mes anterior">←</button>
          <h2>${U.nombreMes(mes)}</h2>
          <button type="button" class="boton boton-secundario boton-chico" data-mes="1" aria-label="Mes siguiente">→</button>
        </div>
        <div class="calendario">
          ${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => `<div class="cal-dia-nombre">${d}</div>`).join('')}
          ${celdas.join('')}
        </div>
        <p class="muted chico separado">Tocá un día para agregar una publicación. ${pilares.map((p) => `<span class="chip-color"><i style="background:${U.esc(p.color)}"></i>${U.esc(p.nombre)}</span>`).join('')}</p>`;
      cuerpo.querySelectorAll('[data-mes]').forEach((b) => b.onclick = () => {
        const f = new Date(a, m - 1 + Number(b.dataset.mes), 1); mes = U.isoDeFecha(f).slice(0, 7); dibujar();
      });
      // Día vacío: nueva publicación. Día con publicaciones: lista para elegir (más cómodo en el celular)
      const abrirDia = (el) => {
        const lista = porDia[el.dataset.dia] || [];
        if (!lista.length) return abrirPublicacion(null, { fecha: el.dataset.dia }, pilares, dibujar);
        const m = UI.modal({
          titulo: U.fecha(el.dataset.dia), ancho: 'chico',
          contenido: `<ul class="lista-simple">${lista.map((p) => `<li><span class="chip-color"><i style="background:${U.esc(pil[p.pilar_id]?.color || '#477ab3')}"></i></span>
              <div class="crece">${U.esc(p.titulo)}<small>${U.esc(p.red)} · ${U.esc(p.formato)} · ${U.esc(p.estado)}</small></div>
              <button type="button" class="boton-texto" data-ver="${p.id}">Editar</button></li>`).join('')}</ul>
            <div class="acciones-form"><button type="button" class="boton" data-otra>+ Otra publicación este día</button></div>`
        });
        m.cuerpo.addEventListener('click', (e) => {
          const v = e.target.closest('[data-ver]');
          if (v) { m.cerrar(); abrirPublicacion(lista.find((p) => p.id === Number(v.dataset.ver)), null, pilares, dibujar); }
          if (e.target.closest('[data-otra]')) { m.cerrar(); abrirPublicacion(null, { fecha: el.dataset.dia }, pilares, dibujar); }
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
      buscar: (p) => [p.titulo, p.texto, p.red, p.formato].join(' '),
      filtros: [
        { id: 'estado', etiqueta: 'Estado', opciones: N.ESTADOS_PUBLICACION, valor: (p) => p.estado },
        { id: 'pilar', etiqueta: 'Pilar', opciones: (f, x) => x.pilares.map((p) => ({ valor: p.id, texto: p.nombre })), valor: (p) => p.pilar_id },
        { id: 'red', etiqueta: 'Red', opciones: N.REDES, valor: (p) => p.red }
      ],
      columnas: [
        { titulo: 'Publicación', valor: (p) => `<b style="font-weight:500">${U.esc(p.titulo)}</b><br><small class="muted">${U.esc(p.red)} · ${U.esc(p.formato)}</small>` },
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
        { titulo: 'Formato', valor: (i) => U.esc(i.formato || '—') },
        { titulo: 'Prioridad', valor: (i) => UI.etiqueta(i.prioridad, N.tonoPrioridad(i.prioridad)) },
        { titulo: 'Estado', valor: (i) => i.usada ? UI.etiqueta('Usada', 'ok') : UI.etiqueta('Sin usar', 'neutro') }
      ],
      campos: (fila, x) => [
        { campo: 'titulo', etiqueta: 'Idea', requerido: true, ancho: 'completo' },
        { campo: 'pilar_id', etiqueta: 'Pilar', tipo: 'select', numerico: true, opciones: x.pilares.map((p) => ({ valor: p.id, texto: p.nombre })) },
        { campo: 'formato', etiqueta: 'Formato', tipo: 'select', opciones: N.FORMATOS },
        { campo: 'prioridad', etiqueta: 'Prioridad', tipo: 'select', opciones: N.PRIORIDADES, vacio: false, defecto: 'Media' },
        { campo: 'usada', etiqueta: '¿Ya se usó?', tipo: 'si_no', textoSi: 'Sí, ya la usé' },
        { campo: 'descripcion', etiqueta: 'Detalle', tipo: 'area' }
      ],
      accionesExtra: (i) => i.usada ? '' : `<button type="button" class="boton-texto" data-accion="usar" title="Pasar al calendario">→ Calendario</button>`,
      alAccion: {
        usar: (i, x, recargar) => abrirPublicacion(null, { titulo: i.titulo, texto: i.descripcion, pilar_id: i.pilar_id, formato: i.formato || 'Post', estado: 'En preparación' }, x.pilares,
          async () => { await DB.actualizar('ideas_contenido', i.id, { usada: true }); recargar(); })
      }
    });
  }

  // ---------- Pilares ----------
  function pestanaPilares(cuerpo) {
    Seccion.crud({
      contenedor: cuerpo, tabla: 'pilares_contenido', nombre: 'pilar',
      columnas: [
        { titulo: 'Pilar', valor: (p) => `<span class="chip-color"><i style="background:${U.esc(p.color)}"></i><b style="font-weight:500">${U.esc(p.nombre)}</b></span>` },
        { titulo: 'De qué se trata', valor: (p) => U.esc(p.descripcion || '—') }
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
