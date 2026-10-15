# Mi Tracker (versión 3)

Hábitos, asistencia a clase, horario, calendario, tareas, diario de estudio e informes en una web sin servidor.

## Estructura (sube la carpeta entera a GitHub)
```
index.html            ← la página
css/styles.css        ← estilos
js/core.js            ← cálculos, datos y reglas (lo que no se ve)
js/extra.js           ← calendario, diario, informe, cronómetro, seguridad…
js/ui.js              ← pantallas principales
js/i18n.js            ← traducción al gallego
manifest.webmanifest, sw.js, icon*.png/svg   ← instalar como app y usar sin conexión
```

## Publicarla en GitHub Pages
1. Crea un repositorio en github.com (p. ej. `mi-tracker`).
2. «Add file → Upload files» y arrastra **todo el contenido** de la carpeta (con `css/` y `js/`).
3. **Settings → Pages → Deploy from a branch → `main` / `/ (root)`** → Save.
4. Abre `https://TU-USUARIO.github.io/mi-tracker/` y, en el móvil, «Añadir a pantalla de inicio».
5. Para actualizar: sustituye los archivos y cambia `VERSION` en `sw.js`.

## Tus datos
- Viven **solo en el navegador** (localStorage + copia redundante en IndexedDB). No hay sincronización entre móvil y ordenador: usa **Datos → Exportar copia (JSON)** e **Importar copia**.
- **No subas nunca tu copia JSON a un repositorio público.**
- El PIN impide que otra persona abra la app en ese dispositivo, pero **no cifra** los datos ni las copias.
- Los datos de la versión anterior se migran solos si abres esta en el mismo navegador y dirección.

## Qué no incluye (necesita un servicio externo)
Sincronizar móvil y ordenador, avisos con la app cerrada e importar el Excel directamente (el registro sí se puede importar en CSV).
