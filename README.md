# Mi Tracker (versión 4 · optimizada para iPhone)

Hábitos, asistencia, horario, calendario, tareas, diario e informes en una web sin servidor.

## Estructura (sube TODO el contenido a GitHub, con las carpetas)
```
index.html · sw.js · manifest.webmanifest · icon.svg · icon-192.png · icon-512.png
css/styles.css
js/core.js  js/extra.js  js/ui.js  js/i18n.js
```
Para actualizar una versión anterior: sustituye todos los archivos (sobre todo `index.html`, `css/styles.css`, `js/ui.js`, `js/extra.js`, `js/i18n.js` y `sw.js`) y recarga. Tus datos no se tocan (viven en el navegador).
Si en el iPhone sigue saliendo la versión antigua: cierra la app, ábrela de nuevo y recarga una vez (el `sw.js` nuevo limpia la caché anterior).

## Cambios de la versión 4
- Inicio: sin el texto de seguimiento; fecha visible, editable y con flechas.
- Cronómetro eliminado de la interfaz (tus datos antiguos no se pierden).
- Registro de hábitos en grupos desplegables independientes (se recuerda cuáles abres o cierras).
- Selectores de fecha y hora en hoja con Aceptar / Cancelar (ya no se cierran solos).
- Navegación: barra inferior fija en móvil (Hoy, Horario, Tareas, Dashboard, Más) y menú superior en ordenador.
- iPhone: áreas seguras e indicador inferior, sin scrolls anidados ni scroll horizontal, campos de 16 px (sin zoom), sin bloquear gestos del sistema.
- Diseño móvil renovado: controles de 44 px, tablas como tarjetas, calendario compacto, hojas inferiores.

## Tus datos
Viven solo en el navegador. Haz copias desde «Datos». No subas nunca tu copia JSON a un repositorio público.
