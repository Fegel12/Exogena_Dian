# 👥 Terceros RUES (cámaras de comercio) — cómo cargarlos

## De dónde salen los terceros

La base de terceros viene del portal de datos abiertos de Colombia (**datos.gov.co**): el registro empresarial de las cámaras de comercio (RUES). El usuario tiene el archivo **TXT (~3 millones de registros)** descargado de ese portal.

Ese TXT es un CSV con comillas (~36 columnas) con: cámara, matrícula, razón social (y apellidos/nombres), tipo de documento, número de identificación, actividades CIIU, fechas, tipo de sociedad y **estado** (ACTIVA / CANCELADA / MATRÍCULA CANCELADA LEY 1429).

## Cómo cargarlo (1 comando)

```bash
cd C:\Users\egelv\exogena-app\backend

# Carga normal (agrega a lo que haya)
.venv\Scripts\python.exe scripts/cargar_terceros.py "C:\ruta\terceros.txt"

# Si quieres borrar los terceros anteriores y cargar de cero
.venv\Scripts\python.exe scripts/cargar_terceros.py "C:\ruta\terceros.txt" --limpiar
```

### Carga real realizada (26-ene-2026)

El archivo real del portal (`Personas_Naturales,_Personas_Jurídicas_y_Entidades_Sin_Animo_de_Lucro_20260126-1.txt`, **3,15 GB**) fue cargado completo:

- **7.919.810 terceros únicos** cargados (1.205.125 duplicados omitidos — el RUES repite el mismo NIT en varias matrículas).
- La base quedó en **~1,2 GB** y las búsquedas tardan **menos de medio segundo**.
- Tiempo total de carga: unos 7 minutos.

## Cómo funciona el cargador (a prueba de cambios)

El archivo trae un **encabezado con nombres de columna** (`codigo_camara`, `razon_social`, `numero_identificacion`, `estado_matricula`…). El cargador **mapea las columnas por su nombre**, así que si la DIAN cambia el orden de las columnas en una próxima versión del archivo, el cargador sigue funcionando. Si el archivo no trae encabezado, usa las posiciones conocidas del formato oficial.

Detalles importantes:
- `numero_identificacion` **no incluye el dígito de verificación** (va en una columna aparte); se guarda sin DV y la validación lo tolera del lado del balance.
- Los tipos de documento se traducen: "NIT"→NIT, "CEDULA DE CIUDADANIA"→CC, "CEDULA DE EXTRANJERIA"→CE, "PASAPORTE"→PA, "TARJETA DE IDENTIDAD"→TI.
- Si el mismo número aparece varias veces, se guarda **una sola vez**; si alguna matrícula del mismo número está ACTIVA, se prefiere ese estado.
- Carga en lotes con modo WAL de SQLite para velocidad.

## Archivo de muestra

`backend/scripts/cargar_terceros.py`:
1. Lee el TXT línea por línea con el módulo `csv` (maneja comas dentro de comillas).
2. Detecta y salta el encabezado si existe.
3. Traduce el tipo de documento: "NIT"→NIT, "CEDULA DE CIUDADANIA"→CC, "CEDULA DE EXTRANJERIA"→CE, "PASAPORTE"→PA, "TARJETA DE IDENTIDAD"→TI.
4. Guarda solo el número (dígitos), el nombre, la cámara, la matrícula, el estado y los CIIU.
5. **Omite duplicados** (mismo tipo + número ya visto).
6. Guarda en la tabla `third_parties` (índice por `doc_number` para búsquedas rápidas).

## Archivo de muestra

Para probar sin el archivo grande, hay una muestra en `backend/data/terceros_muestra.txt` (16 registros reales del portal):

```bash
.venv\Scripts\python.exe scripts/cargar_terceros.py "data\terceros_muestra.txt"
```

## Actualización periódica (la API de datos.gov.co)

El portal también ofrece una **API** que por defecto trae solo los primeros 1.000 registros. El portal incluye instrucciones para traer más (paginación). La idea a futuro:
- Carga inicial completa con el TXT.
- Actualizaciones periódicas (mensuales o al cambiar la resolución) vía API, usando la paginación documentada.
- Así la base de terceros siempre está al día sin descargar los 3 millones cada vez.

## Cómo se usan en las validaciones

Cuando `third_parties` tiene datos, el validador avisa si un tercero del balance:
- **no aparece** en la base → `THIRD_PARTY_NOT_FOUND` ("verifique si el NIT está bien digitado o si el tercero está registrado en el RUES"),
- **está cancelado** (estado distinto de ACTIVA) → `THIRD_PARTY_CANCELLED`.

> Nota: el balance de muestra actual tiene nombres/NIT **anonimizados**, por lo que la mayoría de los terceros no coincidirán con la base real. Con balances reales la validación funciona de inmediato.
