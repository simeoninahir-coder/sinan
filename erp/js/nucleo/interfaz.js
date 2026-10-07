/* =====================================================================
   INTERFAZ · piezas visuales reutilizables
   Avisos, ventanas (modales), confirmaciones, formularios, tablas,
   etiquetas de estado, pestañas y gráficos simples.
   ===================================================================== */
(function () {
  const UI = {};
  const esc = (s) => U.esc(s);

  // ---------- Avisos cortos (abajo de la pantalla) ----------
  UI.aviso = (texto, tipo = 'ok') => {
    let caja = document.getElementById('avisos');
    if (!caja) { caja = document.createElement('div'); caja.id = 'avisos'; document.body.appendChild(caja); }
    const el = document.createElement('div');
    el.className = `aviso aviso-${tipo}`;
    el.setAttribute('role', 'status');
    el.textContent = texto;
    caja.appendChild(el);
    setTimeout(() => el.classList.add('saliendo'), tipo === 'error' ? 6000 : 3200);
    setTimeout(() => el.remove(), tipo === 'error' ? 6400 : 3600);
  };
  UI.error = (e) => { console.error(e); UI.aviso(e && e.message ? e.message : String(e), 'error'); };

  // ---------- Ventana modal ----------
  UI.modal = ({ titulo, contenido, ancho = 'normal', alCerrar }) => {
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.innerHTML = `
      <div class="modal modal-${ancho}" role="dialog" aria-modal="true" aria-label="${esc(titulo)}">
        <header class="modal-cabecera">
          <h2>${esc(titulo)}</h2>
          <button type="button" class="boton-icono" data-cerrar aria-label="Cerrar">✕</button>
        </header>
        <div class="modal-cuerpo"></div>
      </div>`;
    const cuerpo = fondo.querySelector('.modal-cuerpo');
    if (typeof contenido === 'string') cuerpo.innerHTML = contenido; else if (contenido) cuerpo.appendChild(contenido);
    const cerrar = () => {
      fondo.remove();
      document.removeEventListener('keydown', alTecla);
      if (!document.querySelector('.modal-fondo')) document.body.classList.remove('sin-scroll');
      if (alCerrar) alCerrar();
    };
    const alTecla = (e) => { if (e.key === 'Escape' && fondo === [...document.querySelectorAll('.modal-fondo')].pop()) cerrar(); };
    fondo.addEventListener('mousedown', (e) => { if (e.target === fondo) cerrar(); });
    fondo.querySelector('[data-cerrar]').addEventListener('click', cerrar);
    document.addEventListener('keydown', alTecla);
    document.body.appendChild(fondo);
    document.body.classList.add('sin-scroll');
    return { el: fondo, cuerpo, cerrar };
  };

  // ---------- Confirmación (devuelve true / false) ----------
  UI.confirmar = (mensaje, { titulo = '¿Estás segura?', boton = 'Sí, eliminar', peligro = true } = {}) =>
    new Promise((resolver) => {
      let respondido = false;
      const m = UI.modal({
        titulo, ancho: 'chico',
        contenido: `<p class="confirmar-texto">${esc(mensaje)}</p>
          <div class="acciones-form">
            <button type="button" class="boton boton-secundario" data-no>Cancelar</button>
            <button type="button" class="boton ${peligro ? 'boton-peligro' : ''}" data-si>${esc(boton)}</button>
          </div>`,
        alCerrar: () => { if (!respondido) resolver(false); }
      });
      m.cuerpo.querySelector('[data-no]').onclick = () => { respondido = true; m.cerrar(); resolver(false); };
      m.cuerpo.querySelector('[data-si]').onclick = () => { respondido = true; m.cerrar(); resolver(true); };
      m.cuerpo.querySelector('[data-si]').focus();
    });

  // ---------- Etiquetas de estado ----------
  // tonos: ok (verde), atencion (ámbar), alerta (rojo), info (azul), neutro (gris)
  UI.etiqueta = (texto, tono = 'neutro') => `<span class="etiqueta etiqueta-${tono}">${esc(texto)}</span>`;

  // ---------- Formularios ----------
  // Cada campo: { campo, etiqueta, tipo, opciones, requerido, ayuda, ancho, sugerencias, defecto, numerico }
  const opcionesDe = (c, valores) => {
    const ops = typeof c.opciones === 'function' ? c.opciones(valores) : (c.opciones || []);
    return ops.map((o) => (typeof o === 'object' ? o : { valor: o, texto: o }));
  };

  UI.campoHTML = (c, valores = {}) => {
    // Subtítulo dentro del formulario (ej: "Costo", "Precio")
    if (c.tipo === 'titulo') return `<h3 class="form-subtitulo campo-completo">${esc(c.etiqueta)}</h3>`;
    // Bloque libre que después completa la sección (ej: packaging, calculadora)
    if (c.tipo === 'bloque') return `<div class="campo campo-completo" data-campo="${c.campo}">
      ${c.etiqueta ? `<span class="campo-etiqueta">${esc(c.etiqueta)}</span>` : ''}<div data-bloque="${c.campo}"></div>
      ${c.ayuda ? `<small class="campo-ayuda">${esc(c.ayuda)}</small>` : ''}</div>`;
    let v = valores[c.campo];
    if ((v === undefined || v === null) && c.defecto !== undefined) v = typeof c.defecto === 'function' ? c.defecto() : c.defecto;
    const id = 'f-' + c.campo + '-' + Math.random().toString(36).slice(2, 7);
    const req = c.requerido ? 'required' : '';
    const ro = c.soloLectura ? 'readonly' : '';
    const ph = c.placeholder ? `placeholder="${esc(c.placeholder)}"` : '';
    let control = '';
    switch (c.tipo) {
      case 'area':
        control = `<textarea id="${id}" name="${c.campo}" rows="${c.filas || 3}" ${req} ${ro} ${ph}>${esc(v ?? '')}</textarea>`; break;
      case 'numero': case 'pesos':
        control = `<div class="${c.tipo === 'pesos' ? 'con-prefijo' : ''}">${c.tipo === 'pesos' ? '<span>$</span>' : ''}
          <input id="${id}" name="${c.campo}" type="number" inputmode="decimal" step="${c.paso || (c.tipo === 'pesos' ? '1' : 'any')}"
          ${c.min !== undefined ? `min="${c.min}"` : ''} value="${v ?? ''}" ${req} ${ro} ${ph}></div>`; break;
      case 'fecha':
        control = `<input id="${id}" name="${c.campo}" type="date" value="${esc(v ?? '')}" ${req} ${ro}>`; break;
      case 'select': {
        const ops = opcionesDe(c, valores);
        control = `<select id="${id}" name="${c.campo}" ${req} ${c.soloLectura ? 'disabled' : ''}>
          ${c.vacio !== false ? `<option value="">${esc(c.vacio || '— Elegir —')}</option>` : ''}
          ${ops.map((o) => `<option value="${esc(o.valor)}" ${String(o.valor) === String(v ?? '') ? 'selected' : ''}>${esc(o.texto)}</option>`).join('')}
        </select>`; break;
      }
      case 'si_no':
        control = `<label class="interruptor"><input id="${id}" name="${c.campo}" type="checkbox" ${v ? 'checked' : ''}><span>${esc(c.textoSi || 'Sí')}</span></label>`; break;
      case 'lista':
        control = `<input id="${id}" name="${c.campo}" type="text" value="${esc((v || []).join(', '))}" ${ph || 'placeholder="Separados por coma"'}>`; break;
      case 'color':
        control = `<input id="${id}" name="${c.campo}" type="color" value="${esc(v || '#9cc9e8')}">`; break;
      case 'foto':
        control = `<div class="campo-foto">
          <img class="foto-previa" src="${esc(U.urlFoto(v))}" alt="" ${v ? '' : 'hidden'}>
          <div class="foto-controles">
            <input id="${id}" name="${c.campo}" type="text" value="${esc(v ?? '')}" placeholder="Link de la foto (o subí una)">
            <label class="boton boton-secundario boton-chico">Subir foto<input type="file" accept="image/*" data-subir-foto hidden></label>
          </div></div>`; break;
      default: {
        const tipos = { email: 'email', tel: 'tel', url: 'url', hora: 'time' };
        const lista = c.sugerencias ? `list="${id}-l"` : '';
        control = `<input id="${id}" name="${c.campo}" type="${tipos[c.tipo] || 'text'}" value="${esc(v ?? '')}" ${req} ${ro} ${ph} ${lista}>`;
        if (c.sugerencias) {
          const sug = typeof c.sugerencias === 'function' ? c.sugerencias() : c.sugerencias;
          control += `<datalist id="${id}-l">${sug.map((s) => `<option value="${esc(s)}">`).join('')}</datalist>`;
        }
      }
    }
    return `<div class="campo ${c.ancho === 'completo' || c.tipo === 'area' || c.tipo === 'foto' ? 'campo-completo' : ''}" data-campo="${c.campo}">
      ${c.tipo === 'si_no' ? `<span class="campo-etiqueta">${esc(c.etiqueta)}</span>` : `<label for="${id}" class="campo-etiqueta">${esc(c.etiqueta)}${c.requerido ? ' <b>*</b>' : ''}</label>`}
      ${control}
      ${c.ayuda ? `<small class="campo-ayuda">${esc(c.ayuda)}</small>` : ''}
    </div>`;
  };

  UI.leerFormulario = (form, campos) => {
    const datos = {};
    for (const c of campos) {
      if (c.soloLectura || c.noGuardar) continue;
      const el = form.elements[c.campo];
      if (!el) continue;
      let v = el.type === 'checkbox' ? el.checked : el.value.trim();
      if (c.tipo === 'numero' || c.tipo === 'pesos') v = v === '' ? (c.requerido ? 0 : null) : Number(v);
      else if (c.tipo === 'lista') v = v ? v.split(',').map((x) => x.trim()).filter(Boolean) : [];
      else if (c.tipo === 'select' && c.numerico) v = v === '' ? null : Number(v);
      else if (c.tipo !== 'si_no' && v === '') v = null;
      datos[c.campo] = v;
    }
    return datos;
  };

  // Activa la subida de fotos dentro de un formulario
  UI.activarFotos = (raiz) => {
    raiz.querySelectorAll('[data-subir-foto]').forEach((inp) => {
      inp.addEventListener('change', async () => {
        const archivo = inp.files[0]; if (!archivo) return;
        const caja = inp.closest('.campo-foto');
        const texto = caja.querySelector('input[type=text]');
        const etiqueta = inp.parentElement;
        etiqueta.classList.add('cargando');
        try {
          const url = await DB.subirFoto(archivo);
          texto.value = url;
          texto.dispatchEvent(new Event('input'));
          UI.aviso('Foto subida');
        } catch (e) { UI.error(e); } finally { etiqueta.classList.remove('cargando'); }
      });
    });
    raiz.querySelectorAll('.campo-foto input[type=text]').forEach((t) => {
      t.addEventListener('input', () => {
        const img = t.closest('.campo-foto').querySelector('.foto-previa');
        img.src = U.urlFoto(t.value); img.hidden = !t.value;
      });
    });
  };

  // Ventana con formulario completo: arma, valida y guarda
  UI.formularioModal = ({ titulo, campos, valores = {}, alGuardar, textoBoton = 'Guardar', alArmar, ancho }) => {
    const form = document.createElement('form');
    form.className = 'formulario';
    form.noValidate = false;
    form.innerHTML = `<div class="grilla-form">${campos.map((c) => UI.campoHTML(c, valores)).join('')}</div>
      <p class="form-error" hidden></p>
      <div class="acciones-form">
        <button type="button" class="boton boton-secundario" data-cancelar>Cancelar</button>
        <button type="submit" class="boton">${esc(textoBoton)}</button>
      </div>`;
    const m = UI.modal({ titulo, contenido: form, ancho });
    UI.activarFotos(form);
    form.querySelector('[data-cancelar]').onclick = m.cerrar;
    if (alArmar) alArmar(form, m);
    const primero = form.querySelector('input:not([type=hidden]):not([readonly]), select, textarea');
    if (primero && window.innerWidth > 760) primero.focus();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = form.querySelector('.form-error');
      err.hidden = true;
      if (!form.reportValidity()) return;
      const boton = form.querySelector('[type=submit]');
      boton.disabled = true; boton.classList.add('cargando');
      try {
        await alGuardar(UI.leerFormulario(form, campos), form);
        m.cerrar();
      } catch (ex) {
        console.error(ex);
        err.textContent = ex.message || String(ex); err.hidden = false;
      } finally { boton.disabled = false; boton.classList.remove('cargando'); }
    });
    return m;
  };

  // ---------- Tablas (en el celular se ven como tarjetas) ----------
  // columnas: [{ titulo, valor: fila => html, clase }]
  UI.tabla = ({ columnas, filas, acciones, vacio = 'Todavía no hay nada cargado acá.', alClicFila }) => {
    if (!filas.length) return `<div class="vacio">${esc(vacio)}</div>`;
    return `<div class="tabla-caja"><table class="tabla ${alClicFila ? 'tabla-clic' : ''}">
      <thead><tr>${columnas.map((c) => `<th class="${c.clase || ''}">${esc(c.titulo)}</th>`).join('')}${acciones ? '<th class="col-acciones"><span class="solo-lectores">Acciones</span></th>' : ''}</tr></thead>
      <tbody>${filas.map((f) => `<tr data-id="${f.id}">
        ${columnas.map((c, i) => `<td class="${c.clase || ''} ${i === 0 ? 'col-principal' : ''}" data-label="${esc(c.titulo)}"><div class="celda">${c.valor(f) ?? "—"}</div></td>`).join('')}
        ${acciones ? `<td class="col-acciones">${acciones(f)}</td>` : ''}
      </tr>`).join('')}</tbody>
    </table></div>`;
  };

  const svg = (d) => `<svg class="icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONO_EDITAR = svg('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>');
  const ICONO_BORRAR = svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>');
  UI.botonesFila = (extra = '') => `<div class="botones-fila">${extra}
      <button type="button" class="boton-icono" data-accion="editar" title="Editar" aria-label="Editar">${ICONO_EDITAR}</button>
      <button type="button" class="boton-icono boton-icono-peligro" data-accion="borrar" title="Eliminar" aria-label="Eliminar">${ICONO_BORRAR}</button>
    </div>`;

  // ---------- Pestañas ----------
  // pestanas: [{ id, titulo, render(contenedor) }]
  UI.pestanas = (contenedor, pestanas, clave) => {
    let activa = sessionStorageGet('pest-' + clave) || pestanas[0].id;
    if (!pestanas.some((p) => p.id === activa)) activa = pestanas[0].id;
    contenedor.innerHTML = `<div class="pestanas" role="tablist">${pestanas.map((p) =>
      `<button type="button" role="tab" data-pest="${p.id}">${esc(p.titulo)}</button>`).join('')}</div>
      <div class="pestana-cuerpo"></div>`;
    const cuerpo = contenedor.querySelector('.pestana-cuerpo');
    const mostrar = (id) => {
      activa = id; sessionStorageSet('pest-' + clave, id);
      contenedor.querySelectorAll('[data-pest]').forEach((b) => b.setAttribute('aria-selected', b.dataset.pest === id));
      cuerpo.innerHTML = '<div class="cargando-bloque">Cargando…</div>';
      Promise.resolve(pestanas.find((p) => p.id === id).render(cuerpo)).catch((e) => {
        cuerpo.innerHTML = `<div class="vacio">No se pudo cargar: ${esc(e.message)}</div>`;
        UI.error(e);
      });
    };
    contenedor.querySelectorAll('[data-pest]').forEach((b) => b.onclick = () => mostrar(b.dataset.pest));
    mostrar(activa);
  };
  function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch { return null; } }
  function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }

  // ---------- Tarjeta de número destacado ----------
  UI.numeroDestacado = (titulo, valor, detalle = '', tono = '') =>
    `<div class="tarjeta dato ${tono ? 'dato-' + tono : ''}"><span class="dato-titulo">${esc(titulo)}</span>
      <strong class="dato-valor">${valor}</strong>${detalle ? `<span class="dato-detalle">${detalle}</span>` : ''}</div>`;

  // ---------- Gráficos simples (barras hechas con HTML) ----------
  UI.grafico = {
    // Barras horizontales con el valor escrito al final
    barras(items, { formato = U.pesos, vacio = 'Sin datos para mostrar.' } = {}) {
      if (!items.length) return `<div class="vacio">${esc(vacio)}</div>`;
      const max = Math.max(...items.map((i) => Math.abs(i.valor)), 1);
      return `<div class="grafico-barras">${items.map((i) => `
        <div class="gb-fila" data-tip="${esc(i.etiqueta)}: ${esc(formato(i.valor))}${i.extra ? ' · ' + esc(i.extra) : ''}">
          <span class="gb-etiqueta">${esc(i.etiqueta)}</span>
          <span class="gb-pista"><span class="gb-barra ${i.valor < 0 ? 'negativa' : ''}" style="width:${Math.max(2, Math.abs(i.valor) / max * 100)}%"></span></span>
          <span class="gb-valor">${esc(formato(i.valor))}</span>
        </div>`).join('')}</div>`;
    },
    // Columnas verticales (admite negativos) + tabla de datos plegable
    columnas(items, { formato = U.pesos, vacio = 'Sin datos para mostrar.', titulo = 'Valor' } = {}) {
      if (!items.length) return `<div class="vacio">${esc(vacio)}</div>`;
      const max = Math.max(...items.map((i) => Math.max(0, i.valor)), 0);
      const min = Math.min(...items.map((i) => Math.min(0, i.valor)), 0);
      const rango = (max - min) || 1;
      const cero = (max / rango) * 100; // % desde arriba donde está el cero
      return `<div class="grafico-columnas" style="--cero:${cero}%">
        ${items.map((i) => {
          const alto = Math.abs(i.valor) / rango * 100;
          return `<div class="gc-col" data-tip="${esc(i.etiqueta)}: ${esc(formato(i.valor))}">
            <div class="gc-area"><span class="gc-barra ${i.valor < 0 ? 'negativa' : ''}" style="height:${Math.max(i.valor ? 1.5 : 0, alto)}%;${i.valor < 0 ? `top:${cero}%` : `bottom:${100 - cero}%`}"></span></div>
            <span class="gc-etiqueta">${esc(i.etiqueta)}</span></div>`;
        }).join('')}
      </div>
      <details class="ver-tabla"><summary>Ver en tabla</summary>
        <table class="tabla tabla-mini"><tbody>${items.map((i) => `<tr><td>${esc(i.etiqueta)}</td><td class="num">${esc(formato(i.valor))}</td></tr>`).join('')}</tbody></table>
      </details>`;
    }
  };

  // Globito con el dato al pasar el mouse (o tocar) un gráfico
  document.addEventListener('DOMContentLoaded', () => {
    const tip = document.createElement('div'); tip.className = 'globito'; tip.hidden = true;
    document.body.appendChild(tip);
    const mover = (e) => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (!el) { tip.hidden = true; return; }
      tip.textContent = el.dataset.tip; tip.hidden = false;
      const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
      tip.style.left = x + 'px'; tip.style.top = (e.clientY - tip.offsetHeight - 10) + 'px';
    };
    document.addEventListener('mousemove', mover);
    document.addEventListener('click', mover);
    document.addEventListener('scroll', () => { tip.hidden = true; }, true);
  });

  window.UI = UI;
})();
