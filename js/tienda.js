/* Tienda: carga catalog.json, arma la grilla, busca, filtra, ordena y abre WhatsApp con el pedido escrito.
 * Sin librerías. El catálogo lo publica el bot de mpl-precios todos los días: no editarlo a mano.
 */
(function () {
  'use strict';

  var POR_TANDA = 24;
  var CONTACTOS = {
    mateo: { nombre: 'Mateo', numero: '5493482664743' },
    luca: { nombre: 'Luca', numero: '5493482209654' }
  };
  var ICONO_WA = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3Z"/></svg>';

  var ICONO_FLECHA = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9.3 5.3 7.9 6.7l5.3 5.3-5.3 5.3 1.4 1.4 6.7-6.7z"/></svg>';

  var $ = function (id) { return document.getElementById(id); };
  var grilla = $('grilla'), conteo = $('conteo'), cargarMas = $('cargar-mas');
  var sinResultados = $('sin-resultados'), errorCaja = $('error');
  var busqueda = $('busqueda'), limpiar = document.querySelector('.limpiar'), orden = $('orden');
  var botonesConsola = document.querySelectorAll('[data-consola]');
  var hoja = $('hoja');

  var juegos = [], buscador = null, lista = [], mostrados = 0;
  // consola: 'populares' (al abrir), '' (todos), 'PS5' o 'PS4'. orden: 'auto' depende de lo que se mira
  // (buscando: más parecidos; en Populares: el orden de populares; si no: A a Z), o el que eligió la persona.
  var estado = { texto: '', consola: 'populares', orden: 'auto' };
  var NOMBRE_AUTO = { parecido: 'Más parecidos', popular: 'Más populares', nombre: 'A a Z' };

  var formato = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
  function pesos(n) { return '$' + formato.format(n); }

  // Cuotas: solo si catalog.json trae "mostrar_cuotas": true (lo decide config.json de mpl-precios).
  // Por ahora no se trabaja con tarjeta: sin el dato, o con false, se muestra solo efectivo o transferencia.
  var conCuotas = false;
  function rotuloPago() { return conCuotas ? 'Contado / transferencia' : 'Efectivo o transferencia'; }
  function lineaCuotas(j) {
    return conCuotas && j.cuota ? '<span class="cuotas">3 cuotas sin interés de <b>' + pesos(j.cuota) + '</b></span>' : '';
  }
  function textoPago(j) {
    return rotuloPago() + ': ' + pesos(j.contado) + '.' +
      (conCuotas && j.cuota ? ' O en 3 cuotas sin interés de ' + pesos(j.cuota) + '.' : '');
  }

  function escapar(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- Lista visible ----------

  function consolaElegida() { return estado.consola === 'populares' ? '' : estado.consola; }
  function ordenAuto() { return estado.texto ? 'parecido' : estado.consola === 'populares' ? 'popular' : 'nombre'; }

  function calcularLista() {
    var base;
    if (estado.texto) {
      // Buscando se busca en todo el catálogo, aunque esté elegido Populares.
      base = buscador.buscar(estado.texto).map(function (r) { return r.juego; });
    } else if (estado.consola === 'populares') {
      base = juegos.filter(function (j) { return j.popular; });
    } else {
      base = juegos.slice();
    }
    var consola = consolaElegida();
    if (consola) base = base.filter(function (j) { return j.consola.indexOf(consola) >= 0; });
    var orden = estado.orden === 'auto' ? ordenAuto() : estado.orden;
    if (orden === 'menor') base.sort(function (a, b) { return a.contado - b.contado; });
    else if (orden === 'mayor') base.sort(function (a, b) { return b.contado - a.contado; });
    else if (orden === 'nombre') base.sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
    else if (orden === 'popular') base.sort(function (a, b) { return a.popular - b.popular; });
    return base;
  }

  // La primera opción del orden dice qué hace "auto" ahora. "A a Z" no se repite cuando auto ya es A a Z.
  // (Las opciones se sacan y se ponen porque Safari de iPhone ignora <option hidden>.)
  var opcionNombre = orden.querySelector('[value="nombre"]');
  function actualizarOrden() {
    var auto = ordenAuto();
    orden.querySelector('[value="auto"]').textContent = NOMBRE_AUTO[auto];
    if (auto === 'nombre') {
      if (estado.orden === 'nombre') estado.orden = 'auto';
      if (opcionNombre.parentNode) orden.removeChild(opcionNombre);
    } else if (!opcionNombre.parentNode) {
      orden.insertBefore(opcionNombre, orden.options[1] || null);
    }
    orden.value = estado.orden;
  }

  function tarjeta(j, indice) {
    // Nada va encima de la tapa: la consola y las etiquetas (Versión PS4, Preventa, Solo DLC) van debajo.
    var etiquetas = '<span class="etiqueta consola">' + escapar(j.consola) + '</span>' +
      (j.etiquetas || []).map(function (e) {
        return '<span class="etiqueta">' + escapar(e) + '</span>';
      }).join('');
    var tapa = j.imagen
      ? '<img src="' + escapar(j.imagen) + '" alt="" width="480" height="605" loading="lazy" decoding="async" onload="this.classList.add(\'lista\')" onerror="this.parentNode.classList.add(\'falta\');this.remove()">'
      : '';
    // La tapa y el nombre abren la ficha del juego.
    return '<li class="juego">' +
      '<button class="tapa' + (j.imagen ? '' : ' falta') + '" type="button" data-ficha="' + indice + '" aria-label="Ver detalles de ' + escapar(j.nombre) + '">' +
        '<span class="sin-tapa" aria-hidden="true">' + escapar(j.nombre) + '</span>' + tapa +
      '</button>' +
      '<div class="datos">' +
        '<div class="etiquetas">' + etiquetas + '</div>' +
        '<h3 class="titulo-juego"><button class="abrir-ficha" type="button" data-ficha="' + indice + '">' +
          '<span class="nombre">' + escapar(j.nombre) + '</span>' +
          '<span class="ver-detalles">Ver detalles' + ICONO_FLECHA + '</span>' +
        '</button></h3>' +
        '<p class="precio">' +
          '<span class="rotulo">' + rotuloPago() + '</span>' +
          '<span class="contado">' + pesos(j.contado) + '</span>' +
          lineaCuotas(j) +
        '</p>' +
        '<button class="boton-pedir" type="button" data-pedir="' + indice + '">' + ICONO_WA + 'Pedir</button>' +
      '</div>' +
    '</li>';
  }

  function pintar(desdeCero) {
    if (desdeCero) {
      actualizarOrden();
      lista = calcularLista();
      mostrados = 0;
      grilla.innerHTML = '';
    }
    var hasta = Math.min(lista.length, mostrados + POR_TANDA), html = '';
    for (var i = mostrados; i < hasta; i++) html += tarjeta(lista[i], i);
    grilla.insertAdjacentHTML('beforeend', html);
    mostrados = hasta;

    var hay = lista.length > 0;
    sinResultados.hidden = hay || !juegos.length;
    cargarMas.hidden = mostrados >= lista.length;
    if (!cargarMas.hidden) cargarMas.textContent = 'Cargar más juegos (quedan ' + formato.format(lista.length - mostrados) + ')';
    conteo.textContent = !hay ? '' :
      formato.format(lista.length) + (lista.length === 1 ? ' juego' : ' juegos') +
      (estado.texto ? ' para “' + estado.texto + '”' : estado.consola === 'populares' ? ' populares' : '') +
      (consolaElegida() ? ' de ' + consolaElegida() : '');
  }

  // ---------- Controles ----------

  var espera;
  busqueda.addEventListener('input', function () {
    limpiar.hidden = !busqueda.value;
    clearTimeout(espera);
    espera = setTimeout(function () {
      estado.texto = busqueda.value.trim();
      pintar(true);
    }, 160);
  });

  limpiar.addEventListener('click', function () {
    busqueda.value = '';
    busqueda.dispatchEvent(new Event('input'));
    busqueda.focus();
  });

  botonesConsola.forEach(function (b) {
    b.addEventListener('click', function () {
      estado.consola = b.getAttribute('data-consola');
      botonesConsola.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      pintar(true);
    });
  });

  orden.addEventListener('change', function () {
    estado.orden = orden.value;
    pintar(true);
  });

  cargarMas.addEventListener('click', function () { pintar(false); });

  // ---------- WhatsApp ----------

  function mensajeJuego(j) {
    return '¡Hola! Quiero pedir ' + j.nombre + ' para ' + j.consola + ', cuenta primaria. ' + textoPago(j);
  }

  function abrirHoja(mensaje, detalle) {
    soltarEleccion();
    $('hoja-juego').textContent = detalle;
    Object.keys(CONTACTOS).forEach(function (clave) {
      $('contacto-' + clave).href = 'https://wa.me/' + CONTACTOS[clave].numero + '?text=' + encodeURIComponent(mensaje);
    });
    if (typeof hoja.showModal === 'function') hoja.showModal();
    else hoja.setAttribute('open', '');
  }

  function pedir(j) {
    abrirHoja(mensajeJuego(j), j.nombre + ' · ' + j.consola + ' · ' + pesos(j.contado));
  }

  grilla.addEventListener('click', function (e) {
    var ficha = e.target.closest('[data-ficha]');
    if (ficha) return abrirFicha(lista[+ficha.getAttribute('data-ficha')]);
    var boton = e.target.closest('[data-pedir]');
    if (boton) pedir(lista[+boton.getAttribute('data-pedir')]);
  });

  // ---------- Ficha del juego ----------
  // Sinopsis e "Incluye" salen de descripciones.json (textos propios; se baja una sola vez). Audio, peso y
  // género vienen en catalog.json. Si un juego no tiene sinopsis, la ficha muestra igual lo que haya.

  var fichaHoja = $('ficha'), fichaCuerpo = $('ficha-cuerpo'), fichaJuego = null, descripciones = null;

  function cargarDescripciones() {
    if (!descripciones) {
      descripciones = fetch('descripciones.json').then(function (r) { return r.ok ? r.json() : {}; })
        .catch(function () { return {}; })
        .then(function (crudo) {
          var porEdicion = {};
          Object.keys(crudo.juegos || {}).forEach(function (titulo) {
            var d = crudo.juegos[titulo] || {}, ediciones = d.ediciones || {};
            Object.keys(ediciones).forEach(function (nombre) {
              // Cada edición es una lista ("incluye") o {"incluye": [...], "nota": "aclaración"}.
              var e = ediciones[nombre] || [];
              porEdicion[buscador.normalizar(nombre)] = {
                sinopsis: d.sinopsis || '',
                incluye: Array.isArray(e) ? e : (e.incluye || []),
                nota: Array.isArray(e) ? '' : (e.nota || '')
              };
            });
          });
          return porEdicion;
        });
    }
    return descripciones;
  }

  function textoFicha(d) {
    if (!d) return '';
    var html = d.sinopsis ? '<p class="ficha-sinopsis">' + escapar(d.sinopsis) + '</p>' : '';
    if (d.incluye && d.incluye.length) {
      html += '<div class="ficha-incluye"><h3>Este juego incluye:</h3><ul>' +
        d.incluye.map(function (x) { return '<li>' + escapar(x) + '</li>'; }).join('') + '</ul></div>';
    }
    if (d.nota) html += '<p class="ficha-nota">' + escapar(d.nota) + '</p>';
    return html;
  }

  function abrirFicha(j) {
    fichaJuego = j;
    var datos = [['Audio', j.audio], ['Peso', j.peso], ['Género', (j.generos || []).join(', ')]].filter(function (d) { return d[1]; });
    var etiquetas = '<span class="etiqueta consola">' + escapar(j.consola) + '</span>' +
      (j.etiquetas || []).map(function (e) { return '<span class="etiqueta">' + escapar(e) + '</span>'; }).join('');
    fichaCuerpo.innerHTML =
      '<div class="ficha-cabeza">' +
        (j.imagen ? '<img class="ficha-tapa" src="' + escapar(j.imagen) + '" alt="" width="96" height="121">' : '<div class="ficha-tapa"></div>') +
        '<div><div class="etiquetas">' + etiquetas + '</div><h2 id="ficha-nombre">' + escapar(j.nombre) + '</h2></div>' +
      '</div>' +
      '<div id="ficha-texto"></div>' +
      (datos.length ? '<dl class="ficha-datos">' + datos.map(function (d) {
        return '<dt>' + d[0] + '</dt><dd>' + escapar(d[1]) + '</dd>';
      }).join('') + '</dl>' : '') +
      '<p class="precio">' +
        '<span class="rotulo">' + rotuloPago() + '</span>' +
        '<span class="contado">' + pesos(j.contado) + '</span>' +
        lineaCuotas(j) +
      '</p>' +
      '<button class="boton-pedir" type="button" data-pedir-ficha>' + ICONO_WA + 'Pedir</button>';
    fichaCuerpo.scrollTop = 0;
    fichaHoja.style.transform = '';
    if (typeof fichaHoja.showModal === 'function') fichaHoja.showModal(); else fichaHoja.setAttribute('open', '');
    cargarDescripciones().then(function (mapa) {
      if (fichaJuego === j) $('ficha-texto').innerHTML = textoFicha(mapa[buscador.normalizar(j.nombre)]);
    });
  }

  function cerrarFicha() {
    fichaHoja.style.transform = '';
    if (fichaHoja.open) fichaHoja.close();
  }

  fichaHoja.addEventListener('click', function (e) {
    if (e.target === fichaHoja || e.target.closest('.ficha-cerrar')) return cerrarFicha();   // afuera o la X
    if (e.target.closest('[data-pedir-ficha]')) { var j = fichaJuego; cerrarFicha(); pedir(j); }
  });

  // Deslizar hacia abajo la cierra (solo con el contenido arriba de todo, para no pelear con el scroll).
  var arrastre = null;
  fichaHoja.addEventListener('touchstart', function (e) {
    if (fichaCuerpo.scrollTop > 0 && fichaCuerpo.contains(e.target)) return;
    arrastre = { y: e.touches[0].clientY, dy: 0 };
    fichaHoja.classList.add('arrastrando');
  }, { passive: true });
  fichaHoja.addEventListener('touchmove', function (e) {
    if (!arrastre) return;
    arrastre.dy = Math.max(0, e.touches[0].clientY - arrastre.y);
    fichaHoja.style.transform = arrastre.dy ? 'translateY(' + arrastre.dy + 'px)' : '';
  }, { passive: true });
  fichaHoja.addEventListener('touchend', function () {
    if (!arrastre) return;
    fichaHoja.classList.remove('arrastrando');
    var lejos = arrastre.dy > 90;
    arrastre = null;
    if (lejos) return cerrarFicha();
    fichaHoja.style.transition = 'transform .2s ease-out';
    fichaHoja.style.transform = '';
    setTimeout(function () { fichaHoja.style.transition = ''; }, 220);
  });

  // ---------- Destacado de la portada (destacado.json + precios del catálogo) ----------

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  function preventaDe(j) {
    for (var i = 0; i < (j.etiquetas || []).length; i++) {
      var m = /^preventa\s*(.*)$/i.exec(j.etiquetas[i]);
      if (m) return { fecha: m[1].trim() };
    }
    return null;
  }

  function fechaLarga(texto) {
    var m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(texto || '');
    if (!m || +m[2] < 1 || +m[2] > 12) return texto ? 'Sale el ' + texto : '';
    return 'Sale el ' + (+m[1]) + ' de ' + MESES[+m[2] - 1] + (m[3] ? ' de ' + (m[3].length === 2 ? '20' + m[3] : m[3]) : '');
  }

  var destacado = $('destacado'), edicionesDestacado = [];

  function pintarDestacado(cfg) {
    destacado.classList.remove('cargando');
    var n = buscador.normalizar;
    edicionesDestacado = (cfg && cfg.activo !== false ? cfg.ediciones || [] : []).map(function (e) {
      var j = juegos.filter(function (x) { return n(x.nombre) === n(e.nombre) && (!cfg.consola || x.consola === cfg.consola); })[0];
      return j && { cfg: e, juego: j, preventa: preventaDe(j) };
    }).filter(Boolean);
    if (!edicionesDestacado.length) { destacado.hidden = true; return; }   // ya no está disponible

    var primera = edicionesDestacado[0].juego;
    var enPreventa = edicionesDestacado.filter(function (e) { return e.preventa; })[0];
    var tapa = primera.imagen_grande || primera.imagen;
    destacado.innerHTML =
      '<div class="destacado-cabeza">' +
        (tapa ? '<img class="destacado-tapa" src="' + escapar(tapa) + '" alt="Tapa de ' + escapar(cfg.titulo || primera.nombre) + '" width="480" height="605" fetchpriority="high">' : '') +
        '<div class="destacado-texto">' +
          '<span class="estado">' + (enPreventa ? 'Preventa' : 'Ya disponible') + '</span>' +
          '<h2 id="destacado-titulo">' + escapar(cfg.titulo || primera.nombre) + '</h2>' +
          (enPreventa && enPreventa.preventa.fecha ? '<p class="fecha">' + escapar(fechaLarga(enPreventa.preventa.fecha)) + '</p>' : '') +
          (cfg.texto ? '<p class="bajada">' + escapar(cfg.texto) + '</p>' : '') +
          '<div class="consola-destacado"><span class="etiqueta consola">' + escapar(primera.consola) + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="ediciones' + (edicionesDestacado.length === 1 ? ' una' : '') + '">' +
        edicionesDestacado.map(function (e, i) {
          return '<div class="edicion">' +
            '<p class="precio">' +
              '<span class="edicion-nombre">' + escapar(e.cfg.titulo || e.juego.nombre) + '</span>' +
              '<span class="contado">' + pesos(e.juego.contado) + '</span>' +
              (conCuotas ? lineaCuotas(e.juego) : '<span class="rotulo">' + rotuloPago() + '</span>') +
            '</p>' +
            '<button class="boton-pedir" type="button" data-destacado="' + i + '">' + ICONO_WA + (e.preventa ? 'Reservar' : 'Pedir') + '</button>' +
          '</div>';
        }).join('') +
      '</div>';
  }

  destacado.addEventListener('click', function (e) {
    var b = e.target.closest('[data-destacado]');
    if (!b) return;
    var ed = edicionesDestacado[+b.getAttribute('data-destacado')], j = ed.juego;
    var nombre = ed.cfg.en_el_mensaje || j.nombre;
    abrirHoja('¡Hola! Quiero ' + (ed.preventa ? 'reservar ' : 'pedir ') + nombre + ' para ' + j.consola + ', cuenta primaria. ' +
      textoPago(j),
      nombre + ' · ' + j.consola + ' · ' + pesos(j.contado));
  });

  $('consultar-busqueda').addEventListener('click', function () {
    var texto = estado.texto;
    abrirHoja('¡Hola! Estoy buscando ' + (texto || 'un juego') + (consolaElegida() ? ' para ' + consolaElegida() : '') + '. ¿Lo tienen?',
      'Te escribimos para preguntar por “' + texto + '”.');
  });

  document.querySelector('[data-consultar]').addEventListener('click', function () {
    abrirHoja('¡Hola! Quería hacer una consulta sobre los juegos.', 'Elegí con quién seguir por WhatsApp.');
  });

  // Tocar fuera de la hoja la cierra. Al elegir un contacto se ilumina su figura y ~400 ms después se abre
  // WhatsApp (con "reducir movimiento", al instante). Si el navegador bloquea la pestaña nueva, va en la misma.
  var figuras = $('figuras');
  var reducirMovimiento = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function soltarEleccion() {
    figuras.classList.remove('eligiendo');
    figuras.querySelectorAll('.elegido').forEach(function (f) { f.classList.remove('elegido'); });
    delete hoja.dataset.eligiendo;
  }

  hoja.addEventListener('click', function (e) {
    if (e.target === hoja) return hoja.close();
    var contacto = e.target.closest('.contacto');
    if (!contacto) return;
    e.preventDefault();
    if (hoja.dataset.eligiendo) return;
    hoja.dataset.eligiendo = '1';
    var destino = contacto.href;
    var irAWhatsApp = function () {
      var ventana = window.open(destino, '_blank');
      if (ventana) ventana.opener = null; else location.href = destino;
      hoja.close();
    };
    if (reducirMovimiento.matches) return irAWhatsApp();
    figuras.classList.add('eligiendo');
    $('figura-' + contacto.dataset.contacto).classList.add('elegido');
    setTimeout(irAWhatsApp, 400);
  });
  hoja.addEventListener('close', soltarEleccion);

  // Las figuras se bajan después de que cargó la página, así aparecen al instante al abrir el menú.
  function precargarFiguras() {
    figuras.querySelectorAll('img[data-src]').forEach(function (img) { img.src = img.dataset.src; });
  }
  if (document.readyState === 'complete') precargarFiguras();
  else window.addEventListener('load', precargarFiguras);

  // ---------- Barra fija: sombra solo cuando ya quedó pegada arriba ----------
  var barra = $('barra');
  if ('IntersectionObserver' in window) {
    var marca = document.createElement('div');
    barra.parentNode.insertBefore(marca, barra);
    new IntersectionObserver(function (e) {
      barra.classList.toggle('pegada', !e[0].isIntersecting);
    }).observe(marca);
  }

  // ---------- Carga ----------

  function esqueleto() {
    var html = '';
    for (var i = 0; i < 4; i++) html += '<li class="juego cargando" aria-hidden="true"><div class="tapa"></div><div class="datos"></div></li>';
    grilla.innerHTML = html;
  }

  esqueleto();
  Promise.all([
    fetch('catalog.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw r; return r.json(); }),
    fetch('sinonimos.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch('sagas.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch('destacado.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
  ]).then(function (datos) {
    juegos = datos[0].juegos || [];
    conCuotas = datos[0].mostrar_cuotas === true;
    if (conCuotas) $('aclaracion').textContent = $('aclaracion').getAttribute('data-con-cuotas');
    buscador = window.crearBuscador(juegos, datos[1], datos[2]);
    // Sin populares en el catálogo (el bot todavía no los armó) el botón no se muestra y se abre en Todos.
    if (!juegos.some(function (j) { return j.popular; })) {
      document.querySelector('[data-consola="populares"]').hidden = true;
      document.querySelector('.consolas').classList.add('sin-populares');
      estado.consola = '';
      botonesConsola.forEach(function (o) { o.setAttribute('aria-pressed', String(o.getAttribute('data-consola') === '')); });
    }
    if (datos[0].actualizado) {
      var f = new Date(datos[0].actualizado);
      $('actualizado').textContent = 'Precios actualizados el ' + f.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }) + '.';
    }
    pintarDestacado(datos[3]);
    pintar(true);
    // Las descripciones se bajan cuando el celular está libre, así la primera ficha abre con el texto.
    (window.requestIdleCallback || function (f) { setTimeout(f, 1500); })(cargarDescripciones);
  }).catch(function () {
    destacado.hidden = true;
    grilla.innerHTML = '';
    conteo.textContent = '';
    errorCaja.hidden = false;
  });
})();
