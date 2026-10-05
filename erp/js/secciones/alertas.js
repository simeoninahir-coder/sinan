/* =====================================================================
   SECCIÓN · ALERTAS
   Stock bajo, insumos para reponer, pedidos sin actualizar,
   eventos próximos y clientas para contactar (seguimientos y cumpleaños).
   Las alertas se calculan solas a partir de los datos (no se cargan a mano).
   ===================================================================== */
(function () {
  const DIAS_PEDIDO_QUIETO = 3;   // pedidos sin movimiento hace más de estos días
  const DIAS_EVENTO_PROXIMO = 14; // eventos que faltan menos de estos días
  const DIAS_CUMPLE = 7;          // cumpleaños que faltan menos de estos días

  // Grupos de alertas: cómo se ven y a dónde llevan
  const GRUPOS = [
    { tipo: 'stock', icono: 'inventario', titulo: 'Stock de productos', ir: 'inventario', frase: (n) => `${n} ${n === 1 ? 'producto' : 'productos'} con poco o sin stock` },
    { tipo: 'insumo', icono: 'insumos', titulo: 'Insumos y packaging', ir: 'insumos', frase: (n) => `${n} ${n === 1 ? 'insumo' : 'insumos'} para reponer` },
    { tipo: 'pedido', icono: 'ventas', titulo: `Pedidos quietos (+${DIAS_PEDIDO_QUIETO} días)`, ir: 'ventas', frase: (n) => `${n} ${n === 1 ? 'pedido' : 'pedidos'} sin actualizar` },
    { tipo: 'evento', icono: 'eventos', titulo: 'Eventos y ferias que se acercan', ir: 'eventos', frase: (n) => `${n} ${n === 1 ? 'evento próximo' : 'eventos próximos'}` },
    { tipo: 'cliente', icono: 'clientes', titulo: 'Clientas para contactar', ir: 'clientes/seguimientos', frase: (n) => `${n} ${n === 1 ? 'clienta' : 'clientas'} para contactar` }
  ];

  // Devuelve [{ tipo, nivel: 'alerta'|'atencion'|'info', titulo, detalle, marca, ir: [seccion, parametro] }]
  App.calcularAlertas = async () => {
    const [cfg, stock, productos, pedidos, eventos, tareasEv, clientes, insumos] = await Promise.all([
      App.config(), DB.listar('stock'), DB.listar('productos'), DB.listar('pedidos'),
      DB.listar('eventos', { orden: 'fecha' }), DB.listar('evento_tareas'), DB.listar('clientes'),
      App.insumosParaReponer ? App.insumosParaReponer().catch(() => []) : []
    ]);
    const prod = U.porId(productos);
    const cli = U.porId(clientes);
    const alertas = [];

    // Stock de productos
    stock.forEach((s) => {
      const p = prod[s.producto_id];
      if (!p || p.estado === 'Discontinuado' || p.estado === 'Pausado') return;
      const est = N.estadoStock(s, cfg);
      if (est === 'ok') return;
      alertas.push({
        tipo: 'stock', nivel: est === 'sin' ? 'alerta' : 'atencion', marca: est === 'sin' ? 'Sin stock' : 'Poco stock',
        titulo: p.nombre + (s.color !== 'Único' ? ` · ${s.color}` : ''),
        detalle: `Quedan ${s.cantidad} · mínimo ${N.minimo(s, cfg)}`, ir: ['inventario']
      });
    });

    // Insumos
    insumos.forEach((i) => alertas.push({
      tipo: 'insumo', nivel: i.stock <= 0 ? 'alerta' : 'atencion', marca: i.stock <= 0 ? 'Sin stock' : 'Reponer',
      titulo: i.nombre, detalle: `Quedan ${i.stock}`, ir: ['insumos']
    }));

    // Pedidos quietos
    pedidos.forEach((p) => {
      if (N.ESTADOS_FINALES.includes(p.estado)) return;
      const dias = Math.floor((Date.now() - new Date(p.actualizado).getTime()) / 86400000);
      if (dias <= DIAS_PEDIDO_QUIETO) return;
      alertas.push({
        tipo: 'pedido', nivel: dias > 7 ? 'alerta' : 'atencion', marca: p.estado,
        titulo: `Pedido #${p.id} · ${N.nombreCliente(cli, p.cliente_id)}`,
        detalle: `Sin cambios hace ${dias} días · ${U.pesos(p.total)}`, ir: ['ventas', 'editar-' + p.id]
      });
    });

    // Eventos y ferias próximos
    const pendientes = U.agrupar(tareasEv.filter((t) => !t.hecha), (t) => t.evento_id);
    eventos.forEach((e) => {
      if (e.estado === 'Realizado' || e.estado === 'Cancelado') return;
      const dias = U.diasHasta(e.fecha);
      if (dias < 0 || dias > DIAS_EVENTO_PROXIMO) return;
      const n = (pendientes[e.id] || []).length;
      alertas.push({
        tipo: 'evento', nivel: dias <= 3 && n ? 'alerta' : 'info',
        marca: dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `En ${dias} días`,
        titulo: (e.tipo === 'Feria' ? 'Feria · ' : '') + e.nombre,
        detalle: `${U.fecha(e.fecha)}${e.lugar ? ' · ' + e.lugar : ''} · ${n ? n + (n === 1 ? ' tarea pendiente' : ' tareas pendientes') : 'checklist completo'}`,
        ir: ['eventos', 'ver-' + e.id]
      });
    });

    // Clientas: contactos agendados y cumpleaños
    clientes.forEach((c) => {
      if (c.proximo_contacto && U.diasHasta(c.proximo_contacto) <= 0) {
        const atraso = -U.diasHasta(c.proximo_contacto);
        alertas.push({
          tipo: 'cliente', nivel: atraso > 3 ? 'alerta' : 'atencion', marca: atraso ? `Hace ${atraso} días` : 'Hoy',
          titulo: `Contactar a ${c.nombre}`, detalle: `Agendado para el ${U.fecha(c.proximo_contacto)}`, ir: ['clientes', 'ficha-' + c.id]
        });
      }
      const cumple = N.diasCumple(c.fecha_nacimiento);
      if (cumple !== null && cumple <= DIAS_CUMPLE) {
        alertas.push({
          tipo: 'cliente', nivel: 'info', marca: cumple === 0 ? '¡Hoy!' : `En ${cumple} días`,
          titulo: `Cumpleaños de ${c.nombre} 🎂`, detalle: 'Buen momento para saludarla', ir: ['clientes', 'ficha-' + c.id]
        });
      }
    });

    const peso = { alerta: 0, atencion: 1, info: 2 };
    return alertas.sort((a, b) => peso[a.nivel] - peso[b.nivel]);
  };

  const peorNivel = (lista) => (lista.some((a) => a.nivel === 'alerta') ? 'alerta' : lista.some((a) => a.nivel === 'atencion') ? 'atencion' : 'info');

  // Resumen prolijo por grupo (se usa en Inicio)
  App.dibujarResumenAlertas = (alertas) => {
    const filas = GRUPOS.map((g) => ({ g, lista: alertas.filter((a) => a.tipo === g.tipo) })).filter((x) => x.lista.length);
    if (!filas.length) return `<div class="todo-ok">${App.icono('alertas')}<div><b>Todo en orden</b><small>No hay nada pendiente por ahora.</small></div></div>`;
    return `<div class="alertas-resumen">${filas.map(({ g, lista }) => {
      const unicos = [...new Set(lista.map((a) => a.titulo.replace(/^(Contactar a |Feria · |Cumpleaños de )/, '').replace(' 🎂', '')))];
      const nombres = unicos.slice(0, 2).join(', ') + (unicos.length > 2 ? ` y ${unicos.length - 2} más` : '');
      return `<button type="button" class="alerta-grupo nivel-${peorNivel(lista)}" data-ir="${g.ir}">
        <span class="ag-icono">${App.icono(g.icono)}</span>
        <span class="ag-texto"><b>${U.esc(g.frase(lista.length))}</b><small>${U.esc(nombres)}</small></span>
        <span class="ag-flecha" aria-hidden="true">›</span>
      </button>`;
    }).join('')}</div>`;
  };

  // Lista detallada de alertas
  App.dibujarAlertas = (alertas) => {
    if (!alertas.length) return '<div class="vacio">Todo en orden 🎉</div>';
    return `<ul class="lista-alertas">${alertas.map((a) => `
      <li><button type="button" class="alerta-fila" data-ir="${a.ir.join('/')}">
        <span class="af-punto nivel-${a.nivel}"></span>
        <span class="af-texto"><b>${U.esc(a.titulo)}</b><small>${U.esc(a.detalle)}</small></span>
        ${a.marca ? `<span class="af-marca nivel-${a.nivel}">${U.esc(a.marca)}</span>` : ''}
        <span class="ag-flecha" aria-hidden="true">›</span>
      </button></li>`).join('')}</ul>`;
  };

  // Activa los botones que llevan a otra sección
  App.activarIr = (raiz) => raiz.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ir]'); if (!b) return;
    const [s, p] = b.dataset.ir.split('/');
    if (s === 'clientes' && p === 'seguimientos') { try { sessionStorage.setItem('pest-clientes', 'seguimientos'); } catch { /* nada */ } App.ir('clientes'); return; }
    App.ir(s, p);
  });

  App.registrar({
    id: 'alertas', titulo: 'Alertas', icono: 'alertas',
    descripcion: 'Lo que necesita tu atención, ordenado por tema.',
    insignia: async () => (await App.calcularAlertas()).filter((a) => a.nivel !== 'info').length,
    async render(cont) {
      const alertas = await App.calcularAlertas();
      const grupos = GRUPOS.map((g) => ({ g, lista: alertas.filter((a) => a.tipo === g.tipo) }));
      const conAlertas = grupos.filter((x) => x.lista.length);
      cont.innerHTML = `
        <div class="chips-resumen">${grupos.map(({ g, lista }) => `
          <span class="chip-resumen ${lista.length ? 'nivel-' + peorNivel(lista) : 'nivel-ok'}">${App.icono(g.icono)} ${U.esc(g.titulo)} <b>${lista.length}</b></span>`).join('')}
        </div>
        ${conAlertas.length ? `<div class="grilla grilla-2 separado">${conAlertas.map(({ g, lista }) => `
          <section class="tarjeta">
            <div class="tarjeta-cabecera"><h2 class="titulo-icono">${App.icono(g.icono)} ${U.esc(g.titulo)}</h2><span class="contador-pill">${lista.length}</span></div>
            ${App.dibujarAlertas(lista)}
          </section>`).join('')}</div>`
        : `<div class="separado">${App.dibujarResumenAlertas([])}</div>`}`;
      App.activarIr(cont);
      App.actualizarInsignias();
    }
  });
})();
