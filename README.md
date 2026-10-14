# Mi Tracker

Hábitos, asistencia a clase, horario, tareas y estudio en una sola página, sin servidor.

## Archivos (súbelos todos al repositorio)
- `index.html` — la aplicación (lo único imprescindible)
- `manifest.webmanifest`, `sw.js`, `icon.svg`, `icon-192.png`, `icon-512.png` — para instalarla como app y usarla sin conexión

## Publicarla en GitHub Pages
1. Crea un repositorio en github.com (por ejemplo `mi-tracker`).
2. «Add file → Upload files» y sube todos los archivos de arriba.
3. **Settings → Pages → Deploy from a branch → `main` / `/ (root)`** → Save.
4. Abre `https://TU-USUARIO.github.io/mi-tracker/`.
   - Móvil: menú del navegador → «Añadir a pantalla de inicio» / «Instalar app».
5. Para actualizar: sube el `index.html` nuevo (sustituye al anterior). Tus datos no se tocan porque viven en el navegador.
   Si cambias `index.html`, cambia también `VERSION` en `sw.js` para que el móvil descargue la versión nueva.

## Tus datos
- Se guardan **solo en el navegador** donde la uses. Móvil y ordenador **no se sincronizan**: usa **Datos → Exportar copia (JSON)** e **Importar copia**.
- **No subas nunca tu copia JSON al repositorio** si es público.
- La versión nueva lee tus datos de la anterior (se migran solos) si la abres en el mismo navegador y dirección.

## Novedades
- Asistencia a clase en «Hoy» (asistí / no asistí / no hubo clase / falta justificada); las asistidas suman a tus horas de estudio.
- «Qué se ve en el horario»: eliges los campos de la cuadrícula; vista en lista para móvil; exportar a calendario (.ics).
- Plan de estudio sugerido, resumen semanal, deshacer/rehacer (Ctrl+Z), búsqueda, importar registro CSV, instalación y uso sin conexión.
