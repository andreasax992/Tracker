# Mi Tracker (versión 6 · datos protegidos)

Hábitos, asistencia, horario, calendario, tareas, diario e informes en una web sin servidor.

## Estructura (sube TODO el contenido a GitHub, con las carpetas)
```
index.html · sw.js · manifest.webmanifest · icon.svg · icon-192.png · icon-512.png
css/styles.css
js/core.js  js/extra.js  js/ui.js  js/i18n.js
```
Para actualizar una versión anterior: sustituye todos los archivos (sobre todo `index.html`, `css/styles.css`, `js/ui.js`, `js/extra.js`, `js/i18n.js` y `sw.js`) y recarga. Tus datos no se tocan (viven en el navegador).
Si en el iPhone sigue saliendo la versión antigua: cierra la app, ábrela de nuevo y recarga una vez (el `sw.js` nuevo limpia la caché anterior).

## Bloque E · temas, repasos y repertorio
- **Estudio** tiene ahora tres subpestañas: Sesiones, Temas y repasos, Repertorio.
- **Temas y repasos**: apunta lo que estudias y la app programa los repasos a 1, 3, 7, 14, 30, 60 y 120 días. «Bien» avanza, «Regular» repite con la mitad de espera y «Mal» vuelve al principio. Lo que toca aparece en Hoy («Repasos de hoy»).
- **Repertorio**: piezas con estado, tempo objetivo y fecha de actuación. Al registrar una sesión puedes elegir la pieza y el tempo alcanzado; se ve el tiempo dedicado y la evolución del tempo.
- Formato de datos versión 5 (migración automática).

## Bloque D · proyectos y objetivos
- Nueva sección **Proyectos** (en «Más»): proyectos con fecha límite y objetivos medibles. Un objetivo puede medirse con horas de trabajo (las que ya apuntas a mano y en sesiones, de una asignatura o de un hábito), con las tareas hechas del proyecto, o a mano.
- Las tareas tienen un campo opcional «Proyecto». Borrar un proyecto borra sus objetivos pero conserva sus tareas, y antes guarda una copia recuperable.
- Formato de datos versión 4 (migración automática). Los proyectos y objetivos guardan su fecha de modificación.

## Bloque C · sesiones de estudio
- Nueva sección **Estudio** (en «Más») y grupo «Sesiones de estudio y práctica» en Hoy. Cada sesión (fecha, minutos, asignatura o hábito de práctica, tipo, objetivo y notas) se apunta una vez y suma a las horas de la asignatura o a los minutos del hábito de ese día.
- Lo que ya apuntabas a mano no se toca ni se convierte; se suma a lo manual. Las clases (asistencia) siguen separadas.
- Los instrumentos son tus hábitos de práctica con unidad en minutos u horas; desde el formulario puedes crear uno nuevo.
- El formato de datos pasa a la versión 3 (migración automática con copia previa).

## Cambios de la versión 6 (bloques A y B)
- **Datos protegidos**: una carga fallida nunca sobrescribe tus datos (modo recuperación); versión del formato con migraciones; copias internas recuperables (diarias y antes de importar, restaurar o borrar); importación con validación, vista previa y opción de importar solo una parte; aviso y recordatorio de copia; errores de almacenamiento visibles.
- **Pruebas**: carpeta `tests/`. Para ejecutarlas: `npm install` y `npm test` (no hace falta subirla a GitHub Pages).
- Archivos nuevos: `js/storage.js`, `js/backup.js`, `package.json`, `tests/`. Actualiza también `index.html`, `sw.js`, `js/ui.js`, `js/extra.js`, `js/core.js`, `css/styles.css`.
- Tus datos actuales se conservan: misma clave de almacenamiento y mismo campo `v:1`. Al abrir la v6 por primera vez se guarda una copia del formato anterior antes de migrar.

## Cambios de la versión 5
- Horario en cuadrícula legible en el móvil: columnas anchas (se desliza en horizontal), columna de horas fija, texto más grande, atajos para saltar a cada día y ajustes de ancho de columna y alto de hora (⚙ «Qué se ve en el horario»).

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
