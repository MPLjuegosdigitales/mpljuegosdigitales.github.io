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

  var $ = function (id) { return document.getElementById(id); };
  var grilla = $('grilla'), conteo = $('conteo'), cargarMas = $('cargar-mas');
  var sinResultados = $('sin-resultados'), errorCaja = $('error');
  var busqueda = $('busqueda'), limpiar = document.querySelector('.limpiar'), orden = $('orden');
  var botonesConsola = document.querySelectorAll('[data-consola]');
  var hoja = $('hoja');

  var juegos = [], buscador = null, lista = [], mostrados = 0;
  var estado = { texto: '', consola: '', orden: 'nombre' };

  var formato = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
  function pesos(n) { return '$' + formato.format(n); }

  function escapar(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- Lista visible ----------

  function calcularLista() {
    var base;
    if (estado.texto) {
      base = buscador.buscar(estado.texto).map(function (r) { return r.juego; });
    } else {
      base = juegos.slice();
    }
    if (estado.consola) {
      base = base.filter(function (j) { return j.consola.indexOf(estado.consola) >= 0; });
    }
    if (estado.orden === 'menor') base.sort(function (a, b) { return a.contado - b.contado; });
    else if (estado.orden === 'mayor') base.sort(function (a, b) { return b.contado - a.contado; });
    else if (estado.orden === 'nombre' && !estado.texto) base.sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
    return base;
  }

  function tarjeta(j, indice) {
    var etiquetas = (j.etiquetas || []).map(function (e) {
      var clase = /^preventa/i.test(e) ? ' preventa' : /dlc/i.test(e) ? ' dlc' : '';
      return '<span class="etiqueta' + clase + '">' + escapar(e) + '</span>';
    }).join('');
    var tapa = j.imagen
      ? '<img src="' + escapar(j.imagen) + '" alt="" width="480" height="600" loading="lazy" decoding="async" onload="this.classList.add(\'lista\')" onerror="this.parentNode.classList.add(\'falta\');this.remove()">'
      : '';
    return '<li class="juego">' +
      '<div class="tapa' + (j.imagen ? '' : ' falta') + '">' +
        '<span class="sin-tapa" aria-hidden="true">' + escapar(j.nombre) + '</span>' + tapa +
        '<span class="consola">' + escapar(j.consola) + '</span>' +
      '</div>' +
      '<div class="cartel">' +
        '<h3 class="nombre">' + escapar(j.nombre) + '</h3>' +
        (etiquetas ? '<div class="etiquetas">' + etiquetas + '</div>' : '') +
        '<p class="precio">' +
          '<span class="rotulo">Contado / transferencia</span>' +
          '<span class="contado">' + pesos(j.contado) + '</span>' +
          '<span class="cuotas">3 cuotas sin interés de <b>' + pesos(j.cuota) + '</b></span>' +
        '</p>' +
        '<button class="boton-pedir" type="button" data-pedir="' + indice + '">' + ICONO_WA + 'Pedir</button>' +
      '</div>' +
    '</li>';
  }

  function pintar(desdeCero) {
    if (desdeCero) {
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
      (estado.texto ? ' para “' + estado.texto + '”' : '') +
      (estado.consola ? ' de ' + estado.consola : '');
  }

  // ---------- Controles ----------

  var espera;
  busqueda.addEventListener('input', function () {
    limpiar.hidden = !busqueda.value;
    clearTimeout(espera);
    espera = setTimeout(function () {
      var antes = estado.texto;
      estado.texto = busqueda.value.trim();
      // Mientras se busca, el orden pasa a "Más parecidos", salvo que se haya elegido un precio.
      if (estado.texto && !antes && estado.orden === 'nombre') { estado.orden = 'parecido'; orden.value = 'parecido'; }
      if (!estado.texto && estado.orden === 'parecido') { estado.orden = 'nombre'; orden.value = 'nombre'; }
      orden.querySelector('[value="parecido"]').hidden = !estado.texto;
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
    return '¡Hola! Quiero pedir ' + j.nombre + ' para ' + j.consola + ', cuenta primaria. ' +
      'Contado / transferencia: ' + pesos(j.contado) + '. ' +
      'O en 3 cuotas sin interés de ' + pesos(j.cuota) + '.';
  }

  function abrirHoja(mensaje, detalle) {
    $('hoja-juego').textContent = detalle;
    Object.keys(CONTACTOS).forEach(function (clave) {
      $('contacto-' + clave).href = 'https://wa.me/' + CONTACTOS[clave].numero + '?text=' + encodeURIComponent(mensaje);
    });
    if (typeof hoja.showModal === 'function') hoja.showModal();
    else hoja.setAttribute('open', '');
  }

  grilla.addEventListener('click', function (e) {
    var boton = e.target.closest('[data-pedir]');
    if (!boton) return;
    var j = lista[+boton.getAttribute('data-pedir')];
    abrirHoja(mensajeJuego(j), j.nombre + ' · ' + j.consola + ' · ' + pesos(j.contado));
  });

  $('consultar-busqueda').addEventListener('click', function () {
    var texto = estado.texto;
    abrirHoja('¡Hola! Estoy buscando ' + (texto || 'un juego') + (estado.consola ? ' para ' + estado.consola : '') + '. ¿Lo tienen?',
      'Te escribimos para preguntar por “' + texto + '”.');
  });

  document.querySelector('[data-consultar]').addEventListener('click', function () {
    abrirHoja('¡Hola! Quería hacer una consulta sobre los juegos.', 'Elegí con quién seguir por WhatsApp.');
  });

  // Tocar fuera de la hoja la cierra; elegir un contacto también.
  hoja.addEventListener('click', function (e) {
    if (e.target === hoja || e.target.closest('.contacto')) hoja.close();
  });

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
    for (var i = 0; i < 4; i++) html += '<li class="juego cargando" aria-hidden="true"><div class="tapa"></div><div class="cartel"></div></li>';
    grilla.innerHTML = html;
  }

  esqueleto();
  Promise.all([
    fetch('catalog.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw r; return r.json(); }),
    fetch('sinonimos.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
    fetch('sagas.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
  ]).then(function (datos) {
    juegos = datos[0].juegos || [];
    buscador = window.crearBuscador(juegos, datos[1], datos[2]);
    if (datos[0].actualizado) {
      var f = new Date(datos[0].actualizado);
      $('actualizado').textContent = 'Precios actualizados el ' + f.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }) + '.';
    }
    pintar(true);
  }).catch(function () {
    grilla.innerHTML = '';
    conteo.textContent = '';
    errorCaja.hidden = false;
  });
})();
