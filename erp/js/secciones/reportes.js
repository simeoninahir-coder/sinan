/* =====================================================================
   SECCIÓN · REPORTES
   Producto más vendido, ingresos por canal, resultado por evento
   y evolución mensual, con gráficos simples.
   ===================================================================== */
App.registrar({
  id: 'reportes', titulo: 'Reportes', icono: 'reportes', grupo: 'admin',
  descripcion: 'Cómo viene el negocio, en gráficos.',
  async render(cont) {
    const [v, eventos, movs] = await Promise.all([N.cargarVentas(), DB.listar('eventos', { orden: 'fecha' }), DB.listar('movimientos_financieros')]);
    const periodos = [
      { valor: 'anio', texto: 'Este año' },
      { valor: '6', texto: 'Últimos 6 meses' },
      { valor: '12', texto: 'Últimos 12 meses' },
      { valor: '3', texto: 'Últimos 3 meses' },
      // Años anteriores (incluye las ventas históricas) y todo junto
      ...[...new Set(v.pedidos.map((p) => p.fecha.slice(0, 4)))].filter((a) => a < U.hoy().slice(0, 4)).sort().reverse().map((a) => ({ valor: 'y' + a, texto: 'Año ' + a })),
      { valor: 'todo', texto: 'Desde el principio' }
    ];
    cont.innerHTML = `<div class="barra-herramientas"><div class="filtros">
      <select aria-label="Período">${periodos.map((p) => `<option value="${p.valor}">${p.texto}</option>`).join('')}</select></div></div>
      <div data-reportes></div>`;
    const sel = cont.querySelector('select');

    function dibujar() {
      let meses;
      let hasta = U.hoy();
      if (sel.value === 'anio') { const n = Number(U.hoy().slice(5, 7)); meses = U.ultimosMeses(n); }
      else if (sel.value.startsWith('y')) { const a = sel.value.slice(1); meses = Array.from({ length: 12 }, (_, i) => a + '-' + String(i + 1).padStart(2, '0')); hasta = a + '-12-31'; }
      else if (sel.value === 'todo') { const prim = v.pedidos.map((p) => p.fecha).sort()[0] || U.hoy(); const d0 = U.fechaDeIso(prim.slice(0, 8) + '01'); meses = []; for (let d = d0; U.isoDeFecha(d) <= U.hoy(); d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) meses.push(U.isoDeFecha(d).slice(0, 7)); }
      else meses = U.ultimosMeses(Number(sel.value));
      const desde = meses[0] + '-01';
      const pedidos = v.pedidos.filter((p) => N.pedidoValido(p) && p.fecha >= desde && p.fecha <= hasta);
      const total = U.sumar(pedidos, (p) => p.total);

      // Productos
      const prods = App.rentabilidadProductos(v, desde, hasta);
      // Más vendidos: solo productos por unidad (sin lo mayorista)
      const porUnidades = prods.filter((p) => !p.mayorista).sort((a, b) => b.unidades - a.unidades || b.ingresos - a.ingresos);
      const top = porUnidades[0];

      // Canales
      const canales = Object.entries(U.agrupar(pedidos, (p) => p.canal))
        .map(([k, ps]) => ({ etiqueta: k, valor: U.sumar(ps, (p) => p.total), extra: `${ps.length} pedidos` })).sort((a, b) => b.valor - a.valor);

      // Medios de pago
      const medios = Object.entries(U.agrupar(pedidos, (p) => p.medio_pago || 'Sin definir'))
        .map(([k, ps]) => ({ etiqueta: k, valor: U.sumar(ps, (p) => p.total), extra: `${ps.length} ventas` })).sort((a, b) => b.valor - a.valor);

      // Eventos
      const ventasEv = U.agrupar(pedidos.filter((p) => p.evento_id), (p) => p.evento_id);
      const movsEv = U.agrupar(movs.filter((m) => m.evento_id), (m) => m.evento_id);
      const evs = eventos.filter((e) => e.fecha >= desde && e.fecha <= hasta && e.fecha <= U.hoy() && e.estado !== 'Cancelado').map((e) => {
        const ms = movsEv[e.id] || [];
        const res = U.sumar(ventasEv[e.id] || [], (p) => p.total) + U.sumar(ms.filter((m) => m.tipo === 'ingreso'), (m) => m.monto) - U.sumar(ms.filter((m) => m.tipo === 'egreso'), (m) => m.monto);
        return { etiqueta: e.nombre, valor: res, extra: U.fecha(e.fecha) };
      });

      // Mensual
      const ventasMes = meses.map((m) => ({ etiqueta: U.nombreMes(m, true), valor: U.sumar(pedidos.filter((p) => U.mes(p.fecha) === m), (p) => p.total) }));

      // Clientas
      const clientas = Object.entries(U.agrupar(pedidos.filter((p) => p.cliente_id), (p) => p.cliente_id))
        .map(([id, ps]) => ({ etiqueta: v.clientesId[id]?.nombre || '—', valor: U.sumar(ps, (p) => p.total), extra: `${ps.length} compras` }))
        .sort((a, b) => b.valor - a.valor).slice(0, 6);

      const caja = cont.querySelector('[data-reportes]');
      caja.innerHTML = `
        <div class="grilla grilla-4">
          ${UI.numeroDestacado('Ventas del período', U.pesos(total), `${pedidos.length} pedidos`)}
          ${UI.numeroDestacado('Producto más vendido', top ? U.esc(top.nombre) : '—', top ? `${top.unidades} unidades · ${U.pesos(top.ingresos)}` : '')}
          ${UI.numeroDestacado('Canal principal', canales[0] ? U.esc(canales[0].etiqueta) : '—', canales[0] ? `${U.porcentaje(total ? canales[0].valor / total * 100 : 0)} de las ventas` : '')}
          ${UI.numeroDestacado('Ganancia bruta', U.pesos(U.sumar(prods, (p) => p.ganancia)), `margen ${U.porcentaje(U.margen(U.sumar(prods, (p) => p.ingresos), U.sumar(prods, (p) => p.costo)))} · ticket ${U.pesos(pedidos.length ? total / pedidos.length : 0)}`)}
        </div>
        <div class="grilla grilla-2 separado">
          <section class="tarjeta"><h2>Ventas por mes</h2>${UI.grafico.columnas(ventasMes)}</section>
          <section class="tarjeta"><h2>Resultado por mes</h2><div data-resultado><div class="cargando-bloque">Cargando…</div></div>
            <p class="muted chico" style="margin-bottom:0">Ventas + otros ingresos − gastos.</p></section>
          <section class="tarjeta"><h2>Productos más vendidos <small class="muted chico">(por unidad)</small></h2>
            ${UI.grafico.barras(porUnidades.slice(0, 8).map((p) => ({ etiqueta: p.nombre, valor: p.unidades, extra: U.pesos(p.ingresos) })), { formato: (n) => n + ' u.' })}</section>
          <section class="tarjeta"><h2>Ingresos por canal</h2>${UI.grafico.barras(canales)}</section>
          <section class="tarjeta"><h2>Ventas por medio de pago</h2>${UI.grafico.barras(medios)}</section>
          <section class="tarjeta"><h2>Ganancia por producto</h2>
            ${UI.grafico.barras(prods.slice(0, 8).map((p) => ({ etiqueta: p.nombre, valor: p.ganancia, extra: 'margen ' + U.porcentaje(p.margen) })))}</section>
          <section class="tarjeta"><h2>Resultado por evento</h2>${UI.grafico.barras(evs, { vacio: 'No hubo eventos en este período.' })}</section>
          <section class="tarjeta"><h2>Clientas que más compraron</h2>${UI.grafico.barras(clientas)}</section>
        </div>`;
      App.finanzasMensuales(meses).then((r) => {
        const el = caja.querySelector('[data-resultado]');
        if (el) el.innerHTML = UI.grafico.columnas(r.map((x) => ({ etiqueta: U.nombreMes(x.mes, true), valor: x.resultado })));
      }).catch(UI.error);
    }
    sel.onchange = dibujar;
    dibujar();
  }
});
