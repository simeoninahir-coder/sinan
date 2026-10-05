/* =====================================================================
   SECCIÓN · EQUIPO
   Personas, roles y tareas asignadas. Lista para cuando se sumen empleadas.
   ===================================================================== */
(function () {
  function pestanaTareas(cuerpo) {
    Seccion.crud({
      contenedor: cuerpo, tabla: 'tareas', nombre: 'tarea', textoNuevo: 'Nueva tarea',
      async cargar() {
        const [filas, personas] = await Promise.all([DB.listar('tareas', { orden: 'fecha_limite' }), DB.listar('personas', { orden: 'nombre' })]);
        const peso = { 'En curso': 0, Pendiente: 1, Hecha: 2 };
        filas.sort((a, b) => peso[a.estado] - peso[b.estado] || String(a.fecha_limite || '9').localeCompare(String(b.fecha_limite || '9')));
        return { filas, extra: { personas, gente: U.porId(personas) } };
      },
      buscar: (t, x) => [t.titulo, t.descripcion, t.area, x.gente[t.persona_id]?.nombre].join(' '),
      filtros: [
        { id: 'estado', etiqueta: 'Estado', opciones: N.ESTADOS_TAREA, valor: (t) => t.estado },
        { id: 'persona', etiqueta: 'Persona', opciones: (f, x) => x.personas.map((p) => ({ valor: p.id, texto: p.nombre })), valor: (t) => t.persona_id },
        { id: 'prio', etiqueta: 'Prioridad', opciones: N.PRIORIDADES, valor: (t) => t.prioridad }
      ],
      columnas: [
        { titulo: 'Tarea', valor: (t) => `<b style="font-weight:500" class="${t.estado === 'Hecha' ? 'hecha' : ''}">${U.esc(t.titulo)}</b>${t.area ? `<br><small class="muted">${U.esc(t.area)}</small>` : ''}` },
        { titulo: 'Responsable', valor: (t, x) => U.esc(x.gente[t.persona_id]?.nombre || 'Sin asignar') },
        { titulo: 'Vence', valor: (t) => t.fecha_limite ? U.fecha(t.fecha_limite) + (t.estado !== 'Hecha' && U.diasHasta(t.fecha_limite) < 0 ? ' ' + UI.etiqueta('Vencida', 'alerta') : '') : '—' },
        { titulo: 'Prioridad', valor: (t) => UI.etiqueta(t.prioridad, N.tonoPrioridad(t.prioridad)) },
        { titulo: 'Estado', valor: (t) => UI.etiqueta(t.estado, N.tonoTarea(t.estado)) }
      ],
      campos: (fila, x) => [
        { campo: 'titulo', etiqueta: 'Tarea', requerido: true, ancho: 'completo' },
        { campo: 'persona_id', etiqueta: 'Responsable', tipo: 'select', numerico: true, vacio: 'Sin asignar', opciones: x.personas.filter((p) => p.activa || p.id === fila?.persona_id).map((p) => ({ valor: p.id, texto: p.nombre })) },
        { campo: 'area', etiqueta: 'Área', sugerencias: ['Ventas', 'Compras', 'Contenido', 'Eventos', 'Administración', 'Envíos'] },
        { campo: 'fecha_limite', etiqueta: 'Fecha límite', tipo: 'fecha' },
        { campo: 'prioridad', etiqueta: 'Prioridad', tipo: 'select', opciones: N.PRIORIDADES, vacio: false, defecto: 'Media' },
        { campo: 'estado', etiqueta: 'Estado', tipo: 'select', opciones: N.ESTADOS_TAREA, vacio: false, defecto: 'Pendiente' },
        { campo: 'descripcion', etiqueta: 'Detalle', tipo: 'area' }
      ],
      accionesExtra: (t) => t.estado === 'Hecha' ? '' : `<button type="button" class="boton-texto" data-accion="hecha">✓ Hecha</button>`,
      alAccion: { hecha: async (t, x, recargar) => { try { await DB.actualizar('tareas', t.id, { estado: 'Hecha' }); UI.aviso('Tarea hecha 👏'); recargar(); } catch (e) { UI.error(e); } } }
    });
  }

  function pestanaPersonas(cuerpo) {
    Seccion.crud({
      contenedor: cuerpo, tabla: 'personas', nombre: 'persona', textoNuevo: 'Nueva persona', orden: 'nombre',
      async cargar() {
        const [filas, tareas] = await Promise.all([DB.listar('personas', { orden: 'nombre' }), DB.listar('tareas')]);
        const pend = U.agrupar(tareas.filter((t) => t.estado !== 'Hecha'), (t) => t.persona_id);
        filas.forEach((p) => { p._pendientes = (pend[p.id] || []).length; });
        return { filas };
      },
      buscar: (p) => [p.nombre, p.rol, p.email, p.telefono].join(' '),
      filtros: [{ id: 'activa', etiqueta: 'Estado', opciones: [{ valor: 'true', texto: 'Activas' }, { valor: 'false', texto: 'Inactivas' }], valor: (p) => String(p.activa) }],
      columnas: [
        { titulo: 'Nombre', valor: (p) => `<b style="font-weight:500">${U.esc(p.nombre)}</b>` },
        { titulo: 'Rol', valor: (p) => U.esc(p.rol || '—') },
        { titulo: 'Contacto', valor: (p) => [p.telefono, p.email].filter(Boolean).map(U.esc).join('<br>') || '—' },
        { titulo: 'Tareas pendientes', clase: 'num', valor: (p) => p._pendientes },
        { titulo: 'Estado', valor: (p) => p.activa ? UI.etiqueta('Activa', 'ok') : UI.etiqueta('Inactiva', 'neutro') }
      ],
      campos: [
        { campo: 'nombre', etiqueta: 'Nombre', requerido: true },
        { campo: 'rol', etiqueta: 'Rol', placeholder: 'Ej: Atención al cliente' },
        { campo: 'telefono', etiqueta: 'Teléfono', tipo: 'tel' },
        { campo: 'email', etiqueta: 'Email', tipo: 'email' },
        { campo: 'activa', etiqueta: 'Estado', tipo: 'si_no', textoSi: 'Trabaja actualmente con Sinan', defecto: true }
      ],
      mensajeBorrar: () => 'Sus tareas quedan "Sin asignar". Si solo dejó de trabajar, mejor marcala como inactiva.'
    });
  }

  App.registrar({
    id: 'equipo', titulo: 'Equipo', icono: 'equipo',
    descripcion: 'Quién hace qué: personas, roles y tareas.',
    render(cont) {
      UI.pestanas(cont, [
        { id: 'tareas', titulo: 'Tareas', render: pestanaTareas },
        { id: 'personas', titulo: 'Personas', render: pestanaPersonas }
      ], 'equipo');
    }
  });
})();
