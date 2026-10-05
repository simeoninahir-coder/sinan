/* =====================================================================
   SECCIÓN · PRODUCTOS
   Catálogo con precio, costo, margen (se calcula solo), stock y foto.
   ===================================================================== */
App.registrar({
  id: 'productos', titulo: 'Productos', icono: 'productos',
  descripcion: 'Tu catálogo: precios, costos, margen y stock de cada producto.',
  render(cont, param) {
    const crud = Seccion.crud({
      contenedor: cont, tabla: 'productos', nombre: 'producto',
      async cargar() {
        const [filas, stock, cfg] = await Promise.all([DB.listar('productos', { orden: 'nombre' }), DB.listar('stock'), App.config()]);
        const porProd = U.agrupar(stock, (s) => s.producto_id);
        filas.forEach((p) => {
          p._stock = porProd[p.id] || [];
          p._total = U.sumar(p._stock, (s) => s.cantidad);
          p._margen = U.margen(p.precio, p.costo);
          const estados = p._stock.map((s) => N.estadoStock(s, cfg));
          p._estadoStock = estados.includes('sin') ? 'sin' : estados.includes('bajo') ? 'bajo' : 'ok';
        });
        return { filas };
      },
      buscar: (p) => [p.nombre, p.categoria, p.descripcion, (p.colores || []).join(' ')].join(' '),
      filtros: [
        { id: 'cat', etiqueta: 'Categoría', opciones: (f) => [...new Set([...N.CATEGORIAS, ...f.map((p) => p.categoria).filter(Boolean)])], valor: (p) => p.categoria },
        { id: 'estado', etiqueta: 'Estado', opciones: N.ESTADOS_PRODUCTO, valor: (p) => p.estado },
        { id: 'stock', etiqueta: 'Stock', opciones: [{ valor: 'ok', texto: 'OK' }, { valor: 'bajo', texto: 'Stock bajo' }, { valor: 'sin', texto: 'Sin stock' }], valor: (p) => p._estadoStock }
      ],
      columnas: [
        { titulo: 'Producto', valor: (p) => `<div class="celda-producto">
            ${p.foto_url ? `<img class="miniatura" src="${U.esc(U.urlFoto(p.foto_url))}" alt="" loading="lazy">` : '<span class="miniatura"></span>'}
            <div><b>${U.esc(p.nombre)}</b><small>${U.esc(p.categoria || 'Sin categoría')}</small></div></div>` },
        { titulo: 'Colores', valor: (p) => (p.colores || []).length ? p.colores.map((c) => `<span class="chip-color"><i style="background:${N.colorHex(c)}"></i>${U.esc(c)}</span>`).join('') : '<span class="muted">Único</span>' },
        { titulo: 'Precio', clase: 'num', valor: (p) => U.pesos(p.precio) },
        { titulo: 'Costo', clase: 'num', valor: (p) => U.pesos(p.costo) },
        { titulo: 'Margen', clase: 'num', valor: (p) => p._margen === null ? '—' : `${U.porcentaje(p._margen)}<br><small class="muted">${U.pesos(p.precio - p.costo)}</small>` },
        { titulo: 'Stock', clase: 'num', valor: (p) => `${p._total} ${p._estadoStock !== 'ok' ? N.etiquetaStock(p._estadoStock) : ''}` },
        { titulo: 'Estado', valor: (p) => UI.etiqueta(p.estado, N.tonoProducto(p.estado)) }
      ],
      campos: [
        { campo: 'nombre', etiqueta: 'Nombre', requerido: true },
        { campo: 'categoria', etiqueta: 'Categoría', sugerencias: N.CATEGORIAS, ayuda: 'Elegí una o escribí una nueva.' },
        { campo: 'precio', etiqueta: 'Precio de venta', tipo: 'pesos', requerido: true, min: 0 },
        { campo: 'costo', etiqueta: 'Costo', tipo: 'pesos', requerido: true, min: 0, ayuda: 'Lo que te cuesta a vos cada unidad.' },
        { campo: '_margen', etiqueta: 'Margen (automático)', soloLectura: true, ayuda: 'Ganancia sobre el precio de venta.' },
        { campo: 'estado', etiqueta: 'Estado', tipo: 'select', opciones: N.ESTADOS_PRODUCTO, defecto: 'Activo', vacio: false },
        { campo: 'colores', etiqueta: 'Colores', tipo: 'lista', ancho: 'completo', placeholder: 'Ej: Negro, Celeste (vacío si tiene un solo color)', ayuda: 'Se crea el stock de cada color en Inventario.' },
        { campo: 'descripcion', etiqueta: 'Descripción', tipo: 'area' },
        { campo: 'foto_url', etiqueta: 'Foto', tipo: 'foto' }
      ],
      // Calcula el margen en vivo mientras escribís precio y costo
      alArmar(form) {
        const calc = () => {
          const m = U.margen(form.precio.value, form.costo.value);
          form._margen.value = m === null ? '—' : `${U.porcentaje(m)} (${U.pesos((Number(form.precio.value) || 0) - (Number(form.costo.value) || 0))} por unidad)`;
        };
        form.precio.addEventListener('input', calc); form.costo.addEventListener('input', calc); calc();
      },
      mensajeBorrar: () => 'También se borra su stock. Las ventas ya registradas se conservan.',
      accionesExtra: () => `<button type="button" class="boton-texto" data-accion="stock" title="Ver stock en Inventario">Stock</button>`,
      alAccion: { stock: () => App.ir('inventario') }
    });
    if (param === 'nuevo') crud.nuevo();
  }
});
