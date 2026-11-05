# mpljuegosdigitales.github.io

Tienda de MPL Juegos Digitales: https://mpljuegosdigitales.github.io (GitHub Pages, rama main).
El catálogo (`catalog.json` e `img/j/`) lo publica todos los días a las 9:00 el repo privado
[mpl-precios](https://github.com/MPLjuegosdigitales/mpl-precios).

## Cómo trabajamos (Mateo y Luca)

```
git clone https://github.com/MPLjuegosdigitales/mpljuegosdigitales.github.io.git
git clone https://github.com/MPLjuegosdigitales/mpl-precios.git
```

1. Antes de empezar: `git checkout main` y `git pull`. El bot sube `catalog.json` a main todos los días.
2. Cada cambio en su propia rama: `git checkout -b nombre-del-cambio`.
3. Subí la rama y abrí un PR a main (`gh pr create`). El otro lo revisa antes de unirlo.
4. Nadie sube directo a main (solo el bot). `catalog.json` e `img/j/` no se editan a mano.

Las reglas completas están en `CLAUDE.md` (las lee también Claude Code).
