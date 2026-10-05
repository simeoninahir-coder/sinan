/* =====================================================================
   SECCIÓN · CLIENTES
   Datos de contacto, canal de origen, historial de compras y total gastado.
   ===================================================================== */
(function () {
  function verHistorial(c, x) {
    const pedidos = x.pedidosPorCliente[c.id] || [];
    const val = pedidos.filter(N.pedidoValido);
    const m = UI.modal({
      titulo: c.nombre, ancho: 'grande',
      contenido: `
        <div class="grilla grilla-3">
          ${UI.numeroDestacado('Total gastado', U.pesos(U.sumar(val, (p) => p.total)))}
          ${UI.numeroDestacado('Compras', val.length)}
          ${UI.numeroDestacado('Última compra', val[0] ? U.fecha(val[0].fecha) : '—')}
        </div>
        <p class="separado muted chico">${[c.telefono, c.email, c.instagram, c.ciudad].filter(Boolean).map(U.esc).join(' · ') || 'Sin datos de contacto'}
          ${c.canal_origen ? ' · Llegó por ' + U.esc(c.canal_origen) : ''}</p>
        ${c.notas ? `<p class="nota">${U.esc(c.notas)}</p>` : ''}
        <h3 style="margin:18px 0 10px">Historial de compras</h3>
        ${UI.tabla({
          filas: pedidos, vacio: 'Todavía no compró nada.',
          columnas: [
            { titulo: 'Pedido', valor: (p) => `<a href="#/ventas/editar-${p.id}">#${p.id}</a> · ${U.fecha(p.fecha)}` },
            { titulo: 'Productos', valor: (p) => p.items.map((i) => `${U.esc(x.productosId[i.producto_id]?.nombre || i.descripcion || '—')} ×${i.cantidad}`).join('<br>') },
            { titulo: 'Canal', valor: (p) => U.esc(p.canal) },
            { titulo: 'Estado', valor: (p) => UI.etiqueta(p.estado, N.tonoPedido(p.estado)) },
            { titulo: 'Total', clase: 'num', valor: (p) => U.pesos(p.total) }
          ]
        })}`
    });
    m.cuerpo.addEventListener('click', (e) => { if (e.target.closest('a')) m.cerrar(); });
  }

  App.registrar({
    id: 'clientes', titulo: 'Clientes', icono: 'clientes',
    descripcion: 'Quién te compra, por dónde llegó y cuánto lleva gastado.',
    render(cont) {
      Seccion.crud({
        contenedor: cont, tabla: 'clientes', nombre: 'cliente', textoNuevo: 'Nueva clienta',
        async cargar() {
          const v = await N.cargarVentas();
          const pedidosPorCliente = U.agrupar(v.pedidos, (p) => p.cliente_id);
          v.clientes.forEach((c) => {
            const val = (pedidosPorCliente[c.id] || []).filter(N.pedidoValido);
            c._compras = val.length;
            c._total = U.sumar(val, (p) => p.total);
            c._ultima = val[0] ? val[0].fecha : null;
          });
          return { filas: v.clientes, extra: { ...v, pedidosPorCliente } };
        },
        buscar: (c) => [c.nombre, c.telefono, c.email, c.instagram, c.ciudad, c.notas].join(' '),
        filtros: [
          { id: 'canal', etiqueta: 'Canal de origen', opciones: (f) => [...new Set([...N.CANALES, ...f.map((c) => c.canal_origen).filter(Boolean)])], valor: (c) => c.canal_origen },
          { id: 'tipo', etiqueta: 'Compras', opciones: [{ valor: 'recurrente', texto: 'Compró 2 veces o más' }, { valor: 'una', texto: 'Compró 1 vez' }, { valor: 'ninguna', texto: 'Todavía no compró' }],
            valor: (c) => c._compras >= 2 ? 'recurrente' : c._compras === 1 ? 'una' : 'ninguna' }
        ],
        columnas: [
          { titulo: 'Nombre', valor: (c) => `<b style="font-weight:500">${U.esc(c.nombre)}</b>${c.ciudad ? `<br><small class="muted">${U.esc(c.ciudad)}</small>` : ''}` },
          { titulo: 'Contacto', valor: (c) => [c.telefono, c.instagram, c.email].filter(Boolean).map(U.esc).join('<br>') || '—' },
          { titulo: 'Origen', valor: (c) => U.esc(c.canal_origen || '—') },
          { titulo: 'Compras', clase: 'num', valor: (c) => c._compras },
          { titulo: 'Total gastado', clase: 'num', valor: (c) => `<b>${U.pesos(c._total)}</b>` },
          { titulo: 'Última compra', valor: (c) => U.fecha(c._ultima) }
        ],
        campos: [
          { campo: 'nombre', etiqueta: 'Nombre y apellido', requerido: true },
          { campo: 'canal_origen', etiqueta: 'Canal de origen', tipo: 'select', opciones: N.CANALES },
          { campo: 'telefono', etiqueta: 'Teléfono / WhatsApp', tipo: 'tel' },
          { campo: 'instagram', etiqueta: 'Instagram', placeholder: '@usuario' },
          { campo: 'email', etiqueta: 'Email', tipo: 'email' },
          { campo: 'ciudad', etiqueta: 'Ciudad / barrio' },
          { campo: 'notas', etiqueta: 'Notas', tipo: 'area', placeholder: 'Gustos, talle, cumpleaños…' }
        ],
        mensajeBorrar: () => 'Sus compras quedan registradas como "Sin cliente".',
        accionesExtra: () => `<button type="button" class="boton-texto" data-accion="historial">Historial</button>`,
        alAccion: { historial: (c, x) => verHistorial(c, x) }
      });
    }
  });
})();
