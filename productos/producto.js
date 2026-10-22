/* Página de producto — JS vanilla.
   Lee precio, stock, reseñas y número de WhatsApp de ../data/productos.js (misma fuente que el catálogo). */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var DATA = window.SINAN_DATA || null;
  var PRODUCTO_ID = document.body.getAttribute('data-producto-id');
  var producto = ((DATA && DATA.productos) || []).filter(function (p) { return p.id === PRODUCTO_ID; })[0] || null;
  var reducido = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var WA_FALLBACK = '5491126724433';

  var colorActual = null;
  var galeria = null;

  function soloDigitos(s) { return String(s || '').replace(/\D/g, ''); }
  function formatearPrecio(n) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  /* ===== Menú mobile (igual que la página principal) ===== */
  function iniciarMenu() {
    var btn = $('.header__menu-btn');
    var menu = $('#mobile-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', function () {
      var abierto = menu.dataset.open === 'true';
      menu.dataset.open = String(!abierto);
      menu.hidden = abierto;
      btn.setAttribute('aria-expanded', String(!abierto));
    });
  }

  /* ===== Precio y stock ===== */
  function iniciarPrecioYStock() {
    if (!producto) return;
    var precioEl = $('#pg-price');
    if (precioEl) precioEl.textContent = formatearPrecio(producto.precio);

    var stock = typeof producto.stock === 'number' ? producto.stock : null;
    $$('.js-stock-badge').forEach(function (badge) {
      if (stock === 0) {
        badge.textContent = 'Sin stock por ahora';
        badge.classList.add('is-agotado');
      } else if (stock !== null && stock <= 3) {
        badge.textContent = stock === 1 ? '¡Solo queda 1!' : '¡Solo quedan ' + stock + '!';
      } else {
        badge.hidden = true;
      }
    });

    if (stock === 0) {
      $$('[data-wa-cta]').forEach(function (a) {
        a.classList.add('is-disabled');
        a.removeAttribute('href');
        a.setAttribute('aria-disabled', 'true');
        var txt = $('.pg-cta__txt', a);
        if (txt) txt.textContent = 'Sin stock por ahora';
      });
    }
  }

  /* ===== WhatsApp (mismo mensaje que el catálogo, con el color elegido) ===== */
  function urlWhatsApp() {
    var numero = (DATA && DATA.marca && DATA.marca.whatsapp) ? soloDigitos(DATA.marca.whatsapp) : WA_FALLBACK;
    var nombre = producto ? producto.nombre : 'Bolso Cielo';
    var precio = producto ? ' — ' + formatearPrecio(producto.precio) : '';
    var color = colorActual ? ' (Color: ' + colorActual + ')' : '';
    var msg = '¡Hola Sinan! Quiero comprar:\n\n• ' + nombre + color + precio + '\n\n¿Cómo coordinamos el pago y el envío? 💙';
    return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(msg);
  }
  function actualizarWhatsApp() {
    if (producto && producto.stock === 0) return;
    $$('[data-wa-cta]').forEach(function (a) { a.href = urlWhatsApp(); });
  }

  /* ===== Video de YouTube (solo se muestra si pegaste un ID) ===== */
  function iniciarVideo() {
    var slide = $('#pg-video');
    if (!slide) return null;
    var id = (slide.getAttribute('data-youtube-id') || '').trim();
    if (!id || /^REEMPLAZAR/i.test(id)) {
      slide.parentNode.removeChild(slide);
      return null;
    }
    var idSeguro = encodeURIComponent(id);
    var poster = 'https://i.ytimg.com/vi/' + idSeguro + '/hqdefault.jpg';
    slide.setAttribute('data-thumb', poster);

    function mostrarPoster() {
      slide.innerHTML =
        '<button type="button" class="pg-video-play" aria-label="Reproducir video del Bolso Cielo">' +
          '<img src="' + poster + '" alt="" loading="lazy" />' +
          '<span class="pg-play-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>' +
        '</button>';
    }
    function reproducir() {
      slide.innerHTML =
        '<iframe src="https://www.youtube-nocookie.com/embed/' + idSeguro + '?autoplay=1&rel=0&playsinline=1" ' +
        'title="Video del Bolso Cielo" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
    }
    slide.addEventListener('click', function (e) {
      if (e.target.closest('.pg-video-play')) reproducir();
    });
    mostrarPoster();

    return {
      slide: slide,
      reset: function () { if (slide.querySelector('iframe')) mostrarPoster(); }
    };
  }

  /* ===== Galería: carrusel con scroll-snap (se desliza con el dedo) + miniaturas ===== */
  function iniciarGaleria() {
    var track = $('#pg-track');
    if (!track) return null;
    var video = iniciarVideo();
    var slides = $$('.pg-slide', track);
    var thumbsEl = $('#pg-thumbs');
    var contador = $('#pg-counter');
    var prev = $('#pg-prev');
    var next = $('#pg-next');
    var actual = -1;
    var pendiente = false;

    var thumbs = slides.map(function (slide, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pg-thumb';
      b.setAttribute('aria-label', 'Ver foto ' + (i + 1));
      var img = $('img', slide);
      var src = slide.getAttribute('data-thumb') || (img && img.getAttribute('src')) || '';
      b.innerHTML = '<img src="' + escapeHtml(src) + '" alt="" loading="lazy" />';
      if (video && slide === video.slide) {
        b.classList.add('pg-thumb--video');
        b.setAttribute('aria-label', 'Ver video');
        b.innerHTML += '<span class="pg-thumb__play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>';
      }
      b.addEventListener('click', function () { irA(i); });
      if (thumbsEl) thumbsEl.appendChild(b);
      return b;
    });

    function irA(i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: i * track.clientWidth, behavior: reducido ? 'auto' : 'smooth' });
    }

    function actualizar() {
      pendiente = false;
      var i = Math.round(track.scrollLeft / (track.clientWidth || 1));
      i = Math.max(0, Math.min(slides.length - 1, i));
      if (i === actual) return;
      actual = i;
      thumbs.forEach(function (t, k) { t.classList.toggle('is-active', k === i); });
      var t = thumbs[i];
      if (t && thumbsEl && thumbsEl.scrollWidth > thumbsEl.clientWidth) {
        thumbsEl.scrollTo({ left: t.offsetLeft - (thumbsEl.clientWidth - t.offsetWidth) / 2, behavior: reducido ? 'auto' : 'smooth' });
      }
      if (contador) contador.textContent = (i + 1) + ' / ' + slides.length;
      if (prev) prev.disabled = i === 0;
      if (next) next.disabled = i === slides.length - 1;
      if (video && slides[i] !== video.slide) video.reset();
    }

    track.addEventListener('scroll', function () {
      if (!pendiente) { pendiente = true; requestAnimationFrame(actualizar); }
    }, { passive: true });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); irA(actual - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); irA(actual + 1); }
    });
    window.addEventListener('resize', function () { track.scrollLeft = Math.max(0, actual) * track.clientWidth; });
    if (prev) prev.addEventListener('click', function () { irA(actual - 1); });
    if (next) next.addEventListener('click', function () { irA(actual + 1); });

    actualizar();
    return { irA: irA };
  }

  /* ===== Selector de color: cambia el nombre, el mensaje de WhatsApp y (opcional) la foto ===== */
  function iniciarColores() {
    var wrap = $('#pg-colores');
    if (!wrap) return;
    var swatches = $$('.pg-swatch', wrap);
    var etiqueta = $('#pg-color-nombre');

    function seleccionar(btn) {
      swatches.forEach(function (b) {
        var activo = b === btn;
        b.classList.toggle('is-active', activo);
        b.setAttribute('aria-checked', String(activo));
      });
      colorActual = btn.getAttribute('data-color');
      if (etiqueta) etiqueta.textContent = colorActual;
      var slide = btn.getAttribute('data-slide');
      if (slide !== null && galeria) galeria.irA(parseInt(slide, 10) || 0);
      actualizarWhatsApp();
    }

    swatches.forEach(function (b) { b.addEventListener('click', function () { seleccionar(b); }); });
    var inicial = swatches.filter(function (b) { return b.classList.contains('is-active'); })[0] || swatches[0];
    if (inicial) {
      colorActual = inicial.getAttribute('data-color');
      if (etiqueta) etiqueta.textContent = colorActual;
    }
  }

  /* ===== Reseñas reales (las de productos.js que digan producto: 'Bolso Cielo') ===== */
  function iniciarResenas() {
    var seccion = $('#pg-resenas');
    var grid = $('#pg-resenas-grid');
    if (!seccion || !grid || !producto) return;
    var lista = ((DATA && DATA.resenas) || []).filter(function (r) {
      return r.producto && r.producto.toLowerCase() === producto.nombre.toLowerCase();
    });
    if (!lista.length) { seccion.hidden = true; return; }

    grid.innerHTML = lista.map(function (r) {
      var estrellas = '';
      for (var i = 1; i <= 5; i++) {
        estrellas += '<span class="estrella ' + (i <= r.estrellas ? 'on' : '') + '">★</span>';
      }
      var foto = r.foto
        ? '<img class="resena__foto" src="../' + escapeHtml(r.foto) + '" alt="Foto de ' + escapeHtml(r.autor) + '" loading="lazy" data-zoom-group="resenas" />'
        : '';
      return '<article class="resena">' + foto +
        '<div class="resena__estrellas" aria-label="' + (r.estrellas || 0) + ' de 5 estrellas">' + estrellas + '</div>' +
        '<p class="resena__texto">"' + escapeHtml(r.texto) + '"</p>' +
        '<p class="resena__autor">— ' + escapeHtml(r.autor) + '</p>' +
      '</article>';
    }).join('');
    seccion.hidden = false;
  }

  /* ===== Zoom de fotos (galería, "Desde todos los ángulos" y reseñas) ===== */
  function iniciarLightbox() {
    var box = $('#pg-lightbox');
    var img = $('#pg-lightbox-img');
    var cerrar = $('#pg-lightbox-close');
    var prev = $('#pg-lightbox-prev');
    var next = $('#pg-lightbox-next');
    if (!box || !img) return;
    var grupo = [];
    var idx = 0;
    var origen = null;

    function imagenDe(el) { return el.tagName === 'IMG' ? el : $('img', el); }
    function mostrar() {
      var el = grupo[idx];
      img.src = el.currentSrc || el.src;
      img.alt = el.alt || '';
      prev.hidden = next.hidden = grupo.length < 2;
    }
    function abrir(disparador) {
      var nombre = disparador.getAttribute('data-zoom-group');
      var disparadores = $$('[data-zoom-group="' + nombre + '"]');
      grupo = disparadores.map(imagenDe).filter(Boolean);
      idx = Math.max(0, disparadores.indexOf(disparador));
      origen = disparador;
      mostrar();
      box.classList.add('open');
      document.body.style.overflow = 'hidden';
      cerrar.focus();
    }
    function cerrarZoom() {
      box.classList.remove('open');
      document.body.style.overflow = '';
      img.removeAttribute('src');
      if (origen && origen.focus) origen.focus();
    }
    function mover(d) {
      if (grupo.length < 2) return;
      idx = (idx + d + grupo.length) % grupo.length;
      mostrar();
    }

    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-zoom-group]');
      if (t) abrir(t);
    });
    cerrar.addEventListener('click', cerrarZoom);
    prev.addEventListener('click', function () { mover(-1); });
    next.addEventListener('click', function () { mover(1); });
    box.addEventListener('click', function (e) { if (e.target === box) cerrarZoom(); });
    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('open')) return;
      if (e.key === 'Escape') cerrarZoom();
      else if (e.key === 'ArrowLeft') mover(-1);
      else if (e.key === 'ArrowRight') mover(1);
    });
  }

  /* ===== Arranque ===== */
  iniciarMenu();
  iniciarPrecioYStock();
  galeria = iniciarGaleria();
  iniciarColores();
  actualizarWhatsApp();
  iniciarResenas();
  iniciarLightbox();
})();
