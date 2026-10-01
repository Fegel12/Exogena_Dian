# ESTADO Y PENDIENTES — 15 sep 2026

## Contexto (por si se retoma en un chat nuevo)
- El chat largo del proyecto (sesión 20260801) quedó SATURADO (~168k tokens de contexto):
  las respuestas tardan y salen "Request timed out". Usar chat nuevo o `/compact`.
- Modelo de Hermes: por defecto ahora **deepseek-v4-pro** vía proveedor **deepseek**
  (configurado y probado). Alias rápido: `/model pro`. NO usar la ruta Alibaba (clave eliminada).

## Estado de la app (exogena-app)
- Backend `C:\Users\egelv\exogena-app\backend` (FastAPI, puerto 8000) — 7.919.810 terceros RUES cargados.
- Frontend `frontend` (Next.js, puerto 3000) — dashboard, subir, parametrizar, generar (XML+Excel).
- Pruebas backend: 12/12 ✅. Docs completos en `docs/00..10`.

## Login OAuth — LO QUE FALTA (único pendiente grande)
1. `frontend/.env.local` tiene 6 valores de RELLENO (TU_CLI..., xxx) para Google/Microsoft/Apple.
   → Reemplazar con credenciales REALES (el código las detecta solo y activa los botones).
2. Google (el más fácil): console.cloud.google.com → Nuevo proyecto → "OAuth 2.0 Client ID" (tipo Web)
   → Redirect URI: `http://localhost:3000/api/auth/callback/google`
   → AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET
3. Microsoft: portal.azure.com → App registrations → Redirect `http://localhost:3000/api/auth/callback/microsoft-entra-id`
4. Apple: developer.apple.com → Sign in with Apple (más complejo, dejar para el final).
5. Hecho previo: lib/auth.js, ruta `/api/auth/[...nextauth]`, página `/login`, middleware desactivado
   a propósito (se activa al configurar OAuth: middleware.js.disabled → middleware.js).

## Otras tareas menores
- Botón "Subir" desde Google Drive / OneDrive / Apple (subida desde nube) — pendiente opcional.
- Revisar aviso de Excel/XML del formato 1001 con datos reales (ya genera ambos).
