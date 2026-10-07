/* =====================================================================
   SECCIÓN CRUD · listado con buscador, filtros, crear, editar y eliminar
   Casi todas las secciones se arman con esta pieza: solo se le dice
   qué tabla usar, qué columnas mostrar y qué campos tiene el formulario.
   ===================================================================== */
(function () {
  /*
   Opciones:
     contenedor   elemento donde se dibuja
     tabla        nombre de la tabla en la base
     nombre       cómo se llama un registro ('producto', 'cliente'…)
     orden, asc   orden inicial
     cargar()     (opcional) trae filas + datos extra: { filas, extra }
     columnas     [{ titulo, valor(fila, extra), clase }]
     campos       [...] o (fila, extra) => [...]  (ver UI.campoHTML)
     buscar(fila) texto donde busca el buscador
     filtros      [{ id, etiqueta, opciones(filas, extra), valor(fila) }]
     preparar(datos, fila, extra)  ajusta los datos antes de guardar
     despues(guardada, esNueva, extra)  algo extra después de guardar
     editar(fila, extra, recargar)  reemplaza la ventana de edición estándar
     accionesExtra(fila, extra)  botones extra en cada fila
     alAccion     { nombreAccion: (fila, extra, recargar) => … }
     noBorrar(fila, extra)  devuelve un texto si NO se puede borrar
     resumen(filas, extra)  HTML arriba de la tabla (totales, etc.)
     sinNuevo     oculta el botón de nuevo
  */
  function crud(o) {
    // Filtros con valor inicial (defecto), por ejemplo ventas: solo las actuales
    const estado = { filas: [], extra: {}, texto: '', filtros: Object.fromEntries((o.filtros || []).filter((f) => f.defecto).map((f) => [f.id, f.defecto])) };
    const nombre = o.nombre || 'registro';
    const raiz = o.contenedor;

    raiz.innerHTML = `
      <div class="barra-herramientas">
        <div class="buscador"><input type="search" placeholder="Buscar…" aria-label="Buscar ${U.esc(nombre)}"></div>
        <div class="filtros">${(o.filtros || []).map((f) => `
          <select data-filtro="${f.id}" aria-label="${U.esc(f.etiqueta)}"><option value="">${U.esc(f.etiqueta)}: todos</option></select>`).join('')}
        </div>
        ${o.sinNuevo ? '' : `<button type="button" class="boton" data-nuevo>+ ${U.esc(o.textoNuevo || 'Nuevo ' + nombre)}</button>`}
      </div>
      <div class="crud-resumen"></div>
      <p class="contador"></p>
      <div class="crud-lista"><div class="cargando-bloque">Cargando…</div></div>`;

    const lista = raiz.querySelector('.crud-lista');

    async function recargar() {
      try {
        if (o.cargar) { const r = await o.cargar(); estado.filas = r.filas; estado.extra = r.extra || {}; }
        else estado.filas = await DB.listar(o.tabla, { orden: o.orden || 'id', asc: o.asc !== false });
        llenarFiltros();
        dibujar();
      } catch (e) {
        lista.innerHTML = `<div class="vacio">No se pudo cargar: ${U.esc(e.message)}</div>`;
        UI.error(e);
      }
    }

    function llenarFiltros() {
      (o.filtros || []).forEach((f) => {
        const sel = raiz.querySelector(`[data-filtro="${f.id}"]`);
        const actual = sel.value || estado.filtros[f.id] || '';
        let ops = typeof f.opciones === 'function' ? f.opciones(estado.filas, estado.extra) : f.opciones;
        ops = ops.map((x) => (typeof x === 'object' ? x : { valor: x, texto: x }));
        sel.innerHTML = `<option value="">${U.esc(f.etiqueta)}: todos</option>` +
          ops.map((x) => `<option value="${U.esc(x.valor)}">${U.esc(x.texto)}</option>`).join('');
        if (ops.some((x) => String(x.valor) === actual)) sel.value = actual;
      });
    }

    function filtradas() {
      const t = U.normalizar(estado.texto);
      return estado.filas.filter((f) => {
        if (t && !U.normalizar(o.buscar ? o.buscar(f, estado.extra) : JSON.stringify(f)).includes(t)) return false;
        for (const fl of o.filtros || []) {
          const v = estado.filtros[fl.id];
          if (!v) continue;
          const val = String(fl.valor(f, estado.extra));
          // contiene: el valor es una lista separada por "|" (ej: etiquetas)
          if (fl.contiene ? !val.split('|').includes(v) : val !== v) return false;
        }
        return true;
      });
    }

    function dibujar() {
      const filas = filtradas();
      raiz.querySelector('.crud-resumen').innerHTML = o.resumen ? o.resumen(filas, estado.extra) : '';
      raiz.querySelector('.contador').textContent =
        filas.length === estado.filas.length ? `${filas.length} en total` : `${filas.length} de ${estado.filas.length}`;
      lista.innerHTML = UI.tabla({
        columnas: o.columnas.map((c) => ({ ...c, valor: (f) => c.valor(f, estado.extra) })),
        filas,
        vacio: estado.filas.length ? 'No hay resultados con esa búsqueda.' : `Todavía no hay ningún ${nombre} cargado.`,
        acciones: (f) => UI.botonesFila(o.accionesExtra ? o.accionesExtra(f, estado.extra) : '')
      });
    }

    function abrirFormulario(fila) {
      // interceptar: permite que algunas filas se editen en otra sección (devuelve true)
      if (fila && o.interceptar && o.interceptar(fila, estado.extra)) return;
      if (o.editar) return o.editar(fila, estado.extra, recargar);
      const campos = typeof o.campos === 'function' ? o.campos(fila, estado.extra) : o.campos;
      UI.formularioModal({
        titulo: fila ? `Editar ${nombre}` : `Nuevo ${nombre}`,
        campos, valores: fila || {},
        alArmar: o.alArmar ? (form) => o.alArmar(form, fila, estado.extra) : null,
        alGuardar: async (datos) => {
          if (o.preparar) datos = (await o.preparar(datos, fila, estado.extra)) || datos;
          const guardada = fila ? await DB.actualizar(o.tabla, fila.id, datos) : await DB.crear(o.tabla, datos);
          if (o.despues) await o.despues(guardada, !fila, estado.extra);
          UI.aviso(fila ? 'Cambios guardados' : `${nombre.charAt(0).toUpperCase() + nombre.slice(1)} creado`);
          recargar();
        }
      });
    }

    async function borrar(fila) {
      const motivo = o.noBorrar && o.noBorrar(fila, estado.extra);
      if (motivo) return UI.aviso(motivo, 'atencion');
      const extraMsg = o.mensajeBorrar ? ' ' + o.mensajeBorrar(fila, estado.extra) : '';
      const ok = await UI.confirmar(`Vas a eliminar este ${nombre}.${extraMsg} No se puede deshacer.`);
      if (!ok) return;
      try { await DB.borrar(o.tabla, fila.id); UI.aviso('Eliminado'); recargar(); } catch (e) { UI.error(e); }
    }

    // Eventos
    raiz.querySelector('[type=search]').addEventListener('input', (e) => { estado.texto = e.target.value; dibujar(); });
    raiz.querySelectorAll('[data-filtro]').forEach((s) => s.addEventListener('change', () => { estado.filtros[s.dataset.filtro] = s.value; dibujar(); }));
    const btnNuevo = raiz.querySelector('[data-nuevo]');
    if (btnNuevo) btnNuevo.onclick = () => abrirFormulario(null);
    lista.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-accion]'); if (!btn) return;
      const fila = estado.filas.find((f) => String(f.id) === btn.closest('tr').dataset.id);
      const a = btn.dataset.accion;
      if (a === 'editar') abrirFormulario(fila);
      else if (a === 'borrar') borrar(fila);
      else if (o.alAccion && o.alAccion[a]) o.alAccion[a](fila, estado.extra, recargar);
    });

    recargar();
    return { recargar, nuevo: () => abrirFormulario(null), editar: abrirFormulario, estado };
  }

  window.Seccion = { crud };
})();
