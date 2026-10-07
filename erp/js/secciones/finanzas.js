/* =====================================================================
   SECCIÓN · FINANZAS
   Ingresos y egresos, resultado mensual y rentabilidad por producto.
   Las ventas se suman solas desde la sección Ventas: acá se cargan
   los gastos y los OTROS ingresos (entradas de eventos, etc.).
   ===================================================================== */
(function () {
  // Junta ventas + movimientos por mes
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

  // ---------- Movimientos: ventas (automáticas) + otros ingresos + gastos ----------
  function pestanaMovimientos(cuerpo, abrirNuevo) {
    const crud = Seccion.crud({
      contenedor: cuerpo, tabla: 'movimientos_financieros', nombre: 'movimiento', textoNuevo: 'Cargar gasto o ingreso',
      async cargar() {
        const [movs, eventos, proveedores, campanas, v] = await Promise.all([
          DB.listar('movimientos_financieros', { orden: 'fecha', asc: false }), DB.listar('eventos', { orden: 'fecha', asc: false }),
          DB.listar('proveedores', { orden: 'nombre' }), DB.listar('campanas', { orden: 'fecha_inicio', asc: false }), N.cargarVentas()]);
        // Cada venta aparece como un ingreso (se edita desde Ventas)
        const ventas = v.pedidos.filter(N.pedidoValido).map((p) => ({
          id: 'v' + p.id, _venta: p.id, fecha: p.fecha, tipo: 'ingreso', categoria: 'Ventas', monto: p.total, medio_pago: p.medio_pago,
          evento_id: p.evento_id,
          descripcion: `Venta #${p.id} · ${N.nombreCliente(v.clientesId, p.cliente_id)}`,
          _detalle: p.items.map((i) => (v.productosId[i.producto_id]?.nombre || i.descripcion) + ' ×' + i.cantidad).join(', ')
        }));
        const filas = [...ventas, ...movs].sort((a, b) => b.fecha.localeCompare(a.fecha));
        return { filas, extra: { eventos, proveedores, campanas, ev: U.porId(eventos), prov: U.porId(proveedores), camp: U.porId(campanas) } };
      },
      buscar: (m, x) => [m.descripcion, m._detalle, m.categoria, m.medio_pago, x.ev[m.evento_id]?.nombre, x.prov[m.proveedor_id]?.nombre].join(' '),
      filtros: [
        { id: 'tipo', etiqueta: 'Tipo', opciones: [{ valor: 'venta', texto: 'Ventas' }, { valor: 'ingreso', texto: 'Otros ingresos' }, { valor: 'egreso', texto: 'Egresos' }],
          valor: (m) => (m._venta ? 'venta' : m.tipo) },
        { id: 'cat', etiqueta: 'Categoría', opciones: (f) => [...new Set(f.map((m) => m.categoria))].sort(), valor: (m) => m.categoria },
        { id: 'mes', etiqueta: 'Mes', opciones: (f) => [...new Set(f.map((m) => U.mes(m.fecha)))].sort().reverse().map((x) => ({ valor: x, texto: U.nombreMes(x) })), valor: (m) => U.mes(m.fecha) }
      ],
      resumen: (filas) => {
        const ven = U.sumar(filas.filter((m) => m._venta), (m) => m.monto);
        const ing = U.sumar(filas.filter((m) => !m._venta && m.tipo === 'ingreso'), (m) => m.monto);
        const egr = U.sumar(filas.filter((m) => m.tipo === 'egreso'), (m) => m.monto);
        const res = ven + ing - egr;
        return `<div class="grilla grilla-4">
          ${UI.numeroDestacado('Ventas', U.pesos(ven), 'se suman solas desde Ventas')}
          ${UI.numeroDestacado('Otros ingresos', U.pesos(ing))}
          ${UI.numeroDestacado('Egresos', U.pesos(egr))}
          ${UI.numeroDestacado('Resultado', U.pesos(res), 'de lo que estás viendo', res >= 0 ? 'ok' : 'alerta')}
        </div>`;
      },
      columnas: [
        { titulo: 'Fecha', valor: (m) => U.fecha(m.fecha) },
        { titulo: 'Detalle', valor: (m, x) => `${U.esc(m.descripcion || m.categoria)}<br><small class="muted">${m._venta ? U.esc(m._detalle)
          : [m.categoria, x.prov[m.proveedor_id]?.nombre, x.ev[m.evento_id] ? 'Evento: ' + x.ev[m.evento_id].nombre : null, x.camp[m.campana_id] ? 'Campaña: ' + x.camp[m.campana_id].nombre : null].filter(Boolean).map(U.esc).join(' · ')}</small>` },
        { titulo: 'Tipo', valor: (m) => m._venta ? UI.etiqueta('Venta', 'info') : m.tipo === 'ingreso' ? UI.etiqueta('Ingreso', 'ok') : UI.etiqueta('Egreso', 'neutro') },
        { titulo: 'Medio', valor: (m) => U.esc(m.medio_pago || '—') },
        { titulo: 'Monto', clase: 'num', valor: (m) => `<b style="color:${m.tipo === 'ingreso' ? 'var(--ok)' : 'var(--texto)'}">${m.tipo === 'egreso' ? '−' : '+'}${U.pesos(m.monto)}</b>` }
      ],
      // Las ventas se editan y borran desde Ventas
      interceptar: (m) => { if (m._venta) { App.ir('ventas', 'editar-' + m._venta); return true; } return false; },
      noBorrar: (m) => (m._venta ? 'Las ventas se borran desde la sección Ventas.' : m.categoria === 'Puesto de feria' ? 'Este gasto viene del costo del puesto: cambialo desde Eventos.' : null),
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


  // ---------- Resultado mensual ----------
  async function pestanaResultado(cuerpo) {
    const d = await datosMensuales();
    const meses = U.ultimosMeses(12);
    // Desde el primer mes con movimiento (sin saltear meses vacíos en el medio)
    let filas = meses.map((m) => resumenMes(m, d));
    const primero = filas.findIndex((x) => x.ventas || x.ingresos || x.egresos);
    filas = filas.slice(primero === -1 ? filas.length - 1 : primero);
    const actual = U.mes(U.hoy());
    const r = resumenMes(actual, d);
    const cats = U.agrupar(d.movs.filter((m) => m.tipo === 'egreso' && U.mes(m.fecha) === actual), (m) => m.categoria);
    const total = U.sumar(filas, (x) => x.resultado);
    cuerpo.innerHTML = `
      <div class="grilla grilla-4">
        ${UI.numeroDestacado('Ventas del mes', U.pesos(r.ventas), U.nombreMes(actual))}
        ${UI.numeroDestacado('Otros ingresos', U.pesos(r.ingresos))}
        ${UI.numeroDestacado('Egresos', U.pesos(r.egresos))}
        ${UI.numeroDestacado('Resultado del mes', U.pesos(r.resultado), 'ventas + ingresos − egresos', r.resultado >= 0 ? 'ok' : 'alerta')}
      </div>
      <div class="grilla grilla-2 separado">
        <section class="tarjeta"><h2>Resultado por mes</h2>
          ${UI.grafico.columnas(filas.map((x) => ({ etiqueta: U.nombreMes(x.mes, true), valor: x.resultado })))}</section>
        <section class="tarjeta"><h2>Gastos de ${U.MESES[Number(actual.slice(5)) - 1]} por categoría</h2>
          ${UI.grafico.barras(Object.entries(cats).map(([k, v]) => ({ etiqueta: k, valor: U.sumar(v, (m) => m.monto) })).sort((a, b) => b.valor - a.valor), { vacio: 'Todavía no hay gastos este mes.' })}</section>
      </div>
      <section class="separado">
        ${UI.tabla({
          filas: [...filas].reverse().map((x) => ({ ...x, id: x.mes })),
          columnas: [
            { titulo: 'Mes', valor: (x) => U.nombreMes(x.mes) },
            { titulo: 'Ventas', clase: 'num', valor: (x) => U.pesos(x.ventas) },
            { titulo: 'Otros ingresos', clase: 'num', valor: (x) => U.pesos(x.ingresos) },
            { titulo: 'Egresos', clase: 'num', valor: (x) => U.pesos(x.egresos) },
            { titulo: 'Resultado', clase: 'num', valor: (x) => `<b style="color:${x.resultado >= 0 ? 'var(--ok)' : 'var(--alerta)'}">${U.pesos(x.resultado)}</b>` }
          ]
        })}
        <p class="muted chico">Acumulado del período: <b>${U.pesos(total)}</b>. Las compras de mercadería cuentan como egreso el mes en que se pagan.</p>
      </section>`;
  }

  // ---------- Rentabilidad por producto ----------
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

  async function pestanaRentabilidad(cuerpo) {
    const v = await N.cargarVentas();
    const periodos = [
      { valor: '', texto: 'Desde siempre' },
      { valor: U.hoy().slice(0, 4) + '-01-01', texto: 'Este año' },
      { valor: U.ultimosMeses(3)[0] + '-01', texto: 'Últimos 3 meses' },
      { valor: U.mes(U.hoy()) + '-01', texto: 'Este mes' }
    ];
    cuerpo.innerHTML = `<div class="barra-herramientas"><div class="filtros"><select aria-label="Período">${periodos.map((p) => `<option value="${p.valor}">${p.texto}</option>`).join('')}</select></div></div><div data-r></div>`;
    const dibujar = () => {
      const filas = App.rentabilidadProductos(v, cuerpo.querySelector('select').value);
      const tot = { ing: U.sumar(filas, (f) => f.ingresos), gan: U.sumar(filas, (f) => f.ganancia) };
      cuerpo.querySelector('[data-r]').innerHTML = `
        <div class="grilla grilla-3">
          ${UI.numeroDestacado('Vendido en productos', U.pesos(tot.ing), 'sin envíos ni descuentos')}
          ${UI.numeroDestacado('Ganancia bruta', U.pesos(tot.gan), 'precio − costo de lo vendido', 'ok')}
          ${UI.numeroDestacado('Margen promedio', U.porcentaje(U.margen(tot.ing, tot.ing - tot.gan)))}
        </div>
        <p class="muted chico">El costo es el que tenía cada producto al momento de la venta.</p>
        ${UI.tabla({
          filas, vacio: 'No hay ventas en este período.',
          columnas: [
            { titulo: 'Producto', valor: (f) => `<b style="font-weight:500">${U.esc(f.nombre)}</b>` },
            { titulo: 'Unidades', clase: 'num', valor: (f) => f.unidades },
            { titulo: 'Ingresos', clase: 'num', valor: (f) => U.pesos(f.ingresos) },
            { titulo: 'Costo', clase: 'num', valor: (f) => U.pesos(f.costo) },
            { titulo: 'Ganancia', clase: 'num', valor: (f) => `<b>${U.pesos(f.ganancia)}</b>` },
            { titulo: 'Margen', clase: 'num', valor: (f) => U.porcentaje(f.margen) }
          ]
        })}`;
    };
    cuerpo.querySelector('select').onchange = dibujar;
    dibujar();
  }

  App.registrar({
    id: 'finanzas', titulo: 'Finanzas', icono: 'finanzas', grupo: 'admin',
    descripcion: 'Gastos, otros ingresos, resultado de cada mes y qué productos dejan más ganancia.',
    render(cont, param) {
      if (param === 'nuevo') { try { sessionStorage.removeItem('pest-finanzas'); } catch { /* nada */ } }
      UI.pestanas(cont, [
        { id: 'movimientos', titulo: 'Ingresos y egresos', render: (c) => pestanaMovimientos(c, param === 'nuevo') },
        { id: 'resultado', titulo: 'Resultado mensual', render: pestanaResultado },
        { id: 'rentabilidad', titulo: 'Rentabilidad por producto', render: pestanaRentabilidad }
      ], 'finanzas');
    }
  });
})();
