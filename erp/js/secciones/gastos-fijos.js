/* =====================================================================
   FINANZAS · GASTOS OPERATIVOS (gastos fijos mensuales)
   Cada herramienta (CapCut, Claude…) tiene su monto para Sinan, día de
   vencimiento, estado y GRUPO. En pantalla se ven agrupadas como un solo
   ítem (ej: "Herramientas") con el detalle de cada una.
     Activo     → se descuenta de caja (se carga UN gasto por grupo y mes)
     Registrado → no se descuenta: queda anotado como "Deuda operativa Sinan"
     Inactivo   → no suma ni avisa
   Cada mes se anota solo desde el día 1 (con fecha del vencimiento).
   ===================================================================== */
(function () {
  const ESTADOS = [
    { valor: 'Activo', texto: 'Activo - se descuenta de caja' },
    { valor: 'Registrado', texto: 'Registrado - no se descuenta' },
    { valor: 'Inactivo', texto: 'Inactivo' }
  ];
  const textoEstado = (e) => ESTADOS.find((x) => x.valor === e)?.texto || e;
  const tonoEstado = { Activo: 'ok', Registrado: 'atencion', Inactivo: 'neutro' };
  const CATEGORIA = 'Gastos operativos';
  const cuenta = (g) => g.estado !== 'Inactivo';
  const grupoDe = (g) => g?.grupo || 'Herramientas';
  const detalle = (gs) => gs.map((g) => `${g.nombre} ${U.pesos(g.monto)}`).join(' · ');

  // Anota los meses que faltan (desde "desde" hasta el mes actual), uno por herramienta y mes.
  // Si se descuenta, se carga UN solo gasto en Finanzas por grupo y mes.
  let enCurso = null;
  App.asegurarGastosFijos = () => {
    if (enCurso) return enCurso;
    enCurso = (async () => {
      const [gastos, registros] = await Promise.all([DB.listar('gastos_fijos'), DB.listar('gastos_fijos_mes')]);
      const ya = new Set(registros.map((r) => r.gasto_fijo_id + '|' + r.mes));
      const nuevosADescontar = {};   // 'grupo|mes' → [{ reg, gasto }]
      for (const g of gastos.filter(cuenta)) {
        for (let m = g.desde; m <= U.mes(U.hoy()); m = U.isoDeFecha(new Date(Number(m.slice(0, 4)), Number(m.slice(5)), 1)).slice(0, 7)) {
          if (ya.has(g.id + '|' + m)) continue;
          const modo = g.estado === 'Activo' ? 'descuenta' : 'registra';
          let reg;
          try { reg = await DB.crear('gastos_fijos_mes', { gasto_fijo_id: g.id, mes: m, monto: g.monto, modo }); }
          catch { continue; }   // ya lo anotó otro dispositivo
          if (modo === 'descuenta') (nuevosADescontar[grupoDe(g) + '|' + m] = nuevosADescontar[grupoDe(g) + '|' + m] || []).push({ reg, gasto: g });
        }
      }
      for (const [clave, lista] of Object.entries(nuevosADescontar)) {
        const [grupo, mes] = clave.split('|');
        const dia = String(Math.min(...lista.map((x) => x.gasto.dia_vencimiento))).padStart(2, '0');
        const mov = await DB.crear('movimientos_financieros', {
          fecha: `${mes}-${dia}`, tipo: 'egreso', categoria: CATEGORIA,
          descripcion: `${grupo} (${lista.map((x) => x.gasto.nombre).join(', ')})`, monto: U.sumar(lista, (x) => x.reg.monto)
        });
        for (const x of lista) await DB.actualizar('gastos_fijos_mes', x.reg.id, { movimiento_id: mov.id });
      }
    })().catch((e) => console.error(e)).finally(() => { setTimeout(() => { enCurso = null; }, 60000); });
    return enCurso;
  };

  // "Deuda operativa Sinan": todo lo registrado sin descontar de caja
  App.deudaOperativa = async () => U.sumar((await DB.listar('gastos_fijos_mes').catch(() => [])).filter((r) => r.modo === 'registra'), (r) => r.monto);

  // Lo registrado sin descontar, agrupado por grupo y mes (lo muestra Finanzas → Movimientos)
  App.gastosFijosRegistrados = async () => {
    const [gastos, registros] = await Promise.all([DB.listar('gastos_fijos').catch(() => []), DB.listar('gastos_fijos_mes').catch(() => [])]);
    const g = U.porId(gastos);
    return Object.entries(U.agrupar(registros.filter((r) => r.modo === 'registra'), (r) => grupoDe(g[r.gasto_fijo_id]) + '|' + r.mes)).map(([clave, rs]) => {
      const [grupo, mes] = clave.split('|');
      const dia = Math.min(...rs.map((r) => g[r.gasto_fijo_id]?.dia_vencimiento || 10));
      return { grupo, mes, fecha: `${mes}-${String(dia).padStart(2, '0')}`, monto: U.sumar(rs, (r) => r.monto), detalle: rs.map((r) => `${g[r.gasto_fijo_id]?.nombre || '?'} ${U.pesos(r.monto)}`).join(' · ') };
    });
  };

  // Aviso 2 días antes del vencimiento (ej: el 8, para lo que vence el 10)
  App.alertasGastosFijos = async () => {
    const gastos = (await DB.listar('gastos_fijos', { orden: 'nombre' }).catch(() => [])).filter(cuenta);
    const dia = Number(U.hoy().slice(8, 10));
    return Object.entries(U.agrupar(gastos, (g) => g.dia_vencimiento)).filter(([d]) => dia >= Number(d) - 2 && dia <= Number(d)).map(([d, gs]) => ({
      tipo: 'gastofijo', nivel: 'atencion', marca: dia === Number(d) ? 'Vence hoy' : `En ${Number(d) - dia} días`,
      titulo: `El ${d} vencen tus gastos fijos. Total: ${U.pesos(U.sumar(gs, (g) => g.monto))}`,
      detalle: detalle(gs), ir: ['finanzas', 'operativos']
    }));
  };

  // Pasar a caja lo registrado de un grupo y mes (cuando las ventas lo permiten)
  async function descontar(grupo, mes, regs, gastosId, recargar) {
    const total = U.sumar(regs, (r) => r.monto);
    if (!(await UI.confirmar(`Vas a descontar de caja ${U.pesos(total)} de ${grupo} (${U.nombreMes(mes)}). Se carga como un gasto de hoy y baja la deuda operativa.`, { titulo: 'Descontar de caja', boton: 'Sí, descontar', peligro: false }))) return;
    try {
      const mov = await DB.crear('movimientos_financieros', { fecha: U.hoy(), tipo: 'egreso', categoria: CATEGORIA, descripcion: `${grupo} de ${U.nombreMes(mes)} (${regs.map((r) => gastosId[r.gasto_fijo_id]?.nombre).join(', ')})`, monto: total });
      for (const r of regs) await DB.actualizar('gastos_fijos_mes', r.id, { modo: 'descuenta', movimiento_id: mov.id });
      UI.aviso('Descontado de caja · deuda actualizada'); recargar();
    } catch (e) { UI.error(e); }
  }

  // Al revés: lo descontado de un grupo y mes pasa a deuda (se saca el gasto de Finanzas)
  async function pasarADeuda(grupo, mes, regs, recargar) {
    const total = U.sumar(regs, (r) => r.monto);
    if (!(await UI.confirmar(`${grupo} de ${U.nombreMes(mes)} (${U.pesos(total)}) no se descuenta de caja: se saca de los gastos de Finanzas y queda anotado como deuda operativa.`, { titulo: 'No descontar', boton: 'Sí, no descontar', peligro: false }))) return;
    try {
      for (const id of [...new Set(regs.map((r) => r.movimiento_id).filter(Boolean))]) await DB.borrar('movimientos_financieros', id);
      for (const r of regs) await DB.actualizar('gastos_fijos_mes', r.id, { modo: 'registra', movimiento_id: null });
      UI.aviso('Queda anotado sin descontar'); recargar();
    } catch (e) { UI.error(e); }
  }

  // ---------- Pestaña de Finanzas ----------
  App.pestanaGastosOperativos = async (cuerpo) => {
    await App.asegurarGastosFijos();
    const recargar = () => App.pestanaGastosOperativos(cuerpo);
    cuerpo.innerHTML = `<div data-grupos></div>
      <section class="tarjeta separado"><h2>Mes a mes</h2><div data-historial></div></section>
      <h3 class="separado" style="margin-bottom:10px">Detalle por herramienta</h3><div data-gastos></div>`;

    const crud = Seccion.crud({
      contenedor: cuerpo.querySelector('[data-gastos]'), tabla: 'gastos_fijos', nombre: 'gasto fijo', textoNuevo: 'Nueva herramienta / gasto fijo', orden: 'nombre',
      async cargar() {
        const [filas, registros] = await Promise.all([DB.listar('gastos_fijos', { orden: 'nombre' }), DB.listar('gastos_fijos_mes')]);
        dibujarGrupos(filas, registros);
        dibujarHistorial(filas, registros);
        return { filas, extra: { registros } };
      },
      buscar: (g) => [g.nombre, g.grupo, g.notas].join(' '),
      columnas: [
        { titulo: 'Herramienta', valor: (g) => `<b style="font-weight:500">${U.esc(g.nombre)}</b><br><small class="muted">${U.esc(grupoDe(g))}</small>` },
        { titulo: 'Monto mensual Sinan', clase: 'num', valor: (g) => U.pesos(g.monto) },
        { titulo: 'Vencimiento', valor: (g) => `Día ${g.dia_vencimiento}` },
        { titulo: 'Estado', valor: (g) => UI.etiqueta(textoEstado(g.estado), tonoEstado[g.estado]) }
      ],
      campos: [
        { campo: 'nombre', etiqueta: 'Herramienta', requerido: true, placeholder: 'Ej: CapCut' },
        { campo: 'grupo', etiqueta: 'Se muestra dentro de', sugerencias: ['Herramientas'], defecto: 'Herramientas', requerido: true },
        { campo: 'monto', etiqueta: 'Monto mensual que le corresponde a Sinan', tipo: 'pesos', min: 0, requerido: true },
        { campo: 'dia_vencimiento', etiqueta: 'Día de vencimiento', tipo: 'numero', min: 1, paso: 1, defecto: 10, requerido: true, ayuda: 'Del 1 al 28.' },
        { campo: 'estado', etiqueta: 'Estado', tipo: 'select', opciones: ESTADOS, vacio: false, defecto: 'Registrado', ancho: 'completo',
          ayuda: 'Activo: se descuenta de caja. Registrado: no sale de caja, queda anotado para cuando la caja crezca. Inactivo: no suma ni avisa.' },
        { campo: 'notas', etiqueta: 'Notas', tipo: 'area', filas: 2 }
      ],
      preparar: (d, fila) => {
        if (d.dia_vencimiento < 1 || d.dia_vencimiento > 28) throw new Error('El día de vencimiento tiene que ser del 1 al 28.');
        return fila ? d : { ...d, desde: U.mes(U.hoy()) };
      },
      despues: async () => { await App.asegurarGastosFijos(); App.actualizarInsignias(); },
      mensajeBorrar: () => 'Se borra también su historial mes a mes. Si solo dejó de usarse, mejor marcala como Inactiva.'
    });

    // Tarjeta por grupo: "Herramientas $ 16.833" con el detalle y el estado
    function dibujarGrupos(gastos, registros) {
      const caja = cuerpo.querySelector('[data-grupos]');
      const deuda = U.sumar(registros.filter((r) => r.modo === 'registra'), (r) => r.monto);
      const grupos = Object.entries(U.agrupar(gastos.filter(cuenta), grupoDe));
      caja.innerHTML = `<div class="grilla grilla-2">
        ${grupos.map(([grupo, gs]) => {
          const estados = [...new Set(gs.map((g) => g.estado))];
          const estado = estados.length === 1 ? estados[0] : null;
          return `<section class="tarjeta grupo-gasto">
            <div class="tarjeta-cabecera"><h2>${U.esc(grupo)}</h2>${estado ? UI.etiqueta(textoEstado(estado), tonoEstado[estado]) : UI.etiqueta('Estados mezclados', 'neutro')}</div>
            <strong class="dato-valor">${U.pesos(U.sumar(gs, (g) => g.monto))} <small class="muted chico" style="font-weight:400">por mes · vence el día ${Math.min(...gs.map((g) => g.dia_vencimiento))}</small></strong>
            <p class="muted chico" style="margin:6px 0 12px">${U.esc(detalle(gs))}</p>
            ${estado !== 'Activo' ? `<button type="button" class="boton boton-chico" data-grupo-estado="${U.esc(grupo)}|Activo">Empezar a descontar de caja</button>` : ''}
            ${estado !== 'Registrado' ? `<button type="button" class="boton boton-secundario boton-chico" data-grupo-estado="${U.esc(grupo)}|Registrado">No descontar (solo anotar)</button>` : ''}
          </section>`;
        }).join('') || '<div class="vacio">No hay gastos fijos activos.</div>'}
        ${UI.numeroDestacado('Deuda operativa Sinan', U.pesos(deuda), 'anotado sin descontar de caja (se acumula mes a mes)', deuda ? 'alerta' : 'ok')}
      </div>`;
      caja.onclick = async (e) => {
        const b = e.target.closest('[data-grupo-estado]'); if (!b) return;
        const [grupo, estado] = b.dataset.grupoEstado.split('|');
        const ok = await UI.confirmar(estado === 'Activo'
          ? `Desde ahora ${grupo} se descuenta de caja cada mes. Lo que ya quedó anotado como deuda sigue ahí hasta que lo descuentes desde "Mes a mes".`
          : `Desde ahora ${grupo} no se descuenta de caja: queda anotado cada mes como deuda operativa.`, { titulo: grupo, boton: 'Confirmar', peligro: false });
        if (!ok) return;
        try {
          for (const g of gastos.filter((x) => cuenta(x) && grupoDe(x) === grupo)) await DB.actualizar('gastos_fijos', g.id, { estado });
          UI.aviso('Listo'); recargar();
        } catch (ex) { UI.error(ex); }
      };
    }

    // Historial agrupado: un renglón por grupo y mes
    function dibujarHistorial(gastos, registros) {
      const gid = U.porId(gastos);
      const filas = Object.entries(U.agrupar(registros, (r) => grupoDe(gid[r.gasto_fijo_id]) + '|' + r.mes + '|' + r.modo)).map(([clave, rs]) => {
        const [grupo, mes, modo] = clave.split('|');
        return { id: clave, grupo, mes, modo, regs: rs, monto: U.sumar(rs, (r) => r.monto) };
      }).sort((a, b) => b.mes.localeCompare(a.mes) || a.grupo.localeCompare(b.grupo));
      const caja = cuerpo.querySelector('[data-historial]');
      caja.innerHTML = UI.tabla({
        filas, vacio: 'Todavía no hay meses anotados.',
        columnas: [
          { titulo: 'Mes', valor: (f) => U.nombreMes(f.mes) },
          { titulo: 'Ítem', valor: (f) => `<b style="font-weight:500">${U.esc(f.grupo)}</b><br><small class="muted">${U.esc(f.regs.map((r) => `${gid[r.gasto_fijo_id]?.nombre || '?'} ${U.pesos(r.monto)}`).join(' · '))}</small>` },
          { titulo: 'Total', clase: 'num', valor: (f) => `<b>${U.pesos(f.monto)}</b>` },
          { titulo: 'Cómo quedó', valor: (f) => f.modo === 'descuenta' ? UI.etiqueta('Descontado de caja', 'ok') : UI.etiqueta('Anotado sin descontar', 'atencion') }
        ],
        acciones: (f) => (f.modo === 'registra'
          ? `<button type="button" class="boton-texto" data-accion-hist="descontar">Descontar de caja</button>`
          : `<button type="button" class="boton-texto" data-accion-hist="deuda">No descontar</button>`)
      });
      caja.onclick = (e) => {
        const b = e.target.closest('[data-accion-hist]'); if (!b) return;
        const f = filas.find((x) => x.id === b.closest('tr').dataset.id);
        if (b.dataset.accionHist === 'descontar') descontar(f.grupo, f.mes, f.regs, gid, recargar);
        else pasarADeuda(f.grupo, f.mes, f.regs, recargar);
      };
    }
    return crud;
  };
})();
