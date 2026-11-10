/* Banners de la portada: las imágenes de img/banner/ en un carrusel, según banner.json (se edita ahí).
 * - Cada pantalla recibe su versión con <picture>: menos de 900 px de ancho, la de celular (1080×900); desde
 *   900 px, la de compu (1920×409). No se recortan nunca (object-fit: contain si hay que achicarlas).
 * - "mostrar_hasta" (hora de Argentina): pasado ese minuto el banner se oculta solo, también con la página abierta.
 * - Pasa solo cada N segundos; se desliza con el dedo (scroll-snap nativo); puntitos para ir a cada uno.
 * - Se pausa al tocarlo, con el teclado adentro o con el mouse encima; fuera de pantalla no avanza.
 * - Con "reducir movimiento" no pasa solo. Con un solo banner visible no hay carrusel ni puntitos.
 * - Al tocar uno avisa a js/tienda.js (evento "mpl-banner" con el destino) para que baje hasta ahí; si nadie
 *   lo atiende, el link funciona solo (#destacado o #contenido).
 */
(function () {
  'use strict';

  var raiz = document.getElementById('banner');
  if (!raiz) return;
  var pista = document.getElementById('banner-pista');
  var puntos = document.getElementById('banner-puntos');
  var reducir = window.matchMedia('(prefers-reduced-motion: reduce)');
  var CARPETA = 'img/banner/';

  var config = null;
  var actuales = [], indice = 0, reloj = null, relojVence = null;
  var pausadoPorToque = false, mouseEncima = false, focoAdentro = false, enPantalla = true;

  function escapar(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // "18/11/2026 23:59" (hora de Argentina) → el último milisegundo de ese minuto. Mal escrita: NaN (se ve igual).
  function finDe(texto) {
    var m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?\s*$/.exec(texto || '');
    if (!m) return NaN;
    function dos(n) { return ('0' + n).slice(-2); }
    return Date.parse(m[3] + '-' + dos(m[2]) + '-' + dos(m[1]) + 'T' + dos(m[4] || 23) + ':' + (m[5] || '59') +
      ':59.999-03:00');
  }

  function visibles() {
    var ahora = Date.now();
    return (config.banners || []).filter(function (b) {
      if (!b.imagen) return false;
      if (!b.mostrar_hasta) return true;
      var fin = finDe(b.mostrar_hasta);
      if (isNaN(fin)) {
        if (window.console) console.warn('banner.json: mostrar_hasta mal escrito en "' + b.id + '" (va dd/mm/aaaa hh:mm)');
        return true;
      }
      return ahora <= fin;
    });
  }

  // Si la página queda abierta, al vencer un banner se vuelve a armar el carrusel sin él.
  function programarVencimiento() {
    clearTimeout(relojVence);
    var ahora = Date.now(), proximo = Infinity;
    (config.banners || []).forEach(function (b) {
      var fin = finDe(b.mostrar_hasta);
      if (fin >= ahora) proximo = Math.min(proximo, fin);
    });
    if (proximo - ahora < 864e5) relojVence = setTimeout(pintar, proximo - ahora + 1000);
  }

  function diapositiva(b, i, total) {
    var base = CARPETA + escapar(b.imagen);
    var carrusel = total > 1;
    var destino = /^#[\w-]+$/.test(b.destino || '') ? b.destino : '#contenido';
    var aDonde = destino === '#destacado' ? 'ver precios y reservar' : 'ver la lista de juegos';
    return '<div class="banner-diapo"' +
      (carrusel ? ' role="group" aria-roledescription="banner" aria-label="' + (i + 1) + ' de ' + total + '"' : '') + '>' +
      '<a class="banner-link" href="' + destino + '" data-destino="' + destino + '">' +
        '<picture>' +
          '<source media="(min-width: 900px)" srcset="' + base + '-compu-1280.webp 1280w, ' + base + '-compu-1920.webp 1920w"' +
            ' sizes="100vw" width="1920" height="409">' +
          '<img src="' + base + '-celular-1080.webp" srcset="' + base + '-celular-720.webp 720w, ' + base +
            '-celular-1080.webp 1080w" sizes="100vw" width="1080" height="900" decoding="async"' +
            (i ? ' fetchpriority="low"' : ' fetchpriority="high"') +
            ' alt="' + escapar(b.texto_alternativo || '') + '">' +
        '</picture>' +
        '<span class="oculto">: ' + aDonde + '</span>' +
      '</a>' +
    '</div>';
  }

  function pintar() {
    if (!config) return;
    var antes = actuales[indice] && actuales[indice].id;
    actuales = visibles();
    programarVencimiento();
    if (!actuales.length) { raiz.hidden = true; clearTimeout(reloj); return; }
    raiz.hidden = false;
    var carrusel = actuales.length > 1;
    raiz.classList.toggle('carrusel', carrusel);
    if (carrusel) {
      raiz.setAttribute('aria-roledescription', 'carrusel');
      raiz.setAttribute('aria-label', 'Banners de MPL');
    } else {
      raiz.removeAttribute('aria-roledescription');
      raiz.setAttribute('aria-label', 'Banner de MPL');
    }
    pista.innerHTML = actuales.map(function (b, i) { return diapositiva(b, i, actuales.length); }).join('');
    puntos.hidden = !carrusel;
    puntos.innerHTML = carrusel ? actuales.map(function (b, i) {
      return '<button type="button" class="punto" data-ir="' + i + '" aria-label="Ver el banner ' + (i + 1) +
        ' de ' + actuales.length + '"><span></span></button>';
    }).join('') : '';
    // Si el que se veía sigue estando, se queda en él; si no (venció), vuelve al primero.
    var donde = 0;
    actuales.forEach(function (b, i) { if (b.id === antes) donde = i; });
    ir(donde, true);
    programar();
  }

  function ancho() { return pista.clientWidth || 1; }

  function marcar(i) {
    indice = i;
    var carrusel = actuales.length > 1;
    Array.prototype.forEach.call(pista.children, function (el, k) {
      // Los que no se ven quedan fuera del tab y del lector de pantalla.
      if (k === i || !carrusel) el.removeAttribute('inert'); else el.setAttribute('inert', '');
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

  // ---------- Pasar solo ----------
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
    }, Math.max(2, Number(config.segundos_por_banner) || 6) * 1000);
  }

  // Tocarlo (o deslizarlo) lo pausa: desde ahí lo maneja la persona.
  function pausarPorToque() { pausadoPorToque = true; clearTimeout(reloj); }
  raiz.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') pausarPorToque(); });
  raiz.addEventListener('touchstart', pausarPorToque, { passive: true });
  raiz.addEventListener('mouseenter', function () { mouseEncima = true; clearTimeout(reloj); });
  raiz.addEventListener('mouseleave', function () { mouseEncima = false; programar(); });
  raiz.addEventListener('focusin', function () { focoAdentro = true; clearTimeout(reloj); });
  raiz.addEventListener('focusout', function (e) {
    if (!raiz.contains(e.relatedTarget)) { focoAdentro = false; programar(); }
  });
  document.addEventListener('visibilitychange', function () {
    // Al volver a la pestaña (por ejemplo, al otro día) se revisa si venció alguno.
    if (!document.hidden && config) pintar(); else programar();
  });
  if (reducir.addEventListener) reducir.addEventListener('change', programar);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { enPantalla = e[0].isIntersecting; programar(); }, { threshold: .4 }).observe(raiz);
  }

  // Al deslizar con el dedo, el banner que quedó a la vista pasa a ser el actual.
  var esperaScroll = null;
  pista.addEventListener('scroll', function () {
    clearTimeout(esperaScroll);
    esperaScroll = setTimeout(function () {
      var i = Math.round(pista.scrollLeft / ancho());
      if (i !== indice && i >= 0 && i < actuales.length) marcar(i);
    }, 80);
  }, { passive: true });
  // Si cambia el ancho (girar el celular), se queda en el mismo.
  window.addEventListener('resize', function () { ir(indice, true); });

  puntos.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ir]');
    if (!b) return;
    pausarPorToque();
    ir(Number(b.getAttribute('data-ir')));
  });
  pista.addEventListener('click', function (e) {
    var a = e.target.closest('[data-destino]');
    if (!a) return;
    // js/tienda.js baja hasta el destino teniendo en cuenta la barra fija; si no está, sigue el link.
    var atendido = !document.dispatchEvent(new CustomEvent('mpl-banner', { detail: a.getAttribute('data-destino'), cancelable: true }));
    if (atendido) e.preventDefault();
  });
  raiz.addEventListener('keydown', function (e) {
    if (actuales.length < 2 || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
    e.preventDefault();
    pausarPorToque();
    ir(indice + (e.key === 'ArrowRight' ? 1 : -1));
    var link = pista.children[indice] && pista.children[indice].querySelector('a');
    if (link) link.focus({ preventScroll: true });
  });

  fetch('banner.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw r; return r.json(); })
    .then(function (c) { config = c; pintar(); })
    .catch(function () { raiz.hidden = true; });
})();
