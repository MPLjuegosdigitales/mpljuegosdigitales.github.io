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

  var todos = [], juegos = [], buscador = null, lista = [], mostrados = 0, sinonimos = {}, sagas = {}, generos = {};
  // consola: 'populares' (al abrir), '' (todos), 'PS5' o 'PS4'. orden: 'auto' depende de lo que se mira
  // (buscando: más parecidos; en Populares: el orden de populares; si no: A a Z), o el que eligió la persona.
  // genero: '' (todos) o uno de generos.json; se combina con Todos, PS4, PS5, Ofertas y la búsqueda.
  var estado = { texto: '', consola: 'populares', orden: 'auto', genero: '' };
  var NOMBRE_AUTO = { parecido: 'Más parecidos', popular: 'Más populares', nombre: 'A a Z', descuento: 'Mayor descuento' };

  var formato = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
  function pesos(n) { return '$' + formato.format(n); }

  // Cuotas: solo si catalog.json trae "mostrar_cuotas": true (lo decide config.json de mpl-precios).
  // Por ahora no se trabaja con tarjeta: sin el dato, o con false, se muestra solo efectivo o transferencia.
  var conCuotas = false;
  function rotuloPago() { return conCuotas ? 'Contado / transferencia' : 'Efectivo o transferencia'; }
  function lineaCuotas(j) {
    return conCuotas && j.cuota ? '<span class="cuotas">3 cuotas sin interés de <b>' + pesos(j.cuota) + '</b></span>' : '';
  }
  // ---------- Ofertas ----------
  // catalog.json trae en cada juego en oferta una lista "ofertas": [{promo, contado, anterior, hasta}]. Acá se
  // elige, en el momento, la vigente más barata ("hasta" ya viene con el margen de seguridad y la hora de
  // Argentina). Cuando vencen todas, el juego vuelve a su precio normal ("contado") sin esperar al robot; los
  // que existen solo por la oferta ("solo_oferta") desaparecen.
  var PROMO_DEFECTO = 'Ofertas semanales', relojOfertas = null;

  function refrescarOfertas() {
    var t = Date.now(), proxima = Infinity;
    todos.forEach(function (j) {
      j._o = null;
      (j.ofertas || []).forEach(function (o) {
        var fin = Date.parse(o.hasta);
        if (!(fin >= t) || !(o.contado > 0)) return;          // vencida o con datos rotos: no se usa
        // La más barata; si dos empatan en precio, la que dura más (el precio sigue igual hasta esa fecha).
        if (!j._o || o.contado < j._o.contado || (o.contado === j._o.contado && fin > Date.parse(j._o.hasta))) j._o = o;
        proxima = Math.min(proxima, fin);
      });
      j._precio = j._o ? j._o.contado : j.contado;
    });
    juegos = todos.filter(function (j) { return !j.solo_oferta || j._o; });
    buscador = window.crearBuscador(juegos, sinonimos, sagas, generos);
    clearTimeout(relojOfertas);
    // Si la página queda abierta, a la hora de vencer se vuelve a pintar sola.
    if (proxima < Infinity && proxima - t < 864e5) {
      relojOfertas = setTimeout(function () {
        refrescarOfertas();
        if (estado.consola === 'ofertas' && !hayOfertas()) elegirConsola(juegos.some(function (j) { return j.popular; }) ? 'populares' : '');
        pintar(true);
        if (destacadoCfg !== undefined) pintarDestacado(destacadoCfg);
      }, proxima - t + 1000);
    }
    pintarBotonOfertas();
  }

  function hayOfertas() { return juegos.some(function (j) { return j._o; }); }
  function pago(j) { return j._o || j; }
  function descuento(o) { return o.anterior > o.contado ? Math.round((1 - o.contado / o.anterior) * 100) : 0; }
  function diaMes(iso) { return iso.slice(8, 10) + '/' + iso.slice(5, 7); }
  function nombrePromos() {
    var nombres = [];
    juegos.forEach(function (j) { if (j._o && nombres.indexOf(j._o.promo) < 0) nombres.push(j._o.promo); });
    return nombres.length === 1 ? nombres[0] || PROMO_DEFECTO : 'Ofertas';
  }

  // El botón de la sección va en la fila de filtros (lo arma index.html, para moverlo fácil). Sin ofertas
  // vigentes no aparece.
  var botonOfertas = document.querySelector('[data-consola="ofertas"]');
  function pintarBotonOfertas() {
    if (!botonOfertas) return;
    var hay = hayOfertas();
    botonOfertas.hidden = !hay;
    botonOfertas.textContent = hay ? nombrePromos() : '';
    botonOfertas.parentNode.classList.toggle('con-ofertas', hay);
  }

  function etiquetaOferta(o) {
    var d = descuento(o);
    return '<span class="etiqueta oferta">' + escapar(o.promo || PROMO_DEFECTO) + (d ? ' −' + d + '%' : '') + '</span>';
  }

  // El cartel de precio: con oferta, el precio anterior tachado, el nuevo y hasta cuándo vale.
  function cartelPrecio(j) {
    var o = j._o;
    if (!o) {
      return '<span class="rotulo">' + rotuloPago() + '</span>' +
        '<span class="contado">' + pesos(j.contado) + '</span>' + lineaCuotas(j);
    }
    return '<span class="rotulo">' + rotuloPago() + '</span>' +
      (descuento(o) ? '<s class="anterior"><span class="oculto">Antes </span>' + pesos(o.anterior) + '</s>' : '') +
      '<span class="contado">' + pesos(o.contado) + '</span>' + lineaCuotas(o) +
      '<span class="vence">Válido hasta el ' + diaMes(o.hasta) + '</span>';
  }

  // Arriba de la sección: si todas las ofertas que se ven vencen el mismo día, esa fecha (ya con el margen);
  // si no, que cada tarjeta dice la suya ("Válido hasta el …" en el cartel de precio).
  function avisoOfertas(visibles) {
    var dias = [];
    visibles.forEach(function (j) {
      if (j._o && dias.indexOf(diaMes(j._o.hasta)) < 0) dias.push(diaMes(j._o.hasta));
    });
    return dias.length === 1 ? 'Ofertas válidas hasta el <b>' + dias[0] + '</b>.' : 'Cada oferta indica hasta cuándo es válida.';
  }

  function escapar(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- Lista visible ----------

  function consolaElegida() { return /^(populares|ofertas|psplus)$/.test(estado.consola) ? '' : estado.consola; }
  function ordenAuto() {
    return estado.texto ? 'parecido' : estado.consola === 'populares' ? 'popular' : estado.consola === 'ofertas' ? 'descuento' : 'nombre';
  }

  function tieneGenero(j, g) { return (j.generos || []).indexOf(g) >= 0; }

  // La lista sin género ni orden para lo elegido arriba (modo: 'populares', 'ofertas', '', 'PS4' o 'PS5').
  function listaBase(modo) {
    var base;
    if (estado.texto) {
      // Buscando se busca en todo el catálogo, aunque esté elegido Populares. Si lo buscado es un género
      // ("terror", "rpg"), después de los que se llaman así van todos los de ese género.
      base = buscador.buscar(estado.texto).map(function (r) { return r.juego; });
      var g = buscador.genero(estado.texto);
      if (g) base = base.concat(juegos.filter(function (j) { return tieneGenero(j, g) && base.indexOf(j) < 0; }));
    } else if (modo === 'populares') {
      base = juegos.filter(function (j) { return j.popular; });
    } else if (modo === 'ofertas') {
      base = juntarConsolas(juegos.filter(function (j) { return j._o; }));
    } else {
      base = juegos.slice();
    }
    var consola = /^(populares|ofertas|psplus)$/.test(modo) ? '' : modo;
    if (consola) base = base.filter(function (j) { return j.consola.indexOf(consola) >= 0; });
    return base;
  }

  function calcularLista() {
    var base = listaBase(estado.consola);
    if (estado.genero) base = base.filter(function (j) { return tieneGenero(j, estado.genero); });
    var orden = estado.orden === 'auto' ? ordenAuto() : estado.orden;
    if (orden === 'menor') base.sort(function (a, b) { return a._precio - b._precio; });
    else if (orden === 'mayor') base.sort(function (a, b) { return b._precio - a._precio; });
    else if (orden === 'descuento') base.sort(function (a, b) {
      return descuento(b._o) - descuento(a._o) || a.nombre.localeCompare(b.nombre, 'es');
    });
    else if (orden === 'nombre') base.sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
    else if (orden === 'popular') base.sort(function (a, b) { return a.popular - b.popular; });
    return base;
  }

  // Solo en la sección de ofertas: si el mismo juego está en oferta en PS4 y en PS5 al mismo precio, con la
  // misma promo y hasta el mismo día, va en una sola tarjeta "PS4/PS5" (el WhatsApp dice "para PS4/PS5" y la
  // consola se pregunta por chat). Precio anterior: el más bajo de los dos. Si en PS5 es la "Versión PS4", la
  // ficha lo aclara. Con precios distintos, y fuera de la sección (Todos, PS4, PS5, búsqueda), van separados.
  var RETRO = 'Versión PS4';
  function sinRetro(j) { return (j.etiquetas || []).filter(function (e) { return e !== RETRO; }); }
  function claveOferta(j) {
    return [buscador.normalizar(j.nombre), sinRetro(j).join('|'), j._o.contado, j._o.promo, j._o.hasta].join('#');
  }
  function juntarConsolas(base) {
    var grupos = {}, hechos = {};
    base.forEach(function (j) { (grupos[claveOferta(j)] = grupos[claveOferta(j)] || []).push(j); });
    return base.map(function (j) {
      var k = claveOferta(j), g = grupos[k];
      var ps4 = g.filter(function (x) { return x.consola === 'PS4'; });
      var ps5 = g.filter(function (x) { return x.consola === 'PS5'; });
      if (g.length !== 2 || ps4.length !== 1 || ps5.length !== 1) return j;
      if (hechos[k]) return null;
      hechos[k] = true;
      var a = ps4[0], b = ps5[0], retro = (b.etiquetas || []).indexOf(RETRO) >= 0, u = {};
      Object.keys(a).forEach(function (c) { u[c] = a[c]; });
      if (!retro && b.imagen) { u.imagen = b.imagen; u.imagen_grande = b.imagen_grande; }
      u.consola = 'PS4/PS5';
      u.etiquetas = sinRetro(a);
      u.ps5_es_ps4 = retro;
      u._o = { promo: a._o.promo, contado: a._o.contado, hasta: a._o.hasta,
               anterior: Math.min(a._o.anterior || 0, b._o.anterior || 0),
               ref: [a._o.ref, b._o.ref].filter(function (r, i, l) { return r && l.indexOf(r) === i; }).join('/') };
      u._precio = u._o.contado;
      return u;
    }).filter(Boolean);
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
      (j._o ? etiquetaOferta(j._o) : '') +
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
        '<p class="precio' + (j._o ? ' en-oferta' : '') + '">' + cartelPrecio(j) + '</p>' +
        '<button class="boton-pedir" type="button" data-pedir="' + indice + '">' + ICONO_WA + 'Pedir</button>' +
      '</div>' +
    '</li>';
  }

  function pintar(desdeCero) {
    // PS Plus elegido y sin buscar: se ve la sección de planes en vez de la lista. Buscando, se busca en los juegos.
    var enPsPlus = estado.consola === 'psplus' && !estado.texto;
    contenido.classList.toggle('en-psplus', enPsPlus);
    if (enPsPlus) pintarPsPlus();
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
    var aviso = $('aviso-ofertas');
    aviso.hidden = estado.consola !== 'ofertas' || !hay;
    if (!aviso.hidden) aviso.innerHTML = avisoOfertas(lista);
    sinResultados.hidden = hay || !juegos.length;
    cargarMas.hidden = mostrados >= lista.length;
    if (!cargarMas.hidden) cargarMas.textContent = 'Cargar más juegos (quedan ' + formato.format(lista.length - mostrados) + ')';
    conteo.textContent = !hay ? '' :
      formato.format(lista.length) + (lista.length === 1 ? ' juego' : ' juegos') +
      (estado.texto ? ' para “' + estado.texto + '”' : estado.consola === 'populares' ? ' populares' :
        estado.consola === 'ofertas' ? ' en oferta' : '') +
      (estado.genero ? ' de ' + estado.genero : '') +
      (consolaElegida() ? (estado.genero ? ' para ' : ' de ') + consolaElegida() : '');
    pintarBotonGenero();
  }

  // ---------- Género: botón en la línea del orden y hoja desde abajo con cuántos juegos hay de cada uno ----------
  var botonGenero = $('boton-genero'), hojaGeneros = $('hoja-generos');

  function listaGeneros() {
    var orden = (generos.lista || []).slice();
    juegos.forEach(function (j) { (j.generos || []).forEach(function (g) { if (orden.indexOf(g) < 0) orden.push(g); }); });
    return orden;
  }
  function pintarBotonGenero() {
    botonGenero.hidden = !juegos.some(function (j) { return j.generos && j.generos.length; });
    botonGenero.setAttribute('aria-pressed', String(!!estado.genero));
    $('genero-elegido').textContent = estado.genero || 'Género';
  }
  function abrirGeneros() {
    // Se cuenta sobre lo que se va a ver: Populares pasa a Todos al elegir un género.
    var modo = /^(populares|psplus)$/.test(estado.consola) ? '' : estado.consola;
    var base = listaBase(modo), cuenta = {};
    base.forEach(function (j) { (j.generos || []).forEach(function (g) { cuenta[g] = (cuenta[g] || 0) + 1; }); });
    var consola = /^(PS4|PS5)$/.test(modo) ? modo : '';
    $('generos-nota').textContent = 'Cuántos juegos hay de cada uno' + (estado.texto ? ' para “' + estado.texto + '”' :
      modo === 'ofertas' ? ' en oferta' : '') + (consola ? ' de ' + consola : '') + '.';
    var opcion = function (valor, nombre, n) {
      return '<button type="button" data-genero="' + escapar(valor) + '" aria-pressed="' + (estado.genero === valor) + '">' +
        '<strong>' + escapar(nombre) + '</strong><span>' + formato.format(n) + '</span></button>';
    };
    $('generos-lista').innerHTML = opcion('', 'Todos los géneros', base.length) +
      listaGeneros().filter(function (g) { return cuenta[g] || estado.genero === g; })
        .map(function (g) { return opcion(g, g, cuenta[g] || 0); }).join('');
    if (typeof hojaGeneros.showModal === 'function') hojaGeneros.showModal(); else hojaGeneros.setAttribute('open', '');
  }
  function cerrarGeneros() { if (hojaGeneros.open) { if (hojaGeneros.close) hojaGeneros.close(); else hojaGeneros.removeAttribute('open'); } }
  botonGenero.addEventListener('click', abrirGeneros);
  hojaGeneros.addEventListener('click', function (e) {
    if (e.target === hojaGeneros) return cerrarGeneros();       // tocar fuera de la lista la cierra
    var b = e.target.closest('[data-genero]');
    if (!b) return;
    estado.genero = b.getAttribute('data-genero');
    if (estado.genero && /^(populares|psplus)$/.test(estado.consola)) elegirConsola('');
    cerrarGeneros();
    pintar(true);
  });

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

  function elegirConsola(valor) {
    estado.consola = valor;
    if (/^(populares|psplus)$/.test(valor)) estado.genero = '';      // Populares y PS Plus van sin género
    botonesConsola.forEach(function (o) { o.setAttribute('aria-pressed', String(o.getAttribute('data-consola') === valor)); });
  }
  botonesConsola.forEach(function (b) {
    b.addEventListener('click', function () {
      var valor = b.getAttribute('data-consola');
      // PS Plus arranca en la consola que estaba elegida en los filtros (PS4 o PS5); si no, en PS5.
      if (valor === 'psplus' && estado.consola !== 'psplus') consolaInicialPs(estado.consola);
      elegirConsola(valor);
      pintar(true);
      // PS Plus es mucho más corto que la lista: si se eligió desde abajo, se sube al principio de la sección.
      if (valor === 'psplus' && contenido.getBoundingClientRect().top < 0) {
        contenido.scrollIntoView({ behavior: reducirMovimiento.matches ? 'auto' : 'smooth' });
      }
    });
  });

  // ---------- PS Plus ----------
  // Precios: catalog.json "ps_plus" ({consola: {plan: {meses: {contado, cuota?}}}}), los pone el bot con la Ganancia
  // PS Plus; cada consola con su propio precio. Textos: psplus.json. Una consola a la que le falta algún precio no
  // aparece en el selector; sin ninguna (o sin los textos), la sección y su botón no se muestran.
  var contenido = $('contenido'), seccionPsPlus = $('ps-plus'), botonPsPlus = document.querySelector('[data-consola="psplus"]');
  var MESES_PS = ['1', '3', '12'], CONSOLAS_PS = ['PS4', 'PS5'], psPlus = null, mesesPs = '1', consolaPs = 'PS5';

  function nombreDuracion(m) { return m === '1' ? '1 mes' : m + ' meses'; }

  function prepararPsPlus(precios, textos) {
    var planes = textos && textos.planes;
    var consolas = CONSOLAS_PS.filter(function (c) {
      var porPlan = precios && precios[c];
      return porPlan && planes && planes.length && planes.every(function (p) {
        return porPlan[p.id] && MESES_PS.every(function (m) { return porPlan[p.id][m] && porPlan[p.id][m].contado > 0; });
      });
    });
    psPlus = consolas.length ? { precios: precios, textos: textos, consolas: consolas } : null;
    if (psPlus && MESES_PS.indexOf(String(textos.duracion_inicial)) >= 0) mesesPs = String(textos.duracion_inicial);
    consolaInicialPs('');
    botonPsPlus.hidden = !psPlus;
    botonPsPlus.parentNode.classList.toggle('con-psplus', !!psPlus);
    if (!psPlus && estado.consola === 'psplus') elegirConsola(juegos.some(function (j) { return j.popular; }) ? 'populares' : '');
  }

  // La consola elegida en los filtros si tiene precios; si no, PS5; si PS5 no tiene, la que haya.
  function consolaInicialPs(filtro) {
    if (!psPlus) return;
    var c = psPlus.consolas;
    consolaPs = c.indexOf(filtro) >= 0 ? filtro : c.indexOf('PS5') >= 0 ? 'PS5' : c[0];
  }

  function precioPs(plan, m) { return psPlus.precios[consolaPs][plan][m]; }

  // Ahorro contra pagar mes a mes, con el precio mensual de la misma consola.
  function ahorroPs(plan, m) {
    return m === '1' ? 0 : Math.max(0, precioPs(plan, '1').contado * +m - precioPs(plan, m).contado);
  }

  function selectorPs(clase, nombre, dato, opciones, actual, texto) {
    return '<div class="' + clase + '" role="group" aria-label="' + nombre + '">' +
      opciones.map(function (o) {
        return '<button type="button" data-' + dato + '="' + o + '" aria-pressed="' + (o === actual) + '">' + texto(o) + '</button>';
      }).join('') +
    '</div>';
  }

  function pintarPsPlus() {
    if (!psPlus) return;
    var t = psPlus.textos;
    seccionPsPlus.innerHTML =
      '<h2 class="titulo" id="psplus-titulo">' + escapar(t.titulo || 'PS Plus') + '</h2>' +
      (t.bajada ? '<p class="aclaracion">' + escapar(t.bajada) + '</p>' : '') +
      '<div class="psplus-selectores">' +
        selectorPs('psplus-consola', 'Consola', 'consola-ps', psPlus.consolas, consolaPs, function (c) { return c; }) +
        selectorPs('psplus-duracion', 'Duración', 'meses', MESES_PS, mesesPs, nombreDuracion) +
      '</div>' +
      '<ul class="psplus-planes">' +
        t.planes.map(function (p) {
          var precio = precioPs(p.id, mesesPs), ahorro = ahorroPs(p.id, mesesPs);
          return '<li class="plan plan-' + escapar(p.id) + '">' +
            '<h3 class="plan-nombre">' + escapar(p.nombre) + '</h3>' +
            (p.para_quien ? '<p class="plan-para">' + escapar(p.para_quien) + '</p>' : '') +
            '<ul class="plan-incluye">' + (p.incluye || []).map(function (x) { return '<li>' + escapar(x) + '</li>'; }).join('') + '</ul>' +
            '<p class="plan-precio">' +
              '<span class="rotulo">' + rotuloPago() + ' · ' + nombreDuracion(mesesPs) + ' · ' + consolaPs + '</span>' +
              '<span class="contado">' + pesos(precio.contado) + '</span>' + lineaCuotas(precio) +
              (ahorro ? '<span class="ahorro">Ahorrás ' + pesos(ahorro) + ' contra pagar mes a mes</span>' : '') +
            '</p>' +
            '<button class="boton-pedir" type="button" data-plan="' + escapar(p.id) + '">' + ICONO_WA + 'Pedir</button>' +
          '</li>';
        }).join('') +
      '</ul>';
  }

  seccionPsPlus.addEventListener('click', function (e) {
    var opcion = e.target.closest('[data-meses], [data-consola-ps]');
    if (opcion) {
      var esConsola = opcion.hasAttribute('data-consola-ps');
      if (esConsola) consolaPs = opcion.getAttribute('data-consola-ps'); else mesesPs = opcion.getAttribute('data-meses');
      pintarPsPlus();
      seccionPsPlus.querySelector(esConsola ? '[data-consola-ps="' + consolaPs + '"]' : '[data-meses="' + mesesPs + '"]').focus();
      return;
    }
    var boton = e.target.closest('[data-plan]');
    if (!boton) return;
    var plan = psPlus.textos.planes.filter(function (p) { return p.id === boton.getAttribute('data-plan'); })[0];
    var precio = pesos(precioPs(plan.id, mesesPs).contado);
    // Con el saludo de abrirHoja: "¡Hola Mateo! Quiero PS Plus Extra por 12 meses para PS5. Efectivo o transferencia: $147.999."
    abrirHoja('Quiero PS Plus ' + plan.nombre + ' por ' + nombreDuracion(mesesPs) + ' para ' + consolaPs +
      '. Efectivo o transferencia: ' + precio + '.',
      'PS Plus ' + plan.nombre + ' · ' + nombreDuracion(mesesPs) + ' · ' + consolaPs + ' · ' + precio);
  });

  orden.addEventListener('change', function () {
    estado.orden = orden.value;
    pintar(true);
  });

  cargarMas.addEventListener('click', function () { pintar(false); });

  // ---------- WhatsApp ----------

  function mensajeJuego(j) {
    return 'Quiero pedir ' + j.nombre + ' para ' + j.consola + ', cuenta primaria. ' + textoPrecio(j) + referencia(j);
  }

  // Última línea del pedido, para saber de dónde sale el precio: "Ref. O7" (oferta del Issue #7), "Ref. S" (copia de
  // nuestro stock). Con el precio normal no va nada. Qué es cada código lo dice la pestaña Referencias de la planilla.
  function referencia(j) {
    var ref = j._o ? j._o.ref : j.ref;
    return ref ? '\nRef. ' + ref : '';
  }

  function textoPrecio(j) {
    return (j._o ? 'Precio en oferta: ' : 'Precio: ') + pesos(j._precio) + '.';
  }

  // El mensaje llega con el saludo a quien se eligió: "¡Hola Mateo! ..." o "¡Hola Luca! ...".
  function abrirHoja(mensaje, detalle) {
    soltarEleccion();
    $('hoja-juego').textContent = detalle;
    Object.keys(CONTACTOS).forEach(function (clave) {
      var texto = '¡Hola ' + CONTACTOS[clave].nombre + '! ' + mensaje;
      $('contacto-' + clave).href = 'https://wa.me/' + CONTACTOS[clave].numero + '?text=' + encodeURIComponent(texto);
    });
    if (typeof hoja.showModal === 'function') hoja.showModal();
    else hoja.setAttribute('open', '');
  }

  function pedir(j) {
    abrirHoja(mensajeJuego(j), j.nombre + ' · ' + j.consola + ' · ' + pesos(j._precio) +
      (j._o ? ' · oferta hasta el ' + diaMes(j._o.hasta) : ''));
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

  // Fotos del juego: capturas.json lo escribe el bot (mpl-precios, capturas.py). Dice de dónde salen las fotos
  // de cada juego (Steam, la PS Store o, para llenar huecos, archivos propios de img/f/) y se bajan recién al abrir
  // la ficha. capturas.json se baja una sola vez.
  var capturas = null;
  var FOTOS_POPULAR = 5, FOTOS = 3;           // además de la carátula

  function cargarCapturas() {
    if (!capturas) {
      capturas = fetch('capturas.json').then(function (r) { return r.ok ? r.json() : {}; })
        .catch(function () { return {}; });
    }
    return capturas;
  }

  function fotosDe(datos, j) {
    var c = (datos.juegos || {})[buscador.normalizar(j.nombre)], fotos = [];
    if (!c) return fotos;
    if (c.s && c.f) fotos = c.f.map(function (f) { return datos.steam + c.s + '/' + f; });
    else if (c.p) fotos = c.p.map(function (p) { return datos.ps + p + '?w=640'; });
    else if (c.a) fotos = c.a.slice();          // archivos propios: img/f/…webp
    return fotos.slice(0, j.popular ? FOTOS_POPULAR : FOTOS);
  }

  // La tira: la carátula primero y después las fotos; abajo, un punto por cada una. Tocar una la agranda (visor).
  // Sin fotos no hay tira: la ficha muestra solo la carátula, arriba al lado del nombre.
  function pintarFotos(fotos, j) {
    var caja = $('ficha-fotos'), cabeza = fichaCuerpo.querySelector('.ficha-cabeza');
    if (!fotos.length) { caja.hidden = true; return; }
    var tapa = j.imagen_grande || j.imagen;
    var lista = (tapa ? [{ url: tapa, tapa: true }] : []).concat(fotos.map(function (u) { return { url: u }; }));
    caja.innerHTML =
      '<div class="fotos-tira" tabindex="0" aria-label="Fotos de ' + escapar(j.nombre) + '. Tocá una para verla grande.">' +
        lista.map(function (f, i) {
          return '<img class="' + (f.tapa ? 'foto-tapa' : 'foto') + '" src="' + escapar(f.url) + '"' +
            ' alt="' + (f.tapa ? 'Carátula de ' : 'Foto de ') + escapar(j.nombre) + '"' +
            (f.tapa ? ' width="480" height="605"' : ' width="640" height="360"') +
            ' decoding="async"' + (i > 1 ? ' loading="lazy"' : '') + '>';
        }).join('') +
      '</div>' +
      '<button class="fotos-flecha anterior" type="button" aria-label="Foto anterior">' + ICONO_FLECHA + '</button>' +
      '<button class="fotos-flecha siguiente" type="button" aria-label="Foto siguiente">' + ICONO_FLECHA + '</button>' +
      '<div class="fotos-puntos" aria-hidden="true"></div>';
    caja.hidden = false;
    if (cabeza && tapa) cabeza.classList.add('con-fotos');     // la carátula ya está en la tira
    var tira = caja.querySelector('.fotos-tira');
    // Una foto que no carga se saca, sin dejar hueco. Si queda solo la carátula, no hay tira.
    tira.querySelectorAll('img').forEach(function (img) {
      img.addEventListener('error', function () {
        img.remove();
        if (!tira.querySelector('.foto')) {
          caja.hidden = true;
          if (cabeza) cabeza.classList.remove('con-fotos');
        } else {
          pintarPuntos(caja);
        }
      });
    });
    tira.addEventListener('scroll', function () { marcarPunto(caja); }, { passive: true });
    pintarPuntos(caja);
  }

  // La foto que se ve: la que está más cerca del borde izquierdo de la tira.
  function fotoActual(tira) {
    var base = tira.children[0].offsetLeft, mejor = 0, distancia = Infinity;
    for (var i = 0; i < tira.children.length; i++) {
      var d = Math.abs(tira.children[i].offsetLeft - base - tira.scrollLeft);
      if (d < distancia) { distancia = d; mejor = i; }
    }
    // Al final de la tira, la última (aunque no llegue al borde).
    if (tira.scrollLeft + tira.clientWidth >= tira.scrollWidth - 4) mejor = tira.children.length - 1;
    return mejor;
  }
  function irAFoto(tira, i, suave) {
    var hijo = tira.children[Math.max(0, Math.min(i, tira.children.length - 1))];
    if (!hijo) return;
    var izquierda = hijo.offsetLeft - tira.children[0].offsetLeft;
    if (tira.scrollTo) tira.scrollTo({ left: izquierda, behavior: suave ? 'smooth' : 'auto' }); else tira.scrollLeft = izquierda;
  }
  function pintarPuntos(caja) {
    var tira = caja.querySelector('.fotos-tira, .visor-tira'), puntos = caja.querySelector('.fotos-puntos');
    puntos.innerHTML = new Array(tira.children.length + 1).join('<span></span>');
    marcarPunto(caja);
  }
  function marcarPunto(caja) {
    var tira = caja.querySelector('.fotos-tira, .visor-tira');
    if (!tira || !tira.children.length) return;
    var actual = fotoActual(tira), puntos = caja.querySelectorAll('.fotos-puntos span');
    for (var i = 0; i < puntos.length; i++) puntos[i].classList.toggle('activo', i === actual);
    var ant = caja.querySelector('.anterior'), sig = caja.querySelector('.siguiente');
    if (ant) ant.disabled = actual === 0;
    if (sig) sig.disabled = actual === tira.children.length - 1;
  }

  // ---------- Visor: una foto a pantalla completa (se pasa con el dedo; la X, Esc o tocar afuera lo cierran) ----------
  var visor = $('visor'), visorTira = visor.querySelector('.visor-tira');
  function abrirVisor(desde) {
    var imgs = $('ficha-fotos').querySelectorAll('.fotos-tira img');
    visorTira.innerHTML = Array.prototype.map.call(imgs, function (img) {
      return '<div class="visor-foto"><img src="' + escapar(img.getAttribute('src')) + '" alt="' + escapar(img.alt) + '" decoding="async"></div>';
    }).join('');
    if (typeof visor.showModal === 'function') visor.showModal(); else visor.setAttribute('open', '');
    pintarPuntos(visor);
    irAFoto(visorTira, desde, false);
    marcarPunto(visor);
  }
  function cerrarVisor() {
    if (!visor.open) return;
    if (visor.close) visor.close(); else visor.removeAttribute('open');
    // La tira de la ficha queda en la misma foto que se estaba viendo.
    var tira = $('ficha-fotos').querySelector('.fotos-tira');
    if (tira) irAFoto(tira, fotoActual(visorTira), false);
  }
  visorTira.addEventListener('scroll', function () { marcarPunto(visor); }, { passive: true });
  visor.addEventListener('click', function (e) {
    if (e.target.closest('.visor-cerrar') || !e.target.closest('img')) cerrarVisor();
  });
  visor.addEventListener('cancel', function (e) { e.preventDefault(); cerrarVisor(); });

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
      (j._o ? etiquetaOferta(j._o) : '') +
      (j.etiquetas || []).map(function (e) { return '<span class="etiqueta">' + escapar(e) + '</span>'; }).join('');
    fichaCuerpo.innerHTML =
      '<div class="ficha-cabeza">' +
        (j.imagen ? '<img class="ficha-tapa" src="' + escapar(j.imagen) + '" alt="" width="96" height="121">' : '<div class="ficha-tapa"></div>') +
        '<div><div class="etiquetas">' + etiquetas + '</div><h2 id="ficha-nombre">' + escapar(j.nombre) + '</h2>' +
          (j.ps5_es_ps4 ? '<p class="ficha-consolas">En PS5 se juega la versión de PS4.</p>' : '') + '</div>' +
      '</div>' +
      '<div class="ficha-fotos" id="ficha-fotos" hidden></div>' +
      '<div id="ficha-texto"></div>' +
      (datos.length ? '<dl class="ficha-datos">' + datos.map(function (d) {
        return '<dt>' + d[0] + '</dt><dd>' + escapar(d[1]) + '</dd>';
      }).join('') + '</dl>' : '') +
      '<p class="precio' + (j._o ? ' en-oferta' : '') + '">' + cartelPrecio(j) + '</p>' +
      '<button class="boton-pedir" type="button" data-pedir-ficha>' + ICONO_WA + 'Pedir</button>';
    fichaCuerpo.scrollTop = 0;
    fichaHoja.style.transform = '';
    if (typeof fichaHoja.showModal === 'function') fichaHoja.showModal(); else fichaHoja.setAttribute('open', '');
    cargarDescripciones().then(function (mapa) {
      if (fichaJuego === j) $('ficha-texto').innerHTML = textoFicha(mapa[buscador.normalizar(j.nombre)]);
    });
    cargarCapturas().then(function (datos) {
      if (fichaJuego === j) pintarFotos(fotosDe(datos, j), j);
    });
  }

  function cerrarFicha() {
    fichaHoja.style.transform = '';
    if (fichaHoja.open) fichaHoja.close();
  }

  fichaHoja.addEventListener('click', function (e) {
    if (e.target === fichaHoja || e.target.closest('.ficha-cerrar')) return cerrarFicha();   // afuera o la X
    if (e.target.closest('[data-pedir-ficha]')) { var j = fichaJuego; cerrarFicha(); pedir(j); }
    var flecha = e.target.closest('.fotos-flecha');
    if (flecha) {
      var tira = $('ficha-fotos').querySelector('.fotos-tira');
      irAFoto(tira, fotoActual(tira) + (flecha.classList.contains('anterior') ? -1 : 1), !reducirMovimiento.matches);
    }
    var foto = e.target.closest('.fotos-tira img');
    if (foto) abrirVisor(Array.prototype.indexOf.call(foto.parentNode.children, foto));
  });

  // Deslizar hacia abajo la cierra (solo con el contenido arriba de todo, para no pelear con el scroll).
  // En las fotos no: ahí el dedo pasa de una foto a otra.
  var arrastre = null;
  fichaHoja.addEventListener('touchstart', function (e) {
    if (e.target.closest('.ficha-fotos')) return;
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

  var destacado = $('destacado'), edicionesDestacado = [], destacadoCfg;

  function pintarDestacado(cfg) {
    destacadoCfg = cfg;
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
              (e.juego._o && descuento(e.juego._o) ? '<s class="anterior">' + pesos(e.juego._o.anterior) + '</s>' : '') +
              '<span class="contado">' + pesos(e.juego._precio) + '</span>' +
              (conCuotas ? lineaCuotas(pago(e.juego)) : '<span class="rotulo">' + rotuloPago() + '</span>') +
              (e.juego._o ? '<span class="vence">' + escapar(e.juego._o.promo) + ', hasta el ' + diaMes(e.juego._o.hasta) + '</span>' : '') +
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
    abrirHoja('Quiero ' + (ed.preventa ? 'reservar ' : 'pedir ') + nombre + ' para ' + j.consola + ', cuenta primaria. ' + textoPrecio(j) + referencia(j),
      nombre + ' · ' + j.consola + ' · ' + pesos(j._precio));
  });

  $('consultar-busqueda').addEventListener('click', function () {
    var texto = estado.texto;
    abrirHoja('Estoy buscando ' + (texto || 'un juego') + (consolaElegida() ? ' para ' + consolaElegida() : '') + '. ¿Lo tienen?',
      'Te escribimos para preguntar por “' + texto + '”.');
  });

  // "Consultar" del encabezado y del pie.
  document.querySelectorAll('[data-consultar]').forEach(function (b) {
    b.addEventListener('click', function () {
      abrirHoja('Quería hacer una consulta sobre los juegos.', 'Elegí con quién seguir por WhatsApp.');
    });
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
    fetch('destacado.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
    fetch('psplus.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
    fetch('generos.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
  ]).then(function (datos) {
    todos = datos[0].juegos || [];
    sinonimos = datos[1]; sagas = datos[2]; generos = datos[5] || {};
    conCuotas = datos[0].mostrar_cuotas === true;
    if (conCuotas) $('aclaracion').textContent = $('aclaracion').getAttribute('data-con-cuotas');
    avisarCatalogo(datos[0]);
    refrescarOfertas();
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
    prepararPsPlus(datos[0].ps_plus, datos[4]);
    // Un link a la página con #ps-plus (por ejemplo, desde Instagram) abre directo los planes.
    if (psPlus && location.hash === '#ps-plus') { consolaInicialPs(estado.consola); elegirConsola('psplus'); }
    pintar(true);
    window.addEventListener('hashchange', function () {
      if (psPlus && location.hash === '#ps-plus' && estado.consola !== 'psplus') {
        consolaInicialPs(estado.consola); elegirConsola('psplus'); pintar(true);
      }
    });
    // Las descripciones se bajan cuando el celular está libre, así la primera ficha abre con el texto.
    (window.requestIdleCallback || function (f) { setTimeout(f, 1500); })(cargarDescripciones);
    // La lista de fotos también (solo la lista: las fotos se bajan al abrir la ficha).
    (window.requestIdleCallback || function (f) { setTimeout(f, 3000); })(cargarCapturas);
  }).catch(function () {
    destacado.hidden = true;
    grilla.innerHTML = '';
    conteo.textContent = '';
    errorCaja.hidden = false;
    avisarCatalogo({});
  });

  // Preguntas frecuentes y pie (js/preguntas.js) esperan el catálogo para los horarios y la demora de entrega.
  var catalogoAvisado = false;
  function avisarCatalogo(catalogo) {
    if (catalogoAvisado) return;
    catalogoAvisado = true;
    document.dispatchEvent(new CustomEvent('mpl:catalogo', { detail: catalogo }));
  }
})();
