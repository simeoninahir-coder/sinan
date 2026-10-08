/* =====================================================================
   FINANZAS · GASTOS OPERATIVOS (gastos fijos mensuales)
   Cada herramienta (CapCut, Claude…) tiene su monto para Sinan, día de
   vencimiento y estado:
     Activo     → se descuenta de caja (al vencer se carga como gasto)
     Registrado → no se descuenta: se acumula como "Deuda operativa Sinan"
     Inactivo   → no suma ni avisa
   Al llegar el vencimiento de cada mes, se anota solo (una vez por mes).
   Se usa como pestaña dentro de Finanzas, y desde Inicio y Alertas.
   ===================================================================== */
(function () {
  const ESTADOS = [
    { valor: 'Activo', texto: 'Activo - se descuenta de caja' },
    { valor: 'Registrado', texto: 'Registrado - no se descuenta' },
    { valor: 'Inactivo', texto: 'Inactivo' }
  ];
  const tonoEstado = { Activo: 'ok', Registrado: 'atencion', Inactivo: 'neutro' };
  const CATEGORIA = 'Gastos operativos';
  const cuenta = (g) => g.estado !== 'Inactivo';

  // Anota los gastos fijos que ya vencieron y todavía no se anotaron (de "desde" hasta hoy)
  let enCurso = null;
  App.asegurarGastosFijos = () => {
    if (enCurso) return enCurso;
    enCurso = (async () => {
      const [gastos, registros] = await Promise.all([DB.listar('gastos_fijos'), DB.listar('gastos_fijos_mes')]);
      const hoy = U.hoy();
      const ya = new Set(registros.map((r) => r.gasto_fijo_id + '|' + r.mes));
      for (const g of gastos.filter(cuenta)) {
        for (let m = g.desde; m <= U.mes(hoy); m = U.isoDeFecha(new Date(Number(m.slice(0, 4)), Number(m.slice(5)), 1)).slice(0, 7)) {
          const vence = `${m}-${String(g.dia_vencimiento).padStart(2, '0')}`;
          if (vence > hoy || ya.has(g.id + '|' + m)) continue;
          const modo = g.estado === 'Activo' ? 'descuenta' : 'registra';
          let reg;
          try { reg = await DB.crear('gastos_fijos_mes', { gasto_fijo_id: g.id, mes: m, monto: g.monto, modo }); }
          catch { continue; }   // ya lo anotó otro dispositivo
          if (modo === 'descuenta') {
            const mov = await DB.crear('movimientos_financieros', { fecha: vence, tipo: 'egreso', categoria: CATEGORIA, descripcion: `${g.nombre} (gasto fijo)`, monto: g.monto });
            await DB.actualizar('gastos_fijos_mes', reg.id, { movimiento_id: mov.id });
          }
        }
      }
    })().catch((e) => console.error(e)).finally(() => { setTimeout(() => { enCurso = null; }, 60000); });
    return enCurso;
  };

  // "Deuda operativa Sinan": todo lo registrado sin descontar de caja
  App.deudaOperativa = async () => U.sumar((await DB.listar('gastos_fijos_mes').catch(() => [])).filter((r) => r.modo === 'registra'), (r) => r.monto);

  // Aviso 2 días antes del vencimiento (ej: el 8, para lo que vence el 10)
  App.alertasGastosFijos = async () => {
    const gastos = (await DB.listar('gastos_fijos', { orden: 'nombre' }).catch(() => [])).filter(cuenta);
    const dia = Number(U.hoy().slice(8, 10));
    return Object.entries(U.agrupar(gastos, (g) => g.dia_vencimiento)).filter(([d]) => dia >= Number(d) - 2 && dia <= Number(d)).map(([d, gs]) => ({
      tipo: 'gastofijo', nivel: 'atencion', marca: dia === Number(d) ? 'Vence hoy' : `En ${Number(d) - dia} días`,
      titulo: `El ${d} vencen tus gastos fijos. Total: ${U.pesos(U.sumar(gs, (g) => g.monto))}`,
      detalle: gs.map((g) => `${g.nombre} ${U.pesos(g.monto)}`).join(' · '),
      ir: ['finanzas', 'operativos']
    }));
  };

  // Pasar a caja algo que estaba registrado (cuando las ventas lo permiten)
  async function pagar(r, g, recargar) {
    if (!(await UI.confirmar(`Vas a descontar de caja ${U.pesos(r.monto)} de ${g ? g.nombre : 'este gasto'} (${U.nombreMes(r.mes)}). Se carga como gasto de hoy y baja la deuda operativa.`, { titulo: 'Pagar deuda', boton: 'Sí, descontar', peligro: false }))) return;
    try {
      const mov = await DB.crear('movimientos_financieros', { fecha: U.hoy(), tipo: 'egreso', categoria: CATEGORIA, descripcion: `${g ? g.nombre : 'Gasto fijo'} (deuda de ${U.nombreMes(r.mes)})`, monto: r.monto });
      await DB.actualizar('gastos_fijos_mes', r.id, { modo: 'descuenta', movimiento_id: mov.id });
      UI.aviso('Descontado de caja · deuda actualizada'); recargar();
    } catch (e) { UI.error(e); }
  }

  // ---------- Pestaña de Finanzas ----------
  App.pestanaGastosOperativos = async (cuerpo) => {
    await App.asegurarGastosFijos();
    const recargar = () => App.pestanaGastosOperativos(cuerpo);
    cuerpo.innerHTML = '<div data-gastos></div><section class="tarjeta separado"><h2>Mes a mes</h2><div data-historial></div></section>';
    const crud = Seccion.crud({
      contenedor: cuerpo.querySelector('[data-gastos]'), tabla: 'gastos_fijos', nombre: 'gasto fijo', textoNuevo: 'Nuevo gasto fijo', orden: 'nombre',
      async cargar() {
        const [filas, registros] = await Promise.all([DB.listar('gastos_fijos', { orden: 'nombre' }), DB.listar('gastos_fijos_mes')]);
        dibujarHistorial(filas, registros);
        return { filas, extra: { registros } };
      },
      buscar: (g) => g.nombre + ' ' + (g.notas || ''),
      resumen: (filas, x) => {
        const activos = filas.filter(cuenta);
        const total = U.sumar(activos, (g) => g.monto);
        const deuda = U.sumar(x.registros.filter((r) => r.modo === 'registra'), (r) => r.monto);
        const mes = U.mes(U.hoy());
        const delMes = x.registros.filter((r) => r.mes === mes);
        const proximo = activos.map((g) => g.dia_vencimiento).sort((a, b) => a - b).find((d) => d >= Number(U.hoy().slice(8))) || (activos[0] && activos[0].dia_vencimiento);
        return `<div class="grilla grilla-3">
          ${UI.numeroDestacado('Total mensual Sinan', U.pesos(total), activos.map((g) => `${U.esc(g.nombre)} ${U.pesos(g.monto)}`).join(' · ') || 'sin gastos activos')}
          ${UI.numeroDestacado('Este mes', delMes.length ? U.pesos(U.sumar(delMes, (r) => r.monto)) : 'Pendiente', delMes.length ? `${U.pesos(U.sumar(delMes.filter((r) => r.modo === 'descuenta'), (r) => r.monto))} descontado · ${U.pesos(U.sumar(delMes.filter((r) => r.modo === 'registra'), (r) => r.monto))} registrado` : (proximo ? `vence el día ${proximo}` : ''))}
          ${UI.numeroDestacado('Deuda operativa Sinan', U.pesos(deuda), 'registrado sin descontar de caja', deuda ? 'alerta' : 'ok')}
        </div>`;
      },
      columnas: [
        { titulo: 'Herramienta', valor: (g) => `<b style="font-weight:500">${U.esc(g.nombre)}</b>${g.notas ? `<br><small class="muted">${U.esc(g.notas)}</small>` : ''}` },
        { titulo: 'Monto mensual Sinan', clase: 'num', valor: (g) => `<b>${U.pesos(g.monto)}</b>` },
        { titulo: 'Vencimiento', valor: (g) => `Día ${g.dia_vencimiento}` },
        { titulo: 'Estado', valor: (g) => UI.etiqueta(ESTADOS.find((e) => e.valor === g.estado).texto, tonoEstado[g.estado]) }
      ],
      campos: [
        { campo: 'nombre', etiqueta: 'Herramienta', requerido: true, placeholder: 'Ej: CapCut' },
        { campo: 'monto', etiqueta: 'Monto mensual que le corresponde a Sinan', tipo: 'pesos', min: 0, requerido: true },
        { campo: 'dia_vencimiento', etiqueta: 'Día de vencimiento', tipo: 'numero', min: 1, paso: 1, defecto: 10, requerido: true, ayuda: 'Del 1 al 28.' },
        { campo: 'estado', etiqueta: 'Estado', tipo: 'select', opciones: ESTADOS, vacio: false, defecto: 'Activo', ancho: 'completo',
          ayuda: 'Activo: al vencer se carga como gasto. Registrado: no sale de caja y se suma a la deuda operativa. Inactivo: no suma ni avisa.' },
        { campo: 'notas', etiqueta: 'Notas', tipo: 'area', filas: 2 }
      ],
      preparar: (d, fila) => {
        if (d.dia_vencimiento < 1 || d.dia_vencimiento > 28) throw new Error('El día de vencimiento tiene que ser del 1 al 28.');
        return fila ? d : { ...d, desde: U.mes(U.hoy()) };
      },
      despues: async () => { await App.asegurarGastosFijos(); App.actualizarInsignias(); },
      mensajeBorrar: () => 'Se borra también su historial mes a mes (los gastos ya cargados en Finanzas quedan). Si solo dejó de usarse, mejor marcalo como Inactivo.'
    });

    function dibujarHistorial(gastos, registros) {
      const g = U.porId(gastos);
      const filas = registros.slice().sort((a, b) => b.mes.localeCompare(a.mes) || a.id - b.id);
      const caja = cuerpo.querySelector('[data-historial]');
      caja.innerHTML = UI.tabla({
        filas, vacio: 'Todavía no venció ningún mes. Se anota solo el día de vencimiento.',
        columnas: [
          { titulo: 'Mes', valor: (r) => U.nombreMes(r.mes) },
          { titulo: 'Herramienta', valor: (r) => U.esc(g[r.gasto_fijo_id]?.nombre || '—') },
          { titulo: 'Monto', clase: 'num', valor: (r) => U.pesos(r.monto) },
          { titulo: 'Cómo quedó', valor: (r) => r.modo === 'descuenta' ? UI.etiqueta('Descontado de caja', 'ok') : UI.etiqueta('Registrado (deuda)', 'atencion') }
        ],
        acciones: (r) => (r.modo === 'registra' ? `<button type="button" class="boton-texto" data-pagar="${r.id}">Descontar de caja</button>` : '')
      });
      caja.onclick = (e) => {
        const b = e.target.closest('[data-pagar]'); if (!b) return;
        const r = registros.find((x) => x.id === Number(b.dataset.pagar));
        pagar(r, g[r.gasto_fijo_id], recargar);
      };
    }
    return crud;
  };
})();
