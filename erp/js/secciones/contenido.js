/* =====================================================================
   SECCIÓN · CONTENIDO / MARKETING
   Calendario de publicaciones, banco de ideas, pilares de contenido
   y métricas mensuales de Instagram.
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

  App.registrar({
    id: 'contenido', titulo: 'Contenido', icono: 'contenido',
    descripcion: 'Calendario de publicaciones, ideas, pilares y métricas de Instagram.',
    render(cont) {
      UI.pestanas(cont, [
        { id: 'calendario', titulo: 'Calendario', render: pestanaCalendario },
        { id: 'publicaciones', titulo: 'Publicaciones', render: pestanaPublicaciones },
        { id: 'ideas', titulo: 'Banco de ideas', render: pestanaIdeas },
        { id: 'pilares', titulo: 'Pilares', render: pestanaPilares },
        { id: 'metricas', titulo: 'Métricas de Instagram', render: pestanaMetricas }
      ], 'contenido');
    }
  });
})();
