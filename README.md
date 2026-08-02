# Portal Exógena DIAN 🇨🇴

Aplicación web para generar la **información exógena** que se reporta a la DIAN en Colombia, a partir del **balance de prueba con terceros** exportado por el programa contable (WorldOffice por ahora, con soporte para detectar otros).

## Stack

- **Backend**: Python + FastAPI + SQLAlchemy (SQLite en desarrollo, lista para PostgreSQL multiusuario)
- **Frontend**: Next.js + JavaScript
- **Base de terceros**: RUES / cámaras de comercio (datos.gov.co)

## Cómo funciona

1. **Superusuario** crea empresas; cada **usuario** ve solo las empresas que le asignan (multiusuario).
2. Se sube el **balance de prueba con terceros** (Excel de WorldOffice).
3. El sistema **valida**:
   - Cuadre: débitos = créditos y ACTIVO = PASIVO + PATRIMONIO + (INGRESOS − GASTOS − COSTOS).
   - **Cuentas que no cumplen su naturaleza contable** (las muestra primero en el dashboard).
   - Cuentas que no existen / mal ubicadas en el **PUC**.
   - Suma de los terceros vs saldo de la cuenta.
   - Terceros que no aparecen o están cancelados en la base RUES.
   - Cada error dice **qué pasó, dónde y qué hacer** (nada de "Error 501").
4. Se **generan los archivos XML** para la DIAN (formato 1001: Pagos y Retenciones, por ahora) según la estructura del anexo de la resolución (máx. 5.000 registros por archivo, ISO-8859-1, nombre `Dmuisca_...xml`).

## Estructura

```
exogena-app/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI
│   │   ├── models.py            # Base de datos (multiusuario: tenant_id)
│   │   ├── services/
│   │   │   ├── balance_importer.py   # Importador del balance WorldOffice
│   │   │   ├── validator.py          # Motor de validaciones
│   │   │   ├── puc_loader.py         # Carga del PUC (Decreto 2650/1993)
│   │   │   └── template_engine.py    # Generador de XML por formato
│   │   └── routers/             # API REST
│   ├── scripts/seed.py          # Arranque: PUC + empresa demo + balance de muestra
│   └── data/                    # SQLite + subidas
└── frontend/                    # Next.js (dashboard, empresas, subir, generar)
```

## Puesta en marcha

```bash
# Backend
cd backend
uv venv .venv
uv pip install --python .venv/Scripts/python.exe -r requirements.txt
.venv/Scripts/python.exe scripts/seed.py          # carga PUC + importa el balance demo
.venv/Scripts/python.exe -m uvicorn app.main:app --port 8000

# Frontend
cd frontend
npm install
npm run dev        # http://localhost:3000
```

## Documentación

Toda la documentación está en la carpeta **`docs/`** (índice en `docs/00-INDICE.md`):
arquitectura, base de datos, código explicado módulo por módulo, API, validaciones,
formatos DIAN, guía de uso e historial del proyecto.

## Cargar los terceros (cámaras de comercio / RUES)

```bash
cd backend
.venv/Scripts/python.exe scripts/cargar_terceros.py "C:\ruta\tus_terceros.txt"
# opción --limpiar para borrar los anteriores
```

## Probar (suite de pruebas)

```bash
cd backend
.venv/Scripts/python.exe -m pytest tests/ -q
```

## Pendiente / avisos importantes

- **Catálogo de conceptos**: las reglas de ejemplo del formato 1001 (conceptos 9001-9006) son **REEMPLAZABLES**: el catálogo oficial de la resolución está en las páginas escaneadas del PDF. La parametrización se hace en la tabla `template_rules` o vía plantilla Excel.
- **Resolución 000021/2026** (año gravable 2026): el PDF está escaneado, requiere OCR cuando se vaya a parametrizar.
- **Base RUES de 3 millones de terceros**: cargar el TXT completo en `third_parties` (script pendiente) y actualizarla con la API de datos.gov.co.
- **Autenticación**: aún no hay login (MVP); el modelo de usuarios (superuser/user) ya está en la base de datos.
- **PostgreSQL + RLS**: el modelo de datos ya lleva `tenant_id` en todas las tablas; la migración a PostgreSQL con Row-Level Security es directa.
