# mpljuegosdigitales.github.io — reglas del proyecto

Tienda pública de MPL Juegos Digitales en GitHub Pages (https://mpljuegosdigitales.github.io).
Organización MPLjuegosdigitales; trabajan dos socios: @MateoCipres y @LucaAlonso0.

## Git

- Antes de empezar: `git checkout main && git pull`. **El bot de mpl-precios sube `catalog.json` e
  `img/j/` a main todos los días**: sin el pull, tu rama queda vieja.
- Cada cambio en su propia rama, con PR a main. No pushear directo a main (solo el bot) ni unir un PR
  sin el OK del socio que lo pidió.
- No editar a mano `catalog.json` ni `img/j/`: los pisa el bot. Los precios se cambian en la planilla.
- Commits y PRs **sin `Co-Authored-By` ni ninguna atribución a Claude** (ni "Generated with Claude Code").

## Contenido

- Este repo es público: nunca costo, ID ni nombre o links del proveedor, ni ninguna clave.
- La clave de Google vive solo como secret de mpl-precios, nunca acá.
- La planilla JUEGOS DIGITALES se maneja desde mpl-precios, y solo sus pestañas Catálogo, Juegos propios y Ofertas.
- Las ofertas se cargan desde un Issue de mpl-precios (privado). Nada de ofertas se abre en este repo.

## Diseño

- Prioridad: celular (360-430 px de ancho) primero; después tablet y compu.
- Paleta: #E5AFFB (lila claro), #975AB7 (violeta), #4F1964 (violeta oscuro). Ningún otro color salvo
  neutros para texto cuando haga falta contraste.
- Única excepción: el acento de ofertas `--oferta` (en css/tienda.css), solo para la etiqueta de la promoción,
  el botón de la sección y su aviso. No usarlo para nada más.
- Logo `LOGO_MPL_sin_fondo.png`: nunca modificarlo, recortarlo ni cambiarle colores.
- Nada de decoraciones ni motivos que no se hayan pedido. Todo lo tocable de al menos 44 px de alto.
