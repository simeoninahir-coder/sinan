/* =====================================================================
   SECCIÓN · INICIO
   De un vistazo: qué hay que hacer hoy, cómo vienen las ventas,
   el embudo de consultas, gráficos y lo que necesita atención.
   ===================================================================== */
App.registrar({
  id: 'inicio', titulo: 'Inicio', icono: 'inicio',
  async render(cont) {
    const [v, consultas, eventos, tareas, personas, alertas] = await Promise.all([
      N.cargarVentas(), DB.listar('consultas').catch(() => []), DB.listar('eventos', { orden: 'fecha' }),
      DB.listar('tareas', { orden: 'fecha_limite' }), DB.listar('personas'), App.calcularAlertas()
    ]);
    const hoy = U.hoy();
    const mes = U.mes(hoy);
    const d = U.fechaDeIso(hoy); d.setDate(1); d.setMonth(d.getMonth() - 1);
    const mesAnt = U.mes(U.isoDeFecha(d));
    const validos = v.pedidos.filter(N.pedidoValido);
    const delMes = validos.filter((p) => U.mes(p.fecha) === mes);
    const ventasMes = U.sumar(delMes, (p) => p.total);
    const ventasAnt = U.sumar(validos.filter((p) => U.mes(p.fecha) === mesAnt), (p) => p.total);
    const ganancia = (ps) => U.sumar(ps, (p) => U.sumar(p.items, (i) => i.cantidad * (i.precio_unitario - i.costo_unitario)));
    const consMes = consultas.filter((c) => U.mes(c.fecha) === mes);

    // ---- Para hacer hoy ----
    const cuenta = (e) => v.pedidos.filter((p) => p.estado === e);
    const reponer = alertas.filter((a) => a.tipo === 'stock' || a.tipo === 'insumo').length;
    const sinResponder = consultas.filter((c) => c.etapa === 'Nueva').length;
    const hacer = [
      { n: cuenta('Por preparar').length, t: 'Por preparar', s: 'pedidos para armar', ir: 'ventas/Por preparar', tono: 'alerta', i: '📦' },
      { n: cuenta('Por entregar').length, t: 'Por entregar', s: 'pedidos para enviar', ir: 'envios', tono: 'atencion', i: '🚚' },
      { n: cuenta('Por cobrar').length, t: 'Por cobrar', s: U.pesos(U.sumar(cuenta('Por cobrar'), (p) => p.total)), ir: 'ventas/Por cobrar', tono: 'info', i: '💵' },
      { n: sinResponder, t: 'Consultas', s: 'sin responder', ir: 'clientes/embudo', tono: 'alerta', i: '💬' },
      { n: reponer, t: 'Reponer', s: 'productos e insumos', ir: 'inventario', tono: 'atencion', i: '🔁' }
    ];

    // ---- Gráficos ----
    const meses = U.ultimosMeses(6);
    const ventas6 = meses.map((m) => ({ etiqueta: U.nombreMes(m, true), valor: U.sumar(validos.filter((p) => U.mes(p.fecha) === m), (p) => p.total) }));
    const anio = hoy.slice(0, 4);
    const canales = Object.entries(U.agrupar(validos.filter((p) => p.fecha.startsWith(anio)), (p) => p.canal))
      .map(([k, g]) => ({ etiqueta: k, valor: U.sumar(g, (p) => p.total), extra: `${g.length} ventas` })).sort((a, b) => b.valor - a.valor);
    const desde90 = U.isoDeFecha(new Date(U.fechaDeIso(hoy).getTime() - 90 * 86400000));
    const porProd = {};
    validos.filter((p) => p.fecha >= desde90).forEach((p) => p.items.forEach((i) => {
      const n = v.productosId[i.producto_id]?.nombre || i.descripcion || '—';
      porProd[n] = (porProd[n] || 0) + i.cantidad;
    }));
    const top = Object.entries(porProd).map(([k, n]) => ({ etiqueta: k, valor: n })).sort((a, b) => b.valor - a.valor).slice(0, 6);
    const cerradasMes = consMes.filter((c) => c.etapa === 'Ganada' || c.etapa === 'Perdida');
    const embudo = [
      { t: 'Consultaron', n: consMes.length },
      { t: 'Presupuesto', n: consMes.filter((c) => c.etapa === 'Presupuesto' || c.etapa === 'Ganada' || c.presupuesto_at).length },
      { t: 'Compraron', n: consMes.filter((c) => c.etapa === 'Ganada').length }
    ];

    // ---- Próximo evento y tareas ----
    const proximo = eventos.find((e) => e.estado !== 'Cancelado' && e.estado !== 'Realizado' && U.diasHasta(e.fecha) >= 0);
    const gente = U.porId(personas);
    const pendientes = tareas.filter((t) => t.estado !== 'Hecha');

    const hora = new Date().getHours();
    const saludo = hora < 13 ? 'Buen día' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const f = U.fechaDeIso(hoy);
    cont.closest('#contenido').querySelector('.cabecera-seccion').innerHTML =
      `<h1>${saludo} ✨</h1><p>Hoy es ${dias[f.getDay()]} ${f.getDate()} de ${U.MESES[f.getMonth()]}. Esto es lo que pasa en Sinan.</p>`;

    let comparacion = '';
    if (ventasAnt > 0) {
      const varPct = (ventasMes - ventasAnt) / ventasAnt * 100;
      comparacion = `<span class="variacion ${varPct >= 0 ? 'sube' : 'baja'}">${varPct >= 0 ? '▲' : '▼'} ${U.porcentaje(Math.abs(varPct))}</span> vs. ${U.MESES[Number(mesAnt.slice(5)) - 1]}`;
    }

    cont.innerHTML = `
      <div class="acciones-rapidas">
        <button type="button" class="boton" data-ir="ventas/nuevo">+ Venta</button>
        <button type="button" class="boton boton-secundario" data-ir="clientes/embudo">+ Consulta</button>
        <button type="button" class="boton boton-secundario" data-ir="inventario/nuevo">+ Producto</button>
        <button type="button" class="boton boton-secundario" data-ir="finanzas/nuevo">+ Gasto</button>
      </div>

      <h2 class="subtitulo">Para hacer hoy</h2>
      <div class="semaforo semaforo-5">${hacer.map((h) => `
        <button type="button" class="semaforo-item tono-${h.n ? h.tono : 'ok'}" data-ir="${h.ir}">
          <span class="sf-icono" aria-hidden="true">${h.n ? h.i : '✓'}</span>
          <span class="sf-num">${h.n}</span>
          <span class="sf-texto"><b>${h.t}</b><small>${h.n ? h.s : 'al día'}</small></span>
        </button>`).join('')}
      </div>

      <h2 class="subtitulo">Este mes</h2>
      <div class="grilla grilla-4">
        ${UI.numeroDestacado('Ventas', U.pesos(ventasMes), comparacion || `${delMes.length} pedidos`)}
        ${UI.numeroDestacado('Ganancia', U.pesos(ganancia(delMes)), 'precio − costo de lo vendido', 'ok')}
        ${UI.numeroDestacado('Pedidos', delMes.length, `ticket promedio ${U.pesos(delMes.length ? ventasMes / delMes.length : 0)}`)}
        ${UI.numeroDestacado('Consultas', consMes.length, cerradasMes.length ? `${U.porcentaje(embudo[2].n / cerradasMes.length * 100)} terminan en venta` : 'cargalas en Clientes → Embudo')}
      </div>

      <div class="grilla grilla-2 separado">
        <section class="tarjeta"><div class="tarjeta-cabecera"><h2>Ventas de los últimos 6 meses</h2><button type="button" class="boton-texto" data-ir="reportes">Más reportes</button></div>
          ${UI.grafico.columnas(ventas6)}</section>
        <section class="tarjeta"><div class="tarjeta-cabecera"><h2>Embudo de consultas del mes</h2><button type="button" class="boton-texto" data-ir="clientes/embudo">Ver embudo</button></div>
          ${consMes.length ? `<div class="embudo">${embudo.map((x, i) => `<div class="embudo-paso" style="--ancho:${Math.max(18, embudo[0].n ? x.n / embudo[0].n * 100 : 0)}%">
            <span class="embudo-barra"><b>${x.n}</b></span><span class="embudo-texto">${x.t}${i && embudo[0].n ? ` · ${U.porcentaje(x.n / embudo[0].n * 100)}` : ''}</span></div>`).join('')}</div>`
            : '<div class="vacio">Todavía no cargaste consultas este mes. Cada vez que alguien te pregunta por un producto, sumala en <b>Clientes → Embudo</b>.</div>'}
        </section>
        <section class="tarjeta"><h2>Ventas por canal (${anio})</h2>${UI.grafico.barras(canales)}</section>
        <section class="tarjeta"><h2>Lo más vendido (90 días)</h2>${UI.grafico.barras(top, { formato: (n) => n + ' u.', vacio: 'Sin ventas en los últimos 90 días.' })}</section>
      </div>

      <div class="grilla grilla-2 separado">
        <section class="tarjeta">
          <div class="tarjeta-cabecera"><h2>Para atender</h2><button type="button" class="boton-texto" data-ir="alertas">Ver detalle</button></div>
          ${App.dibujarResumenAlertas(alertas)}
        </section>
        <section class="tarjeta">
          <div class="tarjeta-cabecera"><h2>Agenda</h2><button type="button" class="boton-texto" data-ir="equipo">Tareas</button></div>
          ${proximo ? `<button type="button" class="alerta-grupo" data-ir="eventos/ver-${proximo.id}">
              <span class="ag-icono">${App.icono('eventos')}</span>
              <span class="ag-texto"><b>${U.esc((proximo.tipo === 'Feria' ? 'Feria · ' : '') + proximo.nombre)}</b><small>${U.fecha(proximo.fecha)} · ${U.diasHasta(proximo.fecha) === 0 ? 'hoy' : 'en ' + U.diasHasta(proximo.fecha) + ' días'}${proximo.lugar ? ' · ' + U.esc(proximo.lugar) : ''}</small></span>
              <span class="ag-flecha">›</span></button>` : '<p class="muted chico">No hay eventos ni ferias próximas.</p>'}
          <ul class="lista-simple separado">${pendientes.slice(0, 5).map((t) => {
            const dl = t.fecha_limite ? U.diasHasta(t.fecha_limite) : null;
            return `<li><input type="checkbox" data-tarea="${t.id}" aria-label="Marcar como hecha">
              <div class="crece">${U.esc(t.titulo)}<small>${t.persona_id && gente[t.persona_id] ? U.esc(gente[t.persona_id].nombre) + ' · ' : ''}${t.fecha_limite ? 'vence ' + U.fecha(t.fecha_limite) : 'sin fecha'}</small></div>
              ${dl !== null && dl < 0 ? UI.etiqueta('Vencida', 'alerta') : UI.etiqueta(t.prioridad, N.tonoPrioridad(t.prioridad))}</li>`;
          }).join('') || '<li class="muted">Sin tareas pendientes.</li>'}</ul>
        </section>
      </div>`;

    App.activarIr(cont);
    cont.querySelectorAll('[data-tarea]').forEach((ch) => ch.addEventListener('change', async () => {
      try {
        await DB.actualizar('tareas', Number(ch.dataset.tarea), { estado: 'Hecha' });
        ch.closest('li').querySelector('.crece').classList.add('hecha'); ch.disabled = true;
        UI.aviso('Tarea hecha 👏');
      } catch (e) { ch.checked = false; UI.error(e); }
    }));
  }
});
