# 📚 Documentación del Portal Exógena DIAN

Bienvenido a la documentación. Aquí está todo lo que se ha realizado y cómo entender el código.

## Índice

| Documento | Contenido |
|---|---|
| [01-ARQUITECTURA.md](01-ARQUITECTURA.md) | Cómo está organizado el sistema y cómo fluyen los datos |
| [02-BASE-DE-DATOS.md](02-BASE-DE-DATOS.md) | Las tablas de la base de datos, campo por campo |
| [03-BACKEND-CODIGO.md](03-BACKEND-CODIGO.md) | Explicación del código del backend (módulo por módulo) |
| [04-API-REFERENCIA.md](04-API-REFERENCIA.md) | Todos los servicios web (API) disponibles |
| [05-FRONTEND.md](05-FRONTEND.md) | Las páginas web (Next.js) y cómo funcionan |
| [06-FORMATOS-DIAN.md](06-FORMATOS-DIAN.md) | Cómo se generan los archivos XML para la DIAN |
| [07-VALIDACIONES.md](07-VALIDACIONES.md) | Las reglas de validación contable (cuadre, naturaleza, PUC, terceros) |
| [08-TERCEROS-RUES.md](08-TERCEROS-RUES.md) | Cómo cargar los 3 millones de terceros de cámaras de comercio |
| [09-GUIA-DE-USO.md](09-GUIA-DE-USO.md) | Guía paso a paso para usar el programa |
| [10-HISTORIAL.md](10-HISTORIAL.md) | Cronología de todo lo realizado |

## Resumen rápido

- **¿Qué es?** Una aplicación web para generar la **información exógena** (medios magnéticos/XML) que las empresas colombianas reportan cada año a la **DIAN**, partiendo del **balance de prueba con terceros**.
- **¿Qué hace?** 1) Importa el balance de WorldOffice · 2) Valida la contabilidad (cuadre, cuentas contra su naturaleza, PUC, terceros) · 3) Genera los archivos XML según la resolución vigente · 4) Todo con errores claros que dicen qué pasó y qué hacer.
- **¿Con qué está hecho?** Backend en **Python (FastAPI)** · Frontend en **Next.js (JavaScript)** · Base de datos **SQLite** (lista para PostgreSQL).
- **¿Dónde está?** `C:\Users\egelv\exogena-app\`
