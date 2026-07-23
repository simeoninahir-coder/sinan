import { jsonResponse } from './_brevo.js';

const BREVO_LIST_ID = 3;

export async function onRequestPost(context) {
  const { request, env } = context;

  let data;
  try {
    data = await request.json();
  } catch (_) {
    return jsonResponse(400, { ok: false, error: 'Datos invalidos' });
  }

  const email = String(data.email || '').trim().toLowerCase();
  const emailRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email || !emailRe.test(email)) {
    return jsonResponse(400, { ok: false, error: 'Mail invalido' });
  }

  if (!env.BREVO_API_KEY) {
    return jsonResponse(500, { ok: false, error: 'Falta configurar BREVO_API_KEY' });
  }

  try {
    const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': env.BREVO_API_KEY
      },
      body: JSON.stringify({
        email: email,
        listIds: [BREVO_LIST_ID],
        updateEnabled: true,
        attributes: { ORIGEN: 'sinan-web' }
      })
    });

    if (!brevoRes.ok) {
      return jsonResponse(502, { ok: false, error: 'No se pudo sumar el mail' });
    }

    return jsonResponse(200, { ok: true });
  } catch (_) {
    return jsonResponse(500, { ok: false, error: 'Error interno' });
  }
}
