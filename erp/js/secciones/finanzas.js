/* =====================================================================
   SECCIÓN · FINANZAS
   Una sola pantalla, por mes (o por año): ventas + otros ingresos − gastos
   = resultado, y la lista de movimientos de ese período.
   Las ventas se suman solas desde Ventas (sin las históricas 2024-2025,
   que no son plata disponible). Acá se cargan gastos y otros ingresos.
   ===================================================================== */
(function () {
  // Junta ventas + movimientos por mes (lo usa Reportes)
  async function datosMensuales() {
    const [pedidos, movs] = await Promise.all([DB.listar('pedidos'), DB.listar('movimientos_financieros', { orden: 'fecha' })]);
    return { pedidos: pedidos.filter(N.pedidoValido), movs };
  }
  function resumenMes(mes, { pedidos, movs }) {
    const ventas = U.sumar(pedidos.filter((p) => U.mes(p.fecha) === mes), (p) => p.total);
    const ingresos = U.sumar(movs.filter((m) => m.tipo === 'ingreso' && U.mes(m.fecha) === mes), (m) => m.monto);
    const egresos = U.sumar(movs.filter((m) => m.tipo === 'egreso' && U.mes(m.fecha) === mes), (m) => m.monto);
    return { mes, ventas, ingresos, egresos, resultado: ventas + ingresos - egresos };
  }
  App.finanzasMensuales = async (meses) => { const d = await datosMensuales(); return meses.map((m) => resumenMes(m, d)); };

  // Período que se está mirando: 'AAAA-MM' (un mes) o 'AAAA' (un año)
  let periodo = null;
  const enPeriodo = (fecha) => String(fecha).startsWith(periodo);
  const nombrePeriodo = () => (periodo.length === 4 ? 'Año ' + periodo : U.nombreMes(periodo));

  function dibujar(cont, abrirNuevo) {
    const esAnio = periodo.length === 4;
    cont.innerHTML = `
      <div class="barra-periodo">
        <button type="button" class="boton-icono" data-mover="-1" aria-label="Anterior">‹</button>
        <h2>${nombrePeriodo()}</h2>
        <button type="button" class="boton-icono" data-mover="1" aria-label="Siguiente" ${(esAnio ? periodo >= U.hoy().slice(0, 4) : periodo >= U.mes(U.hoy())) ? 'disabled' : ''}>›</button>
        <div class="selector-chico">
          <button type="button" data-vista="mes" class="${esAnio ? '' : 'activo'}">Mes</button>
          <button type="button" data-vista="anio" class="${esAnio ? 'activo' : ''}">Año</button>
        </div>
      </div>
      <div data-lista></div>`;
    cont.querySelectorAll('[data-mover]').forEach((b) => b.onclick = () => {
      if (esAnio) periodo = String(Number(periodo) + Number(b.dataset.mover));
      else { const f = U.fechaDeIso(periodo + '-01'); f.setMonth(f.getMonth() + Number(b.dataset.mover)); periodo = U.isoDeFecha(f).slice(0, 7); }
      dibujar(cont);
    });
    cont.querySelectorAll('[data-vista]').forEach((b) => b.onclick = () => {
      periodo = b.dataset.vista === 'anio' ? periodo.slice(0, 4) : (periodo.length === 4 ? (periodo === U.hoy().slice(0, 4) ? U.mes(U.hoy()) : periodo + '-12') : periodo);
      dibujar(cont);
    });
    lista(cont.querySelector('[data-lista]'), abrirNuevo);
  }

  // ---------- Movimientos del período: ventas (automáticas) + otros ingresos + gastos ----------
  function lista(cuerpo, abrirNuevo) {
    const crud = Seccion.crud({
      contenedor: cuerpo, tabla: 'movimientos_financieros', nombre: 'movimiento', textoNuevo: 'Cargar gasto o ingreso',
      async cargar() {
        const [movs, eventos, proveedores, campanas, v] = await Promise.all([
          DB.listar('movimientos_financieros', { orden: 'fecha', asc: false }), DB.listar('eventos', { orden: 'fecha', asc: false }),
          DB.listar('proveedores', { orden: 'nombre' }), DB.listar('campanas', { orden: 'fecha_inicio', asc: false }), N.cargarVentas()]);
        // Cada venta del período aparece como ingreso (se edita desde Ventas). Las históricas no cuentan.
        const ventas = v.pedidos.filter((p) => N.pedidoValido(p) && !p.historico && enPeriodo(p.fecha)).map((p) => ({
          id: 'v' + p.id, _venta: p.id, fecha: p.fecha, tipo: 'ingreso', categoria: 'Ventas', monto: p.total, medio_pago: p.medio_pago,
          evento_id: p.evento_id,
          descripcion: `Venta #${p.id} · ${N.nombreCliente(v.clientesId, p.cliente_id)}`,
          _detalle: p.items.map((i) => (v.productosId[i.producto_id]?.nombre || i.descripcion) + ' ×' + i.cantidad).join(', ')
        }));
        // Gastos fijos anotados sin descontar (ej: Herramientas): se ven como un solo renglón y no restan
        const anotados = (App.gastosFijosRegistrados ? await App.gastosFijosRegistrados() : []).filter((r) => enPeriodo(r.fecha)).map((r) => ({
          id: 'f' + r.grupo + r.mes, _fijo: true, fecha: r.fecha, tipo: 'anotado', categoria: r.grupo, monto: r.monto,
          descripcion: r.grupo + ' (no se descuenta)', _detalle: r.detalle }));
        const filas = [...ventas, ...anotados, ...movs.filter((m) => enPeriodo(m.fecha))].sort((a, b) => b.fecha.localeCompare(a.fecha));
        return { filas, extra: { eventos, proveedores, campanas, ev: U.porId(eventos), prov: U.porId(proveedores), camp: U.porId(campanas) } };
      },
      buscar: (m, x) => [m.descripcion, m._detalle, m.categoria, m.medio_pago, x.ev[m.evento_id]?.nombre, x.prov[m.proveedor_id]?.nombre].join(' '),
      filtros: [
        { id: 'tipo', etiqueta: 'Tipo', opciones: [{ valor: 'venta', texto: 'Ventas' }, { valor: 'ingreso', texto: 'Otros ingresos' }, { valor: 'egreso', texto: 'Gastos' }, { valor: 'anotado', texto: 'Anotado sin descontar' }],
          valor: (m) => (m._venta ? 'venta' : m.tipo) },
        { id: 'cat', etiqueta: 'Categoría', opciones: (f) => [...new Set(f.map((m) => m.categoria))].sort(), valor: (m) => m.categoria }
      ],
      resumen: (filas) => {
        const ven = U.sumar(filas.filter((m) => m._venta), (m) => m.monto);
        const ing = U.sumar(filas.filter((m) => !m._venta && m.tipo === 'ingreso'), (m) => m.monto);
        const egr = U.sumar(filas.filter((m) => m.tipo === 'egreso'), (m) => m.monto);
        const res = ven + ing - egr;
        return `<div class="grilla grilla-4">
          ${UI.numeroDestacado('Ventas', U.pesos(ven), `${filas.filter((m) => m._venta).length} ventas`)}
          ${UI.numeroDestacado('Otros ingresos', U.pesos(ing))}
          ${UI.numeroDestacado('Gastos', U.pesos(egr), U.sumar(filas.filter((m) => m._fijo), (m) => m.monto) ? `+ ${U.pesos(U.sumar(filas.filter((m) => m._fijo), (m) => m.monto))} anotado sin descontar` : '')}
          ${UI.numeroDestacado('Resultado', U.pesos(res), 'ventas + ingresos − gastos', res >= 0 ? 'ok' : 'alerta')}
        </div>`;
      },
      columnas: [
        { titulo: 'Fecha', valor: (m) => U.fecha(m.fecha) },
        { titulo: 'Detalle', valor: (m, x) => `${U.esc(m.descripcion || m.categoria)}<br><small class="muted">${m._venta || m._fijo ? U.esc(m._detalle)
          : [m.categoria, x.prov[m.proveedor_id]?.nombre, x.ev[m.evento_id] ? 'Evento: ' + x.ev[m.evento_id].nombre : null, x.camp[m.campana_id] ? 'Campaña: ' + x.camp[m.campana_id].nombre : null].filter(Boolean).map(U.esc).join(' · ')}</small>` },
        { titulo: 'Tipo', valor: (m) => m._fijo ? UI.etiqueta('No se descuenta', 'atencion') : m._venta ? UI.etiqueta('Venta', 'info') : m.tipo === 'ingreso' ? UI.etiqueta('Ingreso', 'ok') : UI.etiqueta('Egreso', 'neutro') },
        { titulo: 'Medio', valor: (m) => U.esc(m.medio_pago || '—') },
        { titulo: 'Monto', clase: 'num', valor: (m) => m._fijo ? `<span class="muted">${U.pesos(m.monto)}</span>` : `<b style="color:${m.tipo === 'ingreso' ? 'var(--ok)' : 'var(--texto)'}">${m.tipo === 'egreso' ? '−' : '+'}${U.pesos(m.monto)}</b>` }
      ],
      // Las ventas se editan y borran desde Ventas
      interceptar: (m) => { if (m._venta) { App.ir('ventas', 'editar-' + m._venta); return true; } if (m._fijo) { App.ir('finanzas', 'operativos'); return true; } return false; },
      noBorrar: (m) => (m._fijo ? 'Esto se maneja desde la pestaña Gastos operativos.' : m._venta ? 'Las ventas se borran desde la sección Ventas.' : m.categoria === 'Puesto de feria' ? 'Este gasto viene del costo del puesto: cambialo desde Eventos.' : null),
      campos: (fila, x) => [
        { campo: 'tipo', etiqueta: 'Tipo', tipo: 'select', opciones: [{ valor: 'egreso', texto: 'Egreso (gasto)' }, { valor: 'ingreso', texto: 'Otro ingreso (no ventas)' }], vacio: false, defecto: 'egreso' },
        { campo: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: U.hoy },
        { campo: 'categoria', etiqueta: 'Categoría', requerido: true, sugerencias: [...N.CATEGORIAS_GASTO, ...N.CATEGORIAS_INGRESO], ayuda: 'Elegí una o escribí una nueva.' },
        { campo: 'monto', etiqueta: 'Monto', tipo: 'pesos', requerido: true, min: 0 },
        { campo: 'descripcion', etiqueta: 'Descripción', ancho: 'completo' },
        { campo: 'medio_pago', etiqueta: 'Medio de pago', tipo: 'select', opciones: N.MEDIOS_PAGO },
        { campo: 'proveedor_id', etiqueta: 'Proveedor', tipo: 'select', numerico: true, vacio: 'Ninguno', opciones: x.proveedores.map((p) => ({ valor: p.id, texto: p.nombre })) },
        { campo: 'evento_id', etiqueta: 'Feria o evento', tipo: 'select', numerico: true, vacio: 'Ninguno', opciones: x.eventos.map((e) => ({ valor: e.id, texto: e.nombre })), ayuda: 'Se suma a su balance.' },
        { campo: 'campana_id', etiqueta: 'Campaña de marketing', tipo: 'select', numerico: true, vacio: 'Ninguna', opciones: x.campanas.map((c) => ({ valor: c.id, texto: c.nombre })), ayuda: 'Se suma al gasto de la campaña.' }
      ]
    });
    if (abrirNuevo) setTimeout(() => crud.nuevo(), 300);
  }

  // ---------- Ganancia por producto (la usa Reportes) ----------
  App.rentabilidadProductos = (v, desde, hasta) => {
    const validos = new Set(v.pedidos.filter((p) => N.pedidoValido(p) && (!desde || p.fecha >= desde) && (!hasta || p.fecha <= hasta)).map((p) => p.id));
    const grupos = U.agrupar(v.items.filter((i) => validos.has(i.pedido_id)), (i) => i.producto_id || 'x-' + i.descripcion);
    return Object.entries(grupos).map(([k, its]) => {
      const p = v.productosId[its[0].producto_id];
      const ingresos = U.sumar(its, (i) => i.cantidad * i.precio_unitario);
      const costo = U.sumar(its, (i) => i.cantidad * i.costo_unitario);
      return { id: k, mayorista: N.esMayorista(its[0], v.productosId), nombre: p ? p.nombre : (its[0].descripcion || 'Producto borrado'), unidades: U.sumar(its, (i) => i.cantidad), ingresos, costo, ganancia: ingresos - costo, margen: U.margen(ingresos, costo) };
    }).sort((a, b) => b.ganancia - a.ganancia);
  };


  App.registrar({
    id: 'finanzas', titulo: 'Finanzas', icono: 'finanzas', grupo: 'admin',
    descripcion: 'Lo que entró y salió en cada mes, el resultado y los gastos fijos.',
    render(cont, param) {
      periodo = U.mes(U.hoy());
      if (param === 'operativos' || param === 'nuevo') { try { sessionStorage.setItem('pest-finanzas', param === 'operativos' ? 'operativos' : 'movimientos'); } catch { /* nada */ } }
      App.asegurarGastosFijos();
      UI.pestanas(cont, [
        { id: 'movimientos', titulo: 'Movimientos', render: async (c) => { await App.asegurarGastosFijos(); dibujar(c, param === 'nuevo'); } },
        { id: 'operativos', titulo: 'Gastos operativos', render: App.pestanaGastosOperativos }
      ], 'finanzas');
    }
  });
})();
