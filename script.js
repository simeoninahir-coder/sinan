/* SINAN — Lógica de la web (v4: página de producto + carrito + WhatsApp + reseñas + Brevo) */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var formatearPrecio = function (n) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
  };

  var DATA = null;
  var categoriaActiva = 'todas';
  var carrito = [];
  var productoPaginaState = { producto: null, idx: 0 };

  function cargarCarrito() {
    try { carrito = JSON.parse(localStorage.getItem('sinan_carrito') || '[]'); }
    catch (_) { carrito = []; }
  }
  function guardarCarrito() {
    try { localStorage.setItem('sinan_carrito', JSON.stringify(carrito)); } catch (_) {}
    actualizarCarritoUI();
  }

  function cargarDatos() {
    if (window.SINAN_DATA) {
      DATA = window.SINAN_DATA;
      iniciar();
      return;
    }
    var grid = $('#productos-grid');
    if (grid) grid.innerHTML = '<p class="productos-vacio">No pudimos cargar los productos.</p>';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cargarDatos);
  } else {
    cargarDatos();
  }

  function iniciar() {
    cargarCarrito();
    aplicarMarca();
    renderDestacados();
    renderCategorias();
    renderFiltros();
    renderProductos();
    renderResenas();
    activarMobileMenu();
    activarNewsletter();
    activarCarrito();
    activarProductoPagina();
    activarResenaZoom();
    activarResenaForm();
    activarAnimacionesScroll();
    abrirProductoPaginaDesdeHash();
  }

  // ===== DESTACADOS =====
  function renderDestacados() {
    var grid = $('#destacados-grid');
    if (!grid || !DATA.productos) return;
    var destacados = DATA.productos.filter(function (p) { return p.destacado === true; });
    if (destacados.length === 0) {
      var sec = $('#destacados');
      if (sec) sec.style.display = 'none';
      return;
    }
    renderProductosEn(grid, destacados);
  }

  // Helper: renderea un array de productos en cualquier grid (reutilizable)
  function renderProductosEn(grid, productos) {
    grid.innerHTML = productos.map(function (p) {
      var tieneOferta = p.precioAnterior && p.precioAnterior > p.precio;
      var esOferta = p.categoria === 'ofertas' || tieneOferta;
      var stock = (typeof p.stock === 'number') ? p.stock : null;
      var agotado = stock === 0;
      var proximamente = agotado && p.proximamente === true;
      var pocoStock = stock !== null && stock > 0 && stock <= 3;
      var fotos = fotosProducto(p);
      var imgHtml = fotos.length
        ? '<img src="' + escapeHtml(fotos[0]) + '" alt="' + escapeHtml(p.nombre) + '" loading="lazy" />'
        : '';
      // Placeholder SOLO si no hay foto
      var placeholder = fotos.length === 0
        ? '<div class="producto-card__placeholder">' +
          '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
          '<path d="M19 7h-3V6a3 3 0 0 0-3-3h-2a3 3 0 0 0-3 3v1H5a1 1 0 0 0-1 1v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a1 1 0 0 0-1-1ZM10 6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1h-4Zm8 14H6V9h2v2a1 1 0 0 0 2 0V9h4v2a1 1 0 0 0 2 0V9h2Z"/>' +
          '</svg></div>'
        : '';
      var badge = '';
      if (proximamente) badge = '<span class="producto-card__badge producto-card__badge--proximamente">Proximamente</span>';
      else if (agotado) badge = '<span class="producto-card__badge producto-card__badge--agotado">Agotado</span>';
      else if (p.nuevo) badge = '<span class="producto-card__badge producto-card__badge--nuevo">Nuevo</span>';
      else if (esOferta) badge = '<span class="producto-card__badge producto-card__badge--oferta">Oferta</span>';
      else badge = '<span class="producto-card__badge">Destacado</span>';
      var videos = videosProducto(p);
      var multiBadge = '';
      if (videos.length > 0 && fotos.length > 1) multiBadge = '<span class="producto-card__multi-badge">Video + ' + (fotos.length - 1) + ' fotos</span>';
      else if (videos.length > 0) multiBadge = '<span class="producto-card__multi-badge">Video</span>';
      else if (fotos.length > 1) multiBadge = '<span class="producto-card__multi-badge">+' + (fotos.length - 1) + ' fotos</span>';
      var precioAnt = tieneOferta ? '<span class="producto-card__precio-anterior">' + formatearPrecio(p.precioAnterior) + '</span>' : '';
      var descuentoPct = tieneOferta ? '<span class="producto-card__descuento-pct">-' + Math.round((1 - p.precio / p.precioAnterior) * 100) + '%</span>' : '';
      var stockNota = '';
      if (pocoStock) stockNota = '<p class="producto-card__stock-nota">Solo ' + (stock === 1 ? 'queda 1' : 'quedan ' + stock) + '</p>';
      else if (proximamente) stockNota = '<p class="producto-card__stock-nota producto-card__stock-nota--proximamente">Proximamente</p>';
      else if (agotado) stockNota = '<p class="producto-card__stock-nota producto-card__stock-nota--agotado">Sin stock por ahora</p>';
      return '<article class="producto-card" data-producto="' + escapeHtml(p.id) + '">' +
        '<div class="producto-card__img">' + imgHtml + placeholder + badge + multiBadge + '</div>' +
        '<div class="producto-card__body">' +
        '<h3 class="producto-card__nombre">' + escapeHtml(p.nombre) + '</h3>' +
        '<p class="producto-card__desc">' + formatDescripcion(p.descripcion || '') + '</p>' +
        '<div class="producto-card__precio-wrap"><span class="producto-card__precio">' + formatearPrecio(p.precio) + '</span>' + precioAnt + descuentoPct + '</div>' +
        stockNota +
        '<div class="producto-card__acciones">' +
        (agotado
          ? '<button class="producto-card__btn producto-card__btn--disabled" disabled>' + (proximamente ? 'Proximamente' : 'Sin stock') + '</button>'
          : '<button class="producto-card__btn producto-card__btn--primary" data-comprar="' + escapeHtml(p.id) + '">Lo quiero ya</button>' +
            '<button class="producto-card__btn producto-card__btn--ghost" data-sumar="' + escapeHtml(p.id) + '">+ Carrito</button>'
        ) + '</div></div></article>';
    }).join('');
    $$('[data-comprar]', grid).forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); comprarAhora(b.dataset.comprar); }); });
    $$('[data-sumar]', grid).forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); sumarAlCarrito(b.dataset.sumar, b); }); });
    $$('[data-producto]', grid).forEach(function (card) {
      card.addEventListener('click', function () { abrirProductoPagina(card.dataset.producto); });
    });
  }

  // ===== Helper para media del producto (fotos + videos) =====
  function fotosProducto(p) {
    if (p.imagenes && p.imagenes.length) return p.imagenes;
    if (p.imagen) return [p.imagen];
    return [];
  }
  function videosProducto(p) {
    if (p.videos && p.videos.length) return p.videos;
    return [];
  }
  // Lista unificada: primero imágenes, después videos
  function mediaProducto(p) {
    var media = [];
    fotosProducto(p).forEach(function (src) { media.push({ tipo: 'imagen', src: src }); });
    videosProducto(p).forEach(function (src) { media.push({ tipo: 'video', src: src }); });
    return media;
  }

  // ===== MARCA =====
  function aplicarMarca() {
    if (!DATA.marca) return;
    var m = DATA.marca;
    var subEl = $('#hero-subclaim');
    if (subEl && m.subclaim) subEl.textContent = m.subclaim;
    // Nota: la sección "Sobre Sinan" ahora está escrita directamente en el HTML
    // con resaltes visuales, no se sobrescribe desde JS.

    var wa = $('#footer-wa'), ig = $('#footer-ig'), tn = $('#footer-tn'), mail = $('#footer-mail');
    if (wa && m.whatsapp) wa.href = 'https://wa.me/' + soloDigitos(m.whatsapp);
    if (ig && m.instagram) ig.href = m.instagram;
    if (tn && m.tiendanube) tn.href = m.tiendanube;
    if (mail && m.email) mail.href = 'mailto:' + m.email;

    var ciudad = $('#footer-ciudad');
    if (ciudad && m.ciudad) ciudad.textContent = m.ciudad;
    var yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    var waFloat = $('#wa-float');
    if (waFloat && m.whatsapp) {
      var msg = encodeURIComponent('Hola Sinan! Vi la web y queria consultarte por un producto.');
      waFloat.href = 'https://wa.me/' + soloDigitos(m.whatsapp) + '?text=' + msg;
      waFloat.hidden = false;
    }

    activarHeroFotos(m.heroFotos);
  }

  // Alterna las fotos del hero cada 3 segundos (si hay mas de una)
  function activarHeroFotos(fotos) {
    var stack = $('#hero-photo-stack');
    if (!stack || !fotos || fotos.length < 2) return;
    stack.innerHTML = fotos.map(function (src, i) {
      return '<img src="' + escapeHtml(src) + '" alt="" class="hero__photo' + (i === 0 ? ' is-active' : '') + '" />';
    }).join('');
    var imgs = $$('.hero__photo', stack);
    var idx = 0;
    setInterval(function () {
      imgs[idx].classList.remove('is-active');
      idx = (idx + 1) % imgs.length;
      imgs[idx].classList.add('is-active');
    }, 3000);
  }

  // ===== CATEGORÍAS =====
  function renderCategorias() {
    var grid = $('#categorias-grid');
    if (!grid || !DATA.categorias) return;
    grid.innerHTML = DATA.categorias.map(function (cat) {
      return '<button class="categoria-card fade-in" data-categoria="' + cat.id + '" aria-label="Ver categoria ' + escapeHtml(cat.nombre) + '">' +
        '<h3>' + escapeHtml(cat.nombre) + '</h3>' +
        '<p>' + escapeHtml(cat.descripcion) + '</p>' +
        '<span class="arrow">&rarr;</span>' +
        '</button>';
    }).join('');
    $$('.categoria-card', grid).forEach(function (card) {
      card.addEventListener('click', function () {
        seleccionarCategoria(card.dataset.categoria);
        var t = $('#catalogo'); if (t) t.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  // ===== FILTROS =====
  function renderFiltros() {
    var wrap = $('#filtros');
    if (!wrap || !DATA.categorias) return;
    var filtros = [{ id: 'todas', nombre: 'Todas' }].concat(DATA.categorias);
    wrap.innerHTML = filtros.map(function (f) {
      return '<button class="filtro" role="tab" data-categoria="' + f.id + '" aria-selected="' + (f.id === categoriaActiva) + '">' +
        escapeHtml(f.nombre) + '</button>';
    }).join('');
    $$('.filtro', wrap).forEach(function (btn) {
      btn.addEventListener('click', function () { seleccionarCategoria(btn.dataset.categoria); });
    });
  }

  function seleccionarCategoria(catId) {
    categoriaActiva = catId;
    $$('.filtro').forEach(function (b) {
      b.setAttribute('aria-selected', b.dataset.categoria === catId);
    });
    renderProductos();
  }

  // ===== PRODUCTOS =====
  function renderProductos() {
    var grid = $('#productos-grid');
    if (!grid || !DATA.productos) return;
    var productos = categoriaActiva === 'todas'
      ? DATA.productos
      : DATA.productos.filter(function (p) { return p.categoria === categoriaActiva; });

    if (productos.length === 0) {
      grid.innerHTML = '<p class="productos-vacio">Pronto sumamos productos en esta categoria.</p>';
      return;
    }

    grid.innerHTML = productos.map(function (p) {
      var tieneOferta = p.precioAnterior && p.precioAnterior > p.precio;
      var esOferta = p.categoria === 'ofertas' || tieneOferta;
      var esDestacado = p.destacado && !esOferta;

      // Stock: undefined o no definido = sin límite; 0 = agotado; <=3 = pocos
      var stock = (typeof p.stock === 'number') ? p.stock : null;
      var agotado = stock === 0;
      var proximamente = agotado && p.proximamente === true;
      var pocoStock = stock !== null && stock > 0 && stock <= 3;

      var fotos = fotosProducto(p);
      var imgHtml = fotos.length
        ? '<img src="' + escapeHtml(fotos[0]) + '" alt="' + escapeHtml(p.nombre) + '" loading="lazy" />'
        : '';
      // Placeholder SOLO si no hay foto (evita transparencias/superposiciones)
      var placeholder = fotos.length === 0
        ? '<div class="producto-card__placeholder">' +
          '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
          '<path d="M19 7h-3V6a3 3 0 0 0-3-3h-2a3 3 0 0 0-3 3v1H5a1 1 0 0 0-1 1v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a1 1 0 0 0-1-1ZM10 6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1h-4Zm8 14H6V9h2v2a1 1 0 0 0 2 0V9h4v2a1 1 0 0 0 2 0V9h2Z"/>' +
          '</svg></div>'
        : '';

      var badge = '';
      if (proximamente) badge = '<span class="producto-card__badge producto-card__badge--proximamente">Proximamente</span>';
      else if (agotado) badge = '<span class="producto-card__badge producto-card__badge--agotado">Agotado</span>';
      else if (p.nuevo) badge = '<span class="producto-card__badge producto-card__badge--nuevo">Nuevo</span>';
      else if (esOferta) badge = '<span class="producto-card__badge producto-card__badge--oferta">Oferta</span>';
      else if (esDestacado) badge = '<span class="producto-card__badge">Destacado</span>';

      // Aviso de stock bajo
      var stockNota = '';
      if (pocoStock) {
        stockNota = '<p class="producto-card__stock-nota">¡Solo ' + (stock === 1 ? 'queda 1' : 'quedan ' + stock) + '!</p>';
      } else if (proximamente) {
        stockNota = '<p class="producto-card__stock-nota producto-card__stock-nota--proximamente">Proximamente</p>';
      } else if (agotado) {
        stockNota = '<p class="producto-card__stock-nota producto-card__stock-nota--agotado">Sin stock por ahora</p>';
      }

      var videos = videosProducto(p);
      var totalMedia = fotos.length + videos.length;
      var multiBadge = '';
      if (videos.length > 0 && fotos.length > 1) {
        multiBadge = '<span class="producto-card__multi-badge">▶ Video + ' + (fotos.length - 1) + ' fotos</span>';
      } else if (videos.length > 0) {
        multiBadge = '<span class="producto-card__multi-badge">▶ Video</span>';
      } else if (fotos.length > 1) {
        multiBadge = '<span class="producto-card__multi-badge">+' + (fotos.length - 1) + ' fotos</span>';
      }

      var zoomHint = totalMedia
        ? '<span class="producto-card__zoom-hint" aria-hidden="true">⤢</span>'
        : '';

      var precioAnt = tieneOferta
        ? '<span class="producto-card__precio-anterior">' + formatearPrecio(p.precioAnterior) + '</span>'
        : '';
      var descuentoPct = tieneOferta
        ? '<span class="producto-card__descuento-pct">-' + Math.round((1 - p.precio / p.precioAnterior) * 100) + '%</span>'
        : '';

      return '<article class="producto-card fade-in" data-producto="' + escapeHtml(p.id) + '">' +
        '<div class="producto-card__img">' +
          imgHtml + placeholder + badge + multiBadge + zoomHint +
        '</div>' +
        '<div class="producto-card__body">' +
          '<h3 class="producto-card__nombre">' + escapeHtml(p.nombre) + '</h3>' +
          '<p class="producto-card__desc">' + formatDescripcion(p.descripcion || '') + '</p>' +
          '<div class="producto-card__precio-wrap">' +
            '<span class="producto-card__precio">' + formatearPrecio(p.precio) + '</span>' +
            precioAnt + descuentoPct +
          '</div>' +
          stockNota +
          '<div class="producto-card__acciones">' +
            (agotado
              ? '<button class="producto-card__btn producto-card__btn--disabled" disabled>' + (proximamente ? 'Proximamente' : 'Sin stock') + '</button>'
              : '<button class="producto-card__btn producto-card__btn--primary" data-comprar="' + escapeHtml(p.id) + '">Lo quiero ya</button>' +
                '<button class="producto-card__btn producto-card__btn--ghost" data-sumar="' + escapeHtml(p.id) + '">+ Carrito</button>'
            ) +
          '</div>' +
        '</div>' +
        '</article>';
    }).join('');

    $$('[data-comprar]', grid).forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); comprarAhora(btn.dataset.comprar); });
    });
    $$('[data-sumar]', grid).forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); sumarAlCarrito(btn.dataset.sumar, btn); });
    });
    $$('[data-producto]', grid).forEach(function (card) {
      card.addEventListener('click', function () { abrirProductoPagina(card.dataset.producto); });
    });

    activarAnimacionesScroll();
  }

  // ===== LIGHTBOX (fotos + videos) =====
  function abrirProductoPagina(productoId, opts) {
    var p = DATA.productos.find(function (x) { return x.id === productoId; });
    if (!p) return;
    opts = opts || {};
    productoPaginaState.producto = p;
    productoPaginaState.idx = 0;
    renderProductoPagina();
    resetResenaForm();
    var modal = $('#producto-pagina');
    if (modal) {
      modal.classList.add('open');
      modal.scrollTop = 0;
      document.body.style.overflow = 'hidden';
    }
    if (!opts.skipPush) {
      try { history.pushState({ producto: productoId }, '', '#producto/' + productoId); } catch (_) {}
    }
  }

  function cerrarProductoPaginaUI() {
    var modal = $('#producto-pagina');
    if (modal) modal.classList.remove('open');
    cerrarZoomFoto();
    document.body.style.overflow = '';
    var v = $('#producto-pagina video');
    if (v) { try { v.pause(); } catch (_) {} }
    productoPaginaState.producto = null;
  }

  function cerrarProductoPagina() {
    if (history.state && history.state.producto) {
      history.back();
    } else {
      cerrarProductoPaginaUI();
      try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
    }
  }

  function abrirProductoPaginaDesdeHash() {
    var m = /^#producto\/(.+)$/.exec(location.hash);
    if (m) abrirProductoPagina(decodeURIComponent(m[1]), { skipPush: true });
  }

  window.addEventListener('popstate', function () {
    var m = /^#producto\/(.+)$/.exec(location.hash);
    if (m) abrirProductoPagina(decodeURIComponent(m[1]), { skipPush: true });
    else cerrarProductoPaginaUI();
  });

  function navegarProductoPaginaFoto(delta) {
    if (!productoPaginaState.producto) return;
    var media = mediaProducto(productoPaginaState.producto);
    if (!media.length) return;
    productoPaginaState.idx = (productoPaginaState.idx + delta + media.length) % media.length;
    renderProductoPagina();
  }

  // ===== ZOOM de foto (pantalla completa) =====
  function abrirZoomFoto() {
    if (!productoPaginaState.producto) return;
    var media = mediaProducto(productoPaginaState.producto);
    var item = media[productoPaginaState.idx];
    if (!item || item.tipo === 'video') return;
    var img = $('#pp-zoom-img');
    if (img) img.src = item.src;
    var zoom = $('#pp-zoom');
    if (zoom) zoom.classList.add('open');
  }
  function cerrarZoomFoto() {
    var zoom = $('#pp-zoom');
    if (zoom) zoom.classList.remove('open');
  }
  function navegarZoomFoto(delta) {
    navegarProductoPaginaFoto(delta);
    var media = mediaProducto(productoPaginaState.producto);
    var item = media[productoPaginaState.idx];
    var img = $('#pp-zoom-img');
    if (img && item && item.tipo !== 'video') img.src = item.src;
  }

  // ===== ZOOM de foto de reseña =====
  function abrirResenaZoom(src) {
    var img = $('#resena-zoom-img');
    if (img) img.src = src;
    var z = $('#resena-zoom');
    if (z) z.classList.add('open');
  }
  function cerrarResenaZoom() {
    var z = $('#resena-zoom');
    if (z) z.classList.remove('open');
  }
  function activarZoomEnResenas(wrap) {
    $$('.resena__foto', wrap).forEach(function (img) {
      img.addEventListener('click', function () { abrirResenaZoom(img.src); });
    });
  }
  function activarResenaZoom() {
    var z = $('#resena-zoom');
    if (!z) return;
    var cerrar = $('#resena-zoom-cerrar');
    if (cerrar) cerrar.addEventListener('click', cerrarResenaZoom);
    z.addEventListener('click', function (e) { if (e.target === z) cerrarResenaZoom(); });
    document.addEventListener('keydown', function (e) {
      if (z.classList.contains('open') && e.key === 'Escape') cerrarResenaZoom();
    });
  }

  // ===== Formulario para que clientas dejen su reseña (se envia por WhatsApp) =====
  var resenaFormRating = 0;

  function pintarEstrellasForm() {
    $$('.resena-form__estrella').forEach(function (b) {
      b.classList.toggle('on', parseInt(b.dataset.star, 10) <= resenaFormRating);
    });
  }

  function resetResenaForm() {
    resenaFormRating = 0;
    pintarEstrellasForm();
    var nombre = $('#resena-form-nombre');
    var texto = $('#resena-form-texto');
    if (nombre) nombre.value = '';
    if (texto) texto.value = '';
  }

  function activarResenaForm() {
    $$('.resena-form__estrella').forEach(function (b) {
      b.addEventListener('click', function () {
        resenaFormRating = parseInt(b.dataset.star, 10);
        pintarEstrellasForm();
      });
    });
    var enviar = $('#resena-form-enviar');
    if (enviar) {
      enviar.addEventListener('click', function () {
        var p = productoPaginaState.producto;
        if (!p) return;
        var nombre = ($('#resena-form-nombre').value || '').trim();
        var texto = ($('#resena-form-texto').value || '').trim();
        if (!nombre || !texto || resenaFormRating === 0) {
          alert('Completá tu nombre, un comentario y las estrellas antes de enviar.');
          return;
        }
        var estrellasTxt = '⭐'.repeat(resenaFormRating);
        var msg = '¡Hola Sinan! Quiero dejar mi reseña de ' + p.nombre + ':\n\n' +
          estrellasTxt + '\n' +
          'Nombre: ' + nombre + '\n' +
          '"' + texto + '"';
        abrirWhatsApp(msg);
        resetResenaForm();
      });
    }
  }

  // Reseñas relacionadas al producto (por nombre exacto, o si no, por categoría) — sin inventar nada, solo si hay match real
  function resenasParaProducto(p) {
    if (!DATA.resenas || !DATA.resenas.length) return [];
    var nombreProducto = (p.nombre || '').toLowerCase();
    var cat = DATA.categorias ? DATA.categorias.find(function (c) { return c.id === p.categoria; }) : null;
    var catNombre = cat ? cat.nombre.toLowerCase() : '';
    return DATA.resenas.filter(function (r) {
      if (!r.producto) return false;
      var rp = r.producto.toLowerCase();
      if (rp === nombreProducto) return true;
      return rp === catNombre || catNombre.indexOf(rp) !== -1 || rp.indexOf(catNombre) !== -1;
    });
  }

  function renderProductoPagina() {
    var p = productoPaginaState.producto;
    if (!p) return;
    var media = mediaProducto(p);

    var wrap = $('#pp-media-wrap');
    var nombre = $('#pp-nombre');
    var contador = $('#pp-contador');
    var thumbs = $('#pp-thumbs');
    var navPrev = $('#pp-prev');
    var navNext = $('#pp-next');
    var badgeEl = $('#pp-badge');

    var item = media[productoPaginaState.idx];
    if (wrap && item) {
      var prevV = wrap.querySelector('video');
      if (prevV) { try { prevV.pause(); } catch (_) {} }
      if (item.tipo === 'video') {
        wrap.innerHTML = '<video class="producto-pagina__video" controls autoplay playsinline preload="metadata" src="' + escapeHtml(item.src) + '"></video>';
      } else {
        wrap.innerHTML = '<img class="producto-pagina__img" id="pp-img" src="' + escapeHtml(item.src) + '" alt="' + escapeHtml(p.nombre) + '" />';
      }
    } else if (wrap) {
      wrap.innerHTML = '';
    }

    if (nombre) nombre.textContent = p.nombre;
    if (contador) contador.textContent = media.length > 1 ? (productoPaginaState.idx + 1) + ' / ' + media.length : '';

    var stock = (typeof p.stock === 'number') ? p.stock : null;
    var agotado = stock === 0;
    var proximamente = agotado && p.proximamente === true;
    var tieneOferta = p.precioAnterior && p.precioAnterior > p.precio;
    var esOferta = p.categoria === 'ofertas' || tieneOferta;

    if (badgeEl) {
      badgeEl.className = 'producto-pagina__badge';
      if (proximamente) { badgeEl.textContent = 'Proximamente'; badgeEl.classList.add('producto-pagina__badge--proximamente'); }
      else if (agotado) { badgeEl.textContent = 'Agotado'; badgeEl.classList.add('producto-pagina__badge--agotado'); }
      else if (p.nuevo) { badgeEl.textContent = 'Nuevo'; badgeEl.classList.add('producto-pagina__badge--nuevo'); }
      else if (esOferta) { badgeEl.textContent = 'Oferta'; badgeEl.classList.add('producto-pagina__badge--oferta'); }
      else if (p.destacado) { badgeEl.textContent = 'Destacado'; }
      else { badgeEl.textContent = ''; }
    }

    var precioEl = $('#pp-precio');
    var precioAntEl = $('#pp-precio-anterior');
    var descuentoEl = $('#pp-descuento');
    var stockNotaEl = $('#pp-stock-nota');
    var descEl = $('#pp-desc');
    var btnComprar = $('#pp-btn-comprar');
    var btnCarrito = $('#pp-btn-carrito');

    if (precioEl) precioEl.textContent = formatearPrecio(p.precio);
    if (precioAntEl) precioAntEl.textContent = tieneOferta ? formatearPrecio(p.precioAnterior) : '';
    if (descuentoEl) descuentoEl.textContent = tieneOferta ? '-' + Math.round((1 - p.precio / p.precioAnterior) * 100) + '%' : '';
    if (descEl) descEl.innerHTML = formatDescripcion(p.descripcion || '');

    if (stockNotaEl) {
      if (proximamente) stockNotaEl.textContent = 'Proximamente';
      else if (agotado) stockNotaEl.textContent = 'Sin stock por ahora';
      else if (stock !== null && stock > 0 && stock <= 3) stockNotaEl.textContent = stock === 1 ? '¡Solo queda 1!' : '¡Solo quedan ' + stock + '!';
      else stockNotaEl.textContent = '';
    }

    if (btnComprar) {
      btnComprar.disabled = agotado;
      btnComprar.textContent = proximamente ? 'Proximamente' : (agotado ? 'Sin stock' : 'Lo quiero ya');
      btnComprar.onclick = agotado ? null : function () { comprarAhora(p.id); };
    }
    if (btnCarrito) {
      btnCarrito.hidden = agotado;
      btnCarrito.textContent = '+ Carrito';
      btnCarrito.onclick = function () { sumarAlCarrito(p.id, btnCarrito); };
    }

    var hayMultiple = media.length > 1;
    if (navPrev) navPrev.style.display = hayMultiple ? 'flex' : 'none';
    if (navNext) navNext.style.display = hayMultiple ? 'flex' : 'none';

    if (thumbs) {
      if (hayMultiple) {
        thumbs.innerHTML = media.map(function (m, i) {
          var inner = m.tipo === 'video'
            ? '<div class="producto-pagina__thumb-video"><span>▶</span></div>'
            : '<img src="' + escapeHtml(m.src) + '" alt="" />';
          return '<button class="producto-pagina__thumb ' + (i === productoPaginaState.idx ? 'active' : '') + '" data-thumb="' + i + '">' +
            inner +
            '</button>';
        }).join('');
        $$('[data-thumb]', thumbs).forEach(function (b) {
          b.addEventListener('click', function () {
            productoPaginaState.idx = parseInt(b.dataset.thumb, 10);
            renderProductoPagina();
          });
        });
      } else {
        thumbs.innerHTML = '';
      }
    }

    // Reseñas relacionadas (solo si hay match real, nunca inventadas)
    var resenasWrap = $('#pp-resenas');
    var resenasGrid = $('#pp-resenas-grid');
    if (resenasWrap && resenasGrid) {
      var relacionadas = resenasParaProducto(p);
      if (relacionadas.length) {
        resenasWrap.hidden = false;
        resenasGrid.innerHTML = relacionadas.map(function (r) {
          var estrellas = '';
          for (var i = 1; i <= 5; i++) estrellas += '<span class="estrella ' + (i <= r.estrellas ? 'on' : '') + '">★</span>';
          var foto = r.foto ? '<img class="resena__foto" src="' + escapeHtml(r.foto) + '" alt="Foto de ' + escapeHtml(r.autor) + '" loading="lazy" />' : '';
          return '<article class="resena">' +
            foto +
            '<div class="resena__estrellas">' + estrellas + '</div>' +
            '<p class="resena__texto">"' + escapeHtml(r.texto) + '"</p>' +
            '<p class="resena__autor">— ' + escapeHtml(r.autor) + '</p>' +
          '</article>';
        }).join('');
        activarZoomEnResenas(resenasGrid);
      } else {
        resenasWrap.hidden = true;
        resenasGrid.innerHTML = '';
      }
    }
  }

  function activarProductoPagina() {
    var modal = $('#producto-pagina');
    if (!modal) return;
    var cerrar = $('#pp-cerrar');
    var prev = $('#pp-prev');
    var next = $('#pp-next');
    var mediaWrap = $('#pp-media-wrap');
    if (cerrar) cerrar.addEventListener('click', cerrarProductoPagina);
    if (prev) prev.addEventListener('click', function () { navegarProductoPaginaFoto(-1); });
    if (next) next.addEventListener('click', function () { navegarProductoPaginaFoto(1); });
    if (mediaWrap) mediaWrap.addEventListener('click', abrirZoomFoto);

    var zoom = $('#pp-zoom');
    var zoomCerrar = $('#pp-zoom-cerrar');
    var zoomPrev = $('#pp-zoom-prev');
    var zoomNext = $('#pp-zoom-next');
    if (zoomCerrar) zoomCerrar.addEventListener('click', cerrarZoomFoto);
    if (zoomPrev) zoomPrev.addEventListener('click', function () { navegarZoomFoto(-1); });
    if (zoomNext) zoomNext.addEventListener('click', function () { navegarZoomFoto(1); });

    document.addEventListener('keydown', function (e) {
      if (zoom && zoom.classList.contains('open')) {
        if (e.key === 'Escape') cerrarZoomFoto();
        else if (e.key === 'ArrowLeft') navegarZoomFoto(-1);
        else if (e.key === 'ArrowRight') navegarZoomFoto(1);
        return;
      }
      if (!modal.classList.contains('open')) return;
      if (e.key === 'Escape') cerrarProductoPagina();
      else if (e.key === 'ArrowLeft') navegarProductoPaginaFoto(-1);
      else if (e.key === 'ArrowRight') navegarProductoPaginaFoto(1);
    });
  }

  // ===== COMPRA =====
  function comprarAhora(id) {
    var p = DATA.productos.find(function (x) { return x.id === id; });
    if (!p) return;
    var msg = '¡Hola Sinan! Quiero comprar:\n\n' +
      '• ' + p.nombre + ' — ' + formatearPrecio(p.precio) + '\n\n' +
      '¿Cómo coordinamos el pago y el envío? 💙';
    abrirWhatsApp(msg);
  }
  function abrirWhatsApp(mensaje) {
    if (!DATA.marca || !DATA.marca.whatsapp) return;
    var url = 'https://wa.me/' + soloDigitos(DATA.marca.whatsapp) + '?text=' + encodeURIComponent(mensaje);
    window.open(url, '_blank');
  }

  // ===== CARRITO =====
  function sumarAlCarrito(id, btn) {
    var p = DATA.productos.find(function (x) { return x.id === id; });
    if (!p) return;
    if (p.stock === 0) return; // agotado, no se puede

    var existente = carrito.find(function (x) { return x.id === id; });
    var qtyActual = existente ? existente.qty : 0;
    var maxStock = (typeof p.stock === 'number') ? p.stock : 99;

    if (qtyActual >= maxStock) {
      // ya tiene el máximo en el carrito
      if (btn) {
        var orig = btn.textContent;
        btn.textContent = '¡Es todo el stock!';
        setTimeout(function () { btn.textContent = orig; }, 1800);
      }
      return;
    }

    if (existente) existente.qty += 1;
    else carrito.push({ id: p.id, nombre: p.nombre, precio: p.precio, qty: 1, stock: maxStock });
    guardarCarrito();
    if (btn) {
      var original = btn.textContent;
      btn.textContent = '✓ Agregado';
      btn.classList.add('agregado');
      setTimeout(function () { btn.textContent = original; btn.classList.remove('agregado'); }, 1300);
    }
    var b = $('#carrito-btn');
    if (b) { b.classList.add('pulse'); setTimeout(function () { b.classList.remove('pulse'); }, 800); }
  }

  function quitarDelCarrito(id) {
    carrito = carrito.filter(function (x) { return x.id !== id; });
    guardarCarrito(); renderCarritoModal();
  }
  function cambiarCantidad(id, delta) {
    var item = carrito.find(function (x) { return x.id === id; });
    if (!item) return;
    var p = DATA.productos.find(function (x) { return x.id === id; });
    var maxStock = item.stock || (p && typeof p.stock === 'number' ? p.stock : 99);
    var nuevaQty = item.qty + delta;
    if (nuevaQty > maxStock) {
      // No se puede sumar más, ya hay stock máximo
      return;
    }
    item.qty = nuevaQty;
    if (item.qty <= 0) carrito = carrito.filter(function (x) { return x.id !== id; });
    guardarCarrito(); renderCarritoModal();
  }
  function totalCarrito() {
    return carrito.reduce(function (s, x) { return s + x.precio * x.qty; }, 0);
  }
  function actualizarCarritoUI() {
    var contador = $('#carrito-contador');
    var btn = $('#carrito-btn');
    var total = carrito.reduce(function (s, x) { return s + x.qty; }, 0);
    if (contador) { contador.textContent = total; contador.hidden = total === 0; }
    if (btn) btn.dataset.empty = total === 0 ? 'true' : 'false';
  }

  function activarCarrito() {
    var btn = $('#carrito-btn');
    var modal = $('#carrito-modal');
    var cerrar = $('#carrito-cerrar');
    var overlay = $('#carrito-overlay');
    if (!btn || !modal) return;
    btn.addEventListener('click', function () {
      renderCarritoModal();
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
    function cerrarModal() {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
    if (cerrar) cerrar.addEventListener('click', cerrarModal);
    if (overlay) overlay.addEventListener('click', cerrarModal);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('open')) cerrarModal();
    });
    actualizarCarritoUI();
  }

  function renderCarritoModal() {
    var body = $('#carrito-body');
    var total = $('#carrito-total');
    var coord = $('#carrito-coordinar');
    if (!body) return;
    if (carrito.length === 0) {
      body.innerHTML = '<p class="carrito-vacio">Todavía no agregaste nada 💙<br/><span>Sumá productos y los coordinamos juntas.</span></p>';
      if (total) total.textContent = formatearPrecio(0);
      if (coord) coord.disabled = true;
      return;
    }
    body.innerHTML = carrito.map(function (item) {
      return '<div class="carrito-item">' +
        '<div class="carrito-item__info"><h4>' + escapeHtml(item.nombre) + '</h4><p>' + formatearPrecio(item.precio) + ' c/u</p></div>' +
        '<div class="carrito-item__controles">' +
          '<button class="carrito-qty" data-menos="' + escapeHtml(item.id) + '">−</button>' +
          '<span class="carrito-qty-num">' + item.qty + '</span>' +
          '<button class="carrito-qty" data-mas="' + escapeHtml(item.id) + '">+</button>' +
          '<button class="carrito-quitar" data-quitar="' + escapeHtml(item.id) + '">×</button>' +
        '</div>' +
        '<div class="carrito-item__subtotal">' + formatearPrecio(item.precio * item.qty) + '</div>' +
      '</div>';
    }).join('');
    if (total) total.textContent = formatearPrecio(totalCarrito());
    if (coord) coord.disabled = false;
    $$('[data-menos]').forEach(function (b) { b.addEventListener('click', function () { cambiarCantidad(b.dataset.menos, -1); }); });
    $$('[data-mas]').forEach(function (b) { b.addEventListener('click', function () { cambiarCantidad(b.dataset.mas, 1); }); });
    $$('[data-quitar]').forEach(function (b) { b.addEventListener('click', function () { quitarDelCarrito(b.dataset.quitar); }); });
    if (coord) coord.onclick = function () { coordinarCarrito(); };
  }

  function coordinarCarrito() {
    if (carrito.length === 0) return;
    var lineas = carrito.map(function (i) { return '• ' + i.nombre + ' x' + i.qty + ' — ' + formatearPrecio(i.precio * i.qty); });
    var msg = '¡Hola Sinan! Quiero llevar:\n\n' + lineas.join('\n') + '\n\nTotal: ' + formatearPrecio(totalCarrito()) + '\n\n¿Cómo coordinamos el pago y el envío? 💙';
    abrirWhatsApp(msg);
  }

  // ===== RESEÑAS =====
  function renderResenas() {
    var wrap = $('#resenas-grid');
    if (!wrap || !DATA.resenas) return;
    if (!DATA.resenas.length) {
      var s = $('#resenas'); if (s) s.style.display = 'none'; return;
    }
    wrap.innerHTML = DATA.resenas.map(function (r) {
      var estrellas = '';
      for (var i = 1; i <= 5; i++) {
        estrellas += '<span class="estrella ' + (i <= r.estrellas ? 'on' : '') + '">★</span>';
      }
      var foto = r.foto ? '<img class="resena__foto" src="' + escapeHtml(r.foto) + '" alt="Foto de ' + escapeHtml(r.autor) + '" loading="lazy" />' : '';
      return '<article class="resena fade-in">' +
        foto +
        '<div class="resena__estrellas">' + estrellas + '</div>' +
        '<p class="resena__texto">"' + escapeHtml(r.texto) + '"</p>' +
        '<p class="resena__autor">— ' + escapeHtml(r.autor) + (r.producto ? ' · <span>' + escapeHtml(r.producto) + '</span>' : '') + '</p>' +
      '</article>';
    }).join('');
    activarZoomEnResenas(wrap);
  }

  // ===== MOBILE MENU =====
  function activarMobileMenu() {
    var btn = $('.header__menu-btn');
    var menu = $('#mobile-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', function () {
      var open = menu.dataset.open === 'true';
      menu.dataset.open = (!open).toString();
      menu.hidden = open;
      btn.setAttribute('aria-expanded', (!open).toString());
    });
    $$('a', menu).forEach(function (a) {
      a.addEventListener('click', function () {
        menu.dataset.open = 'false'; menu.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ===== NEWSLETTER =====
  function activarNewsletter() {
    var form = $('#newsletter-form');
    var msg = $('#newsletter-msg');
    var input = $('#email-input');
    if (!form || !input) return;

    // Validación en vivo: mensaje claro mientras escribe
    input.addEventListener('input', function () {
      input.setCustomValidity('');
      msg.dataset.status = '';
      if (msg.textContent.indexOf('válido') !== -1 || msg.textContent.indexOf('Mmm') !== -1) {
        msg.textContent = '';
      }
    });
    input.addEventListener('invalid', function (e) {
      e.preventDefault();
      msg.textContent = 'Por favor ingresá un mail válido (ejemplo: nombre@mail.com).';
      msg.dataset.status = 'error';
      input.focus();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = input.value.trim().toLowerCase();
      msg.dataset.status = '';

      // Doble validación: HTML5 + regex estricto
      if (!input.checkValidity() || !validarEmailEstricto(email)) {
        msg.textContent = 'Por favor ingresá un mail válido (ejemplo: nombre@mail.com).';
        msg.dataset.status = 'error';
        input.focus();
        return;
      }

      msg.textContent = 'Enviando...';
      try {
        var lista = JSON.parse(localStorage.getItem('sinan_emails') || '[]');
        if (lista.indexOf(email) === -1) lista.push(email);
        localStorage.setItem('sinan_emails', JSON.stringify(lista));
      } catch (_) {}
      var brevo = (DATA.config && DATA.config.brevo) || null;
      if (brevo && brevo.apiKey && brevo.listId) {
        fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'api-key': brevo.apiKey },
          body: JSON.stringify({ email: email, listIds: [parseInt(brevo.listId, 10)], updateEnabled: true, attributes: { ORIGEN: 'sinan-web' } })
        }).then(function () { mostrarMsgExito(msg); }).catch(function () { mostrarMsgExito(msg); });
      } else {
        setTimeout(function () { mostrarMsgExito(msg); }, 400);
      }
      form.reset();
    });
  }
  function mostrarMsgExito(msg) {
    msg.innerHTML = '<strong>¡Bienvenida! 💙</strong><br/>Ya te sumaste a la lista, te voy a avisar de las novedades.';
    msg.dataset.status = 'success';
  }

  function validarEmailEstricto(email) {
    if (!email || email.length < 5 || email.length > 254) return false;
    var re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!re.test(email)) return false;
    if (/\.\./.test(email)) return false;
    var parts = email.split('@');
    if (parts[0].length === 0 || parts[1].length === 0) return false;
    return true;
  }

  function activarAnimacionesScroll() {
    var els = $$('.fade-in');
    setTimeout(function () {
      els.forEach(function (el) { if (!el.classList.contains('is-visible')) el.classList.add('is-visible'); });
    }, 700);
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); }); return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px 50px 0px' });
    els.forEach(function (el) { obs.observe(el); });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  // Permite **negrita** dentro de un texto ya escapado (nada mas de HTML pasa)
  function formatDescripcion(s) {
    return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }
  function validarEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
  function soloDigitos(s) { return String(s || '').replace(/\D/g, ''); }

})();
