/* =====================================================================
   CRM · EMBUDO DE CONSULTAS (clientes potenciales)
   Nueva consulta → Presupuesto enviado → Vendida / Perdida (con motivo).
   Al marcarla vendida se abre la venta ya cargada. Incluye el análisis:
   cuántas se venden, por qué se pierden, por canal y por producto.
   Se usa como pestañas dentro de la sección Clientes.
   ===================================================================== */
(function () {
  const COLUMNAS = [
    { etapa: 'Nueva', titulo: 'Nuevas consultas', ayuda: 'Responder y pasar precio', tono: 'atencion' },
    { etapa: 'Presupuesto', titulo: 'Presupuesto enviado', ayuda: 'Esperando respuesta', tono: 'info' },
    { etapa: 'Ganada', titulo: 'Vendidas', ayuda: 'Últimas 30 días', tono: 'ok' },
    { etapa: 'Perdida', titulo: 'No compraron', ayuda: 'Últimas 30 días', tono: 'neutro' }
  ];
  const diasDesde = (f) => Math.max(0, -U.diasHasta(String(f).slice(0, 10)));

  async function cargar() {
    const [consultas, productos, personas, clientes] = await Promise.all([
      DB.listar('consultas', { orden: 'fecha', asc: false }), DB.listar('productos', { orden: 'nombre' }),
      DB.listar('personas', { orden: 'nombre' }), DB.listar('clientes', { orden: 'nombre' })]);
    return { consultas, productos, personas, clientes, prod: U.porId(productos), gente: U.porId(personas) };
  }
  const queBusca = (c, d) => (d.prod[c.producto_id]?.nombre || c.producto_texto || 'Sin producto') + (c.color ? ' · ' + c.color : '') + (c.cantidad > 1 ? ' ×' + c.cantidad : '');

  // ---------- Formulario de consulta ----------
  function abrirConsulta(fila, d, alGuardar) {
    const campos = [
      { campo: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true, defecto: U.hoy },
      { campo: 'canal', etiqueta: 'Por dónde consultó', tipo: 'select', opciones: N.CANALES, vacio: false, defecto: 'Instagram' },
      { campo: 'nombre', etiqueta: 'Nombre', requerido: true, sugerencias: d.clientes.map((c) => c.nombre), ayuda: 'Si ya es clienta, elegila de la lista.' },
      { campo: 'contacto', etiqueta: 'Teléfono o Instagram', placeholder: '@usuario o 11 1234-5678' },
      { campo: 'producto_id', etiqueta: 'Producto que consultó', tipo: 'select', numerico: true, vacio: 'Otro / no está en la lista',
        opciones: d.productos.filter((p) => p.estado !== 'Discontinuado').map((p) => ({ valor: p.id, texto: `${p.nombre} · ${U.pesos(p.precio)}` })) },
      { campo: 'producto_texto', etiqueta: 'Producto (si no está en la lista)', placeholder: 'Ej: mochila roja grande' },
      { campo: 'color', etiqueta: 'Color', placeholder: 'Ej: Negro' },
      { campo: 'cantidad', etiqueta: 'Cantidad', tipo: 'numero', min: 1, paso: 1, defecto: 1, requerido: true },
      { campo: 'presupuesto', etiqueta: 'Presupuesto / precio pasado', tipo: 'pesos', min: 0, ayuda: 'Se completa solo con el precio del producto.' },
      { campo: 'responsable_id', etiqueta: 'Quién la atiende', tipo: 'select', numerico: true, vacio: 'Sin asignar', opciones: d.personas.filter((p) => p.activa).map((p) => ({ valor: p.id, texto: p.nombre })) },
      { campo: 'notas', etiqueta: 'Qué preguntó / notas', tipo: 'area', filas: 2 }
    ];
    UI.formularioModal({
      titulo: fila ? 'Editar consulta' : 'Nueva consulta', campos, valores: fila || {},
      alArmar(form) {
        const precio = () => {
          const p = d.prod[Number(form.producto_id.value)];
          if (p && !form.presupuesto.value) form.presupuesto.value = Math.round(p.precio * (Number(form.cantidad.value) || 1));
          form.querySelector('[data-campo="producto_texto"]').hidden = !!form.producto_id.value;
        };
        form.producto_id.addEventListener('change', () => { form.presupuesto.value = ''; precio(); });
        form.cantidad.addEventListener('input', () => { form.presupuesto.value = ''; precio(); });
        // Si elige una clienta existente, completa el contacto
        form.nombre.addEventListener('change', () => {
          const c = d.clientes.find((x) => x.nombre === form.nombre.value.trim());
          if (c && !form.contacto.value) form.contacto.value = c.instagram || c.telefono || '';
        });
        precio();
      },
      alGuardar: async (datos) => {
        const c = d.clientes.find((x) => x.nombre === datos.nombre);
        if (c) datos.cliente_id = c.id;
        datos.actualizado = new Date().toISOString();
        if (fila) await DB.actualizar('consultas', fila.id, datos); else await DB.crear('consultas', datos);
        UI.aviso(fila ? 'Consulta actualizada' : 'Consulta cargada en "Nuevas"');
        alGuardar(); App.actualizarInsignias();
      }
    });
  }

  // ---------- Movimientos en el embudo ----------
  async function pasarAPresupuesto(c, d, alGuardar) {
    UI.formularioModal({
      titulo: 'Presupuesto enviado', ancho: 'chico', textoBoton: 'Listo, lo pasé',
      campos: [{ campo: 'presupuesto', etiqueta: '¿Qué precio le pasaste?', tipo: 'pesos', min: 0, ancho: 'completo', defecto: c.presupuesto }],
      alGuardar: async (x) => {
        await DB.actualizar('consultas', c.id, { etapa: 'Presupuesto', presupuesto: x.presupuesto, presupuesto_at: new Date().toISOString(), actualizado: new Date().toISOString() });
        UI.aviso('Pasó a "Presupuesto enviado"'); alGuardar(); App.actualizarInsignias();
      }
    });
  }

  function marcarPerdida(c, alGuardar) {
    UI.formularioModal({
      titulo: '¿Por qué no compró?', ancho: 'chico', textoBoton: 'Guardar',
      campos: [
        { campo: 'motivo_perdida', etiqueta: 'Motivo', tipo: 'select', opciones: N.MOTIVOS_PERDIDA, requerido: true, ancho: 'completo' },
        { campo: 'detalle_perdida', etiqueta: 'Detalle (lo que te dijo)', tipo: 'area', filas: 2 }
      ],
      alGuardar: async (x) => {
        await DB.actualizar('consultas', c.id, { ...x, etapa: 'Perdida', cerrada_at: new Date().toISOString(), actualizado: new Date().toISOString() });
        UI.aviso('Anotado. Sirve para ver qué mejorar.'); alGuardar(); App.actualizarInsignias();
      }
    });
  }

  // Vendida: se asegura la clienta y abre la venta ya completa
  async function marcarGanada(c, d, alGuardar) {
    try {
      let clienteId = c.cliente_id;
      if (!clienteId) {
        const contacto = (c.contacto || '').trim();
        const nueva = await DB.crear('clientes', {
          nombre: c.nombre, canal_origen: c.canal,
          instagram: contacto.startsWith('@') ? contacto : null, telefono: contacto && !contacto.startsWith('@') ? contacto : null
        });
        clienteId = nueva.id;
        await DB.actualizar('consultas', c.id, { cliente_id: clienteId });
      }
      const p = d.prod[c.producto_id];
      const items = p ? [{ producto_id: p.id, color: c.color && (p.colores || []).includes(c.color) ? c.color : (p.colores || [])[0] || 'Único',
        cantidad: c.cantidad || 1, precio_unitario: c.presupuesto ? Math.round(c.presupuesto / (c.cantidad || 1)) : p.precio }] : [];
      await App.nuevaVenta({ cliente_id: clienteId, canal: c.canal && N.CANALES.includes(c.canal) ? c.canal : 'Instagram', responsable_id: c.responsable_id,
        notas: `Desde consulta #${c.id}${!p && c.producto_texto ? ' · ' + c.producto_texto : ''}`, items },
      async (pedidoId) => {
        await DB.actualizar('consultas', c.id, { etapa: 'Ganada', pedido_id: pedidoId, cerrada_at: new Date().toISOString(), actualizado: new Date().toISOString() });
        UI.aviso('¡Vendida! La venta quedó cargada.'); alGuardar();
      });
    } catch (e) { UI.error(e); }
  }

  // ---------- Pestaña: tablero del embudo ----------
  async function pestanaEmbudo(cuerpo) {
    const d = await cargar();
    const recargar = () => pestanaEmbudo(cuerpo);
    const abiertas = d.consultas.filter((c) => c.etapa === 'Nueva' || c.etapa === 'Presupuesto');
    const cerradas30 = d.consultas.filter((c) => (c.etapa === 'Ganada' || c.etapa === 'Perdida') && diasDesde(c.cerrada_at || c.fecha) <= 30);
    const ganadas = cerradas30.filter((c) => c.etapa === 'Ganada').length;
    const tasa = cerradas30.length ? ganadas / cerradas30.length * 100 : null;
    const enJuego = U.sumar(abiertas, (c) => c.presupuesto || 0);

    const tarjeta = (c) => {
      const dias = diasDesde(c.etapa === 'Presupuesto' ? (c.presupuesto_at || c.fecha) : c.fecha);
      const tarde = (c.etapa === 'Nueva' && dias > 1) || (c.etapa === 'Presupuesto' && dias > 3);
      let botones = '';
      if (c.etapa === 'Nueva') botones = `<button type="button" class="boton-texto" data-perdida="${c.id}">No compró</button><button type="button" class="boton boton-chico" data-presupuesto="${c.id}">Pasé presupuesto →</button>`;
      if (c.etapa === 'Presupuesto') botones = `<button type="button" class="boton-texto" data-perdida="${c.id}">No compró</button><button type="button" class="boton boton-chico" data-ganada="${c.id}">¡Vendida! →</button>`;
      if (c.etapa === 'Perdida') botones = `<button type="button" class="boton-texto" data-reabrir="${c.id}">Reabrir</button>`;
      if (c.etapa === 'Ganada' && c.pedido_id) botones = `<a class="boton-texto" href="#/ventas/editar-${c.pedido_id}">Ver venta #${c.pedido_id}</a>`;
      return `<article class="kb-tarjeta">
        <div class="kb-cab"><b>${U.esc(c.nombre)}</b>${c.etapa === 'Nueva' || c.etapa === 'Presupuesto' ? `<span class="kb-dias ${tarde ? 'tarde' : ''}">${dias === 0 ? 'hoy' : `hace ${dias} ${dias === 1 ? 'día' : 'días'}`}</span>` : ''}</div>
        <p class="kb-producto">${U.esc(queBusca(c, d))}${c.presupuesto ? ` · <b>${U.pesos(c.presupuesto)}</b>` : ''}</p>
        <small class="muted">${[c.canal, c.contacto, c.responsable_id && d.gente[c.responsable_id] ? '' + d.gente[c.responsable_id].nombre : null].filter(Boolean).map(U.esc).join(' · ')}</small>
        ${c.etapa === 'Perdida' && c.motivo_perdida ? `<p class="kb-motivo">✕ ${U.esc(c.motivo_perdida)}${c.detalle_perdida ? ': ' + U.esc(c.detalle_perdida) : ''}</p>` : ''}
        ${c.notas && c.etapa !== 'Perdida' ? `<p class="kb-nota">${U.esc(c.notas)}</p>` : ''}
        <div class="kb-pie"><div class="kb-botones izq"><button type="button" class="boton-icono" data-editar-c="${c.id}" aria-label="Editar" title="Editar">✎</button><button type="button" class="boton-icono boton-icono-peligro" data-borrar-c="${c.id}" aria-label="Borrar" title="Borrar">✕</button></div>
          <div class="kb-botones">${botones}</div></div>
      </article>`;
    };

    cuerpo.innerHTML = `
      <div class="barra-herramientas">
        <p class="muted chico" style="margin:0;flex:1 1 220px">Cada vez que alguien te pregunta por un producto, cargalo acá. Así ves cuántas consultas terminan en venta y por qué se pierden.</p>
        <button type="button" class="boton" data-nueva-consulta>+ Nueva consulta</button>
      </div>
      <div class="grilla grilla-4">
        ${UI.numeroDestacado('Consultas abiertas', abiertas.length, `${abiertas.filter((c) => c.etapa === 'Nueva').length} sin responder`, abiertas.some((c) => c.etapa === 'Nueva') ? 'alerta' : '')}
        ${UI.numeroDestacado('En juego', U.pesos(enJuego), 'suma de presupuestos abiertos')}
        ${UI.numeroDestacado('Se venden', tasa === null ? '—' : U.porcentaje(tasa), 'de las cerradas en 30 días', tasa !== null && tasa >= 50 ? 'ok' : '')}
        ${UI.numeroDestacado('Vendidas (30 días)', ganadas, `${cerradas30.length - ganadas} no compraron`)}
      </div>
      <div class="tablero tablero-4 separado">${COLUMNAS.map((col) => {
        const lista = (col.etapa === 'Ganada' || col.etapa === 'Perdida' ? cerradas30 : abiertas).filter((c) => c.etapa === col.etapa)
          .sort((a, b) => (col.etapa === 'Nueva' || col.etapa === 'Presupuesto') ? a.fecha.localeCompare(b.fecha) : String(b.cerrada_at).localeCompare(String(a.cerrada_at)));
        return `<section class="kb-columna tono-${col.tono}">
          <header><h2>${col.titulo} <span class="contador-pill">${lista.length}</span></h2><small>${col.ayuda}</small></header>
          ${lista.map(tarjeta).join('') || '<p class="kb-vacio">Nada por acá</p>'}
        </section>`;
      }).join('')}</div>`;

    const buscar = (id) => d.consultas.find((x) => x.id === Number(id));
    cuerpo.onclick = async (e) => {
      const t = e.target.closest('button, a'); if (!t) return;
      if (t.matches('a[href^="#"]')) return;
      if (t.dataset.nuevaConsulta !== undefined) return abrirConsulta(null, d, recargar);
      if (t.dataset.editarC) return abrirConsulta(buscar(t.dataset.editarC), d, recargar);
      if (t.dataset.presupuesto) return pasarAPresupuesto(buscar(t.dataset.presupuesto), d, recargar);
      if (t.dataset.perdida) return marcarPerdida(buscar(t.dataset.perdida), recargar);
      if (t.dataset.ganada) return marcarGanada(buscar(t.dataset.ganada), d, recargar);
      if (t.dataset.reabrir) {
        await DB.actualizar('consultas', Number(t.dataset.reabrir), { etapa: 'Presupuesto', cerrada_at: null, motivo_perdida: null, detalle_perdida: null, actualizado: new Date().toISOString() });
        UI.aviso('Consulta reabierta'); return recargar();
      }
      if (t.dataset.borrarC && await UI.confirmar('Vas a borrar esta consulta.')) {
        try { await DB.borrar('consultas', Number(t.dataset.borrarC)); UI.aviso('Consulta borrada'); recargar(); App.actualizarInsignias(); } catch (ex) { UI.error(ex); }
      }
    };
  }

  // ---------- Pestaña: análisis del embudo ----------
  async function pestanaAnalisis(cuerpo) {
    const d = await cargar();
    const periodos = [{ valor: '90', texto: 'Últimos 90 días' }, { valor: '30', texto: 'Últimos 30 días' }, { valor: '365', texto: 'Último año' }];
    cuerpo.innerHTML = `<div class="barra-herramientas"><div class="filtros"><select aria-label="Período">${periodos.map((p) => `<option value="${p.valor}">${p.texto}</option>`).join('')}</select></div></div><div data-a></div>`;
    const sel = cuerpo.querySelector('select');
    const dibujar = () => {
      const dias = Number(sel.value);
      const cs = d.consultas.filter((c) => diasDesde(c.fecha) <= dias);
      const total = cs.length;
      const conPresu = cs.filter((c) => c.etapa === 'Presupuesto' || c.etapa === 'Ganada' || (c.etapa === 'Perdida' && c.presupuesto_at)).length;
      const ganadas = cs.filter((c) => c.etapa === 'Ganada');
      const perdidas = cs.filter((c) => c.etapa === 'Perdida');
      const cerradas = ganadas.length + perdidas.length;
      const pct = (a, b) => (b ? a / b * 100 : 0);
      const tasaPor = (clave) => Object.entries(U.agrupar(cs.filter((c) => c.etapa === 'Ganada' || c.etapa === 'Perdida'), clave))
        .map(([k, g]) => ({ etiqueta: k, valor: pct(g.filter((c) => c.etapa === 'Ganada').length, g.length), extra: `${g.filter((c) => c.etapa === 'Ganada').length} de ${g.length}` }))
        .sort((a, b) => b.valor - a.valor);
      const motivos = Object.entries(U.agrupar(perdidas, (c) => c.motivo_perdida || 'Sin motivo')).map(([k, g]) => ({ etiqueta: k, valor: g.length, extra: U.porcentaje(pct(g.length, perdidas.length)) })).sort((a, b) => b.valor - a.valor);
      const productos = Object.entries(U.agrupar(cs, (c) => d.prod[c.producto_id]?.nombre || c.producto_texto || 'Sin producto'))
        .map(([k, g]) => ({ etiqueta: k, valor: g.length, extra: `${g.filter((c) => c.etapa === 'Ganada').length} vendidas` })).sort((a, b) => b.valor - a.valor).slice(0, 8);
      const tiempos = ganadas.filter((c) => c.cerrada_at).map((c) => Math.max(0, (new Date(c.cerrada_at) - U.fechaDeIso(c.fecha)) / 86400000));
      const prom = tiempos.length ? U.sumar(tiempos, (x) => x) / tiempos.length : null;
      const fmtN = (n) => n + (n === 1 ? ' consulta' : ' consultas');
      cuerpo.querySelector('[data-a]').innerHTML = total ? `
        <div class="grilla grilla-4">
          ${UI.numeroDestacado('Consultas', total)}
          ${UI.numeroDestacado('Se vendieron', ganadas.length, U.porcentaje(pct(ganadas.length, cerradas)) + ' de las cerradas', 'ok')}
          ${UI.numeroDestacado('No compraron', perdidas.length, U.porcentaje(pct(perdidas.length, cerradas)) + ' de las cerradas', perdidas.length ? 'alerta' : '')}
          ${UI.numeroDestacado('Tardan en decidir', prom === null ? '—' : `${U.numero(prom)} días`, 'promedio hasta vender')}
        </div>
        <div class="grilla grilla-2 separado">
          <section class="tarjeta"><h2>El embudo</h2>
            <div class="embudo">${[
              { t: 'Consultaron', n: total }, { t: 'Les pasaste presupuesto', n: conPresu }, { t: 'Compraron', n: ganadas.length }
            ].map((x, i, arr) => `<div class="embudo-paso" style="--ancho:${Math.max(18, pct(x.n, arr[0].n))}%">
                <span class="embudo-barra"><b>${x.n}</b></span><span class="embudo-texto">${x.t}${i ? ` · ${U.porcentaje(pct(x.n, arr[0].n))}` : ''}</span></div>`).join('')}</div>
          </section>
          <section class="tarjeta"><h2>¿Por qué no compran?</h2>${UI.grafico.barras(motivos, { formato: fmtN, vacio: 'Todavía no hay consultas perdidas.' })}</section>
          <section class="tarjeta"><h2>Qué canal vende más</h2>
            <p class="muted chico" style="margin-top:-8px">Porcentaje de consultas que terminan en venta.</p>${UI.grafico.barras(tasaPor((c) => c.canal || 'Sin dato'), { formato: U.porcentaje, vacio: 'Faltan consultas cerradas.' })}</section>
          <section class="tarjeta"><h2>Productos más consultados</h2>${UI.grafico.barras(productos, { formato: fmtN })}</section>
        </div>` : '<div class="vacio">Todavía no hay consultas en este período. Cargalas en la pestaña "Embudo" y acá vas a ver el análisis.</div>';
    };
    sel.onchange = dibujar; dibujar();
  }

  App.crm = { pestanaEmbudo, pestanaAnalisis };
})();
