/* =====================================================================
   SECCIÓN · VENTAS / PEDIDOS
   Cada pedido tiene pasos: preparar → entregar → cobrar. Arriba, en grande,
   lo que falta hacer. Al guardar, la base descuenta el stock sola.
   ===================================================================== */
(function () {
  const NUEVO_CLIENTE = '__nuevo__';

  // Ventana de pedido (nuevo o editar). "previo" sirve para precargar una venta (ej: desde una consulta).
  function abrirPedido(pedido, ctx, recargar, previo = null, alGuardado = null) {
    const { clientes, productos, eventos, stock, personas } = ctx;
    const prodId = U.porId(productos);
    const activos = productos.filter((p) => p.estado !== 'Discontinuado' || (pedido && pedido.items.some((i) => i.producto_id === p.id)));
    // Stock disponible por producto|color (si es edición, se suma lo que ya tenía este pedido)
    const disponible = {};
    stock.forEach((s) => { disponible[s.producto_id + '|' + s.color] = s.cantidad; });
    if (pedido && pedido.estado !== 'Cancelado') pedido.items.forEach((i) => { const k = i.producto_id + '|' + i.color; disponible[k] = (disponible[k] || 0) + i.cantidad; });

    const camposCabecera = [
      { campo: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: U.hoy },
      { campo: 'cliente_id', etiqueta: 'Cliente', tipo: 'select', vacio: 'Sin cliente / anónimo',
        opciones: [{ valor: NUEVO_CLIENTE, texto: 'Cliente nueva…' }, ...clientes.map((c) => ({ valor: c.id, texto: c.nombre }))] },
      { campo: '_cli_nombre', etiqueta: 'Nombre de la clienta nueva', noGuardar: true },
      { campo: '_cli_contacto', etiqueta: 'Teléfono o Instagram', noGuardar: true },
      { campo: 'canal', etiqueta: 'Canal de venta', tipo: 'select', opciones: N.CANALES, requerido: true, vacio: false, defecto: 'Presencial' },
      { campo: 'medio_pago', etiqueta: 'Medio de pago', tipo: 'select', opciones: N.MEDIOS_PAGO, vacio: 'Sin definir', defecto: 'Transferencia' },
      { campo: 'responsable_id', etiqueta: 'Responsable del pedido', tipo: 'select', numerico: true, vacio: 'Sin asignar',
        opciones: personas.filter((p) => p.activa || p.id === pedido?.responsable_id).map((p) => ({ valor: p.id, texto: p.nombre })) },
      { campo: 'evento_id', etiqueta: 'Feria o evento (si se vendió en uno)', tipo: 'select', numerico: true, vacio: 'Ninguno',
        opciones: eventos.map((e) => ({ valor: e.id, texto: `${e.tipo === 'Feria' ? 'Feria · ' : ''}${e.nombre} · ${U.fecha(e.fecha)}` })) },
      { campo: 'envio_metodo', etiqueta: 'Cómo se entrega', tipo: 'select', opciones: N.METODOS_ENVIO, vacio: 'Sin definir' },
      { campo: 'envio_detalle', etiqueta: 'Dirección / punto de encuentro / horario', placeholder: 'Ej: Plaza Laferrere, sábado 11 h' }
    ];
    const camposPie = [
      { campo: 'descuento', etiqueta: 'Descuento', tipo: 'pesos', min: 0, defecto: 0 },
      { campo: 'envio', etiqueta: 'Envío (cobrado a la clienta)', tipo: 'pesos', min: 0, defecto: 0 },
      { campo: 'notas', etiqueta: 'Notas', tipo: 'area', filas: 2 }
    ];
    const valores = pedido || previo || {};
    // Pasos: en una venta presencial suele estar todo hecho en el momento
    const pasosHTML = `<div class="campo campo-completo"><span class="campo-etiqueta">¿En qué paso está?</span>
      <div class="checks-pasos">${N.PASOS_PEDIDO.map((s) => `<label class="check-paso"><input type="checkbox" name="${s.campo}" ${valores[s.campo] ? 'checked' : ''}><span>${s.hecho}</span></label>`).join('')}</div>
      <small class="campo-ayuda">Tildá lo que ya está hecho. Lo que falte aparece en "Por preparar", "Por entregar" o "Por cobrar".</small></div>`;

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
        ${pasosHTML}
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

    // Si el canal es Feria/Evento, elige sola la feria o evento de esa fecha
    const elegirEvento = () => {
      if (!['Feria', 'Evento'].includes(form.canal.value) || form.evento_id.value) return;
      const delDia = eventos.find((e) => e.fecha === form.fecha.value && (form.canal.value === 'Feria' ? e.tipo === 'Feria' : e.tipo !== 'Feria'));
      if (delDia) form.evento_id.value = delDia.id;
    };
    form.canal.addEventListener('change', elegirEvento);
    form.fecha.addEventListener('change', elegirEvento);

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
          av.textContent = `Hay ${hay} en stock de este color. Si lo guardás, el stock queda en negativo.`;
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

    // Presencial o feria: se entrega y se cobra en el momento → tilda todo solo (si es nueva)
    form.canal.addEventListener('change', () => {
      if (pedido) return;
      const enMano = ['Presencial', 'Feria', 'Evento'].includes(form.canal.value);
      N.PASOS_PEDIDO.forEach((s) => { form[s.campo].checked = enMano; });
      if (enMano && !form.envio_metodo.value) form.envio_metodo.value = 'En mano (presencial)';
    });
    if (!pedido && !previo) form.canal.dispatchEvent(new Event('change'));

    const iniciales = (pedido && pedido.items) || (previo && previo.items) || [];
    if (iniciales.length) iniciales.forEach(agregarItem); else agregarItem();

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
        // Pasos: si ya estaba hecho se respeta la fecha original; si se tilda ahora, queda la fecha de hoy
        const ahora = new Date().toISOString();
        N.PASOS_PEDIDO.forEach((s) => { cab[s.campo] = form[s.campo].checked ? ((pedido && pedido[s.campo]) || ahora) : ''; });
        cab.estado = pedido && pedido.estado === 'Cancelado' ? 'Cancelado' : '';
        if (pedido) cab.id = pedido.id; else cab.cargado_por = App.usuario || null;
        const id = await DB.rpc('guardar_pedido', { p_pedido: cab, p_items: items });
        UI.aviso(pedido ? 'Pedido actualizado' : `Venta registrada (pedido #${id}) · stock descontado`);
        m.cerrar();
        recargar && recargar();
        if (alGuardado) await alGuardado(id, cab);
        App.actualizarInsignias();
      } catch (ex) {
        console.error(ex);
        err.textContent = ex.message; err.hidden = false;
      } finally { boton.disabled = false; boton.classList.remove('cargando'); }
    });
  }

  // Todo lo que necesita la ventana de venta
  async function cargarContexto() {
    const [v, eventos, stock, personas] = await Promise.all([
      N.cargarVentas(), DB.listar('eventos', { orden: 'fecha', asc: false }), DB.listar('stock'), DB.listar('personas', { orden: 'nombre' })]);
    return { ...v, eventos, stock, personas, personasId: U.porId(personas) };
  }

  // Abrir una venta nueva precargada desde otra sección (ej: consulta ganada)
  App.nuevaVenta = async (previo, alGuardado) => abrirPedido(null, await cargarContexto(), null, previo, alGuardado);

  // Marca el próximo paso del pedido (preparar → entregar → cobrar). Lo usan Ventas, Envíos e Inicio.
  App.avanzarPaso = async (p, campo) => {
    const paso = campo ? N.PASOS_PEDIDO.find((s) => s.campo === campo) : N.proximoPaso(p);
    if (!paso) return;
    await DB.actualizar('pedidos', p.id, { [paso.campo]: new Date().toISOString() });
    UI.aviso(`Pedido #${p.id}: ${paso.hecho.toLowerCase()} ✓`);
    App.actualizarInsignias();
  };

  // Cancelar o reactivar (el stock vuelve o se descuenta solo)
  async function cancelarOReactivar(p, recargar) {
    const cancelar = p.estado !== 'Cancelado';
    const ok = await UI.confirmar(cancelar
      ? `Vas a cancelar el pedido #${p.id}. Sus productos vuelven al stock.`
      : `Vas a reactivar el pedido #${p.id}. Sus productos se vuelven a descontar del stock.`,
    { titulo: cancelar ? 'Cancelar pedido' : 'Reactivar pedido', boton: cancelar ? 'Sí, cancelar' : 'Sí, reactivar', peligro: cancelar });
    if (!ok) return;
    try {
      await DB.actualizar('pedidos', p.id, { estado: cancelar ? 'Cancelado' : 'Por preparar' });
      UI.aviso(cancelar ? 'Pedido cancelado · stock devuelto' : 'Pedido reactivado');
      recargar(); App.actualizarInsignias();
    } catch (e) { UI.error(e); }
  }

  const diasEsperando = (p) => Math.max(0, -U.diasHasta(p.fecha));

  App.registrar({
    id: 'ventas', titulo: 'Ventas', icono: 'ventas', grupo: 'ventas',
    descripcion: 'Cada pedido con sus pasos: preparar → entregar → cobrar. El stock se descuenta solo.',
    insignia: async () => (await DB.listar('pedidos')).filter((p) => ['Por preparar', 'Por entregar', 'Por cobrar'].includes(p.estado)).length,
    render(cont, param) {
      let pendienteAbrir = param;
      const crud = Seccion.crud({
        contenedor: cont, tabla: 'pedidos', nombre: 'pedido', textoNuevo: 'Registrar venta',
        async cargar() {
          const ctx = await cargarContexto();
          // Primero lo que falta hacer (lo más viejo arriba), después lo terminado
          const orden = { 'Por preparar': 0, 'Por entregar': 1, 'Por cobrar': 2, Completado: 3, Cancelado: 4 };
          ctx.pedidos.sort((a, b) => {
            const pa = orden[a.estado] < 3, pb = orden[b.estado] < 3;
            if (pa !== pb) return pa ? -1 : 1;
            return pa ? a.fecha.localeCompare(b.fecha) || a.id - b.id : b.fecha.localeCompare(a.fecha) || b.id - a.id;
          });
          if (pendienteAbrir) {
            const p = pendienteAbrir; pendienteAbrir = null;
            setTimeout(() => {
              if (p === 'nuevo') abrirPedido(null, ctx, crud.recargar);
              else if (p.startsWith('editar-')) { const ped = ctx.pedidos.find((x) => x.id === Number(p.slice(7))); if (ped) abrirPedido(ped, ctx, crud.recargar); }
              else if (N.ESTADOS_PEDIDO.includes(decodeURIComponent(p))) {
                const s = cont.querySelector('[data-filtro="estado"]'); s.value = decodeURIComponent(p); s.dispatchEvent(new Event('change'));
              }
            });
          }
          return { filas: ctx.pedidos, extra: ctx };
        },
        buscar: (p, x) => `#${p.id} ${N.nombreCliente(x.clientesId, p.cliente_id)} ${p.items.map((i) => (x.productosId[i.producto_id]?.nombre || i.descripcion) + ' ' + i.color).join(' ')} ${p.notas || ''} ${p.envio_detalle || ''}`,
        filtros: [
          { id: 'estado', etiqueta: 'Paso', opciones: N.ESTADOS_PEDIDO, valor: (p) => p.estado },
          { id: 'canal', etiqueta: 'Canal', opciones: N.CANALES, valor: (p) => p.canal },
          { id: 'resp', etiqueta: 'Responsable', opciones: (f, x) => x.personas.map((p) => ({ valor: p.id, texto: p.nombre })), valor: (p) => p.responsable_id },
          { id: 'mes', etiqueta: 'Mes', opciones: (f) => [...new Set(f.map((p) => U.mes(p.fecha)))].sort().reverse().map((x) => ({ valor: x, texto: U.nombreMes(x) })), valor: (p) => U.mes(p.fecha) }
        ],
        // Aviso fuerte: lo que falta hacer, en grande y con color
        resumen: (filas, x) => {
          const todos = x.pedidos;
          const grupo = (e) => todos.filter((p) => p.estado === e);
          const tarjetas = [
            { e: 'Por preparar', tono: 'alerta', icono: 'inventario', txt: 'armar el paquete' },
            { e: 'Por entregar', tono: 'atencion', icono: 'proveedores', txt: 'enviar o entregar' },
            { e: 'Por cobrar', tono: 'info', icono: 'finanzas', txt: 'falta el pago' }
          ].map((t) => ({ ...t, lista: grupo(t.e) }));
          const val = filas.filter(N.pedidoValido);
          const tot = U.sumar(val, (p) => p.total);
          return `<div class="semaforo">${tarjetas.map((t) => `
              <button type="button" class="semaforo-item tono-${t.lista.length ? t.tono : 'ok'}" data-ver-paso="${t.e}">
                <span class="sf-icono" aria-hidden="true">${t.lista.length ? App.icono(t.icono) : '✓'}</span>
                <span class="sf-num">${t.lista.length}</span>
                <span class="sf-texto"><b>${t.e}</b><small>${t.lista.length ? t.txt + (t.e === 'Por cobrar' ? ' · ' + U.pesos(U.sumar(t.lista, (p) => p.total)) : '') : 'nada pendiente'}</small></span>
              </button>`).join('')}
            </div>
            <p class="muted chico" style="margin:10px 0 0">Lo filtrado: <b>${U.pesos(tot)}</b> en ${val.length} ${val.length === 1 ? 'pedido' : 'pedidos'} · ticket promedio ${U.pesos(val.length ? tot / val.length : 0)}</p>`;
        },
        columnas: [
          { titulo: 'Pedido', valor: (p, x) => `<b>#${p.id}</b> · ${U.esc(N.nombreCliente(x.clientesId, p.cliente_id))}
              <br><small class="muted">${U.fecha(p.fecha)} · ${U.esc(p.canal)}${p.medio_pago ? ' · ' + U.esc(p.medio_pago) : ''}</small>
              ${p.responsable_id || p.cargado_por ? `<br><small class="muted">${p.responsable_id && x.personasId[p.responsable_id] ? '' + U.esc(x.personasId[p.responsable_id].nombre) : ''}${p.cargado_por ? ` · cargó ${U.esc(p.cargado_por.split('@')[0])}` : ''}</small>` : ''}` },
          { titulo: 'Productos', valor: (p, x) => p.items.map((i) => `${U.esc(x.productosId[i.producto_id]?.nombre || i.descripcion || '—')}${i.color !== 'Único' ? ` <small class="muted">(${U.esc(i.color)})</small>` : ''} ×${i.cantidad}`).join('<br>') },
          { titulo: 'Pasos', valor: (p) => N.pasosHTML(p, true) + (N.proximoPaso(p) && diasEsperando(p) > 2 ? `<small class="espera">hace ${diasEsperando(p)} días</small>` : '') },
          { titulo: 'Entrega', valor: (p) => p.envio_metodo ? `${U.esc(p.envio_metodo)}${p.envio_detalle ? `<br><small class="muted">${U.esc(p.envio_detalle)}</small>` : ''}` : '<span class="muted">—</span>' },
          { titulo: 'Total', clase: 'num', valor: (p) => `<b>${U.pesos(p.total)}</b>` }
        ],
        accionesExtra: (p) => {
          const paso = N.proximoPaso(p);
          return (paso ? `<button type="button" class="boton boton-chico" data-accion="avanzar" title="${paso.accion}">✓ ${paso.hecho}</button>` : '')
            + `<button type="button" class="boton-texto" data-accion="cancelar">${p.estado === 'Cancelado' ? 'Reactivar' : 'Cancelar'}</button>`;
        },
        alAccion: {
          avanzar: async (p, x, recargar) => { try { await App.avanzarPaso(p); recargar(); } catch (e) { UI.error(e); } },
          cancelar: (p, x, recargar) => cancelarOReactivar(p, recargar)
        },
        mensajeBorrar: () => 'El stock de sus productos vuelve al inventario.',
        editar: (fila, ctx, recargar) => abrirPedido(fila, ctx, recargar)
      });
      // Tocar una tarjeta del aviso filtra por ese paso
      cont.addEventListener('click', (e) => {
        const b = e.target.closest('[data-ver-paso]'); if (!b) return;
        const s = cont.querySelector('[data-filtro="estado"]');
        s.value = s.value === b.dataset.verPaso ? '' : b.dataset.verPaso;
        s.dispatchEvent(new Event('change'));
      });
    }
  });
})();
