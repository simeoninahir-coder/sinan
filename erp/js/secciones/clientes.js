/* =====================================================================
   SECCIÓN · CLIENTES (CRM)
   Ficha completa de cada clienta, segmentos (nueva, recurrente,
   frecuente, inactiva), historial, seguimientos, cumpleaños y reportes.
   ===================================================================== */
(function () {
  // Trae clientas + ventas + interacciones y calcula todo lo de cada una
  async function cargarCRM() {
    const [v, interacciones] = await Promise.all([N.cargarVentas(), DB.listar('cliente_interacciones', { orden: 'fecha', asc: false })]);
    const pedidosPorCliente = U.agrupar(v.pedidos, (p) => p.cliente_id);
    const interPorCliente = U.agrupar(interacciones, (i) => i.cliente_id);
    v.clientes.forEach((c) => {
      const val = (pedidosPorCliente[c.id] || []).filter(N.pedidoValido);
      c._pedidos = pedidosPorCliente[c.id] || [];
      c._compras = val.length;
      c._total = U.sumar(val, (p) => p.total);
      c._ultima = val[0] ? val[0].fecha : null;
      c._primera = val.length ? val[val.length - 1].fecha : null;
      c._ticket = val.length ? c._total / val.length : 0;
      c._seg = N.segmentoCliente(c._compras, c._ultima);
      c._inter = interPorCliente[c.id] || [];
      c._cumple = N.diasCumple(c.fecha_nacimiento);
      // Productos que más compró
      const porProd = {};
      val.forEach((p) => p.items.forEach((i) => {
        const n = v.productosId[i.producto_id]?.nombre || i.descripcion || '—';
        porProd[n] = (porProd[n] || 0) + i.cantidad;
      }));
      c._favoritos = Object.entries(porProd).sort((a, b) => b[1] - a[1]).slice(0, 3);
    });
    return { ...v, interacciones, pedidosPorCliente };
  }

  const camposCliente = [
    { campo: 'nombre', etiqueta: 'Nombre y apellido', requerido: true },
    { campo: 'canal_origen', etiqueta: 'Cómo llegó', tipo: 'select', opciones: N.CANALES },
    { campo: 'telefono', etiqueta: 'Teléfono / WhatsApp', tipo: 'tel' },
    { campo: 'instagram', etiqueta: 'Instagram', placeholder: '@usuario' },
    { campo: 'email', etiqueta: 'Email', tipo: 'email' },
    { campo: 'fecha_nacimiento', etiqueta: 'Cumpleaños', tipo: 'fecha' },
    { campo: 'ciudad', etiqueta: 'Ciudad / barrio' },
    { campo: 'direccion', etiqueta: 'Dirección (para envíos)' },
    { campo: 'etiquetas', etiqueta: 'Etiquetas', tipo: 'lista', ancho: 'completo', placeholder: 'Ej: VIP, Mayorista, Familia',
      ayuda: 'Sugeridas: ' + N.ETIQUETAS_CLIENTE.join(', ') },
    { campo: 'intereses', etiqueta: 'Gustos e intereses', tipo: 'area', filas: 2, placeholder: 'Colores, productos que le gustan, talle…' },
    { campo: 'proximo_contacto', etiqueta: 'Próximo contacto', tipo: 'fecha', ayuda: 'Te aparece en Seguimientos y en Alertas.' },
    { campo: 'notas', etiqueta: 'Notas', tipo: 'area', filas: 2 }
  ];

  const chipsEtiquetas = (c) => (c.etiquetas || []).map((e) => `<span class="chip">${U.esc(e)}</span>`).join('');
  const botonesContacto = (c) => [
    N.linkWhatsapp(c.telefono) ? `<a class="boton boton-secundario boton-chico" href="${N.linkWhatsapp(c.telefono)}" target="_blank" rel="noopener">WhatsApp</a>` : '',
    N.linkInstagram(c.instagram) ? `<a class="boton boton-secundario boton-chico" href="${N.linkInstagram(c.instagram)}" target="_blank" rel="noopener">Instagram</a>` : '',
    c.email ? `<a class="boton boton-secundario boton-chico" href="mailto:${U.esc(c.email)}">Mail</a>` : ''
  ].join('');
  const haceDias = (fecha) => { const d = -U.diasHasta(fecha); return d === 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`; };

  // ---------- Ficha de la clienta ----------
  function abrirFicha(id, alCambiar) {
    let m = null;
    async function dibujar() {
      const datos = await cargarCRM();
      const c = datos.clientes.find((x) => x.id === id);
      if (!c) return;
      const html = `
        <div class="ficha-cabecera">
          <div>
            <p class="muted" style="margin:0">${[c.ciudad, c.canal_origen ? 'Llegó por ' + c.canal_origen : null].filter(Boolean).map(U.esc).join(' · ') || '&nbsp;'}</p>
            <div style="margin-top:6px">${UI.etiqueta(c._seg.texto, c._seg.tono)} ${chipsEtiquetas(c)}</div>
          </div>
          <div class="botones-contacto">${botonesContacto(c)}<button type="button" class="boton boton-chico" data-editar>Editar ficha</button></div>
        </div>
        <div class="grilla grilla-4 separado">
          ${UI.numeroDestacado('Total gastado', U.pesos(c._total))}
          ${UI.numeroDestacado('Compras', c._compras, c._primera ? 'desde ' + U.fecha(c._primera) : 'todavía ninguna')}
          ${UI.numeroDestacado('Ticket promedio', U.pesos(c._ticket))}
          ${UI.numeroDestacado('Última compra', c._ultima ? U.fecha(c._ultima) : '—', c._ultima ? haceDias(c._ultima) : '')}
        </div>
        <div class="grilla grilla-2 separado">
          <section class="tarjeta">
            <h3>Datos</h3>
            <dl class="datos-lista">
              <dt>Teléfono</dt><dd>${U.esc(c.telefono || '—')}</dd>
              <dt>Instagram</dt><dd>${U.esc(c.instagram || '—')}</dd>
              <dt>Email</dt><dd>${U.esc(c.email || '—')}</dd>
              <dt>Cumpleaños</dt><dd>${c.fecha_nacimiento ? U.fecha(c.fecha_nacimiento).slice(0, 5) + (c._cumple <= 30 ? ` <b>(${c._cumple === 0 ? '¡hoy!' : 'en ' + c._cumple + ' días'})</b>` : '') : '—'}</dd>
              <dt>Dirección</dt><dd>${U.esc(c.direccion || '—')}</dd>
              <dt>Le gusta</dt><dd>${U.esc(c.intereses || '—')}</dd>
              <dt>Más compró</dt><dd>${c._favoritos.map(([n, q]) => `${U.esc(n)} ×${q}`).join(', ') || '—'}</dd>
              <dt>Próx. contacto</dt><dd>${c.proximo_contacto ? U.fecha(c.proximo_contacto) : '—'}</dd>
            </dl>
            ${c.notas ? `<p class="nota">${U.esc(c.notas)}</p>` : ''}
          </section>
          <section class="tarjeta">
            <h3>Seguimiento</h3>
            <form class="form-linea" data-nueva-inter>
              <select name="tipo" aria-label="Tipo de contacto" style="flex:0 1 130px">${N.TIPOS_INTERACCION.map((t) => `<option>${t}</option>`).join('')}</select>
              <input name="nota" placeholder="¿Qué hablaron?" required aria-label="Nota">
              <button class="boton boton-chico">Agregar</button>
            </form>
            <ul class="linea-tiempo">${c._inter.map((i) => `<li>
              <span class="lt-punto"></span>
              <div class="crece"><small>${U.fecha(i.fecha)} · ${U.esc(i.tipo)}</small>${U.esc(i.nota)}</div>
              <button type="button" class="boton-icono boton-icono-peligro" data-borrar-inter="${i.id}" aria-label="Borrar">✕</button></li>`).join('') || '<li class="muted">Todavía no registraste contactos.</li>'}</ul>
          </section>
        </div>
        <h3 class="separado" style="margin-bottom:10px">Historial de compras</h3>
        ${UI.tabla({
          filas: c._pedidos, vacio: 'Todavía no compró nada.',
          columnas: [
            { titulo: 'Pedido', valor: (p) => `<a href="#/ventas/editar-${p.id}">#${p.id}</a> · ${U.fecha(p.fecha)}` },
            { titulo: 'Productos', valor: (p) => p.items.map((i) => `${U.esc(datos.productosId[i.producto_id]?.nombre || i.descripcion || '—')} ×${i.cantidad}`).join('<br>') },
            { titulo: 'Canal', valor: (p) => U.esc(p.canal) + (p.medio_pago ? `<br><small class="muted">${U.esc(p.medio_pago)}</small>` : '') },
            { titulo: 'Estado', valor: (p) => UI.etiqueta(p.estado, N.tonoPedido(p.estado)) },
            { titulo: 'Total', clase: 'num', valor: (p) => U.pesos(p.total) }
          ]
        })}`;
      if (!m) { m = UI.modal({ titulo: c.nombre, contenido: html, ancho: 'grande', alCerrar: alCambiar }); activar(m.cuerpo); }
      else m.cuerpo.innerHTML = html;
      m.cuerpo._cliente = c;
    }
    function activar(raiz) {
      raiz.addEventListener('click', async (e) => {
        if (e.target.closest('a[href^="#"]')) { m.cerrar(); return; }
        if (e.target.closest('[data-editar]')) return editarCliente(raiz._cliente, dibujar);
        const b = e.target.closest('[data-borrar-inter]');
        if (b && await UI.confirmar('Vas a borrar este registro de contacto.')) {
          try { await DB.borrar('cliente_interacciones', Number(b.dataset.borrarInter)); dibujar(); } catch (ex) { UI.error(ex); }
        }
      });
      raiz.addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target;
        try {
          await DB.crear('cliente_interacciones', { cliente_id: id, tipo: f.tipo.value, nota: f.nota.value.trim(), fecha: U.hoy() });
          // Si tenía un contacto agendado para hoy o antes, ya está hecho: se limpia
          const c = raiz._cliente;
          if (c && c.proximo_contacto && U.diasHasta(c.proximo_contacto) <= 0) await DB.actualizar('clientes', id, { proximo_contacto: null });
          UI.aviso('Contacto registrado'); dibujar();
        } catch (ex) { UI.error(ex); }
      });
    }
    dibujar().catch(UI.error);
  }

  function editarCliente(c, alGuardar) {
    UI.formularioModal({
      titulo: c ? `Editar ${c.nombre}` : 'Nueva clienta', campos: camposCliente, valores: c || {},
      alGuardar: async (d) => {
        if (c) await DB.actualizar('clientes', c.id, d); else await DB.crear('clientes', d);
        UI.aviso(c ? 'Ficha actualizada' : 'Clienta creada');
        alGuardar && alGuardar();
      }
    });
  }

  // ---------- Pestaña: listado ----------
  function pestanaClientas(cuerpo, abrir) {
    const crud = Seccion.crud({
      contenedor: cuerpo, tabla: 'clientes', nombre: 'clienta', textoNuevo: 'Nueva clienta',
      async cargar() {
        const d = await cargarCRM();
        d.clientes.sort((a, b) => b._total - a._total || a.nombre.localeCompare(b.nombre));
        if (abrir) { const id = abrir; abrir = null; setTimeout(() => abrirFicha(id, crud.recargar)); }
        return { filas: d.clientes, extra: d };
      },
      buscar: (c) => [c.nombre, c.telefono, c.email, c.instagram, c.ciudad, c.notas, c.intereses, (c.etiquetas || []).join(' ')].join(' '),
      filtros: [
        { id: 'seg', etiqueta: 'Segmento', opciones: [
          { valor: 'frecuente', texto: 'Frecuentes (3+ compras)' }, { valor: 'recurrente', texto: 'Recurrentes (2 compras)' },
          { valor: 'nueva', texto: 'Nuevas (1 compra)' }, { valor: 'inactiva', texto: `Inactivas (+${N.DIAS_INACTIVA} días)` }, { valor: 'sin', texto: 'Sin compras' }], valor: (c) => c._seg.id },
        { id: 'canal', etiqueta: 'Origen', opciones: (f) => [...new Set([...N.CANALES, ...f.map((c) => c.canal_origen).filter(Boolean)])], valor: (c) => c.canal_origen },
        { id: 'etiqueta', etiqueta: 'Etiqueta', opciones: (f) => [...new Set(f.flatMap((c) => c.etiquetas || []))].sort(), valor: (c) => (c.etiquetas || []).join('|'), contiene: true }
      ],
      columnas: [
        { titulo: 'Clienta', valor: (c) => `<b style="font-weight:500">${U.esc(c.nombre)}</b> ${chipsEtiquetas(c)}${c.ciudad ? `<br><small class="muted">${U.esc(c.ciudad)}</small>` : ''}` },
        { titulo: 'Segmento', valor: (c) => UI.etiqueta(c._seg.texto, c._seg.tono) },
        { titulo: 'Compras', clase: 'num', valor: (c) => c._compras },
        { titulo: 'Total gastado', clase: 'num', valor: (c) => `<b>${U.pesos(c._total)}</b>` },
        { titulo: 'Última compra', valor: (c) => c._ultima ? `${U.fecha(c._ultima)}<br><small class="muted">${haceDias(c._ultima)}</small>` : '—' },
        { titulo: 'Contacto', valor: (c) => [c.telefono, c.instagram].filter(Boolean).map(U.esc).join('<br>') || '—' }
      ],
      editar: (fila, x, recargar) => editarCliente(fila, recargar),
      mensajeBorrar: () => 'Sus compras quedan registradas como "Sin cliente" y se borra su historial de contactos.',
      accionesExtra: () => `<button type="button" class="boton-texto" data-accion="ficha">Ficha</button>`,
      alAccion: { ficha: (c, x, recargar) => abrirFicha(c.id, recargar) }
    });
  }

  // ---------- Pestaña: seguimientos ----------
  async function pestanaSeguimientos(cuerpo) {
    const d = await cargarCRM();
    const conFecha = d.clientes.filter((c) => c.proximo_contacto).sort((a, b) => a.proximo_contacto.localeCompare(b.proximo_contacto));
    const cumples = d.clientes.filter((c) => c._cumple !== null && c._cumple <= 30).sort((a, b) => a._cumple - b._cumple);
    const inactivas = d.clientes.filter((c) => c._seg.id === 'inactiva').sort((a, b) => b._total - a._total);
    const fila = (c, detalle, etiqueta = '') => `<li>
      <div class="crece"><b style="font-weight:500">${U.esc(c.nombre)}</b> ${etiqueta}<small>${detalle}</small></div>
      ${N.linkWhatsapp(c.telefono) ? `<a class="boton-texto" href="${N.linkWhatsapp(c.telefono)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
      <button type="button" class="boton-texto" data-ficha="${c.id}">Ficha</button></li>`;
    cuerpo.innerHTML = `
      <div class="grilla grilla-3">
        <section class="tarjeta"><h2>Para contactar</h2>
          <ul class="lista-simple">${conFecha.map((c) => {
            const dias = U.diasHasta(c.proximo_contacto);
            return fila(c, U.fecha(c.proximo_contacto) + (c._inter[0] ? ' · último: ' + U.esc(c._inter[0].nota) : ''),
              dias < 0 ? UI.etiqueta('Atrasado', 'alerta') : dias === 0 ? UI.etiqueta('Hoy', 'atencion') : '');
          }).join('') || '<li class="muted">No hay contactos agendados. Poné una fecha de "Próximo contacto" en la ficha.</li>'}</ul></section>
        <section class="tarjeta"><h2>Cumpleaños (30 días)</h2>
          <ul class="lista-simple">${cumples.map((c) => fila(c, U.fecha(c.fecha_nacimiento).slice(0, 5) + ' · ' + (c._cumple === 0 ? '¡hoy!' : 'en ' + c._cumple + ' días'),
            c._cumple <= 7 ? UI.etiqueta('Esta semana', 'info') : '')).join('') || '<li class="muted">No hay cumpleaños cerca (o falta cargar las fechas).</li>'}</ul></section>
        <section class="tarjeta"><h2>Para reactivar</h2>
          <p class="muted chico" style="margin-top:-6px">Compraron alguna vez, pero hace más de ${N.DIAS_INACTIVA} días que no compran.</p>
          <ul class="lista-simple">${inactivas.map((c) => fila(c, `Última compra ${haceDias(c._ultima)} · gastó ${U.pesos(c._total)}`)).join('') || '<li class="muted">Ninguna por ahora.</li>'}</ul></section>
      </div>`;
    cuerpo.onclick = (e) => { const b = e.target.closest('[data-ficha]'); if (b) abrirFicha(Number(b.dataset.ficha), () => pestanaSeguimientos(cuerpo)); };
  }

  // ---------- Pestaña: reportes ----------
  async function pestanaReportes(cuerpo) {
    const d = await cargarCRM();
    const cl = d.clientes;
    const compradoras = cl.filter((c) => c._compras);
    const activas = compradoras.filter((c) => c._seg.id !== 'inactiva');
    const repiten = compradoras.filter((c) => c._compras >= 2);
    const totalVentas = U.sumar(compradoras, (c) => c._total);
    // Clientas nuevas por mes (según su primera compra)
    const meses = U.ultimosMeses(12);
    const nuevasMes = meses.map((m) => ({ etiqueta: U.nombreMes(m, true), valor: compradoras.filter((c) => U.mes(c._primera) === m).length }));
    const primerMes = nuevasMes.findIndex((x) => x.valor);
    // Ventas de clientas nuevas vs. que repiten, por mes
    const NOMBRES_SEG = { frecuente: 'Frecuentes', recurrente: 'Recurrentes', nueva: 'Nuevas', inactiva: 'Inactivas', sin: 'Sin compras' };
    const segmentos = Object.entries(NOMBRES_SEG).map(([id, nombre]) => {
      const g = cl.filter((c) => c._seg.id === id);
      return { etiqueta: nombre, valor: g.length, extra: U.pesos(U.sumar(g, (c) => c._total)) };
    }).filter((x) => x.valor);
    const origen = Object.entries(U.agrupar(cl, (c) => c.canal_origen || 'Sin dato')).map(([k, g]) => ({ etiqueta: k, valor: g.length })).sort((a, b) => b.valor - a.valor);
    const top = [...compradoras].sort((a, b) => b._total - a._total).slice(0, 8).map((c) => ({ etiqueta: c.nombre, valor: c._total, extra: c._compras + ' compras' }));
    cuerpo.innerHTML = `
      <div class="grilla grilla-4">
        ${UI.numeroDestacado('Clientas', cl.length, `${compradoras.length} con compras`)}
        ${UI.numeroDestacado('Activas', activas.length, `compraron en los últimos ${N.DIAS_INACTIVA} días`)}
        ${UI.numeroDestacado('Vuelven a comprar', U.porcentaje(compradoras.length ? repiten.length / compradoras.length * 100 : 0), `${repiten.length} compraron 2 veces o más`, 'ok')}
        ${UI.numeroDestacado('Gasto promedio por clienta', U.pesos(compradoras.length ? totalVentas / compradoras.length : 0))}
      </div>
      <div class="grilla grilla-2 separado">
        <section class="tarjeta"><h2>Clientas nuevas por mes</h2>${UI.grafico.columnas(nuevasMes.slice(Math.max(0, primerMes)), { formato: (n) => n + (n === 1 ? ' clienta' : ' clientas') })}</section>
        <section class="tarjeta"><h2>Las que más compraron</h2>${UI.grafico.barras(top)}</section>
        <section class="tarjeta"><h2>Segmentos</h2>${UI.grafico.barras(segmentos, { formato: (n) => n + (n === 1 ? ' clienta' : ' clientas') })}</section>
        <section class="tarjeta"><h2>Cómo llegaron</h2>${UI.grafico.barras(origen, { formato: (n) => n + (n === 1 ? ' clienta' : ' clientas') })}</section>
      </div>`;
  }

  App.registrar({
    id: 'clientes', titulo: 'Clientes', icono: 'clientes', grupo: 'ventas',
    descripcion: 'Tu CRM: consultas (clientes potenciales), fichas de clientas, seguimientos y reportes.',
    insignia: async () => (await DB.listar('consultas')).filter((c) => c.etapa === 'Nueva').length,
    render(cont, param) {
      const abrir = param && param.startsWith('ficha-') ? Number(param.slice(6)) : null;
      if (abrir) { try { sessionStorage.setItem('pest-clientes', 'clientas'); } catch { /* nada */ } }
      if (param === 'embudo') { try { sessionStorage.setItem('pest-clientes', 'embudo'); } catch { /* nada */ } }
      UI.pestanas(cont, [
        { id: 'embudo', titulo: 'Embudo de consultas', render: App.crm.pestanaEmbudo },
        { id: 'analisis', titulo: 'Análisis del embudo', render: App.crm.pestanaAnalisis },
        { id: 'clientas', titulo: 'Clientas', render: (c) => pestanaClientas(c, abrir) },
        { id: 'seguimientos', titulo: 'Seguimientos', render: pestanaSeguimientos },
        { id: 'reportes', titulo: 'Reportes', render: pestanaReportes }
      ], 'clientes');
    }
  });
})();
