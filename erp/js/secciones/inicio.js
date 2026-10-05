/* =====================================================================
   SECCIÓN · INICIO
   Resumen del día: ventas del mes, próximo evento, tareas, alertas y frase.
   ===================================================================== */
App.registrar({
  id: 'inicio', titulo: 'Inicio', icono: 'inicio',
  async render(cont) {
    const [cfg, pedidos, eventos, tareas, personas, alertas] = await Promise.all([
      App.config(true), DB.listar('pedidos'), DB.listar('eventos', { orden: 'fecha' }),
      DB.listar('tareas', { orden: 'fecha_limite' }), DB.listar('personas'), App.calcularAlertas()
    ]);

    // Ventas del mes vs. mes anterior
    const mesActual = U.mes(U.hoy());
    const d = U.fechaDeIso(U.hoy()); d.setDate(1); d.setMonth(d.getMonth() - 1);
    const mesAnterior = U.mes(U.isoDeFecha(d));
    const validos = pedidos.filter(N.pedidoValido);
    const delMes = validos.filter((p) => U.mes(p.fecha) === mesActual);
    const totalMes = U.sumar(delMes, (p) => p.total);
    const totalAnterior = U.sumar(validos.filter((p) => U.mes(p.fecha) === mesAnterior), (p) => p.total);
    const porPreparar = pedidos.filter((p) => ['Pendiente', 'Pagado', 'Preparando'].includes(p.estado)).length;

    // Próximo evento
    const proximo = eventos.find((e) => e.estado !== 'Cancelado' && e.estado !== 'Realizado' && U.diasHasta(e.fecha) >= 0);

    // Tareas pendientes
    const gente = U.porId(personas);
    const pendientes = tareas.filter((t) => t.estado !== 'Hecha');

    const saludo = new Date().getHours() < 13 ? 'Buen día' : new Date().getHours() < 20 ? 'Buenas tardes' : 'Buenas noches';
    cont.closest('#contenido').querySelector('.cabecera-seccion').innerHTML =
      `<h1>${saludo} ✨</h1><p>${U.esc(U.nombreMes(mesActual))} · así viene ${U.esc(cfg.nombre_marca || 'Sinan')}.</p>`;

    let comparacion = 'Primer mes con ventas';
    if (totalAnterior > 0) {
      const v = ((totalMes - totalAnterior) / totalAnterior) * 100;
      comparacion = `${v >= 0 ? '▲' : '▼'} ${U.porcentaje(Math.abs(v))} vs. ${U.MESES[Number(mesAnterior.slice(5)) - 1]}`;
    }

    cont.innerHTML = `
      <div class="barra-herramientas">
        <button type="button" class="boton" data-ir="ventas/nuevo">+ Registrar venta</button>
        <button type="button" class="boton boton-secundario" data-ir="productos/nuevo">+ Producto</button>
        <button type="button" class="boton boton-secundario" data-ir="finanzas/nuevo">+ Gasto o ingreso</button>
      </div>

      <div class="grilla grilla-3">
        <div class="tarjeta frase">
          <blockquote>“${U.esc(cfg.frase || 'Movete a tu ritmo')}”</blockquote>
          <span>${U.esc(cfg.nombre_marca || 'Sinan')}</span>
        </div>
        ${UI.numeroDestacado('Ventas del mes', U.pesos(totalMes),
          `${delMes.length} ${delMes.length === 1 ? 'pedido' : 'pedidos'} · ${comparacion}`)}
        <div class="tarjeta dato">
          <span class="dato-titulo">Próximo evento</span>
          ${proximo ? `
            <strong class="dato-valor" style="font-size:21px">${U.esc(proximo.nombre)}</strong>
            <span class="dato-detalle">${U.fecha(proximo.fecha)} · ${U.diasHasta(proximo.fecha) === 0 ? 'hoy' : 'faltan ' + U.diasHasta(proximo.fecha) + ' días'}</span>
            <span class="dato-detalle">${proximo.cupos ? `${proximo.inscriptos} de ${proximo.cupos} inscriptas` : U.esc(proximo.lugar || '')}</span>
            <button type="button" class="boton-texto" style="align-self:flex-start;padding-left:0" data-ir="eventos/ver-${proximo.id}">Ver evento →</button>`
          : `<strong class="dato-valor" style="font-size:20px">Sin eventos próximos</strong>
            <button type="button" class="boton-texto" style="align-self:flex-start;padding-left:0" data-ir="eventos/nuevo">Crear uno →</button>`}
        </div>
      </div>

      <div class="grilla grilla-4 separado">
        ${UI.numeroDestacado('Pedidos por preparar', porPreparar, 'pendientes, pagados o preparando')}
        ${UI.numeroDestacado('Alertas', alertas.length, alertas.length ? 'para revisar' : 'todo en orden', alertas.length ? 'alerta' : 'ok')}
        ${UI.numeroDestacado('Tareas pendientes', pendientes.length, `${pendientes.filter((t) => t.fecha_limite && U.diasHasta(t.fecha_limite) < 0).length} vencidas`)}
        ${UI.numeroDestacado('Ticket promedio del mes', U.pesos(delMes.length ? totalMes / delMes.length : 0), 'por pedido')}
      </div>

      <div class="grilla grilla-2 separado">
        <section class="tarjeta">
          <div class="tarjeta-cabecera"><h2>Tareas pendientes</h2><button type="button" class="boton-texto" data-ir="equipo">Ver todas</button></div>
          ${pendientes.length ? `<ul class="lista-simple">${pendientes.slice(0, 6).map((t) => {
            const dias = t.fecha_limite ? U.diasHasta(t.fecha_limite) : null;
            return `<li>
              <input type="checkbox" data-tarea="${t.id}" aria-label="Marcar como hecha">
              <div class="crece">${U.esc(t.titulo)}
                <small>${t.persona_id && gente[t.persona_id] ? U.esc(gente[t.persona_id].nombre) + ' · ' : ''}${t.fecha_limite ? 'vence ' + U.fecha(t.fecha_limite) : 'sin fecha'}</small></div>
              ${dias !== null && dias < 0 ? UI.etiqueta('Vencida', 'alerta') : UI.etiqueta(t.prioridad, N.tonoPrioridad(t.prioridad))}
            </li>`;
          }).join('')}</ul>` : '<div class="vacio">No hay tareas pendientes.</div>'}
        </section>
        <section class="tarjeta">
          <div class="tarjeta-cabecera"><h2>Alertas</h2><button type="button" class="boton-texto" data-ir="alertas">Ver todas</button></div>
          ${App.dibujarAlertas(alertas, 5)}
        </section>
      </div>`;

    App.activarIr(cont);
    // Tildar una tarea la marca como hecha
    cont.querySelectorAll('[data-tarea]').forEach((ch) => ch.addEventListener('change', async () => {
      try {
        await DB.actualizar('tareas', Number(ch.dataset.tarea), { estado: 'Hecha' });
        ch.closest('li').querySelector('.crece').classList.add('hecha');
        ch.disabled = true;
        UI.aviso('Tarea hecha 👏');
      } catch (e) { ch.checked = false; UI.error(e); }
    }));
  }
});
