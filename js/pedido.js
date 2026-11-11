/* Pedido de varios juegos: lo que no depende de la página (qué se guarda, cómo queda el mensaje y qué se avisa
 * cuando algo cambió). Los botones, la barra "Tu pedido" y la lista están en js/tienda.js.
 *
 * En el navegador se guarda solo QUÉ se pidió: el juego y la consola (y, en PS5, si es la "Versión PS4"), o el
 * plan de PS Plus con su duración y consola. Nunca el precio: precio, oferta y "Ref." se leen de catalog.json
 * cada vez que se abre la lista y otra vez al enviar.
 *
 * El mensaje (sin el saludo, que lo pone la hoja de contactos):
 *
 *   Quiero pedir:
 *
 *   1. 007 First Light para PS5: $69.999
 *   2. ASTRO BOT para PS5: $51.500 (precio de oferta válido hasta el 18/11). Ref. O8
 *   3. EA SPORTS FC 27 (FIFA 27) para PS5: $69.000. Ref. S
 *   4. PS Plus Extra por 12 meses para PS5: $147.999
 *
 *   Total: $338.498
 *   Juegos en cuenta primaria. Efectivo o transferencia.
 *
 * TOPE: 8 por pedido. WhatsApp no publica un largo máximo para sus links, pero algunos navegadores cortan cerca de
 * los 2.000 caracteres. Con 8 el link queda por debajo aun con los nombres más largos del catálogo, todos en
 * oferta (lo controla pruebas/test_pedido.js de mpl-precios con el catalog.json publicado).
 */
(function (raiz) {
  'use strict';

  var TOPE = 8;
  var LARGO_MAXIMO_LINK = 2000;
  var GUARDADO = 'mpl-pedido';
  var VERSION = 1;
  var GUARDADOS_MAXIMO = 24;      // lo guardado que ya no existe no cuenta para el tope, pero tampoco se acumula
  // "Cuenta primaria" se dice solo de los juegos de estas consolas. Cualquier otra (PS3) queda afuera de esa frase.
  var CON_CUENTA_PRIMARIA = ['PS4', 'PS5'];
  var PLANES = /^[a-z0-9_-]{1,24}$/, MESES = /^(1|3|12)$/, CONSOLA = /^PS[0-9]$/;

  function texto(v, largo) { return typeof v === 'string' && v.trim() && v.length <= largo ? v.trim() : ''; }

  // Lo guardado, ya revisado: cualquier cosa rara (otra versión, datos rotos, alguien que lo tocó a mano) se descarta.
  // Un juego: {n: nombre, c: consola, v4: true si es la "Versión PS4"}. PS Plus: {p: plan, m: meses, c: consola}.
  function limpiar(items) {
    var salida = [];
    (Array.isArray(items) ? items : []).forEach(function (i) {
      if (!i || typeof i !== 'object' || !CONSOLA.test(i.c)) return;
      if (typeof i.p === 'string') {
        if (PLANES.test(i.p) && MESES.test(String(i.m))) salida.push({ p: i.p, m: String(i.m), c: i.c });
      } else if (texto(i.n, 160)) {
        var juego = { n: texto(i.n, 160), c: i.c };
        if (i.v4 === true) juego.v4 = true;
        salida.push(juego);
      }
    });
    return salida.slice(0, GUARDADOS_MAXIMO);
  }

  function leer(almacen) {
    try {
      var crudo = JSON.parse(almacen.getItem(GUARDADO) || 'null');
      return crudo && crudo.v === VERSION ? limpiar(crudo.items) : [];
    } catch (e) {
      return [];      // modo privado, almacenamiento bloqueado o datos rotos: se empieza de cero
    }
  }

  function guardar(almacen, items) {
    try {
      if (items.length) almacen.setItem(GUARDADO, JSON.stringify({ v: VERSION, items: limpiar(items) }));
      else almacen.removeItem(GUARDADO);
      return true;
    } catch (e) {
      return false;   // sin almacenamiento el pedido igual funciona mientras la página esté abierta
    }
  }

  // Identificador de cada cosa pedida. normalizar: el del buscador (sin tildes, mayúsculas ni signos).
  function id(item, normalizar) {
    return typeof item.p === 'string'
      ? 'p|' + item.p + '|' + item.m + '|' + item.c
      : 'j|' + normalizar(item.n) + '|' + item.c + (item.v4 ? '|v4' : '');
  }

  // Una línea del mensaje. r: {nombre, consola, notas: [..], precio, oferta: {hasta: 'dd/mm'} o null, ref}.
  function linea(r, pesos) {
    var t = r.nombre + ' para ' + r.consola + (r.notas && r.notas.length ? ' (' + r.notas.join(', ') + ')' : '') +
      ': ' + pesos(r.precio);
    if (r.oferta) t += ' (precio de oferta válido hasta el ' + r.oferta.hasta + ')';
    if (r.ref) t += '. Ref. ' + r.ref;
    return t;
  }

  function total(resueltos) {
    return resueltos.reduce(function (suma, r) { return suma + r.precio; }, 0);
  }

  // Última línea. "Cuenta primaria" vale solo para los juegos de PS4 y PS5: si en el pedido hay juegos de otra
  // consola, la frase nombra a cuáles se refiere; sin ningún juego de PS4 o PS5, no se dice.
  function pie(resueltos) {
    var juegos = resueltos.filter(function (r) { return r.tipo === 'juego'; });
    var consolas = CON_CUENTA_PRIMARIA.filter(function (c) {
      return juegos.some(function (r) { return r.consola === c; });
    });
    var otros = juegos.filter(function (r) { return CON_CUENTA_PRIMARIA.indexOf(r.consola) < 0; }).length;
    if (!consolas.length) return 'Efectivo o transferencia.';
    return (otros ? 'Juegos de ' + consolas.join(' y ') : 'Juegos') + ' en cuenta primaria. Efectivo o transferencia.';
  }

  // El mensaje sin el saludo ("¡Hola Mateo! " lo agrega la hoja de contactos).
  function mensaje(resueltos, pesos) {
    return 'Quiero pedir:\n\n' +
      resueltos.map(function (r, i) { return (i + 1) + '. ' + linea(r, pesos); }).join('\n') +
      '\n\nTotal: ' + pesos(total(resueltos)) + '\n' + pie(resueltos);
  }

  function largoLink(numero, textoCompleto) {
    return ('https://wa.me/' + numero + '?text=' + encodeURIComponent(textoCompleto)).length;
  }

  // Qué cambió entre lo que la persona vio (antes) y lo que dice ahora el catálogo. Los dos: {id: {nombre, consola,
  // precio, enOferta}}. Lo que ya no está en `ahora` se avisa aparte (faltan: [{nombre, consola}]).
  function cambios(antes, ahora, faltan, pesos) {
    var avisos = [];
    (faltan || []).forEach(function (f) {
      avisos.push(f.nombre + ' para ' + f.consola + ' ya no está disponible: lo sacamos de tu pedido.');
    });
    Object.keys(antes || {}).forEach(function (k) {
      var a = antes[k], b = ahora[k];
      if (!b || (a.precio === b.precio && a.enOferta === b.enOferta)) return;
      var que = a.enOferta && !b.enOferta ? 'terminó la oferta'
        : !a.enOferta && b.enOferta ? 'ahora está en oferta'
        : 'cambió el precio';
      avisos.push(b.nombre + ' para ' + b.consola + ': ' + que + '. ' +
        (a.precio === b.precio ? 'Sigue en ' + pesos(b.precio) + '.' : 'Pasó de ' + pesos(a.precio) + ' a ' + pesos(b.precio) + '.'));
    });
    return avisos;
  }

  var api = {
    TOPE: TOPE, LARGO_MAXIMO_LINK: LARGO_MAXIMO_LINK, CON_CUENTA_PRIMARIA: CON_CUENTA_PRIMARIA,
    leer: leer, guardar: guardar, limpiar: limpiar, id: id,
    linea: linea, total: total, pie: pie, mensaje: mensaje, largoLink: largoLink, cambios: cambios
  };
  raiz.MPLPedido = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
