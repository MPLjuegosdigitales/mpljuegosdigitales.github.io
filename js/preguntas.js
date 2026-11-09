/* Preguntas frecuentes (final de la portada) y datos del pie: horarios de atención, tiempo de entrega y atención
 * presencial. Las preguntas salen de preguntas.json; solo se muestran las "confirmada". Horarios, demora y lugares
 * llegan en catalog.json (config.json de mpl-precios): js/tienda.js avisa con el evento "mpl:catalogo" cuando lo cargó.
 */
(function () {
  'use strict';

  var seccion = document.getElementById('preguntas');
  var lista = document.getElementById('preguntas-lista');

  function escapar(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // "{demora}", "{horarios}" y "{presencial}" por su valor; si alguno falta, null (esa pregunta o línea no se muestra).
  function reemplazar(texto, datos) {
    var falta = false;
    var listo = String(texto).replace(/\{(\w+)\}/g, function (todo, clave) {
      if (!datos[clave]) { falta = true; return todo; }
      return datos[clave];
    });
    return falta ? null : listo;
  }

  function pintarPie(datos) {
    [['pie-horarios', '{horarios}'], ['pie-entrega', 'En general, {demora}, según la demanda.'],
     ['pie-presencial', '{presencial}']].forEach(function (d) {
      var dd = document.getElementById(d[0]), texto = reemplazar(d[1], datos);
      if (!dd) return;
      dd.parentNode.hidden = !texto;
      if (texto) dd.textContent = texto;
    });
  }

  function pintarPreguntas(contenido, datos) {
    var html = ((contenido && contenido.preguntas) || []).filter(function (p) {
      return p.estado === 'confirmada' && p.pregunta && p.respuesta;
    }).map(function (p) {
      var parrafos = (Array.isArray(p.respuesta) ? p.respuesta : [p.respuesta]).map(function (r) { return reemplazar(r, datos); });
      if (parrafos.some(function (r) { return r === null; })) return '';
      return '<details class="pregunta"><summary>' + escapar(p.pregunta) + '</summary>' +
        '<div class="respuesta">' + parrafos.map(function (r) { return '<p>' + escapar(r) + '</p>'; }).join('') + '</div>' +
      '</details>';
    }).join('');
    if (!html) { seccion.hidden = true; return; }
    if (contenido.titulo) document.getElementById('preguntas-titulo').textContent = contenido.titulo;
    lista.innerHTML = html;
    seccion.hidden = false;
  }

  var preguntas = fetch('preguntas.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .catch(function () { return null; });

  document.addEventListener('mpl:catalogo', function (e) {
    var c = e.detail || {};
    var datos = { demora: c.demora_entrega, horarios: c.horarios_atencion, presencial: c.atencion_presencial };
    pintarPie(datos);
    preguntas.then(function (contenido) { pintarPreguntas(contenido, datos); });
  });
})();
