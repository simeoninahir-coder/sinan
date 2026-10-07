/* =====================================================================
   SECCIÓN · CONFIGURACIÓN
   Datos de la marca, redes, datos del negocio y stock mínimo por defecto.
   ===================================================================== */
App.registrar({
  id: 'configuracion', titulo: 'Configuración', icono: 'configuracion', posicion: 'abajo',
  descripcion: 'Datos de la marca y ajustes generales del sistema.',
  async render(cont) {
    const cfg = await App.config(true);
    const grupos = [
      { titulo: 'Marca', campos: [
        { campo: 'nombre_marca', etiqueta: 'Nombre de la marca', requerido: true },
        { campo: 'frase', etiqueta: 'Frase de la marca' },
        { campo: 'descripcion', etiqueta: 'Descripción', tipo: 'area' }
      ] },
      { titulo: 'Redes y contacto', campos: [
        { campo: 'instagram', etiqueta: 'Instagram', placeholder: '@usuario' },
        { campo: 'tiktok', etiqueta: 'TikTok', placeholder: '@usuario' },
        { campo: 'whatsapp', etiqueta: 'WhatsApp', tipo: 'tel' },
        { campo: 'email', etiqueta: 'Email', tipo: 'email' },
        { campo: 'web', etiqueta: 'Web / tienda', tipo: 'url', ancho: 'completo' }
      ] },
      { titulo: 'Datos del negocio', campos: [
        { campo: 'razon_social', etiqueta: 'Razón social / titular' },
        { campo: 'cuit', etiqueta: 'CUIT' },
        { campo: 'condicion_iva', etiqueta: 'Condición frente al IVA', tipo: 'select', opciones: ['Monotributo', 'Responsable inscripto', 'Exento', 'Consumidor final'] },
        { campo: 'ciudad', etiqueta: 'Ciudad' },
        { campo: 'direccion', etiqueta: 'Dirección', ancho: 'completo' }
      ] },
      { titulo: 'Inventario', campos: [
        { campo: 'stock_minimo_defecto', etiqueta: 'Stock mínimo por defecto', tipo: 'numero', min: 0, paso: 1, requerido: true,
          ayuda: 'Si un producto tiene menos unidades que esto, aparece la alerta de "stock bajo". Cada producto/color puede tener su propio mínimo en Inventario.' }
      ] }
    ];
    const todos = grupos.flatMap((g) => g.campos);
    cont.innerHTML = `<form class="formulario">
      ${grupos.map((g) => `<section class="tarjeta" style="margin-bottom:18px"><h2>${g.titulo}</h2>
        <div class="grilla-form">${g.campos.map((c) => UI.campoHTML(c, cfg)).join('')}</div></section>`).join('')}
      <p class="form-error" hidden></p>
      <div class="acciones-form" style="justify-content:flex-start"><button type="submit" class="boton">Guardar configuración</button></div>
    </form>`;
    const form = cont.querySelector('form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const err = form.querySelector('.form-error'); err.hidden = true;
      const b = form.querySelector('[type=submit]'); b.disabled = true; b.classList.add('cargando');
      try {
        await DB.actualizar('configuracion', 1, { ...UI.leerFormulario(form, todos), actualizado: new Date().toISOString() });
        await App.config(true);
        UI.aviso('Configuración guardada');
        App.actualizarInsignias();
      } catch (ex) { err.textContent = ex.message; err.hidden = false; } finally { b.disabled = false; b.classList.remove('cargando'); }
    });
  }
});
