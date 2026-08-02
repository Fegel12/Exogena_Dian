# 🖥️ El frontend (Next.js) explicado

El frontend está en `frontend/`. Es una aplicación Next.js (App Router) con páginas en `frontend/app/`.

## Cómo se conecta con el backend

`frontend/lib/api.js` define funciones sencillas:

```js
export const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

apiGet(path)      // GET  → devuelve JSON
apiPost(path, obj) // POST con JSON
apiUpload(path, file) // POST con archivo (subir balance)
formatoCOP(valor) // formatea números como $ 1.234.567
```

Todas las páginas usan estas funciones; si algún día el backend cambia de dirección, solo se cambia `NEXT_PUBLIC_API_URL`.

## Las páginas

### `/` (app/page.js) — Portada
Menú con tarjetas que enlazan a las 4 secciones. Es un componente de servidor (no hace llamadas al backend).

### `/empresas` (app/empresas/page.js) — Empresas (superusuario)
- Componente de cliente (`"use client"`).
- Al abrir, pide la lista de empresas (`GET /api/companies`) y la muestra en una tabla.
- Un formulario crea empresas nuevas (`POST /api/companies`) con nombre y NIT.
- Cada fila enlaza al dashboard de esa empresa.

### `/dashboard?empresa=1` (app/dashboard/page.js) — El tablero principal
- Componente de cliente. Lee `?empresa=` de la URL (por eso está envuelto en `<Suspense>`, requisito de Next.js 16).
- Selector de empresa; al cambiar, consulta `GET /api/companies/{id}/dashboard`.
- Muestra, en orden:
  1. **Tarjetas de totales**: Activo, Pasivo, Patrimonio, Ingresos, Gastos, Costos.
  2. **Insignias de cuadre**: ✅/❌ "Débitos = Créditos" y "Activo = Pasivo + Patrimonio + Utilidad".
  3. **Resumen por tipo de incidencia** (chips de colores).
  4. **Tabla de incidencias**: el backend ya las ordena con las de **naturaleza primero** (como pediste). Cada fila muestra tipo, cuenta, tercero, monto, y los dos textos: *qué pasó* y 👉 *qué hacer*.

### `/subir` (app/subir/page.js) — Subir balance
- Selector de empresa + selector de archivo Excel + botón.
- Llama a `POST /api/companies/{id}/balances` con el archivo.
- Muestra el resultado: id del balance, periodo, y el resumen de incidencias (errores/advertencias) con enlace al dashboard.

### `/generar` (app/generar/page.js) — Generar archivos DIAN
- Botón "Generar formato 1001" → `POST /api/companies/{id}/generate?formato=1001`.
- Lista los archivos generados (`GET /api/companies/{id}/files`) con enlace de descarga a `GET /api/files/{id}/download`.
- Avisa que las reglas actuales usan conceptos de ejemplo.

## Notas de Next.js 16

- Esta versión tiene cambios frente a versiones anteriores (el propio andamiaje lo avisa en `AGENTS.md`).
- `useSearchParams` (leer parámetros de la URL) **requiere** estar dentro de un `<Suspense>` — por eso el dashboard tiene esa estructura.
- `"use client"` marca los componentes que corren en el navegador (los que usan `useState`/`useEffect`).

## Estilos

Los estilos son en línea (objetos `style`) más `app/globals.css` para lo global. Es un diseño simple y claro, sin librerías externas de UI, para que sea fácil de mantener.
