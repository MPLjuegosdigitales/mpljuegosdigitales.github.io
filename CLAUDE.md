# mpljuegosdigitales.github.io — reglas del proyecto

Tienda pública de MPL Juegos Digitales en GitHub Pages (https://mpljuegosdigitales.github.io).
Organización MPLjuegosdigitales; trabajan dos socios: @MateoCipres y @LucaAlonso0.

**Para retomar:** el estado y lo que sigue están en `PENDIENTES.md` del repo privado **mpl-precios** (nunca acá).

## Git

- Antes de empezar: `git checkout main && git pull`. **El bot de mpl-precios sube `catalog.json` e
  `img/j/` a main todos los días**: sin el pull, tu rama queda vieja.
- Cada cambio en su propia rama, con PR a main. No pushear directo a main (solo el bot) ni unir un PR
  sin el OK del socio que lo pidió.
- No editar a mano `catalog.json`, `capturas.json` ni `img/j/`: los pisa el bot. Los precios se cambian en la
  planilla; las fotos de la ficha de un juego, pegando el link de la PS Store en la columna M de Catálogo.
  Para probar con datos de mentira (por ejemplo, ofertas o precios de PS Plus), usar una copia aparte en una
  carpeta temporal.
- Si un cambio toca la web y el bot: unir primero la web y después el bot.
- Commits y PRs **sin `Co-Authored-By` ni ninguna atribución a Claude** (ni "Generated with Claude Code").

## Contenido

- Este repo es público: nunca costo, ID ni nombre o links del proveedor, ni ninguna clave.
- La clave de Google vive solo como secret de mpl-precios, nunca acá.
- La planilla JUEGOS DIGITALES se maneja desde mpl-precios, y solo sus pestañas Catálogo, Juegos propios, Ofertas y
  Referencias.
- Pedidos de juegos: el WhatsApp termina con una línea "Ref. X" que dice de dónde sale el precio: "Ref. O7" (oferta
  del Issue #7; el código viene en cada oferta de catalog.json, `ref`), "Ref. S" (copia de nuestro stock, `ref` del
  juego). Con el precio normal no va la línea. El código nunca nombra ni identifica al proveedor: qué es cada uno lo
  dice la pestaña Referencias de la planilla (privada).
- Pedido de varios juegos (`js/pedido.js` y la sección "Pedido" de `js/tienda.js`): botón "Agregar al pedido" en cada
  tarjeta, ficha, edición del destacado y plan de PS Plus; con algo agregado aparece abajo la barra "Tu pedido (3) ·
  $X", que abre la lista (quitar, total, "Enviar pedido", "Vaciar pedido"). Sale **un solo WhatsApp**:
  "¡Hola Mateo! Quiero pedir:" + una línea numerada por cosa ("ASTRO BOT para PS5: $51.500 (precio de oferta válido
  hasta el 18/11). Ref. O8"; reserva: "(reserva, sale el 19/11/2026)"; "(Versión PS4)" cuando corresponde) + "Total:
  $X" + "Juegos en cuenta primaria. Efectivo o transferencia.".
  - **En el navegador se guarda solo qué juego y qué consola (o plan, meses y consola), nunca el precio.** Precio,
    oferta y Ref. se leen de catalog.json al abrir la lista y otra vez al enviar; si algo cambió o ya no está, se
    avisa en la lista y no se envía hasta el toque siguiente. Sin conexión, tampoco se envía.
  - Tope de 8 por pedido (juegos y PS Plus cuentan igual); al llegar, se avisa que el resto va en otro mensaje. Es
    para que el link de WhatsApp no pase de 2.000 caracteres.
  - "Cuenta primaria" se dice solo de juegos de PS4 y PS5 (`CON_CUENTA_PRIMARIA`): con solo PS Plus no va, y con
    juegos de otra consola la frase nombra a cuáles se refiere.
  - La tarjeta "PS4/PS5" de las ofertas pregunta para qué consola antes de agregar.
  - Si cambia el mensaje, el tope o lo que se guarda: `node pruebas/test_pedido.js ../mpljuegosdigitales.github.io`
    desde mpl-precios (controla también que el link entre con los nombres más largos del catálogo).
- Las ofertas se cargan desde un Issue de mpl-precios (privado). Nada de ofertas se abre en este repo.
- Precios y ofertas los calcula el bot; la web solo elige, en el momento y con la hora de Argentina, la oferta
  vigente más barata de `ofertas` y, cuando vencen todas, vuelve a `contado`. Sin cuotas mientras
  `catalog.json` traiga `mostrar_cuotas: false`.
- Para ver la web en el celular sin publicar: `python -m http.server 8765 --bind 0.0.0.0` en la carpeta y abrir
  `http://<IP de la compu>:8765` (misma red).

## Diseño

- Prioridad: celular (360-430 px de ancho) primero; después tablet y compu.
- Paleta: #E5AFFB (lila claro), #975AB7 (violeta), #4F1964 (violeta oscuro). Ningún otro color salvo
  neutros para texto cuando haga falta contraste.
- Única excepción: el acento de ofertas `--oferta` (en css/tienda.css), solo para la etiqueta de la promoción,
  el botón de la sección y su aviso. No usarlo para nada más.
- Logo `LOGO_MPL_sin_fondo.png`: nunca modificarlo, recortarlo ni cambiarle colores.
- Nada de decoraciones ni motivos que no se hayan pedido. Todo lo tocable de al menos 44 px de alto.
- Preguntas frecuentes: al final de la portada (después de la lista o de PS Plus), desplegables, en el orden de
  `preguntas.json`; en la web se ven solo las de estado "confirmada" (las "a confirmar" son borradores, con PENDIENTE
  o PROPUESTA). {demora}, {horarios} y {presencial} salen de config.json de mpl-precios (llegan en catalog.json),
  igual que los del pie: si cambian ahí, cambian solos en los dos lugares. Nunca inventar condiciones (garantía,
  devoluciones, cambio de consola, pedidos fuera de horario): quedan "a confirmar" hasta que las definan los socios.
- Pie: horarios de atención, tiempo de entrega, atención presencial, botón Consultar (el mismo menú de Mateo y Luca)
  e Instagram.
- No prometer "con o sin internet": depende del juego (lo explica la pregunta frecuente).
- Las respuestas pueden tener párrafos, listas (`{"lista": [...]}`) y pasos numerados (`{"pasos": [...]}`). Los nombres
  de los menús de la consola van exactos y entre comillas. Los pasos publicados (usuario descargador, candado) son de
  PS5 y lo dicen; los de PS4 no se publican hasta que los pasen los socios.
- Género: botón en la línea del orden (no en la barra fija) que abre una hoja desde abajo con los géneros de
  `generos.json` y cuántos juegos hay de cada uno. Se combina con Todos, PS4, PS5, Ofertas y la búsqueda; elegir un
  género en Populares pasa a Todos. El buscador entiende los géneros ("terror", "rpg", "metroid": palabras de
  `"buscar"` en generos.json y sinonimos.json). Los juegos sin género siguen en Todos y en la búsqueda.
- Fotos de la ficha (capturas.json, lo escribe el bot): tira con la carátula primero y después las fotos, un punto
  por cada una (nada de "1 / 6"); tocar una la abre a pantalla completa; una foto que no carga se saca sin dejar
  hueco. Populares hasta 5 fotos, el resto hasta 3; sin fotos, solo la carátula. Salen de Steam o la PS Store; las
  de Argentina Play solo llenan huecos, revisadas una por una (sin logos, marcas de agua ni textos de tienda), y se
  guardan en `img/f/` con nombre neutro (las sube el bot; no tocarlas a mano). Se bajan solo al abrir la ficha.
  El repo no puede pasar de 600 MB.
- Peso en la ficha: el de la ficha o el de `pesos.json`; el estimado se ve "~X GB (aproximado)". Cada entrada de
  pesos.json lleva su fuente (PS Store, editorial, PlayStation Blog o, si es estimado, la página en que se basa);
  nunca links del proveedor.
- Orden de la portada: encabezado → banners → buscador y filtros (fijos al bajar) → destacado (GTA 6) → lista.
- Banners: imágenes hechas por los socios (en `img/banner/`), **nunca modificadas ni recortadas**; solo se pasan a
  webp livianas, en dos tamaños cada una. `<picture>`: menos de 900 px de ancho, la de celular (1080×900); desde
  900 px, la de compu (1920×409). En un iPhone de 390×844 el banner (con los puntitos) no pasa del 45 % del alto,
  así el buscador se ve en la primera pantalla. Carrusel (`js/banner.js`): pasa solo cada 6 s, se desliza con el
  dedo, puntitos debajo de la imagen, se pausa al tocarlo; con "reducir movimiento" no pasa solo; con uno solo
  visible, sin carrusel ni puntitos. Imágenes, texto alternativo, destino al tocarlo y hasta cuándo se ve cada uno
  (`mostrar_hasta`, hora de Argentina) se cambian en `banner.json`, no en el código.
- Navegación: menú ☰ al lado del buscador, en la misma fila (la barra fija no crece; en pantallas de menos de 390 px
  el buscador dice solo "Buscá tu juego"). Abre una lista desde abajo con Tu pedido, PS Plus, Preguntas frecuentes,
  Horarios y atención y Consultar (`js/menu.js`). **Toda sección nueva se suma a ese menú, nunca a la barra fija.**
  La barra "Tu pedido" es lo único fijo abajo: se ve solo con algo agregado, la página le deja el lugar libre
  (`body.con-pedido`) y el menú, la ficha y las hojas se abren por encima.
- PS Plus: botón "PS Plus" al final de la fila de filtros; elegido, la sección de planes reemplaza a la lista
  (buscando, vuelve la lista). También se abre con un link a `#ps-plus`. Los textos (para quién es, qué incluye)
  se cambian en `psplus.json`; los precios los pone el bot en catalog.json (`ps_plus`). Si falta un precio, no se
  ven ni el botón ni la sección. Colores de los planes: Essential lila, Extra violeta, Deluxe violeta oscuro.
  Cada consola tiene su precio: selector PS4 / PS5 al lado del de 1 / 3 / 12 meses; arranca en la consola elegida
  en los filtros (si no, PS5). Una consola sin todos sus precios no aparece en el selector; sin ninguna, no hay
  sección. Mensaje (con el saludo de siempre): "¡Hola Mateo! Quiero PS Plus Extra por 12 meses para PS5. Efectivo
  o transferencia: $147.999." El ahorro de 3 y 12 meses se calcula con el precio mensual de la misma consola.
