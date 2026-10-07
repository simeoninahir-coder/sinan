/* =====================================================================
   SECCIÓN · PROVEEDORES
   Quién te vende, qué, en cuánto tiempo y con qué condiciones.
   ===================================================================== */
App.registrar({
  id: 'proveedores', titulo: 'Proveedores', icono: 'proveedores', grupo: 'admin',
  descripcion: 'Contactos, tiempos de entrega y condiciones de pago de tus proveedores.',
  render(cont) {
    Seccion.crud({
      contenedor: cont, tabla: 'proveedores', nombre: 'proveedor', orden: 'nombre',
      async cargar() {
        const [filas, movs] = await Promise.all([DB.listar('proveedores', { orden: 'nombre' }), DB.listar('movimientos_financieros')]);
        const porProv = U.agrupar(movs.filter((m) => m.proveedor_id && m.tipo === 'egreso'), (m) => m.proveedor_id);
        filas.forEach((p) => { p._comprado = U.sumar(porProv[p.id] || [], (m) => m.monto); });
        return { filas };
      },
      buscar: (p) => [p.nombre, p.que_provee, p.contacto, p.telefono, p.email, p.instagram, p.notas].join(' '),
      columnas: [
        { titulo: 'Proveedor', valor: (p) => `<b style="font-weight:500">${U.esc(p.nombre)}</b><br><small class="muted">${U.esc(p.que_provee || '')}</small>` },
        { titulo: 'Contacto', valor: (p) => [p.contacto, p.telefono, p.email, p.instagram].filter(Boolean).map(U.esc).join('<br>') || '—' },
        { titulo: 'Entrega', valor: (p) => U.esc(p.tiempo_entrega || '—') },
        { titulo: 'Condiciones de pago', valor: (p) => U.esc(p.condiciones_pago || '—') },
        { titulo: 'Comprado', clase: 'num', valor: (p) => U.pesos(p._comprado) }
      ],
      campos: [
        { campo: 'nombre', etiqueta: 'Nombre', requerido: true },
        { campo: 'que_provee', etiqueta: 'Qué provee', placeholder: 'Ej: bolsos y mochilas' },
        { campo: 'contacto', etiqueta: 'Persona de contacto' },
        { campo: 'telefono', etiqueta: 'Teléfono / WhatsApp', tipo: 'tel' },
        { campo: 'email', etiqueta: 'Email', tipo: 'email' },
        { campo: 'instagram', etiqueta: 'Instagram', placeholder: '@usuario' },
        { campo: 'tiempo_entrega', etiqueta: 'Tiempo de entrega', placeholder: 'Ej: 7 días' },
        { campo: 'condiciones_pago', etiqueta: 'Condiciones de pago', placeholder: 'Ej: 50% seña' },
        { campo: 'notas', etiqueta: 'Notas', tipo: 'area' }
      ],
      mensajeBorrar: () => 'Los gastos cargados con este proveedor quedan, pero sin proveedor.'
    });
  }
});
