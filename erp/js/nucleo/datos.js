/* =====================================================================
   DATOS · única puerta de entrada a la base (Supabase)
   Todas las secciones usan DB.listar / DB.crear / DB.actualizar / DB.borrar.
   Si mañana cambia la base, solo se toca este archivo.
   ===================================================================== */
(function () {
  // Traduce los errores técnicos a mensajes entendibles
  function traducirError(error) {
    const msg = (error && (error.message || error.error_description)) || String(error);
    if (/Invalid login credentials/i.test(msg)) return 'El email o la contraseña no son correctos.';
    if (/Email not confirmed/i.test(msg)) return 'Falta confirmar el email. Revisá tu casilla o confirmalo desde el panel de Supabase.';
    if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'No hay conexión con la base. Revisá tu internet y volvé a intentar.';
    if (/JWT expired|session/i.test(msg)) return 'Tu sesión venció. Volvé a entrar.';
    if (/violates foreign key/i.test(msg)) return 'No se puede borrar porque hay otros datos que lo usan.';
    if (/duplicate key/i.test(msg)) return 'Ya existe un registro igual (por ejemplo, el mismo color dos veces).';
    if (/violates check constraint/i.test(msg)) return 'Algún dato no es válido. Revisá los campos.';
    if (/permission denied|row-level security/i.test(msg)) return 'No tenés permiso para hacer esto. Volvé a entrar.';
    return msg;
  }
  function chequear({ data, error }) {
    if (error) { const e = new Error(traducirError(error)); e.original = error; throw e; }
    return data;
  }

  function crearDBSupabase() {
    const cfg = window.SINAN_CONFIG || {};
    if (!cfg.supabaseUrl || cfg.supabaseUrl.startsWith('PEGAR')) return null;
    const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

    return {
      auth: {
        async sesion() { return chequear(await sb.auth.getSession()).session; },
        async entrar(email, clave) { return chequear(await sb.auth.signInWithPassword({ email, password: clave })); },
        async salir() { await sb.auth.signOut(); },
        async cambiarClave(nueva) { return chequear(await sb.auth.updateUser({ password: nueva })); },
        alCambiar(fn) { sb.auth.onAuthStateChange((_ev, s) => fn(s)); }
      },

      // Trae todas las filas de una tabla (de a 1000, por si crece mucho)
      async listar(tabla, { orden = 'id', asc = true } = {}) {
        const todo = [];
        for (let desde = 0; ; desde += 1000) {
          let q = sb.from(tabla).select('*').order(orden, { ascending: asc });
          if (orden !== 'id') q = q.order('id', { ascending: true });
          const filas = chequear(await q.range(desde, desde + 999));
          todo.push(...filas);
          if (filas.length < 1000) return todo;
        }
      },
      async obtener(tabla, id) {
        return chequear(await sb.from(tabla).select('*').eq('id', id).maybeSingle());
      },
      async crear(tabla, fila) {
        return chequear(await sb.from(tabla).insert(fila).select().single());
      },
      async crearVarios(tabla, filas) {
        if (!filas.length) return [];
        return chequear(await sb.from(tabla).insert(filas).select());
      },
      async actualizar(tabla, id, cambios) {
        return chequear(await sb.from(tabla).update(cambios).eq('id', id).select().single());
      },
      async borrar(tabla, id) {
        chequear(await sb.from(tabla).delete().eq('id', id));
      },
      async rpc(nombre, args) {
        return chequear(await sb.rpc(nombre, args));
      },
      // Sube una foto a la carpeta "fotos" y devuelve su link público
      async subirFoto(archivo) {
        const ext = (archivo.name.split('.').pop() || 'jpg').toLowerCase();
        const ruta = `productos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        chequear(await sb.storage.from('fotos').upload(ruta, archivo, { cacheControl: '3600', upsert: false }));
        return sb.storage.from('fotos').getPublicUrl(ruta).data.publicUrl;
      }
    };
  }

  // DB_PRUEBA solo existe durante pruebas automáticas
  window.DB = window.DB_PRUEBA || crearDBSupabase();
  window.DB_traducirError = traducirError;
})();
