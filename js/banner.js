/* Banner de la portada: un carrusel armado con HTML y CSS a partir de banner.json (los textos se editan ahí).
 * - Diapositivas con mostrar "siempre", "con-ofertas" (solo con ofertas vigentes) o "nunca" (preparadas).
 * - Pasa sola cada N segundos; se desliza con el dedo (scroll-snap nativo); puntitos para ir a cada una.
 * - Se pausa al tocarla, con el teclado adentro o con el mouse encima; fuera de pantalla no avanza.
 * - Con "reducir movimiento" no pasa sola.
 * js/tienda.js le avisa las ofertas vigentes y la demora (window.mplBanner.datos) y escucha sus botones
 * (evento "mpl-banner" con la acción: "catalogo", "ofertas" o "#id").
 */
(function () {
  'use strict';

  var raiz = document.getElementById('banner');
  if (!raiz) return;
  var pista = document.getElementById('banner-pista');
  var puntos = document.getElementById('banner-puntos');
  var reducir = window.matchMedia('(prefers-reduced-motion: reduce)');

  var ICONOS = {
    cuenta: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    pago: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
    reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'
  };

  var config = null;
  // Lo que manda la tienda cuando carga el catálogo (y cuando vence una oferta).
  var datos = { ofertas: false, promo: '', aviso: '', demora: '' };
  var actuales = [], indice = 0, reloj = null;
  var pausadoPorToque = false, mouseEncima = false, focoAdentro = false, enPantalla = true;

  function escapar(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // {demora}, {promo} y {aviso_ofertas}. El aviso puede traer la fecha en negrita (<b>), igual que la sección.
  function texto(plantilla) {
    var t = escapar(plantilla || '');
    return t.replace(/\{demora\}/g, escapar(datos.demora || config.demora_entrega || ''))
      .replace(/\{promo\}/g, escapar(datos.promo || ''))
      .replace(/\{aviso_ofertas\}/g, datos.aviso || '');
  }

  function icono(nombre) {
    var d = ICONOS[nombre];
    return d ? '<svg class="pildora-icono" aria-hidden="true" viewBox="0 0 24 24">' + d + '</svg>' : '';
  }

  function visibles() {
    return (config.diapositivas || []).filter(function (d) {
      return d.mostrar === 'siempre' || (d.mostrar === 'con-ofertas' && datos.ofertas);
    });
  }

  function diapositiva(d, i, total) {
    var esOferta = d.boton && d.boton.accion === 'ofertas';
    var logo = d.logo === 'grande' || d.logo === 'chico'
      ? '<img class="diapo-logo ' + d.logo + '" src="LOGO_MPL_sin_fondo.png" width="763" height="404" alt="' +
        (d.titulo ? '' : 'MPL Juegos Digitales') + '">' : '';
    var cabeza = d.titulo
      ? logo + '<h2 class="diapo-titulo' + (esOferta ? ' oferta' : '') + '">' + texto(d.titulo) + '</h2>'
      : '<h2 class="diapo-marca">' + logo + '</h2>';
    var pildoras = (d.pildoras || []).map(function (p) {
      return '<li class="pildora">' + icono(p.icono) + '<span>' + texto(p.texto) + '</span></li>';
    }).join('');
    return '<div class="diapo diapo-' + escapar(d.id || i) + '" role="group" aria-roledescription="diapositiva"' +
      ' aria-label="' + (i + 1) + ' de ' + total + '">' +
      '<img class="persona izquierda" src="img/mateo-gta.webp" width="896" height="900" alt=""' + (i ? ' loading="lazy"' : '') + '>' +
      '<img class="persona derecha" src="img/luca-gta.webp" width="828" height="900" alt=""' + (i ? ' loading="lazy"' : '') + '>' +
      '<div class="diapo-centro">' + cabeza +
        (d.subtitulo ? '<p class="diapo-sub">' + texto(d.subtitulo) + '</p>' : '') +
        (pildoras ? '<ul class="pildoras">' + pildoras + '</ul>' : '') +
      '</div>' +
      (d.boton ? '<button class="diapo-boton' + (esOferta ? ' oferta' : '') + '" type="button" data-accion="' +
        escapar(d.boton.accion || 'catalogo') + '">' + texto(d.boton.texto) + '</button>' : '') +
      '</div>';
  }

  function pintar() {
    if (!config) return;
    var nuevas = visibles();
    var antes = actuales[indice] && actuales[indice].id;
    actuales = nuevas;
    if (!actuales.length) { raiz.hidden = true; return; }
    raiz.hidden = false;
    pista.innerHTML = actuales.map(function (d, i) { return diapositiva(d, i, actuales.length); }).join('');
    puntos.hidden = actuales.length < 2;
    puntos.innerHTML = actuales.map(function (d, i) {
      return '<button type="button" class="punto" data-ir="' + i + '" aria-label="Ver la diapositiva ' + (i + 1) +
        ' de ' + actuales.length + '"><span></span></button>';
    }).join('');
    // Si la que se veía sigue estando, se queda en ella; si no (venció la oferta), vuelve a la primera.
    var donde = 0;
    actuales.forEach(function (d, i) { if (d.id === antes) donde = i; });
    ir(donde, true);
    programar();
  }

  function ancho() { return pista.clientWidth || 1; }

  function marcar(i) {
    indice = i;
    Array.prototype.forEach.call(pista.children, function (el, k) {
      if (k === i) el.removeAttribute('inert'); else el.setAttribute('inert', '');
    });
    Array.prototype.forEach.call(puntos.children, function (b, k) {
      if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
  }

  function ir(i, sinAnimar) {
    if (!actuales.length) return;
    i = (i + actuales.length) % actuales.length;
    pista.scrollTo({ left: i * ancho(), behavior: sinAnimar || reducir.matches ? 'auto' : 'smooth' });
    marcar(i);
  }

  // ---------- Pasar sola ----------
  function puedePasar() {
    return actuales.length > 1 && !reducir.matches && !pausadoPorToque && !mouseEncima && !focoAdentro &&
      enPantalla && !document.hidden;
  }
  function programar() {
    clearTimeout(reloj);
    if (!puedePasar()) return;
    reloj = setTimeout(function () {
      if (puedePasar()) ir(indice + 1);
      programar();
    }, Math.max(2, Number(config.segundos_por_diapositiva) || 6) * 1000);
  }

  // Tocarla (o deslizarla) la pausa: desde ahí la maneja la persona.
  function pausarPorToque() { pausadoPorToque = true; clearTimeout(reloj); }
  raiz.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') pausarPorToque(); });
  raiz.addEventListener('mouseenter', function () { mouseEncima = true; clearTimeout(reloj); });
  raiz.addEventListener('mouseleave', function () { mouseEncima = false; programar(); });
  raiz.addEventListener('focusin', function () { focoAdentro = true; clearTimeout(reloj); });
  raiz.addEventListener('focusout', function (e) {
    if (!raiz.contains(e.relatedTarget)) { focoAdentro = false; programar(); }
  });
  document.addEventListener('visibilitychange', programar);
  if (reducir.addEventListener) reducir.addEventListener('change', programar);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { enPantalla = e[0].isIntersecting; programar(); }, { threshold: .4 }).observe(raiz);
  }

  // Al deslizar con el dedo, la diapositiva que quedó a la vista pasa a ser la actual.
  var esperaScroll = null;
  pista.addEventListener('scroll', function () {
    clearTimeout(esperaScroll);
    esperaScroll = setTimeout(function () {
      var i = Math.round(pista.scrollLeft / ancho());
      if (i !== indice && i >= 0 && i < actuales.length) marcar(i);
    }, 80);
  }, { passive: true });
  // Si cambia el ancho (girar el celular), se queda en la misma.
  window.addEventListener('resize', function () { ir(indice, true); });

  puntos.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ir]');
    if (!b) return;
    pausarPorToque();
    ir(Number(b.getAttribute('data-ir')));
  });
  pista.addEventListener('click', function (e) {
    var b = e.target.closest('[data-accion]');
    if (b) document.dispatchEvent(new CustomEvent('mpl-banner', { detail: b.getAttribute('data-accion') }));
  });
  raiz.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    pausarPorToque();
    ir(indice + (e.key === 'ArrowRight' ? 1 : -1));
  });

  window.mplBanner = {
    // La tienda avisa: { ofertas: bool, promo, aviso (HTML con <b>), demora }.
    datos: function (d) {
      var cambio = Object.keys(d).some(function (k) { return d[k] !== datos[k]; });
      Object.keys(d).forEach(function (k) { datos[k] = d[k]; });
      if (cambio) pintar();
    }
  };

  fetch('banner.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw r; return r.json(); })
    .then(function (c) { config = c; pintar(); })
    .catch(function () { raiz.hidden = true; });
})();
