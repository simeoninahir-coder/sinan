/* =====================================================================
   SECCIÓN · EVENTOS
   Fecha, lugar, entradas, cupos, checklist, colaboradores y la plata:
   presupuesto vs. gasto real (gastos de Finanzas asociados al evento)
   e ingresos (entradas + ventas hechas en el evento).
   ===================================================================== */
(function () {
  async function cargar() {
    const [eventos, tareas, colabs, fin, pedidos] = await Promise.all([
      DB.listar('eventos', { orden: 'fecha', asc: false }), DB.listar('evento_tareas'), DB.listar('evento_colaboradores'),
      DB.listar('movimientos_financieros'), DB.listar('pedidos')
    ]);
    const t = U.agrupar(tareas, (x) => x.evento_id);
    const c = U.agrupar(colabs, (x) => x.evento_id);
    const f = U.agrupar(fin.filter((x) => x.evento_id), (x) => x.evento_id);
    const v = U.agrupar(pedidos.filter((x) => x.evento_id && N.pedidoValido(x)), (x) => x.evento_id);
    eventos.forEach((e) => {
      e._tareas = t[e.id] || [];
      e._colabs = c[e.id] || [];
      e._movs = f[e.id] || [];
      e._gasto = U.sumar(e._movs.filter((m) => m.tipo === 'egreso'), (m) => m.monto);
      e._otrosIngresos = U.sumar(e._movs.filter((m) => m.tipo === 'ingreso'), (m) => m.monto);
      e._ventas = U.sumar(v[e.id] || [], (p) => p.total);
      e._pedidos = (v[e.id] || []).length;
      e._ingresos = e._otrosIngresos + e._ventas;
      e._resultado = e._ingresos - e._gasto;
    });
    return { filas: eventos };
  }

  function barraPresupuesto(e) {
    if (!e.presupuesto) return U.pesos(e._gasto);
    const pct = (e._gasto / e.presupuesto) * 100;
    return `<div style="min-width:150px">${U.pesos(e._gasto)} <small class="muted">de ${U.pesos(e.presupuesto)}</small>
      <div class="barra-progreso ${pct > 100 ? 'pasado' : ''}"><span style="width:${Math.min(100, pct)}%"></span></div></div>`;
  }

  // Ventana de detalle: checklist, colaboradores y balance
  function verDetalle(id, recargarLista) {
    let m = null;
    async function dibujar() {
      const { filas } = await cargar();
      const e = filas.find((x) => x.id === id);
      if (!e) return;
      const hechas = e._tareas.filter((t) => t.hecha).length;
      const dias = U.diasHasta(e.fecha);
      const html = `
        <p class="muted" style="margin-top:0">${U.fecha(e.fecha)}${e.hora ? ' · ' + U.esc(e.hora) + ' h' : ''}${e.lugar ? ' · ' + U.esc(e.lugar) : ''}
          · ${UI.etiqueta(e.estado, N.tonoEvento(e.estado))} ${dias >= 0 && e.estado !== 'Realizado' ? `<b>${dias === 0 ? 'Es hoy' : 'Faltan ' + dias + ' días'}</b>` : ''}</p>
        ${e.descripcion ? `<p>${U.esc(e.descripcion)}</p>` : ''}
        <div class="grilla grilla-3">
          ${UI.numeroDestacado('Inscriptas', e.cupos ? `${e.inscriptos} / ${e.cupos}` : e.inscriptos, e.precio_entrada ? `Entrada ${U.pesos(e.precio_entrada)} · estimado ${U.pesos(e.precio_entrada * e.inscriptos)}` : 'Entrada libre')}
          ${UI.numeroDestacado('Gasto real', U.pesos(e._gasto), e.presupuesto ? `Presupuesto ${U.pesos(e.presupuesto)}${e._gasto > e.presupuesto ? ' · ⚠ pasado' : ''}` : 'Sin presupuesto', e.presupuesto && e._gasto > e.presupuesto ? 'alerta' : '')}
          ${UI.numeroDestacado('Resultado', U.pesos(e._resultado), 'ingresos − gastos', e._resultado >= 0 ? 'ok' : 'alerta')}
        </div>
        <div class="grilla grilla-2 separado">
          <section class="tarjeta">
            <div class="tarjeta-cabecera"><h3 style="margin:0">Checklist</h3><span class="muted chico">${hechas} de ${e._tareas.length}</span></div>
            <ul class="lista-simple">${e._tareas.map((t) => `<li>
              <input type="checkbox" data-tarea="${t.id}" ${t.hecha ? 'checked' : ''} aria-label="Hecha">
              <div class="crece ${t.hecha ? 'hecha' : ''}">${U.esc(t.tarea)}${t.responsable ? `<small>${U.esc(t.responsable)}</small>` : ''}</div>
              <button type="button" class="boton-icono boton-icono-peligro" data-borrar-tarea="${t.id}" aria-label="Borrar tarea">✕</button></li>`).join('') || '<li class="muted">Sin tareas todavía.</li>'}</ul>
            <form class="form-linea" data-nueva-tarea>
              <input name="tarea" placeholder="Nueva tarea" required aria-label="Nueva tarea">
              <input name="responsable" placeholder="Responsable" style="flex-basis:100px" aria-label="Responsable">
              <button class="boton boton-chico">Agregar</button>
            </form>
          </section>
          <section class="tarjeta">
            <h3>Colaboradores</h3>
            <ul class="lista-simple">${e._colabs.map((c) => `<li>
              <div class="crece"><b style="font-weight:500">${U.esc(c.nombre)}</b>${c.rol ? ' · ' + U.esc(c.rol) : ''}
                <small>${[c.aporte, c.contacto].filter(Boolean).map(U.esc).join(' · ')}</small></div>
              <button type="button" class="boton-icono boton-icono-peligro" data-borrar-colab="${c.id}" aria-label="Borrar colaborador">✕</button></li>`).join('') || '<li class="muted">Sin colaboradores todavía.</li>'}</ul>
            <form class="form-linea" data-nuevo-colab>
              <input name="nombre" placeholder="Nombre" required aria-label="Nombre">
              <input name="rol" placeholder="Rol" aria-label="Rol">
              <input name="aporte" placeholder="Qué aporta" aria-label="Qué aporta">
              <input name="contacto" placeholder="Contacto" aria-label="Contacto">
              <button class="boton boton-chico">Agregar</button>
            </form>
          </section>
        </div>
        <section class="tarjeta separado">
          <h3>Balance</h3>
          <div class="balance">
            <div><span>Ventas en el evento (${e._pedidos} pedidos)</span><span>${U.pesos(e._ventas)}</span></div>
            <div><span>Entradas y otros ingresos (cargados en Finanzas)</span><span>${U.pesos(e._otrosIngresos)}</span></div>
            <div><span>Gastos (cargados en Finanzas)</span><span>−${U.pesos(e._gasto)}</span></div>
            <div class="total"><span>Resultado</span><span>${U.pesos(e._resultado)}</span></div>
          </div>
          ${e._movs.length ? `<details class="ver-tabla"><summary>Ver detalle de gastos e ingresos</summary>
            <table class="tabla tabla-mini"><tbody>${e._movs.map((x) => `<tr><td>${U.fecha(x.fecha)}</td><td>${U.esc(x.descripcion || x.categoria)}</td><td class="num">${x.tipo === 'egreso' ? '−' : ''}${U.pesos(x.monto)}</td></tr>`).join('')}</tbody></table></details>` : ''}
          <p class="nota separado">Para sumar un gasto o un ingreso de este evento, cargalo en <a href="#/finanzas">Finanzas</a> y elegí el evento.</p>
          ${e.resultado ? `<h3 class="separado">Cómo salió</h3><p>${U.esc(e.resultado)}</p>` : ''}
        </section>`;
      if (!m) {
        m = UI.modal({ titulo: e.nombre, contenido: html, ancho: 'grande', alCerrar: recargarLista });
        activar(m.cuerpo);
      } else m.cuerpo.innerHTML = html;
    }

    function activar(raiz) {
      raiz.addEventListener('change', async (ev) => {
        const ch = ev.target.closest('[data-tarea]'); if (!ch) return;
        try { await DB.actualizar('evento_tareas', Number(ch.dataset.tarea), { hecha: ch.checked }); dibujar(); } catch (e) { UI.error(e); }
      });
      raiz.addEventListener('click', async (ev) => {
        const bt = ev.target.closest('[data-borrar-tarea]');
        const bc = ev.target.closest('[data-borrar-colab]');
        if (ev.target.closest('a')) { m.cerrar(); return; }
        if (!bt && !bc) return;
        if (!(await UI.confirmar(bt ? 'Vas a borrar esta tarea del checklist.' : 'Vas a quitar a este colaborador.'))) return;
        try { await DB.borrar(bt ? 'evento_tareas' : 'evento_colaboradores', Number((bt || bc).dataset[bt ? 'borrarTarea' : 'borrarColab'])); dibujar(); } catch (e) { UI.error(e); }
      });
      raiz.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const f = ev.target;
        try {
          if (f.matches('[data-nueva-tarea]')) await DB.crear('evento_tareas', { evento_id: id, tarea: f.tarea.value.trim(), responsable: f.responsable.value.trim() || null });
          else await DB.crear('evento_colaboradores', { evento_id: id, nombre: f.nombre.value.trim(), rol: f.rol.value.trim() || null, aporte: f.aporte.value.trim() || null, contacto: f.contacto.value.trim() || null });
          dibujar();
        } catch (e) { UI.error(e); }
      });
    }
    dibujar().catch(UI.error);
  }

  App.registrar({
    id: 'eventos', titulo: 'Eventos', icono: 'eventos',
    descripcion: 'Encuentros, ferias y talleres: organización, presupuesto y resultado.',
    render(cont, param) {
      let abrir = param;
      const crud = Seccion.crud({
        contenedor: cont, tabla: 'eventos', nombre: 'evento',
        async cargar() {
          const r = await cargar();
          if (abrir) {
            const p = abrir; abrir = null;
            setTimeout(() => { if (p === 'nuevo') crud.nuevo(); else if (p.startsWith('ver-')) verDetalle(Number(p.slice(4)), crud.recargar); });
          }
          return r;
        },
        buscar: (e) => [e.nombre, e.lugar, e.descripcion, e.resultado].join(' '),
        filtros: [
          { id: 'estado', etiqueta: 'Estado', opciones: N.ESTADOS_EVENTO, valor: (e) => e.estado },
          { id: 'cuando', etiqueta: 'Cuándo', opciones: [{ valor: 'proximos', texto: 'Próximos' }, { valor: 'pasados', texto: 'Pasados' }], valor: (e) => U.diasHasta(e.fecha) >= 0 ? 'proximos' : 'pasados' }
        ],
        columnas: [
          { titulo: 'Evento', valor: (e) => `<b style="font-weight:500">${U.esc(e.nombre)}</b><br><small class="muted">${U.esc(e.lugar || '')}</small>` },
          { titulo: 'Fecha', valor: (e) => U.fecha(e.fecha) + (e.hora ? `<br><small class="muted">${U.esc(e.hora)} h</small>` : '') },
          { titulo: 'Inscriptas', clase: 'num', valor: (e) => e.cupos ? `${e.inscriptos} / ${e.cupos}` : e.inscriptos || '—' },
          { titulo: 'Gasto vs. presupuesto', valor: barraPresupuesto },
          { titulo: 'Checklist', valor: (e) => e._tareas.length ? `${e._tareas.filter((t) => t.hecha).length}/${e._tareas.length}` : '—' },
          { titulo: 'Resultado', clase: 'num', valor: (e) => (e._ingresos || e._gasto) ? `<b style="color:${e._resultado >= 0 ? 'var(--ok)' : 'var(--alerta)'}">${U.pesos(e._resultado)}</b>` : '—' },
          { titulo: 'Estado', valor: (e) => UI.etiqueta(e.estado, N.tonoEvento(e.estado)) }
        ],
        campos: [
          { campo: 'nombre', etiqueta: 'Nombre del evento', requerido: true, ancho: 'completo' },
          { campo: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true },
          { campo: 'hora', etiqueta: 'Hora', tipo: 'hora' },
          { campo: 'lugar', etiqueta: 'Lugar' },
          { campo: 'estado', etiqueta: 'Estado', tipo: 'select', opciones: N.ESTADOS_EVENTO, vacio: false, defecto: 'Planificando' },
          { campo: 'precio_entrada', etiqueta: 'Precio de la entrada', tipo: 'pesos', min: 0, defecto: 0, requerido: true },
          { campo: 'presupuesto', etiqueta: 'Presupuesto de gastos', tipo: 'pesos', min: 0, defecto: 0, requerido: true },
          { campo: 'cupos', etiqueta: 'Cupos', tipo: 'numero', min: 0, paso: 1, defecto: 0, requerido: true },
          { campo: 'inscriptos', etiqueta: 'Inscriptas', tipo: 'numero', min: 0, paso: 1, defecto: 0, requerido: true },
          { campo: 'descripcion', etiqueta: 'Descripción', tipo: 'area' },
          { campo: 'resultado', etiqueta: 'Cómo salió (para después del evento)', tipo: 'area', placeholder: 'Qué funcionó, qué cambiarías…' }
        ],
        mensajeBorrar: () => 'Se borran también su checklist y colaboradores. Los gastos y ventas quedan pero sin evento.',
        accionesExtra: () => `<button type="button" class="boton-texto" data-accion="ver">Ver</button>`,
        alAccion: { ver: (e, x, recargar) => verDetalle(e.id, recargar) }
      });
    }
  });
})();
