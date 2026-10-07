/* =====================================================================
   SECCIÓN · INVENTARIO (departamento de Logística)
   Productos y su stock por color en un solo lugar, movimientos
   (entradas, salidas, ajustes) e insumos y packaging.
   El stock NUNCA se escribe a mano: cada cambio queda como movimiento.
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

  // Bloque fuerte arriba con lo que hay que reponer
  function bloqueReponer(items, { titulo, vacio, irA }) {
    if (!items.length) return `<div class="aviso-ok">✓ ${U.esc(vacio)}</div>`;
    return `<section class="bloque-reponer">
      <div class="br-cabecera"><span class="br-icono">!</span><div><b>${U.esc(titulo)}</b><small>${items.length} ${items.length === 1 ? 'ítem' : 'ítems'} por debajo del mínimo</small></div></div>
      <ul>${items.map((i) => `<li class="${i.sin ? 'sin' : ''}">
        <span class="br-nombre">${U.esc(i.nombre)}</span>
        <span class="br-cant"><b>${i.cantidad}</b> / mín. ${i.minimo}</span>
        ${i.boton || ''}</li>`).join('')}</ul>
    </section>`;
  }

  // ---------- Pestaña: productos y stock (todo junto) ----------
  const camposProducto = (fila) => [
    { campo: 'nombre', etiqueta: 'Nombre', requerido: true },
    { campo: 'codigo', etiqueta: 'Código', placeholder: 'Ej: B002' },
    { campo: 'categoria', etiqueta: 'Categoría', sugerencias: N.CATEGORIAS, ayuda: 'Elegí una o escribí una nueva.' },
    { campo: 'estado', etiqueta: 'Estado', tipo: 'select', opciones: N.ESTADOS_PRODUCTO, defecto: 'Activo', vacio: false },
    { campo: 'precio', etiqueta: 'Precio de venta', tipo: 'pesos', requerido: true, min: 0 },
    { campo: 'costo', etiqueta: 'Costo', tipo: 'pesos', requerido: true, min: 0, ayuda: 'Lo que te cuesta a vos cada unidad.' },
    { campo: '_margen', etiqueta: 'Margen (automático)', soloLectura: true },
    ...(fila ? [] : [{ campo: '_stock_inicial', etiqueta: 'Stock inicial (de cada color)', tipo: 'numero', min: 0, paso: 1, defecto: 0, noGuardar: true }]),
    { campo: 'colores', etiqueta: 'Colores', tipo: 'lista', ancho: 'completo', placeholder: 'Ej: Negro, Celeste (vacío si tiene un solo color)' },
    { campo: 'descripcion', etiqueta: 'Descripción', tipo: 'area', filas: 2 },
    { campo: 'foto_url', etiqueta: 'Foto', tipo: 'foto' }
  ];

  // Ventana para corregir stock y mínimo de cada color de un producto
  function editarStock(p, cfg, recargar) {
    const filas = p._stock.slice().sort((a, b) => a.color.localeCompare(b.color));
    const form = document.createElement('form');
    form.className = 'formulario';
    form.innerHTML = `<p class="nota" style="margin-bottom:14px">Poné la <b>cantidad real</b> que tenés. Si cambia, queda registrado como "Ajuste" en Movimientos.</p>
      <div class="tabla-stock">
        <div class="ts-cab"><span>Color</span><span>Cantidad</span><span>Mínimo</span></div>
        ${filas.map((s) => `<div class="ts-fila" data-id="${s.id}">
          <span>${U.esc(s.color)}</span>
          <input type="number" step="1" name="c-${s.id}" value="${s.cantidad}" aria-label="Cantidad ${U.esc(s.color)}">
          <input type="number" step="1" min="0" name="m-${s.id}" value="${s.minimo ?? ''}" placeholder="${cfg.stock_minimo_defecto}" aria-label="Mínimo ${U.esc(s.color)}">
        </div>`).join('')}
      </div>
      <small class="campo-ayuda">Mínimo vacío = ${cfg.stock_minimo_defecto} (el general). Mínimo 0 = por encargo (no avisa).</small>
      <p class="form-error" hidden></p>
      <div class="acciones-form"><button type="button" class="boton boton-secundario" data-cancelar>Cancelar</button><button type="submit" class="boton">Guardar stock</button></div>`;
    const m = UI.modal({ titulo: `Stock · ${p.nombre}`, contenido: form, ancho: 'chico' });
    form.querySelector('[data-cancelar]').onclick = m.cerrar;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const b = form.querySelector('[type=submit]'); b.disabled = true; b.classList.add('cargando');
      try {
        for (const s of filas) {
          const cant = Number(form[`c-${s.id}`].value);
          const minTxt = form[`m-${s.id}`].value;
          const min = minTxt === '' ? null : Number(minTxt);
          if (min !== s.minimo) await DB.actualizar('stock', s.id, { minimo: min });
          if (Number.isInteger(cant) && cant !== s.cantidad) {
            await DB.crear('movimientos_stock', { fecha: U.hoy(), producto_id: p.id, color: s.color, tipo: 'ajuste', cantidad: cant - s.cantidad, motivo: 'Ajuste manual (conteo)' });
          }
        }
        UI.aviso('Stock actualizado'); m.cerrar(); recargar(); App.actualizarInsignias();
      } catch (ex) { const er = form.querySelector('.form-error'); er.textContent = ex.message; er.hidden = false; }
      finally { b.disabled = false; b.classList.remove('cargando'); }
    });
  }

  function pestanaProductos(cuerpo, abrirNuevo) {
    const crud = Seccion.crud({
      contenedor: cuerpo, tabla: 'productos', nombre: 'producto',
      async cargar() {
        const [filas, stock, cfg] = await Promise.all([DB.listar('productos', { orden: 'nombre' }), DB.listar('stock'), App.config()]);
        const porProd = U.agrupar(stock, (s) => s.producto_id);
        filas.forEach((p) => {
          p._stock = porProd[p.id] || [];
          p._total = U.sumar(p._stock, (s) => s.cantidad);
          p._margen = U.margen(p.precio, p.costo);
          const est = p._stock.map((s) => N.estadoStock(s, cfg));
          p._estadoStock = est.includes('sin') ? 'sin' : est.includes('bajo') ? 'bajo' : 'ok';
        });
        // Los que hay que reponer, primero
        const peso = { sin: 0, bajo: 1, ok: 2 };
        filas.sort((a, b) => (a.estado === 'Activo' ? 0 : 1) - (b.estado === 'Activo' ? 0 : 1) || peso[a._estadoStock] - peso[b._estadoStock] || a.nombre.localeCompare(b.nombre));
        return { filas, extra: { cfg, productos: filas } };
      },
      buscar: (p) => [p.codigo, p.nombre, p.categoria, p.descripcion, (p.colores || []).join(' ')].join(' '),
      filtros: [
        { id: 'stock', etiqueta: 'Stock', opciones: [{ valor: 'bajo', texto: 'Para reponer' }, { valor: 'sin', texto: 'Sin stock' }, { valor: 'ok', texto: 'OK' }],
          valor: (p) => p._estadoStock === 'sin' ? 'sin' : p._estadoStock, contiene: false },
        { id: 'cat', etiqueta: 'Categoría', opciones: (f) => [...new Set([...N.CATEGORIAS, ...f.map((p) => p.categoria).filter(Boolean)])], valor: (p) => p.categoria },
        { id: 'estado', etiqueta: 'Estado', opciones: N.ESTADOS_PRODUCTO, valor: (p) => p.estado }
      ],
      resumen: (filas, x) => {
        const activos = x.productos.filter((p) => p.estado !== 'Discontinuado' && p.estado !== 'Pausado');
        const reponer = [];
        activos.forEach((p) => p._stock.forEach((s) => {
          const est = N.estadoStock(s, x.cfg);
          if (est !== 'ok') reponer.push({ nombre: p.nombre + (s.color !== 'Único' ? ' · ' + s.color : ''), cantidad: s.cantidad, minimo: N.minimo(s, x.cfg), sin: est === 'sin',
            boton: `<button type="button" class="boton boton-chico" data-entrada="${p.id}|${U.esc(s.color)}">+ Entrada</button>` });
        }));
        reponer.sort((a, b) => (b.sin - a.sin) || a.cantidad - b.cantidad);
        const unidades = U.sumar(activos, (p) => Math.max(0, p._total));
        return `${bloqueReponer(reponer, { titulo: 'Productos para reponer', vacio: 'Todo el stock de productos está bien.' })}
          <div class="grilla grilla-4 separado">
            ${UI.numeroDestacado('Productos activos', activos.length)}
            ${UI.numeroDestacado('Unidades en stock', U.numero(unidades))}
            ${UI.numeroDestacado('Stock a costo', U.pesos(U.sumar(activos, (p) => Math.max(0, p._total) * (p.costo || 0))))}
            ${UI.numeroDestacado('Stock a precio de venta', U.pesos(U.sumar(activos, (p) => Math.max(0, p._total) * (p.precio || 0))))}
          </div>`;
      },
      columnas: [
        { titulo: 'Producto', valor: (p) => `<div class="celda-producto">
            ${p.foto_url ? `<img class="miniatura" src="${U.esc(U.urlFoto(p.foto_url))}" alt="" loading="lazy">` : '<span class="miniatura"></span>'}
            <div><b>${U.esc(p.nombre)}</b><small>${p.codigo ? U.esc(p.codigo) + ' · ' : ''}${U.esc(p.categoria || 'Sin categoría')}</small></div></div>` },
        { titulo: 'Stock por color', valor: (p, x) => p._stock.length ? p._stock.map((s) => {
            const est = N.estadoStock(s, x.cfg);
            return `<span class="stock-color est-${est}"><i style="background:${N.colorHex(s.color)}"></i>${U.esc(s.color === 'Único' ? 'Stock' : s.color)} <b>${s.cantidad}</b></span>`;
          }).join('') : '—' },
        { titulo: 'Precio', clase: 'num', valor: (p) => U.pesos(p.precio) },
        { titulo: 'Costo · margen', clase: 'num', valor: (p) => `${U.pesos(p.costo)}<br><small class="muted">${p._margen === null ? '—' : U.porcentaje(p._margen)}</small>` },
        { titulo: 'Estado', valor: (p) => (p._estadoStock !== 'ok' && p.estado === 'Activo' ? N.etiquetaStock(p._estadoStock) + ' ' : '') + (p.estado !== 'Activo' ? UI.etiqueta(p.estado, N.tonoProducto(p.estado)) : (p._estadoStock === 'ok' ? UI.etiqueta('OK', 'ok') : '')) }
      ],
      campos: (fila) => camposProducto(fila),
      alArmar(form) {
        const calc = () => {
          const m = U.margen(form.precio.value, form.costo.value);
          form._margen.value = m === null ? '—' : `${U.porcentaje(m)} (${U.pesos((Number(form.precio.value) || 0) - (Number(form.costo.value) || 0))} por unidad)`;
        };
        form.precio.addEventListener('input', calc); form.costo.addEventListener('input', calc); calc();
      },
      // Producto nuevo: carga el stock inicial de cada color como entrada
      despues: async (p, esNuevo) => {
        const form = [...document.querySelectorAll('.modal-fondo form')].pop();
        const inicial = esNuevo && form && form._stock_inicial ? Number(form._stock_inicial.value) || 0 : 0;
        if (inicial > 0) {
          for (const c of (p.colores && p.colores.length ? p.colores : ['Único'])) {
            await DB.crear('movimientos_stock', { fecha: U.hoy(), producto_id: p.id, color: c, tipo: 'entrada', cantidad: inicial, motivo: 'Stock inicial' });
          }
        }
        App.actualizarInsignias();
      },
      mensajeBorrar: () => 'También se borra su stock. Las ventas ya registradas se conservan.',
      accionesExtra: () => `<button type="button" class="boton-texto" data-accion="entrada">+ Entrada</button>
        <button type="button" class="boton-texto" data-accion="stock">Stock</button>`,
      alAccion: {
        entrada: (p, x, recargar) => abrirMovimiento({ valores: { tipo: 'entrada', producto_id: p.id, color: (p._stock[0] || {}).color }, productos: x.productos, alGuardar: () => { recargar(); App.actualizarInsignias(); } }),
        stock: (p, x, recargar) => editarStock(p, x.cfg, recargar)
      }
    });
    // Botones "+ Entrada" del bloque de reponer
    cuerpo.addEventListener('click', (e) => {
      const b = e.target.closest('[data-entrada]'); if (!b) return;
      const [id, color] = b.dataset.entrada.split('|');
      abrirMovimiento({ valores: { tipo: 'entrada', producto_id: Number(id), color }, productos: crud.estado.extra.productos, alGuardar: () => { crud.recargar(); App.actualizarInsignias(); } });
    });
    if (abrirNuevo) setTimeout(() => crud.nuevo(), 400);
  }

  // ---------- Pestaña: insumos y packaging ----------
  const MINIMO_INSUMO = 3; // si un insumo no tiene mínimo propio, se usa este
  const minimoInsumo = (i) => i.minimo ?? MINIMO_INSUMO;
  const reponerInsumo = (i) => i.stock < minimoInsumo(i);
  App.insumosParaReponer = async () => (await DB.listar('insumos', { orden: 'nombre' })).filter(reponerInsumo);

  function cambiarStockInsumo(i, signo, recargar) {
    UI.formularioModal({
      titulo: `${signo > 0 ? 'Sumar' : 'Restar'} · ${i.nombre}`, ancho: 'chico', textoBoton: signo > 0 ? 'Sumar' : 'Restar',
      campos: [{ campo: 'cantidad', etiqueta: `Cantidad (hay ${i.stock})`, tipo: 'numero', paso: 1, min: 1, requerido: true, defecto: 1, ancho: 'completo' }],
      alGuardar: async (d) => {
        await DB.actualizar('insumos', i.id, { stock: i.stock + signo * d.cantidad });
        UI.aviso('Stock de insumo actualizado'); recargar(); App.actualizarInsignias();
      }
    });
  }

  function pestanaInsumos(cuerpo) {
    const crud = Seccion.crud({
      contenedor: cuerpo, tabla: 'insumos', nombre: 'insumo', orden: 'nombre',
      async cargar() {
        const [filas, proveedores] = await Promise.all([DB.listar('insumos', { orden: 'nombre' }), DB.listar('proveedores', { orden: 'nombre' })]);
        filas.sort((a, b) => (reponerInsumo(b) - reponerInsumo(a)) || a.nombre.localeCompare(b.nombre));
        return { filas, extra: { proveedores, prov: U.porId(proveedores), todos: filas } };
      },
      buscar: (i, x) => [i.codigo, i.nombre, i.tipo, i.observaciones, x.prov[i.proveedor_id]?.nombre].join(' '),
      filtros: [
        { id: 'estado', etiqueta: 'Estado', opciones: [{ valor: 'reponer', texto: 'Para reponer' }, { valor: 'ok', texto: 'OK' }], valor: (i) => reponerInsumo(i) ? 'reponer' : 'ok' },
        { id: 'tipo', etiqueta: 'Tipo', opciones: (f) => [...new Set(f.map((i) => i.tipo).filter(Boolean))].sort(), valor: (i) => i.tipo },
        { id: 'prov', etiqueta: 'Proveedor', opciones: (f, x) => x.proveedores.map((p) => ({ valor: p.id, texto: p.nombre })), valor: (i) => i.proveedor_id }
      ],
      resumen: (filas, x) => {
        const todos = x.todos;
        const rep = todos.filter(reponerInsumo).map((i) => ({ nombre: i.nombre + (x.prov[i.proveedor_id] ? ' · ' + x.prov[i.proveedor_id].nombre : ''), cantidad: i.stock, minimo: minimoInsumo(i), sin: i.stock <= 0,
          boton: `<button type="button" class="boton boton-chico" data-sumar-insumo="${i.id}">+ Sumar</button>` })).sort((a, b) => (b.sin - a.sin) || a.cantidad - b.cantidad);
        return `${bloqueReponer(rep, { titulo: 'Insumos para reponer', vacio: 'No falta ningún insumo.' })}
          <div class="grilla grilla-3 separado">
            ${UI.numeroDestacado('Insumos', todos.length)}
            ${UI.numeroDestacado('Para reponer', rep.length, `mínimo general: ${MINIMO_INSUMO}`, rep.length ? 'alerta' : 'ok')}
            ${UI.numeroDestacado('Valor en insumos', U.pesos(U.sumar(todos, (i) => Math.max(0, i.stock) * (i.costo_unitario || 0))))}
          </div>`;
      },
      columnas: [
        { titulo: 'Insumo', valor: (i) => `<b style="font-weight:500">${U.esc(i.nombre)}</b><br><small class="muted">${[i.codigo, i.tipo].filter(Boolean).map(U.esc).join(' · ')}</small>` },
        { titulo: 'Stock', clase: 'num', valor: (i) => `<b style="font-size:17px">${i.stock}</b> <small class="muted">/ mín. ${minimoInsumo(i)}</small>` },
        { titulo: 'Costo unit.', clase: 'num', valor: (i) => i.costo_unitario == null ? '—' : U.pesos(i.costo_unitario) },
        { titulo: 'Proveedor', valor: (i, x) => U.esc(x.prov[i.proveedor_id]?.nombre || '—') },
        { titulo: 'Estado', valor: (i) => reponerInsumo(i) ? UI.etiqueta(i.stock <= 0 ? 'Sin stock' : 'Reponer', 'alerta') : UI.etiqueta('OK', 'ok') }
      ],
      campos: (fila, x) => [
        { campo: 'nombre', etiqueta: 'Insumo', requerido: true },
        { campo: 'codigo', etiqueta: 'Código', placeholder: 'Ej: P001' },
        { campo: 'tipo', etiqueta: 'Tipo', sugerencias: ['Packaging', 'Regalo', 'Papelería'], defecto: 'Packaging' },
        { campo: 'proveedor_id', etiqueta: 'Proveedor', tipo: 'select', numerico: true, vacio: 'Ninguno', opciones: x.proveedores.map((p) => ({ valor: p.id, texto: p.nombre })) },
        { campo: 'stock', etiqueta: 'Stock actual', tipo: 'numero', paso: 1, requerido: true, defecto: 0 },
        { campo: 'costo_unitario', etiqueta: 'Costo unitario', tipo: 'pesos', min: 0 },
        { campo: 'minimo', etiqueta: 'Mínimo para reponer', tipo: 'numero', paso: 1, min: 0, ayuda: `Vacío = ${MINIMO_INSUMO}.` },
        { campo: 'observaciones', etiqueta: 'Notas', tipo: 'area', filas: 2 }
      ],
      despues: () => App.actualizarInsignias(),
      accionesExtra: () => `<button type="button" class="boton-texto" data-accion="mas" title="Sumar unidades">+ Sumar</button>
        <button type="button" class="boton-texto" data-accion="menos" title="Restar unidades">− Usar</button>`,
      alAccion: {
        mas: (i, x, recargar) => cambiarStockInsumo(i, 1, recargar),
        menos: (i, x, recargar) => cambiarStockInsumo(i, -1, recargar)
      }
    });
    cuerpo.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sumar-insumo]'); if (!b) return;
      const i = crud.estado.filas.find((x) => x.id === Number(b.dataset.sumarInsumo));
      if (i) cambiarStockInsumo(i, 1, crud.recargar);
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
    id: 'inventario', titulo: 'Inventario', icono: 'inventario', grupo: 'logistica',
    descripcion: 'Productos, stock por color, movimientos e insumos. Lo que hay que reponer aparece primero.',
    insignia: async () => {
      const [stock, productos, cfg, insumos] = await Promise.all([DB.listar('stock'), DB.listar('productos'), App.config(), App.insumosParaReponer().catch(() => [])]);
      const activos = new Set(productos.filter((p) => p.estado === 'Activo').map((p) => p.id));
      return stock.filter((s) => activos.has(s.producto_id) && N.estadoStock(s, cfg) !== 'ok').length + insumos.length;
    },
    render(cont, param) {
      if (param === 'insumos' || param === 'nuevo') { try { sessionStorage.setItem('pest-inventario', param === 'insumos' ? 'insumos' : 'productos'); } catch { /* nada */ } }
      UI.pestanas(cont, [
        { id: 'productos', titulo: 'Productos y stock', render: (c) => pestanaProductos(c, param === 'nuevo') },
        { id: 'movimientos', titulo: 'Movimientos', render: pestanaMovimientos },
        { id: 'insumos', titulo: 'Insumos y packaging', render: pestanaInsumos }
      ], 'inventario');
    }
  });
})();
