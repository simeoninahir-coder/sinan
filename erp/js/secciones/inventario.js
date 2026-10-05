/* =====================================================================
   SECCIÓN · INVENTARIO
   Stock por producto y color + historial de entradas, salidas y ajustes.
   El stock NUNCA se escribe a mano: cada cambio queda como movimiento
   y la base actualiza la cantidad sola.
   ===================================================================== */
(function () {
  const TIPOS = [
    { valor: 'entrada', texto: 'Entrada (llegó mercadería)' },
    { valor: 'salida', texto: 'Salida (regalo, falla, uso propio…)' },
    { valor: 'ajuste', texto: 'Ajuste (corrección, puede ser negativo)' }
  ];
  const tonoTipo = { entrada: 'ok', salida: 'info', ajuste: 'atencion' };
  const coloresDe = (p) => (p && p.colores && p.colores.length ? p.colores : ['Único']);

  // Ventana para cargar o editar un movimiento de stock
  function abrirMovimiento({ fila, valores = {}, productos, alGuardar }) {
    const prodId = U.porId(productos);
    const campos = [
      { campo: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: U.hoy },
      { campo: 'tipo', etiqueta: 'Tipo de movimiento', tipo: 'select', opciones: TIPOS, requerido: true, vacio: false },
      { campo: 'producto_id', etiqueta: 'Producto', tipo: 'select', numerico: true, requerido: true,
        opciones: productos.map((p) => ({ valor: p.id, texto: p.nombre })) },
      { campo: 'color', etiqueta: 'Color', tipo: 'select', requerido: true, vacio: false,
        opciones: (v) => coloresDe(prodId[v.producto_id]).concat(v.color && !coloresDe(prodId[v.producto_id]).includes(v.color) ? [v.color] : []) },
      { campo: 'cantidad', etiqueta: 'Cantidad', tipo: 'numero', requerido: true, paso: 1, ayuda: 'En un ajuste podés poner un número negativo para restar.' },
      { campo: 'motivo', etiqueta: 'Motivo / detalle', placeholder: 'Ej: Compra a proveedor, regalo a influencer…' }
    ];
    UI.formularioModal({
      titulo: fila ? 'Editar movimiento' : 'Nuevo movimiento de stock',
      campos, valores: fila || valores,
      alArmar(form) {
        form.producto_id.addEventListener('change', () => {
          const cols = coloresDe(prodId[Number(form.producto_id.value)]);
          form.color.innerHTML = cols.map((c) => `<option>${U.esc(c)}</option>`).join('');
        });
      },
      alGuardar: async (d) => {
        if (!Number.isInteger(d.cantidad) || d.cantidad === 0) throw new Error('La cantidad tiene que ser un número entero distinto de 0.');
        if (d.tipo !== 'ajuste' && d.cantidad < 0) throw new Error('En entradas y salidas la cantidad va en positivo.');
        if (fila) await DB.actualizar('movimientos_stock', fila.id, d); else await DB.crear('movimientos_stock', d);
        UI.aviso('Movimiento guardado · stock actualizado');
        alGuardar && alGuardar();
      }
    });
  }

  // ---------- Pestaña: stock actual ----------
  function pestanaStock(cuerpo) {
    Seccion.crud({
      contenedor: cuerpo, tabla: 'stock', nombre: 'stock', textoNuevo: 'Agregar producto/color',
      async cargar() {
        const [stock, productos, cfg] = await Promise.all([DB.listar('stock'), DB.listar('productos', { orden: 'nombre' }), App.config()]);
        const prod = U.porId(productos);
        const filas = stock.filter((s) => prod[s.producto_id]).map((s) => ({
          ...s, _p: prod[s.producto_id], _min: N.minimo(s, cfg), _estado: N.estadoStock(s, cfg)
        })).sort((a, b) => a._p.nombre.localeCompare(b._p.nombre) || a.color.localeCompare(b.color));
        return { filas, extra: { productos, cfg } };
      },
      buscar: (s) => s._p.nombre + ' ' + s.color + ' ' + (s._p.categoria || ''),
      filtros: [
        { id: 'estado', etiqueta: 'Estado', opciones: [{ valor: 'ok', texto: 'OK' }, { valor: 'bajo', texto: 'Stock bajo' }, { valor: 'sin', texto: 'Sin stock' }], valor: (s) => s._estado },
        { id: 'cat', etiqueta: 'Categoría', opciones: (f) => [...new Set(f.map((s) => s._p.categoria).filter(Boolean))].sort(), valor: (s) => s._p.categoria }
      ],
      resumen: (filas, extra) => `<div class="grilla grilla-3">
        ${UI.numeroDestacado('Unidades en stock', U.numero(U.sumar(filas, (s) => Math.max(0, s.cantidad))))}
        ${UI.numeroDestacado('Valor del stock (a costo)', U.pesos(U.sumar(filas, (s) => Math.max(0, s.cantidad) * (s._p.costo || 0))))}
        ${UI.numeroDestacado('Con stock bajo o sin stock', filas.filter((s) => s._estado !== 'ok').length, `mínimo general: ${extra.cfg.stock_minimo_defecto}`, filas.some((s) => s._estado !== 'ok') ? 'alerta' : 'ok')}
      </div>`,
      columnas: [
        { titulo: 'Producto', valor: (s) => `<div class="celda-producto">
            ${s._p.foto_url ? `<img class="miniatura" src="${U.esc(U.urlFoto(s._p.foto_url))}" alt="" loading="lazy">` : '<span class="miniatura"></span>'}
            <div><b>${U.esc(s._p.nombre)}</b><small>${U.esc(s.color)}</small></div></div>` },
        { titulo: 'Cantidad', clase: 'num', valor: (s) => `<b style="font-size:17px">${s.cantidad}</b>` },
        { titulo: 'Mínimo', clase: 'num', valor: (s) => `${s._min}${s.minimo === null ? ' <small class="muted">(general)</small>' : ''}` },
        { titulo: 'Estado', valor: (s) => N.etiquetaStock(s._estado) }
      ],
      accionesExtra: () => `
        <button type="button" class="boton-texto" data-accion="entrada" title="Registrar entrada">+ Entrada</button>
        <button type="button" class="boton-texto" data-accion="salida" title="Registrar salida">− Salida</button>`,
      alAccion: {
        entrada: (s, extra, recargar) => abrirMovimiento({ valores: { tipo: 'entrada', producto_id: s.producto_id, color: s.color }, productos: extra.productos, alGuardar: recargar }),
        salida: (s, extra, recargar) => abrirMovimiento({ valores: { tipo: 'salida', producto_id: s.producto_id, color: s.color }, productos: extra.productos, alGuardar: recargar })
      },
      mensajeBorrar: () => 'Se quita esta fila del inventario (el historial de movimientos se conserva).',
      // Edición propia: si cambiás la cantidad, se registra un ajuste
      editar(fila, extra, recargar) {
        const campos = [
          { campo: 'producto_id', etiqueta: 'Producto', tipo: 'select', numerico: true, requerido: true, soloLectura: !!fila,
            opciones: extra.productos.map((p) => ({ valor: p.id, texto: p.nombre })) },
          { campo: 'color', etiqueta: 'Color', requerido: true, soloLectura: !!fila, defecto: 'Único' },
          { campo: 'cantidad', etiqueta: fila ? 'Cantidad real (contada)' : 'Cantidad inicial', tipo: 'numero', paso: 1, requerido: true, defecto: 0,
            ayuda: fila ? 'Si la cambiás se registra un "ajuste" en el historial.' : 'Se registra como entrada.' },
          { campo: 'minimo', etiqueta: 'Stock mínimo', tipo: 'numero', paso: 1, min: 0,
            ayuda: `Vacío = usa el mínimo general (${extra.cfg.stock_minimo_defecto}).` }
        ];
        UI.formularioModal({
          titulo: fila ? `Stock · ${fila._p.nombre} (${fila.color})` : 'Agregar producto/color al inventario',
          campos, valores: fila || {},
          alGuardar: async (d) => {
            if (fila) {
              if (d.minimo !== fila.minimo) await DB.actualizar('stock', fila.id, { minimo: d.minimo });
              const dif = d.cantidad - fila.cantidad;
              if (dif) await DB.crear('movimientos_stock', { fecha: U.hoy(), producto_id: fila.producto_id, color: fila.color, tipo: 'ajuste', cantidad: dif, motivo: 'Ajuste manual (conteo)' });
            } else {
              await DB.crear('stock', { producto_id: d.producto_id, color: d.color, cantidad: 0, minimo: d.minimo });
              if (d.cantidad) await DB.crear('movimientos_stock', { fecha: U.hoy(), producto_id: d.producto_id, color: d.color, tipo: d.cantidad > 0 ? 'entrada' : 'ajuste', cantidad: d.cantidad, motivo: 'Stock inicial' });
            }
            UI.aviso('Stock actualizado');
            recargar();
          }
        });
      }
    });
  }

  // ---------- Pestaña: movimientos ----------
  function pestanaMovimientos(cuerpo) {
    Seccion.crud({
      contenedor: cuerpo, tabla: 'movimientos_stock', nombre: 'movimiento', textoNuevo: 'Registrar movimiento',
      async cargar() {
        const [movs, productos] = await Promise.all([DB.listar('movimientos_stock', { orden: 'fecha', asc: false }), DB.listar('productos', { orden: 'nombre' })]);
        const prod = U.porId(productos);
        movs.forEach((m) => { m._p = prod[m.producto_id] || { nombre: '(producto borrado)' }; });
        return { filas: movs, extra: { productos } };
      },
      buscar: (m) => `${m._p.nombre} ${m.color} ${m.motivo || ''} ${m.pedido_id || ''}`,
      filtros: [
        { id: 'tipo', etiqueta: 'Tipo', opciones: TIPOS.map((t) => ({ valor: t.valor, texto: t.valor[0].toUpperCase() + t.valor.slice(1) })), valor: (m) => m.tipo },
        { id: 'prod', etiqueta: 'Producto', opciones: (f, e) => e.productos.map((p) => ({ valor: p.id, texto: p.nombre })), valor: (m) => m.producto_id },
        { id: 'mes', etiqueta: 'Mes', opciones: (f) => [...new Set(f.map((m) => U.mes(m.fecha)))].map((x) => ({ valor: x, texto: U.nombreMes(x) })), valor: (m) => U.mes(m.fecha) }
      ],
      columnas: [
        { titulo: 'Fecha', valor: (m) => U.fecha(m.fecha) },
        { titulo: 'Producto', valor: (m) => `${U.esc(m._p.nombre)} <small class="muted">· ${U.esc(m.color)}</small>` },
        { titulo: 'Tipo', valor: (m) => UI.etiqueta(m.tipo[0].toUpperCase() + m.tipo.slice(1), tonoTipo[m.tipo]) },
        { titulo: 'Cantidad', clase: 'num', valor: (m) => { const d = m.tipo === 'salida' ? -m.cantidad : m.cantidad; return `<b>${d > 0 ? '+' : ''}${d}</b>`; } },
        { titulo: 'Motivo', valor: (m) => m.pedido_id ? `<a href="#/ventas/editar-${m.pedido_id}">${U.esc(m.motivo || 'Venta')}</a>` : U.esc(m.motivo || '—') }
      ],
      noBorrar: (m) => m.pedido_item_id ? 'Este movimiento viene de una venta: se cambia o borra desde Ventas.' : null,
      mensajeBorrar: () => 'El stock vuelve a como estaba antes de este movimiento.',
      editar(fila, extra, recargar) {
        if (fila && fila.pedido_item_id) return UI.aviso('Este movimiento viene de una venta: se cambia desde Ventas.', 'atencion');
        abrirMovimiento({ fila, productos: extra.productos, alGuardar: recargar });
      }
    });
  }

  App.registrar({
    id: 'inventario', titulo: 'Inventario', icono: 'inventario',
    descripcion: 'Stock por producto y color, con alertas de stock bajo e historial de movimientos.',
    render(cont) {
      UI.pestanas(cont, [
        { id: 'stock', titulo: 'Stock actual', render: pestanaStock },
        { id: 'movimientos', titulo: 'Movimientos', render: pestanaMovimientos }
      ], 'inventario');
    }
  });
})();
