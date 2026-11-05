/* Buscador tolerante a errores, sin librerías: todo corre en el navegador.
 *
 * - Ignora mayúsculas, tildes, guiones y signos: "Spider-Man" y "spiderman" son lo mismo.
 * - Tolera letras de más, de menos o cambiadas y espacios corridos: "callo f duti" → Call of Duty,
 *   "godofwar" → God of War. Para eso compara de dos formas y se queda con la mejor:
 *     1. palabra por palabra (cada palabra buscada contra la más parecida del nombre);
 *     2. todo junto sin espacios, buscando el texto dentro del nombre con hasta 1 error cada 4 letras.
 * - Sinónimos y siglas en sinonimos.json ("cod" → "call of duty"), que se amplía sin tocar código.
 * - Orden: primero lo que más se parece; dentro de un mismo parecido, la edición base antes que las
 *   variantes (Ultimate, Deluxe…) y el número más nuevo primero (FC 27, FC 26, FC 25…).
 *
 * Uso: const b = crearBuscador(juegos, sinonimos); b.buscar('fifa') → [{juego, puntaje}, …]
 */
(function (global) {
  'use strict';

  var MINIMO = 0.72;          // por debajo de esto no se muestra ("No encontramos ese juego")
  var DISTANCIA_AL_MEJOR = 0.15;   // tampoco lo que queda muy por debajo del mejor resultado
  var VARIANTES = /\b(ultimate|deluxe|gold|premium|complete|completa|definitive|definitiva|bundle|pack|edition|edicion|collection|coleccion|cross gen|vault|legendary|legendaria|super|digital deluxe)\b/;

  function normalizar(texto) {
    return String(texto || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9ñ]+/g, ' ')
      .trim();
  }

  // Distancia de edición con intercambio de letras vecinas ("duyt" ↔ "duty" cuesta 1).
  function distancia(a, b, tope) {
    var m = a.length, n = b.length;
    if (Math.abs(m - n) > tope) return tope + 1;
    var dos = null, ant = new Array(n + 1), act = new Array(n + 1), j, i;
    for (j = 0; j <= n; j++) ant[j] = j;
    for (i = 1; i <= m; i++) {
      act[0] = i;
      var minimoFila = act[0];
      for (j = 1; j <= n; j++) {
        var costo = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        var v = Math.min(ant[j] + 1, act[j - 1] + 1, ant[j - 1] + costo);
        if (dos && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, dos[j - 2] + 1);
        act[j] = v;
        if (v < minimoFila) minimoFila = v;
      }
      if (minimoFila > tope) return tope + 1;
      dos = ant; ant = act; act = new Array(n + 1);
    }
    return ant[n];
  }

  // Menor distancia de `patron` contra cualquier tramo de `texto` (búsqueda aproximada dentro del texto).
  function distanciaDentro(patron, texto) {
    var m = patron.length, n = texto.length, i, j;
    var ant = new Array(n + 1), act = new Array(n + 1);
    for (j = 0; j <= n; j++) ant[j] = 0;           // el tramo puede empezar en cualquier lugar
    for (i = 1; i <= m; i++) {
      act[0] = i;
      for (j = 1; j <= n; j++) {
        var costo = patron.charCodeAt(i - 1) === texto.charCodeAt(j - 1) ? 0 : 1;
        act[j] = Math.min(ant[j] + 1, act[j - 1] + 1, ant[j - 1] + costo);
      }
      var t = ant; ant = act; act = t;
    }
    var mejor = m;
    for (j = 0; j <= n; j++) if (ant[j] < mejor) mejor = ant[j];
    return mejor;
  }

  // Cuánto se parece una palabra buscada a una palabra del nombre (0 a 1).
  function parecidoPalabra(q, p) {
    if (q === p) return 1;
    if (p.indexOf(q) === 0) return q.length >= 4 ? 0.95 : 0.8;   // "minecraf" → "minecraft"; "cod" → "code" vale menos
    if (q.length === 1) return p.indexOf(q) >= 0 ? 0.6 : 0;
    if (q.length < 4) return 0;                                   // siglas cortas: solo exactas o al principio
    var tope = q.length <= 5 ? 1 : 2;
    var d = Math.min(distancia(q, p, tope), distancia(q, p.slice(0, q.length), tope));
    if (d > tope) return 0;
    return d === 1 ? 0.85 : 0.7;
  }

  function puntajePalabras(palabrasQ, juego) {
    var suma = 0, pesos = 0, falta = false;
    for (var i = 0; i < palabrasQ.length; i++) {
      var q = palabrasQ[i], peso = q.length === 1 ? 0.3 : q.length === 2 ? 0.6 : 1, mejor = 0;
      for (var k = 0; k < juego._palabras.length && mejor < 1; k++) {
        var s = parecidoPalabra(q, juego._palabras[k]);
        if (s > mejor) mejor = s;
      }
      if (q.length >= 3 && mejor < 0.7) falta = true;
      suma += peso * mejor; pesos += peso;
    }
    var p = pesos ? suma / pesos : 0;
    return falta ? p * 0.5 : p;           // si una palabra importante no aparece, casi no cuenta
  }

  function puntajeJunto(junto, numeros, juego) {
    if (junto.length < 4) return 0;
    if (juego._junto.indexOf(junto) >= 0) return 1;
    // Con errores, los números tienen que estar igual: "fifa 26" no es FC 25 ni FC 27.
    for (var i = 0; i < numeros.length; i++) if (juego._numeros.indexOf(numeros[i]) < 0) return 0;
    var tope = Math.floor(junto.length / 4);
    var d = distanciaDentro(junto, juego._junto);
    return d <= tope ? 1 - d / junto.length : 0;
  }

  // Las búsquedas alternativas que salen de los sinónimos: "fifa 26" → "fc 26", "ea sports fc 26".
  function alternativas(consulta, sinonimos) {
    var palabras = consulta.split(' '), salida = [consulta];
    for (var i = 0; i < palabras.length; i++) {
      var lista = sinonimos[palabras[i]];
      if (!lista) continue;
      var nuevas = [];
      salida.forEach(function (alt) {
        var partes = alt.split(' ');
        lista.forEach(function (reemplazo) {
          var copia = partes.slice();
          copia[i] = reemplazo;
          nuevas.push(copia.join(' '));
        });
      });
      salida = salida.concat(nuevas);
    }
    // Las frases de varias palabras ("spider man") también se prueban como sinónimo de la consulta entera.
    var entera = sinonimos[consulta];
    if (entera) salida = salida.concat(entera);
    return salida.slice(0, 24);
  }

  function prepararSinonimos(crudos) {
    var s = {};
    Object.keys(crudos || {}).forEach(function (clave) {
      if (clave.charAt(0) === '_') return;          // "_comentario" y similares
      var k = normalizar(clave);
      s[k] = (crudos[clave] || []).map(normalizar).filter(Boolean);
    });
    return s;
  }

  function numero(nombreNormalizado) {
    var m = nombreNormalizado.match(/\b(\d{1,4})\b/);
    return m ? parseInt(m[1], 10) : -1;
  }

  function crearBuscador(juegos, sinonimosCrudos) {
    var sinonimos = prepararSinonimos(sinonimosCrudos);
    juegos.forEach(function (j) {
      var n = normalizar(j.nombre);
      j._palabras = n.split(' ').filter(Boolean);
      j._junto = n.replace(/ /g, '');
      j._numero = numero(n);
      j._numeros = n.match(/\d+/g) || [];
      j._variante = VARIANTES.test(n) ? 1 : 0;
    });

    function buscar(texto) {
      var consulta = normalizar(texto);
      if (!consulta) return [];
      var alts = alternativas(consulta, sinonimos).map(function (a) {
        return { palabras: a.split(' ').filter(Boolean), junto: a.replace(/ /g, ''), numeros: a.match(/\d+/g) || [] };
      });
      var resultados = [];
      for (var i = 0; i < juegos.length; i++) {
        var j = juegos[i], mejor = 0;
        for (var k = 0; k < alts.length && mejor < 1; k++) {
          var s = Math.max(puntajePalabras(alts[k].palabras, j), puntajeJunto(alts[k].junto, alts[k].numeros, j));
          if (s > mejor) mejor = s;
        }
        if (mejor >= MINIMO) resultados.push({ juego: j, puntaje: mejor });
      }
      var tope = 0;
      resultados.forEach(function (r) { if (r.puntaje > tope) tope = r.puntaje; });
      resultados = resultados.filter(function (r) { return r.puntaje >= tope - DISTANCIA_AL_MEJOR; });
      resultados.sort(function (a, b) {
        var pa = Math.round(a.puntaje * 20), pb = Math.round(b.puntaje * 20);   // parecido en tramos de 0,05
        return (pb - pa) ||
          (a.juego._variante - b.juego._variante) ||
          (b.juego._numero - a.juego._numero) ||
          (a.juego._junto.length - b.juego._junto.length) ||
          (a.juego.consola < b.juego.consola ? 1 : a.juego.consola > b.juego.consola ? -1 : 0);
      });
      return resultados;
    }

    return { buscar: buscar, normalizar: normalizar };
  }

  global.crearBuscador = crearBuscador;
  if (typeof module !== 'undefined' && module.exports) module.exports = { crearBuscador: crearBuscador, normalizar: normalizar };
})(typeof window !== 'undefined' ? window : globalThis);
