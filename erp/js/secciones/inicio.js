/* =====================================================================
   SECCIÓN · INICIO
   De un vistazo: qué hay que hacer hoy, números del mes, ventas vs.
   gastos, movimientos recientes, ventas por categoría, más vendidos,
   metas, agenda con notas rápidas y lo que necesita atención.
   ===================================================================== */
(function () {
  const COLOR_VENTAS = '#477ab3';
  const COLOR_GASTOS = '#c9a27e';
  let mesDona = null;        // mes que muestra la dona (se puede mover con las flechas)
  let mesesGrafico = 6;      // período del gráfico de líneas

  // Tarjeta de número con flechita que lleva a otra sección
  const tarjetaNumero = (titulo, valor, detalle, ir) => `<button type="button" class="tarjeta kpi" data-ir="${ir}">
      <span class="kpi-cab">${U.esc(titulo)}<i class="kpi-flecha" aria-hidden="true">↗</i></span>
      <strong class="kpi-valor">${valor}</strong><span class="kpi-detalle">${detalle || '&nbsp;'}</span></button>`;

  async function render(cont) {
    const [v, consultas, eventos, tareas, personas, alertas, movs, objetivos, notas] = await Promise.all([
      N.cargarVentas(), DB.listar('consultas').catch(() => []), DB.listar('eventos', { orden: 'fecha' }),
      DB.listar('tareas', { orden: 'fecha_limite' }), DB.listar('personas'), App.calcularAlertas(),
      DB.listar('movimientos_financieros', { orden: 'fecha', asc: false }), DB.listar('objetivos_mkt').catch(() => []),
      DB.listar('agenda_notas', { orden: 'fecha' }).catch(() => [])
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
    const gastosMes = U.sumar(movs.filter((m) => m.tipo === 'egreso' && U.mes(m.fecha) === mes), (m) => m.monto);

    // ---- Saludo ----
    const hora = new Date().getHours();
    App.titulo(hora < 13 ? 'Buen día' : hora < 20 ? 'Buenas tardes' : 'Buenas noches', 'Esto es lo que pasa hoy en Sinan.');

    // ---- Para hacer hoy ----
    const cuenta = (e) => v.pedidos.filter((p) => p.estado === e);
    const hacer = [
      { n: cuenta('Por preparar').length, t: 'Por preparar', s: 'pedidos para armar', ir: 'ventas/Por preparar', tono: 'alerta', i: 'inventario' },
      { n: cuenta('Por entregar').length, t: 'Por entregar', s: 'pedidos para enviar', ir: 'envios', tono: 'atencion', i: 'proveedores' },
      { n: cuenta('Por cobrar').length, t: 'Por cobrar', s: U.pesos(U.sumar(cuenta('Por cobrar'), (p) => p.total)), ir: 'ventas/Por cobrar', tono: 'info', i: 'finanzas' },
      { n: consultas.filter((c) => c.etapa === 'Nueva').length, t: 'Consultas', s: 'sin responder', ir: 'clientes/embudo', tono: 'alerta', i: 'consulta' },
      { n: alertas.filter((a) => a.tipo === 'stock' || a.tipo === 'insumo').length, t: 'Reponer', s: 'productos e insumos', ir: 'inventario', tono: 'atencion', i: 'reponer' }
    ];

    // ---- Ventas vs. gastos ----
    const meses = U.ultimosMeses(mesesGrafico);
    const serieVentas = meses.map((m) => U.sumar(validos.filter((p) => U.mes(p.fecha) === m), (p) => p.total));
    const serieGastos = meses.map((m) => U.sumar(movs.filter((x) => x.tipo === 'egreso' && U.mes(x.fecha) === m), (x) => x.monto));

    // ---- Movimientos recientes (ventas y gastos) ----
    const recientes = [
      ...validos.filter((p) => !p.historico).map((p) => ({ fecha: p.fecha, orden: p.creado || p.fecha, nombre: N.nombreCliente(v.clientesId, p.cliente_id), detalle: p.items.map((i) => v.productosId[i.producto_id]?.nombre || i.descripcion).join(', '), monto: p.total, ir: 'ventas/editar-' + p.id })),
      ...movs.map((m) => ({ fecha: m.fecha, orden: m.creado || m.fecha, nombre: m.descripcion || m.categoria, detalle: m.categoria, monto: m.tipo === 'egreso' ? -m.monto : m.monto, ir: 'finanzas' }))
    ].sort((a, b) => b.fecha.localeCompare(a.fecha) || String(b.orden).localeCompare(String(a.orden))).slice(0, 7);

    // ---- Ventas por categoría (dona, mes navegable) ----
    if (!mesDona) mesDona = mes;
    const porCat = {};
    validos.filter((p) => U.mes(p.fecha) === mesDona).forEach((p) => p.items.forEach((i) => {
      const cat = v.productosId[i.producto_id]?.categoria || 'Otros';
      porCat[cat] = (porCat[cat] || 0) + i.cantidad * i.precio_unitario;
    }));
    const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
    const itemsDona = cats.slice(0, 5).map(([k, val], n) => ({ etiqueta: k, valor: val, color: UI.grafico.COLORES[n] }));
    if (cats.length > 5) itemsDona.push({ etiqueta: 'Otras', valor: U.sumar(cats.slice(5), (c) => c[1]), color: UI.grafico.COLORES[5] });

    // ---- Más vendidos (solo por unidad, 90 días) ----
    const desde90 = U.isoDeFecha(new Date(U.fechaDeIso(hoy).getTime() - 90 * 86400000));
    const porProd = {};
    validos.filter((p) => p.fecha >= desde90).forEach((p) => p.items.forEach((i) => {
      if (N.esMayorista(i, v.productosId)) return;
      const n = v.productosId[i.producto_id]?.nombre || i.descripcion || '—';
      porProd[n] = (porProd[n] || 0) + i.cantidad;
    }));
    const top = Object.entries(porProd).map(([k, n]) => ({ etiqueta: k, valor: n })).sort((a, b) => b.valor - a.valor).slice(0, 5);

    // ---- Metas (objetivos de marketing en curso) ----
    const metas = objetivos.filter((o) => o.estado !== 'Logrado' && o.estado !== 'No logrado' && o.meta).slice(0, 3);

    // ---- Agenda: notas + eventos + tareas, de hoy en adelante ----
    const gente = U.porId(personas);
    const agenda = [
      ...notas.filter((n) => n.fecha >= hoy).map((n) => ({ fecha: n.fecha, texto: n.texto, tipo: 'Nota', id: n.id })),
      ...eventos.filter((e) => e.fecha >= hoy && e.estado !== 'Cancelado').map((e) => ({ fecha: e.fecha, texto: (e.tipo === 'Feria' ? 'Feria: ' : '') + e.nombre, tipo: 'Evento', ir: 'eventos/ver-' + e.id })),
      ...tareas.filter((t) => t.estado !== 'Hecha' && t.fecha_limite).map((t) => ({ fecha: t.fecha_limite, texto: t.titulo + (t.persona_id && gente[t.persona_id] ? ' · ' + gente[t.persona_id].nombre : ''), tipo: 'Tarea', tarea: t.id, vencida: t.fecha_limite < hoy }))
    ].sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 8);

    let comparacion = '';
    if (ventasAnt > 0) {
      const varPct = (ventasMes - ventasAnt) / ventasAnt * 100;
      comparacion = `<span class="variacion ${varPct >= 0 ? 'sube' : 'baja'}">${varPct >= 0 ? '▲' : '▼'} ${U.porcentaje(Math.abs(varPct))}</span> vs. ${U.MESES[Number(mesAnt.slice(5)) - 1]}`;
    }
    const iniciales = (t) => String(t || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
    const diaCorto = (iso) => { const f = U.fechaDeIso(iso); return `${f.getDate()} ${U.MESES[f.getMonth()].slice(0, 3)}`; };

    cont.innerHTML = `
      <div class="semaforo semaforo-5">${hacer.map((h) => `
        <button type="button" class="semaforo-item tono-${h.n ? h.tono : 'ok'}" data-ir="${h.ir}">
          <span class="sf-icono" aria-hidden="true">${h.n ? App.icono(h.i) : '✓'}</span>
          <span class="sf-num">${h.n}</span>
          <span class="sf-texto"><b>${h.t}</b><small>${h.n ? h.s : 'al día'}</small></span>
        </button>`).join('')}
      </div>

      <div class="inicio-grilla separado">
        <div class="inicio-izq">
          <div class="kpis">
            ${tarjetaNumero('Ventas del mes', U.pesos(ventasMes), comparacion || `${delMes.length} pedidos`, 'ventas')}
            ${tarjetaNumero('Ganancia del mes', U.pesos(ganancia(delMes)), `gastos del mes: ${U.pesos(gastosMes)}`, 'finanzas')}
            ${tarjetaNumero('Pedidos del mes', delMes.length, `ticket promedio ${U.pesos(delMes.length ? ventasMes / delMes.length : 0)}`, 'reportes')}
          </div>

          <section class="tarjeta">
            <div class="tarjeta-cabecera"><h2>Ventas vs. gastos</h2>
              <div class="selector-chico">${[6, 12].map((n) => `<button type="button" data-meses="${n}" class="${n === mesesGrafico ? 'activo' : ''}">${n} meses</button>`).join('')}</div></div>
            ${UI.grafico.lineas(meses.map((m) => U.nombreMes(m, true)), [
              { nombre: 'Ventas', valores: serieVentas, color: COLOR_VENTAS },
              { nombre: 'Gastos', valores: serieGastos, color: COLOR_GASTOS }
            ])}
          </section>

          <div class="grilla grilla-2">
            <section class="tarjeta">
              <div class="tarjeta-cabecera"><h2>Más vendidos</h2><span class="muted chico">por unidad · 90 días</span></div>
              ${UI.grafico.barras(top, { formato: (n) => n + ' u.', vacio: 'Sin ventas en los últimos 90 días.' })}
            </section>
            <section class="tarjeta">
              <div class="tarjeta-cabecera"><h2>Metas</h2><button type="button" class="boton-texto" data-ir="marketing">Ver</button></div>
              ${metas.length ? metas.map((o) => {
                const pct = Math.max(0, Math.min(100, (Number(o.actual) || 0) / o.meta * 100));
                return `<div class="meta"><div class="meta-cab"><span>${U.esc(o.objetivo)}</span><b>${U.porcentaje(pct)}</b></div>
                  <div class="barra-progreso"><span style="width:${pct}%"></span></div>
                  <small class="muted">${U.numero(o.actual)} de ${U.numero(o.meta)}${o.fecha_limite ? ' · hasta ' + U.fecha(o.fecha_limite) : ''}</small></div>`;
              }).join('') : '<p class="muted chico">Cargá tus metas en Marketing → Objetivos (ej: llegar a 1.500 seguidores) y las vas a ver acá.</p>'}
            </section>
          </div>

          <section class="tarjeta">
            <div class="tarjeta-cabecera"><h2>Para atender</h2><button type="button" class="boton-texto" data-ir="alertas">Ver detalle</button></div>
            ${App.dibujarResumenAlertas(alertas)}
          </section>
        </div>

        <div class="inicio-der">
          <section class="tarjeta">
            <div class="tarjeta-cabecera"><h2 class="titulo-icono">${App.icono('finanzas')} Movimientos recientes</h2></div>
            <ul class="movimientos">${recientes.map((r) => `<li><button type="button" data-ir="${r.ir}">
                <span class="mov-avatar">${U.esc(iniciales(r.nombre))}</span>
                <span class="mov-texto"><b>${U.esc(r.nombre)}</b><small>${U.fecha(r.fecha)} · ${U.esc(r.detalle || '')}</small></span>
                <span class="mov-monto ${r.monto >= 0 ? 'mas' : 'menos'}">${r.monto >= 0 ? '+' : '−'}${U.pesos(Math.abs(r.monto)).replace('-', '')}</span>
              </button></li>`).join('') || '<li class="muted chico">Todavía no hay movimientos.</li>'}</ul>
          </section>

          <section class="tarjeta">
            <div class="tarjeta-cabecera navegador-mes">
              <button type="button" class="boton-icono" data-mes-dona="-1" aria-label="Mes anterior">‹</button>
              <h2>${U.nombreMes(mesDona)}</h2>
              <button type="button" class="boton-icono" data-mes-dona="1" aria-label="Mes siguiente" ${mesDona >= mes ? 'disabled' : ''}>›</button>
            </div>
            <p class="muted chico" style="margin:-6px 0 6px">Ventas por categoría</p>
            ${UI.grafico.dona(itemsDona, { centro: U.pesos(U.sumar(itemsDona, (i) => i.valor)), sub: 'vendido en el mes' })}
          </section>

          <section class="tarjeta">
            <div class="tarjeta-cabecera"><h2 class="titulo-icono">${App.icono('eventos')} Agenda</h2></div>
            <form class="nota-rapida" data-nota>
              <input type="date" name="fecha" value="${hoy}" required aria-label="Fecha">
              <input type="text" name="texto" placeholder="Ej: Día de la Madre" required aria-label="Qué pasa ese día">
              <button class="boton boton-chico">Anotar</button>
            </form>
            <ul class="agenda">${agenda.map((a) => `<li class="${a.vencida ? 'vencida' : ''}">
                <span class="ag-dia"><b>${diaCorto(a.fecha)}</b><small>${a.tipo}</small></span>
                <span class="ag-texto-item">${U.esc(a.texto)}</span>
                ${a.id ? `<button type="button" class="boton-icono boton-icono-peligro" data-borrar-nota="${a.id}" aria-label="Borrar nota">✕</button>` : ''}
                ${a.ir ? `<button type="button" class="boton-texto" data-ir="${a.ir}">Ver</button>` : ''}
                ${a.tarea ? `<input type="checkbox" data-tarea="${a.tarea}" aria-label="Marcar tarea como hecha">` : ''}
              </li>`).join('') || '<li class="muted chico">Nada agendado. Anotá fechas especiales arriba.</li>'}</ul>
          </section>
        </div>
      </div>`;

    App.activarIr(cont);
    // Período del gráfico y mes de la dona
    cont.querySelectorAll('[data-meses]').forEach((b) => b.onclick = () => { mesesGrafico = Number(b.dataset.meses); render(cont); });
    cont.querySelectorAll('[data-mes-dona]').forEach((b) => b.onclick = () => {
      const f = U.fechaDeIso(mesDona + '-01'); f.setMonth(f.getMonth() + Number(b.dataset.mesDona));
      mesDona = U.isoDeFecha(f).slice(0, 7); render(cont);
    });
    // Notas rápidas
    cont.querySelector('[data-nota]').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        await DB.crear('agenda_notas', { fecha: f.fecha.value, texto: f.texto.value.trim() });
        UI.aviso(`Anotado para el ${U.fecha(f.fecha.value)}`); render(cont);
      } catch (ex) { UI.error(ex); }
    });
    cont.querySelectorAll('[data-borrar-nota]').forEach((b) => b.onclick = async () => {
      if (!(await UI.confirmar('Vas a borrar esta nota de la agenda.'))) return;
      try { await DB.borrar('agenda_notas', Number(b.dataset.borrarNota)); render(cont); } catch (ex) { UI.error(ex); }
    });
    cont.querySelectorAll('[data-tarea]').forEach((ch) => ch.addEventListener('change', async () => {
      try { await DB.actualizar('tareas', Number(ch.dataset.tarea), { estado: 'Hecha' }); UI.aviso('Tarea hecha'); render(cont); }
      catch (e) { ch.checked = false; UI.error(e); }
    }));
  }

  App.registrar({ id: 'inicio', titulo: 'Inicio', icono: 'inicio', render: (cont) => { mesDona = null; return render(cont); } });
})();
