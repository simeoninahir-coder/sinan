/* =====================================================================
   SECCIÓN · VENTAS / PEDIDOS
   Un pedido tiene uno o varios productos. Al guardarlo, la base
   descuenta el stock sola. Si se cancela o se borra, el stock vuelve.
   ===================================================================== */
(function () {
  const NUEVO_CLIENTE = '__nuevo__';

  // Ventana de pedido (nuevo o editar)
  function abrirPedido(pedido, ctx, recargar) {
    const { clientes, productos, eventos, stock } = ctx;
    const prodId = U.porId(productos);
    const activos = productos.filter((p) => p.estado !== 'Discontinuado' || (pedido && pedido.items.some((i) => i.producto_id === p.id)));
    // Stock disponible por producto|color (si es edición, se suma lo que ya tenía este pedido)
    const disponible = {};
    stock.forEach((s) => { disponible[s.producto_id + '|' + s.color] = s.cantidad; });
    if (pedido && pedido.estado !== 'Cancelado') pedido.items.forEach((i) => { const k = i.producto_id + '|' + i.color; disponible[k] = (disponible[k] || 0) + i.cantidad; });

    const camposCabecera = [
      { campo: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: U.hoy },
      { campo: 'cliente_id', etiqueta: 'Cliente', tipo: 'select', vacio: 'Sin cliente / anónimo',
        opciones: [{ valor: NUEVO_CLIENTE, texto: '➕ Cliente nueva…' }, ...clientes.map((c) => ({ valor: c.id, texto: c.nombre }))] },
      { campo: '_cli_nombre', etiqueta: 'Nombre de la clienta nueva', noGuardar: true },
      { campo: '_cli_contacto', etiqueta: 'Teléfono o Instagram', noGuardar: true },
      { campo: 'canal', etiqueta: 'Canal de venta', tipo: 'select', opciones: N.CANALES, requerido: true, vacio: false, defecto: 'Presencial' },
      { campo: 'medio_pago', etiqueta: 'Medio de pago', tipo: 'select', opciones: N.MEDIOS_PAGO, vacio: 'Sin definir', defecto: 'Transferencia' },
      { campo: 'estado', etiqueta: 'Estado', tipo: 'select', opciones: N.ESTADOS_PEDIDO, requerido: true, vacio: false, defecto: 'Pendiente' },
      { campo: 'evento_id', etiqueta: 'Evento (si se vendió en uno)', tipo: 'select', numerico: true, vacio: 'Ninguno',
        opciones: eventos.map((e) => ({ valor: e.id, texto: `${e.nombre} · ${U.fecha(e.fecha)}` })) }
    ];
    const camposPie = [
      { campo: 'descuento', etiqueta: 'Descuento', tipo: 'pesos', min: 0, defecto: 0 },
      { campo: 'envio', etiqueta: 'Envío (cobrado a la clienta)', tipo: 'pesos', min: 0, defecto: 0 },
      { campo: 'notas', etiqueta: 'Notas', tipo: 'area', filas: 2 }
    ];
    const valores = pedido || {};

    const form = document.createElement('form');
    form.className = 'formulario';
    form.innerHTML = `
      <div class="grilla-form">
        ${camposCabecera.map((c) => UI.campoHTML(c, valores)).join('')}
        <div class="items-pedido">
          <span class="campo-etiqueta">Productos <b>*</b></span>
          <div class="lista-items"></div>
          <button type="button" class="boton boton-secundario boton-chico" data-agregar style="align-self:flex-start">+ Agregar producto</button>
        </div>
        ${camposPie.map((c) => UI.campoHTML(c, valores)).join('')}
        <div class="totales-pedido"><span>Subtotal: <b data-subtotal></b></span><span>Total: <strong data-total></strong></span></div>
      </div>
      <p class="form-error" hidden></p>
      <div class="acciones-form">
        <button type="button" class="boton boton-secundario" data-cancelar>Cancelar</button>
        <button type="submit" class="boton">${pedido ? 'Guardar cambios' : 'Registrar venta'}</button>
      </div>`;
    const m = UI.modal({ titulo: pedido ? `Pedido #${pedido.id}` : 'Nueva venta', contenido: form, ancho: 'grande' });
    form.querySelector('[data-cancelar]').onclick = m.cerrar;
    const listaItems = form.querySelector('.lista-items');

    // Mostrar campos de clienta nueva solo si se eligió esa opción
    const toggleCliente = () => {
      const nuevo = form.cliente_id.value === NUEVO_CLIENTE;
      form.querySelector('[data-campo="_cli_nombre"]').hidden = !nuevo;
      form.querySelector('[data-campo="_cli_contacto"]').hidden = !nuevo;
      form._cli_nombre.required = nuevo;
    };
    form.cliente_id.addEventListener('change', toggleCliente); toggleCliente();

    // Un renglón de producto
    function agregarItem(item = {}) {
      const fila = document.createElement('div');
      fila.className = 'item-pedido';
      const opciones = activos.map((p) => `<option value="${p.id}" ${p.id === item.producto_id ? 'selected' : ''}>${U.esc(p.nombre)} · ${U.pesos(p.precio)}</option>`).join('');
      const borrado = item.id && !item.producto_id ? `<option value="" selected>${U.esc(item.descripcion || 'Producto borrado')}</option>` : '<option value="">— Elegir producto —</option>';
      fila.innerHTML = `
        <div class="campo"><label class="campo-etiqueta">Producto</label><select data-i="producto">${borrado}${opciones}</select></div>
        <div class="campo"><label class="campo-etiqueta">Color</label><select data-i="color"></select></div>
        <div class="campo"><label class="campo-etiqueta">Cant.</label><input data-i="cantidad" type="number" min="1" step="1" value="${item.cantidad || 1}" required></div>
        <div class="campo"><label class="campo-etiqueta">Precio unit.</label><div class="con-prefijo"><span>$</span><input data-i="precio" type="number" min="0" step="1" value="${item.precio_unitario ?? ''}" required></div></div>
        <button type="button" class="boton-icono boton-icono-peligro quitar-item" aria-label="Quitar producto" title="Quitar">✕</button>
        <p class="aviso-stock" hidden></p>`;
      fila.dataset.descripcion = item.descripcion || '';
      const selP = fila.querySelector('[data-i=producto]');
      const selC = fila.querySelector('[data-i=color]');
      const precio = fila.querySelector('[data-i=precio]');
      const llenarColores = (elegido) => {
        const p = prodId[Number(selP.value)];
        const cols = p && p.colores && p.colores.length ? p.colores : ['Único'];
        if (elegido && !cols.includes(elegido)) cols.push(elegido);
        selC.innerHTML = cols.map((c) => `<option ${c === elegido ? 'selected' : ''}>${U.esc(c)}</option>`).join('');
      };
      llenarColores(item.color);
      selP.addEventListener('change', () => {
        llenarColores();
        const p = prodId[Number(selP.value)];
        if (p) precio.value = p.precio;
        actualizar();
      });
      fila.querySelector('.quitar-item').onclick = () => { fila.remove(); actualizar(); };
      fila.addEventListener('input', actualizar);
      fila.addEventListener('change', actualizar);
      listaItems.appendChild(fila);
      actualizar();
    }

    function leerItems() {
      return [...listaItems.querySelectorAll('.item-pedido')].map((f) => ({
        producto_id: f.querySelector('[data-i=producto]').value ? Number(f.querySelector('[data-i=producto]').value) : null,
        descripcion: f.dataset.descripcion || null,
        color: f.querySelector('[data-i=color]').value || 'Único',
        cantidad: Number(f.querySelector('[data-i=cantidad]').value) || 0,
        precio_unitario: Number(f.querySelector('[data-i=precio]').value) || 0,
        _fila: f
      }));
    }

    function actualizar() {
      const items = leerItems();
      // Aviso si no alcanza el stock (no bloquea: se puede vender por encargo)
      const pedidoPor = {};
      items.forEach((i) => { if (i.producto_id) { const k = i.producto_id + '|' + i.color; pedidoPor[k] = (pedidoPor[k] || 0) + i.cantidad; } });
      items.forEach((i) => {
        const av = i._fila.querySelector('.aviso-stock');
        const k = i.producto_id + '|' + i.color;
        const hay = disponible[k] ?? 0;
        if (i.producto_id && pedidoPor[k] > hay) {
          av.textContent = `⚠ Hay ${hay} en stock de este color. Si lo guardás, el stock queda en negativo.`;
          av.hidden = false;
        } else av.hidden = true;
      });
      const sub = U.sumar(items, (i) => i.cantidad * i.precio_unitario);
      const total = sub - (Number(form.descuento.value) || 0) + (Number(form.envio.value) || 0);
      form.querySelector('[data-subtotal]').textContent = U.pesos(sub);
      form.querySelector('[data-total]').textContent = U.pesos(total);
    }
    form.descuento.addEventListener('input', actualizar);
    form.envio.addEventListener('input', actualizar);
    form.querySelector('[data-agregar]').onclick = () => agregarItem();

    if (pedido && pedido.items.length) pedido.items.forEach(agregarItem); else agregarItem();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = form.querySelector('.form-error'); err.hidden = true;
      if (!form.reportValidity()) return;
      const items = leerItems().map(({ _fila, ...i }) => i);
      const boton = form.querySelector('[type=submit]');
      try {
        if (!items.length) throw new Error('Agregá al menos un producto.');
        if (items.some((i) => !i.producto_id && !i.descripcion)) throw new Error('Elegí el producto en cada renglón.');
        if (items.some((i) => i.cantidad < 1)) throw new Error('Las cantidades tienen que ser 1 o más.');
        boton.disabled = true; boton.classList.add('cargando');
        const cab = UI.leerFormulario(form, [...camposCabecera, ...camposPie]);
        if (cab.cliente_id === NUEVO_CLIENTE) {
          const contacto = (form._cli_contacto.value || '').trim();
          const nueva = await DB.crear('clientes', {
            nombre: form._cli_nombre.value.trim(), canal_origen: cab.canal,
            telefono: contacto.startsWith('@') ? null : contacto || null,
            instagram: contacto.startsWith('@') ? contacto : null
          });
          cab.cliente_id = nueva.id;
        }
        cab.cliente_id = cab.cliente_id ? Number(cab.cliente_id) : null;
        if (pedido) cab.id = pedido.id;
        const id = await DB.rpc('guardar_pedido', { p_pedido: cab, p_items: items });
        UI.aviso(pedido ? 'Pedido actualizado' : `Venta registrada (pedido #${id}) · stock descontado`);
        m.cerrar();
        recargar();
        App.actualizarInsignias();
      } catch (ex) {
        console.error(ex);
        err.textContent = ex.message; err.hidden = false;
      } finally { boton.disabled = false; boton.classList.remove('cargando'); }
    });
  }

  // Cambio rápido de estado
  function cambiarEstado(p, recargar) {
    UI.formularioModal({
      titulo: `Estado del pedido #${p.id}`, ancho: 'chico', textoBoton: 'Cambiar',
      campos: [{ campo: 'estado', etiqueta: 'Nuevo estado', tipo: 'select', opciones: N.ESTADOS_PEDIDO, vacio: false, ancho: 'completo',
        ayuda: 'Si lo pasás a "Cancelado", el stock vuelve al inventario.' }],
      valores: p,
      alGuardar: async (d) => {
        await DB.actualizar('pedidos', p.id, { estado: d.estado });
        UI.aviso(`Pedido #${p.id}: ${d.estado}`);
        recargar(); App.actualizarInsignias();
      }
    });
  }

  App.registrar({
    id: 'ventas', titulo: 'Ventas', icono: 'ventas',
    descripcion: 'Pedidos con uno o varios productos. El stock se descuenta solo.',
    render(cont, param) {
      let pendienteAbrir = param;
      const crud = Seccion.crud({
        contenedor: cont, tabla: 'pedidos', nombre: 'pedido', textoNuevo: 'Registrar venta',
        async cargar() {
          const [v, eventos, stock] = await Promise.all([N.cargarVentas(), DB.listar('eventos', { orden: 'fecha', asc: false }), DB.listar('stock')]);
          const ctx = { ...v, eventos, stock };
          // Abre un pedido si se llegó con #/ventas/nuevo o #/ventas/editar-ID
          if (pendienteAbrir) {
            const p = pendienteAbrir; pendienteAbrir = null;
            setTimeout(() => {
              if (p === 'nuevo') abrirPedido(null, ctx, crud.recargar);
              else if (p.startsWith('editar-')) { const ped = v.pedidos.find((x) => x.id === Number(p.slice(7))); if (ped) abrirPedido(ped, ctx, crud.recargar); }
            });
          }
          return { filas: v.pedidos, extra: ctx };
        },
        buscar: (p, x) => `#${p.id} ${N.nombreCliente(x.clientesId, p.cliente_id)} ${p.items.map((i) => (x.productosId[i.producto_id]?.nombre || i.descripcion) + ' ' + i.color).join(' ')} ${p.notas || ''}`,
        filtros: [
          { id: 'estado', etiqueta: 'Estado', opciones: N.ESTADOS_PEDIDO, valor: (p) => p.estado },
          { id: 'canal', etiqueta: 'Canal', opciones: N.CANALES, valor: (p) => p.canal },
          { id: 'medio', etiqueta: 'Medio de pago', opciones: N.MEDIOS_PAGO, valor: (p) => p.medio_pago },
          { id: 'mes', etiqueta: 'Mes', opciones: (f) => [...new Set(f.map((p) => U.mes(p.fecha)))].map((x) => ({ valor: x, texto: U.nombreMes(x) })), valor: (p) => U.mes(p.fecha) }
        ],
        resumen: (filas) => {
          const val = filas.filter(N.pedidoValido);
          const tot = U.sumar(val, (p) => p.total);
          return `<div class="grilla grilla-3">
            ${UI.numeroDestacado('Total vendido (lo filtrado)', U.pesos(tot), 'sin contar cancelados')}
            ${UI.numeroDestacado('Pedidos', val.length, `${filas.length - val.length} cancelados`)}
            ${UI.numeroDestacado('Ticket promedio', U.pesos(val.length ? tot / val.length : 0))}
          </div>`;
        },
        columnas: [
          { titulo: 'Pedido', valor: (p, x) => `<b>#${p.id}</b> · ${U.esc(N.nombreCliente(x.clientesId, p.cliente_id))}<br><small class="muted">${U.fecha(p.fecha)}</small>` },
          { titulo: 'Productos', valor: (p, x) => p.items.map((i) => `${U.esc(x.productosId[i.producto_id]?.nombre || i.descripcion || '—')}${i.color !== 'Único' ? ` <small class="muted">(${U.esc(i.color)})</small>` : ''} ×${i.cantidad}`).join('<br>') },
          { titulo: 'Canal', valor: (p) => U.esc(p.canal) + (p.medio_pago ? `<br><small class="muted">${U.esc(p.medio_pago)}</small>` : '') },
          { titulo: 'Estado', valor: (p) => UI.etiqueta(p.estado, N.tonoPedido(p.estado)) },
          { titulo: 'Total', clase: 'num', valor: (p) => `<b>${U.pesos(p.total)}</b>` }
        ],
        accionesExtra: () => `<button type="button" class="boton-texto" data-accion="estado">Estado</button>`,
        alAccion: { estado: (p, x, recargar) => cambiarEstado(p, recargar) },
        mensajeBorrar: () => 'El stock de sus productos vuelve al inventario.',
        editar: (fila, ctx, recargar) => abrirPedido(fila, ctx, recargar)
      });
    }
  });
})();
