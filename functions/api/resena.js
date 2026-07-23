import { escapeHtml, jsonResponse } from './_brevo.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  let data;
  try {
    data = await request.json();
  } catch (_) {
    return jsonResponse(400, { ok: false, error: 'Datos invalidos' });
  }

  const producto = String(data.producto || '').trim().slice(0, 120);
  const nombre = String(data.nombre || '').trim().slice(0, 60);
  const texto = String(data.texto || '').trim().slice(0, 400);
  const estrellas = Math.min(5, Math.max(1, parseInt(data.estrellas, 10) || 0));

  if (!producto || !nombre || !texto || !estrellas) {
    return jsonResponse(400, { ok: false, error: 'Faltan datos' });
  }

  if (!env.BREVO_API_KEY) {
    return jsonResponse(500, { ok: false, error: 'Falta configurar BREVO_API_KEY' });
  }

  const estrellasTxt = '⭐'.repeat(estrellas);
  const htmlContent =
    '<p><strong>Nueva reseña recibida desde la web</strong></p>' +
    '<p><strong>Producto:</strong> ' + escapeHtml(producto) + '</p>' +
    '<p><strong>Estrellas:</strong> ' + estrellasTxt + ' (' + estrellas + '/5)</p>' +
    '<p><strong>Nombre:</strong> ' + escapeHtml(nombre) + '</p>' +
    '<p><strong>Comentario:</strong> "' + escapeHtml(texto) + '"</p>';

  try {
    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: { name: 'Sinan Web', email: 'simeoninahir@gmail.com' },
        to: [{ email: 'simeoninahir@gmail.com' }],
        subject: 'Nueva reseña: ' + producto,
        htmlContent: htmlContent
      })
    });

    if (!brevoRes.ok) {
      return jsonResponse(502, { ok: false, error: 'No se pudo enviar el mail' });
    }

    return jsonResponse(200, { ok: true });
  } catch (_) {
    return jsonResponse(500, { ok: false, error: 'Error interno' });
  }
}
