/* Menú ☰ (al lado del buscador): una lista desde abajo con las secciones de la tienda. La barra fija no crece.
 * Cada sección nueva (cómo comprar, testimonios, etc.) se suma como un botón más en index.html (#menu) y acá.
 * En pantallas angostas el buscador dice solo "Buscá tu juego" (data-corto), para que entre al lado del botón.
 */
(function () {
  'use strict';

  var menu = document.getElementById('menu');
  var boton = document.getElementById('boton-menu');
  var busqueda = document.getElementById('busqueda');
  if (!menu || !boton) return;

  // Texto del buscador según el ancho
  var largo = busqueda.getAttribute('placeholder'), corto = busqueda.getAttribute('data-corto');
  var angosta = window.matchMedia ? window.matchMedia('(max-width: 389px)') : null;
  function textoBuscador() { busqueda.setAttribute('placeholder', angosta && angosta.matches && corto ? corto : largo); }
  if (angosta) {
    textoBuscador();
    if (angosta.addEventListener) angosta.addEventListener('change', textoBuscador);
    else if (angosta.addListener) angosta.addListener(textoBuscador);
  }

  function visible(el) { return !!el && !el.hidden; }

  boton.addEventListener('click', function () {
    // Solo las secciones que hoy existen: sin precios de PS Plus o sin preguntas, no se ofrecen.
    menu.querySelector('[data-ir="psplus"]').hidden = !visible(document.querySelector('[data-consola="psplus"]'));
    menu.querySelector('[data-ir="preguntas"]').hidden = !visible(document.getElementById('preguntas'));
    if (typeof menu.showModal === 'function') menu.showModal(); else menu.setAttribute('open', '');
  });

  function cerrar() { if (menu.open) { if (menu.close) menu.close(); else menu.removeAttribute('open'); } }

  menu.addEventListener('click', function (e) {
    if (e.target === menu) return cerrar();          // tocar fuera de la lista la cierra
    var item = e.target.closest('[data-ir]');
    if (!item) return;
    var ir = item.getAttribute('data-ir');
    cerrar();
    if (ir === 'psplus') document.querySelector('[data-consola="psplus"]').click();
    else if (ir === 'preguntas') document.getElementById('preguntas').scrollIntoView({ block: 'start' });
    else if (ir === 'pie') document.querySelector('.pie').scrollIntoView({ block: 'start' });
    else if (ir === 'consultar') document.querySelector('.encabezado [data-consultar]').click();
  });

  // El horario real en el renglón de "Horarios y atención" (llega en catalog.json)
  document.addEventListener('mpl:catalogo', function (e) {
    var h = (e.detail || {}).horarios_atencion;
    if (h) document.getElementById('menu-horarios').textContent = h;
  });
})();
