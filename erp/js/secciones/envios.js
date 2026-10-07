/* =====================================================================
   SECCIÓN · ENVÍOS (departamento de Logística)
   Tablero con los pedidos que hay que preparar y entregar, con su
   forma de entrega (Uber, punto de encuentro, correo…) y responsable.
   ===================================================================== */
(function () {
  const COLUMNAS = [
    { estado: 'Por preparar', titulo: 'Por preparar', ayuda: 'Armar el paquete', tono: 'alerta' },
    { estado: 'Por entregar', titulo: 'Por entregar', ayuda: 'Enviar o llevar', tono: 'atencion' },
    { estado: 'Por cobrar', titulo: 'Entregados sin cobrar', ayuda: 'Reclamar el pago', tono: 'info' }
  ];

  async function dibujar(cont) {
    const [v, personas] = await Promise.all([N.cargarVentas(), DB.listar('personas')]);
    const gente = U.porId(personas);
    const filtroMetodo = cont.dataset.metodo || '';
    const pend = v.pedidos.filter((p) => COLUMNAS.some((c) => c.estado === p.estado) && (!filtroMetodo || (p.envio_metodo || 'Sin definir') === filtroMetodo))
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id);
    const metodos = [...new Set(v.pedidos.filter((p) => COLUMNAS.some((c) => c.estado === p.estado)).map((p) => p.envio_metodo || 'Sin definir'))];

    const tarjeta = (p) => {
      const dias = Math.max(0, -U.diasHasta(p.fecha));
      const paso = N.proximoPaso(p);
      return `<article class="kb-tarjeta">
        <div class="kb-cab"><b>#${p.id} · ${U.esc(N.nombreCliente(v.clientesId, p.cliente_id))}</b>
          <span class="kb-dias ${dias > 2 ? 'tarde' : ''}">${dias === 0 ? 'hoy' : `hace ${dias} ${dias === 1 ? 'día' : 'días'}`}</span></div>
        <ul class="kb-items">${p.items.map((i) => `<li>${U.esc(v.productosId[i.producto_id]?.nombre || i.descripcion || '—')}${i.color !== 'Único' ? ' · ' + U.esc(i.color) : ''} <b>×${i.cantidad}</b></li>`).join('')}</ul>
        <p class="kb-envio"><b>${U.esc(p.envio_metodo || 'Forma de entrega sin definir')}</b>${p.envio_detalle ? `<br>${U.esc(p.envio_detalle)}` : ''}</p>
        <div class="kb-pie">
          <small class="muted">${p.responsable_id && gente[p.responsable_id] ? '' + U.esc(gente[p.responsable_id].nombre) : 'Sin responsable'} · ${U.pesos(p.total)}</small>
          <div class="kb-botones">
            <button type="button" class="boton-texto" data-editar="${p.id}">Ver</button>
            ${paso ? `<button type="button" class="boton boton-chico" data-avanzar="${p.id}">✓ ${paso.hecho}</button>` : ''}
          </div>
        </div>
      </article>`;
    };

    cont.innerHTML = `
      <div class="barra-herramientas">
        <div class="filtros"><select data-metodo aria-label="Forma de entrega">
          <option value="">Forma de entrega: todas</option>${metodos.map((m) => `<option ${m === filtroMetodo ? 'selected' : ''}>${U.esc(m)}</option>`).join('')}
        </select></div>
        <button type="button" class="boton" data-nueva>+ Registrar venta</button>
      </div>
      <div class="tablero">${COLUMNAS.map((c) => {
        const lista = pend.filter((p) => p.estado === c.estado);
        return `<section class="kb-columna tono-${c.tono}">
          <header><h2>${c.titulo} <span class="contador-pill">${lista.length}</span></h2><small>${c.ayuda}</small></header>
          ${lista.map(tarjeta).join('') || '<p class="kb-vacio">Nada por acá ✓</p>'}
        </section>`;
      }).join('')}</div>`;

    cont.querySelector('[data-metodo]').onchange = (e) => { cont.dataset.metodo = e.target.value; dibujar(cont); };
    cont.querySelector('[data-nueva]').onclick = () => App.ir('ventas', 'nuevo');
    cont.onclick = async (e) => {
      const a = e.target.closest('[data-avanzar]');
      const ed = e.target.closest('[data-editar]');
      if (a) {
        a.disabled = true;
        try { await App.avanzarPaso(v.pedidos.find((p) => p.id === Number(a.dataset.avanzar))); dibujar(cont); } catch (ex) { UI.error(ex); a.disabled = false; }
      }
      if (ed) App.ir('ventas', 'editar-' + ed.dataset.editar);
    };
  }

  App.registrar({
    id: 'envios', titulo: 'Envíos', icono: 'proveedores', grupo: 'logistica',
    descripcion: 'Qué hay que preparar, entregar y cobrar. Lo más viejo, arriba.',
    insignia: async () => (await DB.listar('pedidos')).filter((p) => p.estado === 'Por preparar' || p.estado === 'Por entregar').length,
    render: (cont) => dibujar(cont)
  });
})();
