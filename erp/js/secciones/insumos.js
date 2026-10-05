/* =====================================================================
   SECCIÓN · INSUMOS Y PACKAGING
   Bolsas, stickers, tarjetas, moñitos… lo que se usa para armar pedidos.
   Avisa cuando hay que reponer (stock por debajo del mínimo).
   ===================================================================== */
(function () {
  const MINIMO_INSUMO = 3; // si un insumo no tiene mínimo propio, se usa este
  const minimo = (i) => i.minimo ?? MINIMO_INSUMO;
  const reponer = (i) => i.stock < minimo(i);

  // Lo usa Alertas
  App.insumosParaReponer = async () => (await DB.listar('insumos', { orden: 'nombre' })).filter(reponer);

  App.registrar({
    id: 'insumos', titulo: 'Insumos', icono: 'insumos',
    descripcion: 'Packaging y regalitos: stock, costo y a quién se le compra.',
    render(cont) {
      Seccion.crud({
        contenedor: cont, tabla: 'insumos', nombre: 'insumo', orden: 'nombre',
        async cargar() {
          const [filas, proveedores] = await Promise.all([DB.listar('insumos', { orden: 'nombre' }), DB.listar('proveedores', { orden: 'nombre' })]);
          return { filas, extra: { proveedores, prov: U.porId(proveedores) } };
        },
        buscar: (i, x) => [i.codigo, i.nombre, i.tipo, i.observaciones, x.prov[i.proveedor_id]?.nombre].join(' '),
        filtros: [
          { id: 'tipo', etiqueta: 'Tipo', opciones: (f) => [...new Set(f.map((i) => i.tipo).filter(Boolean))].sort(), valor: (i) => i.tipo },
          { id: 'estado', etiqueta: 'Estado', opciones: [{ valor: 'reponer', texto: 'Reponer' }, { valor: 'ok', texto: 'OK' }], valor: (i) => reponer(i) ? 'reponer' : 'ok' },
          { id: 'prov', etiqueta: 'Proveedor', opciones: (f, x) => x.proveedores.map((p) => ({ valor: p.id, texto: p.nombre })), valor: (i) => i.proveedor_id }
        ],
        resumen: (filas) => `<div class="grilla grilla-3">
          ${UI.numeroDestacado('Insumos', filas.length)}
          ${UI.numeroDestacado('Para reponer', filas.filter(reponer).length, `mínimo general: ${MINIMO_INSUMO}`, filas.some(reponer) ? 'alerta' : 'ok')}
          ${UI.numeroDestacado('Valor en insumos', U.pesos(U.sumar(filas, (i) => Math.max(0, i.stock) * (i.costo_unitario || 0))))}
        </div>`,
        columnas: [
          { titulo: 'Insumo', valor: (i) => `<b style="font-weight:500">${U.esc(i.nombre)}</b><br><small class="muted">${[i.codigo, i.tipo].filter(Boolean).map(U.esc).join(' · ')}</small>` },
          { titulo: 'Stock', clase: 'num', valor: (i) => `<b style="font-size:17px">${i.stock}</b>` },
          { titulo: 'Costo unit.', clase: 'num', valor: (i) => i.costo_unitario == null ? '—' : U.pesos(i.costo_unitario) },
          { titulo: 'Proveedor', valor: (i, x) => U.esc(x.prov[i.proveedor_id]?.nombre || '—') },
          { titulo: 'Notas', valor: (i) => U.esc(i.observaciones || '—') },
          { titulo: 'Estado', valor: (i) => reponer(i) ? UI.etiqueta('Reponer', i.stock <= 0 ? 'alerta' : 'atencion') : UI.etiqueta('OK', 'ok') }
        ],
        campos: (fila, x) => [
          { campo: 'nombre', etiqueta: 'Insumo', requerido: true },
          { campo: 'codigo', etiqueta: 'Código', placeholder: 'Ej: P001' },
          { campo: 'tipo', etiqueta: 'Tipo', sugerencias: ['Packaging', 'Regalo', 'Papelería'], defecto: 'Packaging' },
          { campo: 'proveedor_id', etiqueta: 'Proveedor', tipo: 'select', numerico: true, vacio: 'Ninguno', opciones: x.proveedores.map((p) => ({ valor: p.id, texto: p.nombre })) },
          { campo: 'stock', etiqueta: 'Stock actual', tipo: 'numero', paso: 1, requerido: true, defecto: 0 },
          { campo: 'costo_unitario', etiqueta: 'Costo unitario', tipo: 'pesos', min: 0 },
          { campo: 'minimo', etiqueta: 'Mínimo para reponer', tipo: 'numero', paso: 1, min: 0, ayuda: `Vacío = ${MINIMO_INSUMO}. Si hay menos, aparece "Reponer".` },
          { campo: 'observaciones', etiqueta: 'Notas', tipo: 'area', filas: 2 }
        ],
        accionesExtra: () => `<button type="button" class="boton-texto" data-accion="mas" title="Sumar unidades">+</button>
          <button type="button" class="boton-texto" data-accion="menos" title="Restar unidades">−</button>`,
        alAccion: {
          mas: (i, x, recargar) => cambiarStock(i, 1, recargar),
          menos: (i, x, recargar) => cambiarStock(i, -1, recargar)
        }
      });
    }
  });

  // Suma o resta unidades rápido (ej: llegaron 20 bolsas, usé 3 stickers)
  function cambiarStock(i, signo, recargar) {
    UI.formularioModal({
      titulo: `${signo > 0 ? 'Sumar' : 'Restar'} · ${i.nombre}`, ancho: 'chico', textoBoton: signo > 0 ? 'Sumar' : 'Restar',
      campos: [{ campo: 'cantidad', etiqueta: `Cantidad (hay ${i.stock})`, tipo: 'numero', paso: 1, min: 1, requerido: true, defecto: 1, ancho: 'completo' }],
      alGuardar: async (d) => {
        await DB.actualizar('insumos', i.id, { stock: i.stock + signo * d.cantidad });
        UI.aviso('Stock de insumo actualizado');
        recargar(); App.actualizarInsignias();
      }
    });
  }
})();
