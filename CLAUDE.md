# mpljuegosdigitales.github.io — reglas del proyecto

Tienda pública de MPL Juegos Digitales en GitHub Pages (https://mpljuegosdigitales.github.io).
Organización MPLjuegosdigitales; trabajan dos socios: @MateoCipres y @LucaAlonso0.

**Para retomar:** el estado y lo que sigue están en `PENDIENTES.md` del repo privado **mpl-precios** (nunca acá).
Publicada desde el 05/11 (primera versión: portada, destacado de GTA 6, Populares, buscador, fichas, menú de
Mateo y Luca, sin cuotas y ofertas). Todavía no hay PS Plus, preguntas frecuentes ni filtro por género: no
agregar botones ni secciones vacías de eso.

## Git

- Antes de empezar: `git checkout main && git pull`. **El bot de mpl-precios sube `catalog.json` e
  `img/j/` a main todos los días**: sin el pull, tu rama queda vieja.
- Cada cambio en su propia rama, con PR a main. No pushear directo a main (solo el bot) ni unir un PR
  sin el OK del socio que lo pidió.
- No editar a mano `catalog.json` ni `img/j/`: los pisa el bot. Los precios se cambian en la planilla.
  Para probar con datos de mentira (por ejemplo, ofertas), usar una copia aparte en una carpeta temporal.
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
  `http://<IP de la compu>:8765` (misma red; el firewall permite Python en redes públicas).

## Diseño

- Prioridad: celular (360-430 px de ancho) primero; después tablet y compu.
- Paleta: #E5AFFB (lila claro), #975AB7 (violeta), #4F1964 (violeta oscuro). Ningún otro color salvo
  neutros para texto cuando haga falta contraste.
- Única excepción: el acento de ofertas `--oferta` (en css/tienda.css), solo para la etiqueta de la promoción,
  el botón de la sección y su aviso. No usarlo para nada más.
- Logo `LOGO_MPL_sin_fondo.png`: nunca modificarlo, recortarlo ni cambiarle colores.
- Nada de decoraciones ni motivos que no se hayan pedido. Todo lo tocable de al menos 44 px de alto.
