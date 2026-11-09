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
- La planilla JUEGOS DIGITALES se maneja desde mpl-precios, y solo sus pestañas Catálogo, Juegos propios y Ofertas.
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
- Preguntas frecuentes: al final de la portada (después de la lista o de PS Plus), desplegables. Se editan en
  `preguntas.json`; en la web se ven solo las de estado "confirmada" (las "a confirmar" son borradores). {demora} y
  {horarios} salen de config.json de mpl-precios (llegan en catalog.json), igual que los del pie: si cambian ahí,
  cambian solos en los dos lugares.
- Pie: horarios de atención, tiempo de entrega, botón Consultar (el mismo menú de Mateo y Luca) e Instagram.
- PS Plus: botón "PS Plus" al final de la fila de filtros; elegido, la sección de planes reemplaza a la lista
  (buscando, vuelve la lista). También se abre con un link a `#ps-plus`. Los textos (para quién es, qué incluye)
  se cambian en `psplus.json`; los precios los pone el bot en catalog.json (`ps_plus`). Si falta un precio, no se
  ven ni el botón ni la sección. Colores de los planes: Essential lila, Extra violeta, Deluxe violeta oscuro.
  Cada consola tiene su precio: selector PS4 / PS5 al lado del de 1 / 3 / 12 meses; arranca en la consola elegida
  en los filtros (si no, PS5). Una consola sin todos sus precios no aparece en el selector; sin ninguna, no hay
  sección. Mensaje (con el saludo de siempre): "¡Hola Mateo! Quiero PS Plus Extra por 12 meses para PS5. Efectivo
  o transferencia: $147.999." El ahorro de 3 y 12 meses se calcula con el precio mensual de la misma consola.
