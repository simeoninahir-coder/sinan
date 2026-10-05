/* =====================================================================
   NEGOCIO · listas de opciones y reglas que usan varias secciones
   (estados, canales, categorías, cálculo de stock bajo, etc.)
   ===================================================================== */
(function () {
  const N = {};

  // Listas de opciones (se pueden ampliar acá)
  N.CATEGORIAS = ['Bolsos', 'Mochilas', 'Carteras', 'Billeteras', 'Llaveros', 'Accesorios', 'Medias', 'Por mayor'];
  N.ESTADOS_PRODUCTO = ['Activo', 'Pausado', 'Agotado', 'Discontinuado'];
  N.CANALES = ['Presencial', 'Feria', 'Instagram', 'Web', 'WhatsApp', 'Evento', 'Otro'];
  N.TIPOS_EVENTO = ['Encuentro', 'Feria', 'Taller', 'Otro'];
  N.ETIQUETAS_CLIENTE = ['VIP', 'Mayorista', 'Familia', 'Amiga', 'Influencer', 'Compañera de trabajo'];
  N.TIPOS_INTERACCION = ['WhatsApp', 'Instagram', 'Llamada', 'En persona', 'Mail'];
  N.TIPOS_CAMPANA = ['Promoción', 'Lanzamiento', 'Sorteo', 'Colaboración', 'Publicidad paga', 'Fecha especial'];
  N.ESTADOS_CAMPANA = ['Planificada', 'Activa', 'Terminada', 'Cancelada'];
  N.ESTADOS_OBJETIVO = ['Pendiente', 'En curso', 'Logrado', 'No logrado'];
  N.ESTADOS_PEDIDO = ['Pendiente', 'Pagado', 'Preparando', 'Enviado', 'Entregado', 'Cancelado'];
  N.ESTADOS_FINALES = ['Entregado', 'Cancelado'];
  N.ESTADOS_EVENTO = ['Planificando', 'Confirmado', 'Realizado', 'Cancelado'];
  N.CATEGORIAS_GASTO = ['Mercadería', 'Packaging', 'Envíos', 'Publicidad', 'Eventos', 'Comisiones', 'Servicios', 'Diseño e imprenta', 'Impuestos', 'Otros'];
  N.CATEGORIAS_INGRESO = ['Entradas de eventos', 'Colaboraciones', 'Aporte propio', 'Otros'];
  N.MEDIOS_PAGO = ['Efectivo', 'Transferencia', 'Mercado Pago', 'Tarjeta'];
  N.REDES = ['Instagram', 'TikTok', 'Facebook', 'Newsletter', 'Web'];
  N.FORMATOS = ['Post', 'Carrusel', 'Reel', 'Historia', 'Video', 'Mail'];
  N.ESTADOS_PUBLICACION = ['Idea', 'En preparación', 'Programada', 'Publicada'];
  N.PRIORIDADES = ['Alta', 'Media', 'Baja'];
  N.ESTADOS_TAREA = ['Pendiente', 'En curso', 'Hecha'];

  // Colores de etiqueta según estado
  N.tonoPedido = (e) => ({ Pendiente: 'atencion', Pagado: 'info', Preparando: 'info', Enviado: 'info', Entregado: 'ok', Cancelado: 'neutro' }[e] || 'neutro');
  N.tonoProducto = (e) => ({ Activo: 'ok', Pausado: 'atencion', Agotado: 'alerta', Discontinuado: 'neutro' }[e] || 'neutro');
  N.tonoEvento = (e) => ({ Planificando: 'atencion', Confirmado: 'info', Realizado: 'ok', Cancelado: 'neutro' }[e] || 'neutro');
  N.tonoTarea = (e) => ({ Pendiente: 'atencion', 'En curso': 'info', Hecha: 'ok' }[e] || 'neutro');
  N.tonoPrioridad = (p) => ({ Alta: 'alerta', Media: 'atencion', Baja: 'neutro' }[p] || 'neutro');
  N.tonoPublicacion = (e) => ({ Idea: 'neutro', 'En preparación': 'atencion', Programada: 'info', Publicada: 'ok' }[e] || 'neutro');

  // Color del puntito según el nombre del color del producto
  const HEX = { negro: '#1a1a1a', blanco: '#f2f0ea', beige: '#d9c3a5', celeste: '#9cc9e8', azul: '#477ab3', rosa: '#f2b8c6', violeta: '#8e6bbf',
    lila: '#c3a6e0', rojo: '#c0392b', verde: '#6aa57a', gris: '#9aa3ab', marron: '#7a5640', camel: '#b68a5a', natural: '#e8dcc8', amarillo: '#f2cf5b', naranja: '#e8894a' };
  N.colorHex = (nombre) => HEX[U.normalizar(nombre).split(' ')[0]] || '#cfd8de';

  // ---------- Stock ----------
  N.minimo = (s, cfg) => (s.minimo ?? cfg?.stock_minimo_defecto ?? 2);
  // 'sin' (0 o menos), 'bajo' (menos que el mínimo) u 'ok'.
  // Mínimo 0 = producto por encargo: solo avisa si el stock queda negativo.
  N.estadoStock = (s, cfg) => {
    if (N.minimo(s, cfg) === 0) return s.cantidad < 0 ? 'sin' : 'ok';
    return s.cantidad <= 0 ? 'sin' : s.cantidad < N.minimo(s, cfg) ? 'bajo' : 'ok';
  };
  N.etiquetaStock = (est) => est === 'sin' ? UI.etiqueta('Sin stock', 'alerta') : est === 'bajo' ? UI.etiqueta('Stock bajo', 'atencion') : UI.etiqueta('OK', 'ok');

  // ---------- Clientas (CRM) ----------
  N.DIAS_INACTIVA = 120; // sin comprar hace más de estos días = inactiva
  // Segmento según cuántas veces compró y hace cuánto
  N.segmentoCliente = (compras, ultima) => {
    if (!compras) return { id: 'sin', texto: 'Sin compras', tono: 'neutro' };
    if (ultima && -U.diasHasta(ultima) > N.DIAS_INACTIVA) return { id: 'inactiva', texto: 'Inactiva', tono: 'atencion' };
    if (compras >= 3) return { id: 'frecuente', texto: 'Frecuente', tono: 'ok' };
    if (compras === 2) return { id: 'recurrente', texto: 'Recurrente', tono: 'info' };
    return { id: 'nueva', texto: 'Nueva', tono: 'neutro' };
  };
  // Link para escribirle por WhatsApp (asume Argentina si no tiene código de país)
  N.linkWhatsapp = (tel) => {
    let n = String(tel || '').replace(/\D/g, '');
    if (!n) return null;
    if (!n.startsWith('54')) n = '549' + n.replace(/^0/, '');
    return 'https://wa.me/' + n;
  };
  N.linkInstagram = (ig) => (ig ? 'https://instagram.com/' + String(ig).replace(/^@/, '').trim() : null);
  // Días que faltan para el próximo cumpleaños (0 = hoy)
  N.diasCumple = (fecha) => {
    if (!fecha) return null;
    const hoy = U.fechaDeIso(U.hoy());
    const [, m, d] = fecha.split('-').map(Number);
    let prox = new Date(hoy.getFullYear(), m - 1, d);
    if (prox < hoy) prox = new Date(hoy.getFullYear() + 1, m - 1, d);
    return Math.round((prox - hoy) / 86400000);
  };

  // ---------- Ventas ----------
  N.pedidoValido = (p) => p.estado !== 'Cancelado';
  N.nombreCliente = (clientes, id) => (clientes[id] ? clientes[id].nombre : 'Sin cliente');

  // Trae todo lo necesario para ventas y reportes de una vez
  N.cargarVentas = async () => {
    const [pedidos, items, clientes, productos] = await Promise.all([
      DB.listar('pedidos', { orden: 'fecha', asc: false }),
      DB.listar('pedido_items'),
      DB.listar('clientes', { orden: 'nombre' }),
      DB.listar('productos', { orden: 'nombre' })
    ]);
    const itemsPorPedido = U.agrupar(items, (i) => i.pedido_id);
    pedidos.forEach((p) => { p.items = itemsPorPedido[p.id] || []; });
    return { pedidos, items, clientes, productos, clientesId: U.porId(clientes), productosId: U.porId(productos) };
  };

  window.N = N;
})();
