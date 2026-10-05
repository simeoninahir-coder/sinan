/* =====================================================================
   SECCIÓN · ALERTAS
   Stock bajo, pedidos sin actualizar hace más de 3 días y eventos próximos.
   Las alertas se calculan solas a partir de los datos (no se cargan a mano).
   ===================================================================== */
(function () {
  const DIAS_PEDIDO_QUIETO = 3;   // pedidos sin movimiento hace más de estos días
  const DIAS_EVENTO_PROXIMO = 14; // eventos que faltan menos de estos días

  // Devuelve [{ tipo, nivel: 'alerta'|'atencion'|'info', titulo, detalle, ir: [seccion, parametro] }]
  App.calcularAlertas = async () => {
    const [cfg, stock, productos, pedidos, eventos, tareasEv, clientes, insumos] = await Promise.all([
      App.config(), DB.listar('stock'), DB.listar('productos'), DB.listar('pedidos'),
      DB.listar('eventos', { orden: 'fecha' }), DB.listar('evento_tareas'), DB.listar('clientes'),
      App.insumosParaReponer ? App.insumosParaReponer().catch(() => []) : []
    ]);
    const prod = U.porId(productos);
    const cli = U.porId(clientes);
    const alertas = [];

    // Insumos y packaging para reponer
    insumos.forEach((i) => alertas.push({
      tipo: 'stock', nivel: i.stock <= 0 ? 'alerta' : 'atencion',
      titulo: `Reponer insumo: ${i.nombre}`,
      detalle: `Quedan ${i.stock}`, ir: ['insumos']
    }));

    // Stock
    stock.forEach((s) => {
      const p = prod[s.producto_id];
      if (!p || p.estado === 'Discontinuado' || p.estado === 'Pausado') return;
      const est = N.estadoStock(s, cfg);
      if (est === 'ok') return;
      const nombre = p.nombre + (s.color !== 'Único' ? ` (${s.color})` : '');
      alertas.push({
        tipo: 'stock', nivel: est === 'sin' ? 'alerta' : 'atencion',
        titulo: est === 'sin' ? `Sin stock: ${nombre}` : `Stock bajo: ${nombre}`,
        detalle: `Quedan ${s.cantidad} · mínimo ${N.minimo(s, cfg)}`,
        ir: ['inventario']
      });
    });

    // Pedidos quietos
    pedidos.forEach((p) => {
      if (N.ESTADOS_FINALES.includes(p.estado)) return;
      const dias = Math.floor((Date.now() - new Date(p.actualizado).getTime()) / 86400000);
      if (dias <= DIAS_PEDIDO_QUIETO) return;
      alertas.push({
        tipo: 'pedido', nivel: dias > 7 ? 'alerta' : 'atencion',
        titulo: `Pedido #${p.id} de ${N.nombreCliente(cli, p.cliente_id)} sin actualizar`,
        detalle: `Está "${p.estado}" hace ${dias} días · ${U.pesos(p.total)}`,
        ir: ['ventas', 'editar-' + p.id]
      });
    });

    // Eventos próximos
    const pendientes = U.agrupar(tareasEv.filter((t) => !t.hecha), (t) => t.evento_id);
    eventos.forEach((e) => {
      if (e.estado === 'Realizado' || e.estado === 'Cancelado') return;
      const dias = U.diasHasta(e.fecha);
      if (dias < 0 || dias > DIAS_EVENTO_PROXIMO) return;
      const n = (pendientes[e.id] || []).length;
      alertas.push({
        tipo: 'evento', nivel: dias <= 3 && n ? 'alerta' : 'info',
        titulo: `${e.nombre} ${dias === 0 ? 'es hoy' : dias === 1 ? 'es mañana' : `en ${dias} días`}`,
        detalle: `${U.fecha(e.fecha)}${e.lugar ? ' · ' + e.lugar : ''} · ${n ? n + ' tareas pendientes' : 'checklist completo'}`,
        ir: ['eventos', 'ver-' + e.id]
      });
    });

    const peso = { alerta: 0, atencion: 1, info: 2 };
    return alertas.sort((a, b) => peso[a.nivel] - peso[b.nivel]);
  };

  // Dibuja una lista de alertas (se usa también en Inicio)
  App.dibujarAlertas = (alertas, limite) => {
    if (!alertas.length) return '<div class="vacio">Todo en orden: no hay alertas 🎉</div>';
    const lista = limite ? alertas.slice(0, limite) : alertas;
    return `<div class="lista-alertas">${lista.map((a) => `
      <div class="alerta-item nivel-${a.nivel}">
        <div class="crece"><b>${U.esc(a.titulo)}</b><small>${U.esc(a.detalle)}</small></div>
        <button type="button" class="boton-texto" data-ir="${a.ir.join('/')}">Ver</button>
      </div>`).join('')}</div>`;
  };
  // Activa los botones "Ver"
  App.activarIr = (raiz) => raiz.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ir]'); if (!b) return;
    const [s, p] = b.dataset.ir.split('/'); App.ir(s, p);
  });

  App.registrar({
    id: 'alertas', titulo: 'Alertas', icono: 'alertas',
    descripcion: 'Lo que necesita tu atención: stock bajo, pedidos quietos y eventos que se acercan.',
    insignia: async () => (await App.calcularAlertas()).length,
    async render(cont) {
      const alertas = await App.calcularAlertas();
      const grupos = [
        { tipo: 'stock', titulo: 'Stock bajo o agotado (productos e insumos)' },
        { tipo: 'pedido', titulo: `Pedidos sin actualizar hace más de ${DIAS_PEDIDO_QUIETO} días` },
        { tipo: 'evento', titulo: `Eventos en los próximos ${DIAS_EVENTO_PROXIMO} días` }
      ];
      cont.innerHTML = `
        <div class="grilla grilla-3">${grupos.map((g) => {
          const n = alertas.filter((a) => a.tipo === g.tipo).length;
          return UI.numeroDestacado(g.titulo, n, n ? 'para revisar' : 'todo bien', n ? (g.tipo === 'evento' ? '' : 'alerta') : 'ok');
        }).join('')}</div>
        ${grupos.map((g) => {
          const lista = alertas.filter((a) => a.tipo === g.tipo);
          return `<section class="separado"><h2 style="font-size:22px;margin:18px 0 12px">${U.esc(g.titulo)}</h2>
            ${App.dibujarAlertas(lista)}</section>`;
        }).join('')}`;
      App.activarIr(cont);
      App.actualizarInsignias();
    }
  });
})();
