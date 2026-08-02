# 📜 Historial del proyecto

Cronología de todo lo realizado (agosto de 2026).

## Fase 1 — Análisis (sin construir)

1. **Reunión de requerimientos**: el usuario explicó el proyecto: aplicación web para la información exógena de la DIAN a partir del balance de prueba con terceros; el mayor problema es la consulta/validación de terceros; se parametrizan todos los formatos; errores claros (nada de "Error 501").

2. **Archivos recibidos**:
   - `2025 12 Balance prueba CON TERCEROS_1.xlsx` — balance de WorldOffice con terceros (anónimo).
   - `Logica contable.xlsx` y `Logica contable_celdas.xlsx` — reglas de naturaleza y niveles.
   - `PUC.pdf` — Decreto 2650/1993 (catálogo completo).
   - `Resolución 000233 de 30-10-2025.pdf` — compendio de anexos (en realidad Resolución 000227).
   - `Resolución 000021 de 17-07-2026.pdf` — la del año 2026 (escaneada).
   - Muestra del TXT de terceros RUES (datos.gov.co).

3. **Análisis del balance**: estructura de 6 columnas, jerarquía por niveles, celdas combinadas (código+nombre), signo por naturaleza de clase, cuadre verificado (débitos=créditos=$22.985M; ACTIVO=PASIVO+PATRIMONIO+Utilidad). Se detectaron cuentas negativas y se clasificaron (legítimas / convención / errores reales como inventarios −$961M).

4. **Análisis de la resolución 2025**: ¡los formatos 2276-2279 desaparecieron! Nueva numeración (1001, 1005, 1647, 2821-2856, 5247-5252) y **todo en XML+XSD** (fin del archivo plano). Se extrajo el texto completo (201 páginas) con las especificaciones técnicas y los XSD.

5. **Análisis del TXT RUES**: estructura de ~36 columnas descifrada (cámara, matrícula, razón social, tipo doc, número, CIIU, fechas, tipo sociedad, estado, representante).

## Fase 2 — Construcción (MVP)

6. **Backend (Python + FastAPI)** en `C:\Users\egelv\exogena-app\backend`:
   - Modelos de datos con `tenant_id` (multiusuario) — `models.py`.
   - Cargador del PUC — `services/puc_loader.py` (2.658 cuentas).
   - Importador del balance WorldOffice — `services/balance_importer.py`.
   - Motor de validaciones con mensajes claros — `services/validator.py`.
   - Generador XML formato 1001 — `services/template_engine.py`.
   - API REST — `routers/` + `main.py`.
   - Arranque — `scripts/seed.py`.

7. **Frontend (Next.js + JavaScript)** en `C:\Users\egelv\exogena-app\frontend`:
   - Páginas: portada, Empresas (superusuario), Dashboard (totales + cuadre + incidencias con naturaleza primero), Subir balance, Generar XML.

8. **Correcciones durante el desarrollo** (detectadas con datos reales):
   - Celdas combinadas del WorldOffice → el importador entiende "código+número en una celda".
   - Los totales reales de las cuentas están en las filas `TOTAL` → se asignan por nombre (primer subtotal gana).
   - El PUC tenía códigos repetidos/sin nombre → máquina de estados en el cargador.
   - El validador generaba falsas alarmas de PUC si el catálogo no estaba cargado → ahora lo omite.

9. **Verificación**: script ad-hoc 25/25 y suite **pytest 10/10** (`backend/tests/test_smoke.py`).

10. **Cargador de terceros RUES** — `scripts/cargar_terceros.py` (probado con muestra de 16 registros) + búsqueda tolerante al dígito de verificación en el validador.

11. **Documentación completa** — carpeta `docs/` (este índice + 10 documentos).

## Pendiente (próximas fases)

- [ ] Cargar los 3 millones de terceros (comando listo: `cargar_terceros.py`).
- [ ] Catálogo oficial de conceptos (OCR de las páginas escaneadas de la resolución) para reemplazar los de ejemplo.
- [ ] Plantilla Excel de parametrización (cargar reglas sin tocar la base).
- [ ] OCR de la Resolución 000021/2026 para parametrizar el año gravable 2026.
- [ ] Login real (usuario/contraseña) con roles superuser/user.
- [ ] Migración a PostgreSQL con Row-Level Security.
- [ ] Actualización periódica de terceros vía API de datos.gov.co (paginación).
- [ ] Generadores para los demás formatos (1005, 1647, 5247-5252…).
- [ ] Validación de los XML contra los XSD oficiales antes de descargar.
