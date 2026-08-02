# 🏗️ Arquitectura del sistema

## Visión general

El Portal Exógena DIAN es una aplicación **cliente-servidor** con dos partes:

```
┌─────────────────────┐        ┌──────────────────────┐        ┌─────────────┐
│  Frontend (Next.js) │  HTTP  │  Backend (FastAPI)   │  SQL   │  Base de    │
│  http://localhost:3000 ─────► │  http://localhost:8000 ─────► │  datos      │
│  - Dashboard        │  JSON  │  - Importador        │        │  (SQLite)   │
│  - Empresas         │        │  - Validador         │        │             │
│  - Subir balance    │        │  - Generador XML     │        │             │
│  - Generar archivos │        │  - API REST          │        │             │
└─────────────────────┘        └──────────────────────┘        └─────────────┘
```

- **Frontend** (carpeta `frontend/`): páginas web que el usuario ve en el navegador. Llama al backend por HTTP.
- **Backend** (carpeta `backend/`): el "cerebro". Recibe los archivos, los procesa y devuelve resultados.
- **Base de datos**: guarda empresas, balances, cuentas PUC, terceros, incidencias y archivos generados.

## Diseño multiusuario (multiempresa)

El sistema fue pensado para un **superusuario** que administra **varias empresas**, y **usuarios** que solo ven las empresas que se les asignan.

- Toda tabla de negocio tiene la columna `tenant_id` (el id de la empresa).
- El superusuario ve todas las empresas; un usuario normal solo ve las suyas (el filtro por `tenant_id`).
- En la base de datos de desarrollo (SQLite) esto es un simple filtro; cuando se pase a **PostgreSQL** se activará **Row-Level Security (RLS)**, que es el mecanismo de seguridad que garantiza que un error de programación nunca mezcle los datos de dos empresas. (Ver el documento previo "Arquitectura Multiinquilino" en la carpeta Insumos del usuario.)

## Flujo de datos (de principio a fin)

1. **Superusuario crea la empresa** → queda una fila en la tabla `tenants`.
2. **El usuario sube el balance de prueba** (Excel de WorldOffice) por la página "Subir balance".
3. **El importador** (`balance_importer.py`) lee el Excel:
   - Detecta el encabezado, el periodo (año) y el NIT de la empresa.
   - Recorre las filas: cuentas (por niveles de dígitos) y terceros.
   - Calcula el **saldo normalizado** según la naturaleza de la clase (débito/crédito).
   - Guarda todo en `balance_rows` y los totales en `balances`.
4. **El validador** (`validator.py`) revisa y guarda incidencias en `validation_issues`:
   - Cuadre (débitos = créditos y ecuación contable).
   - Cuentas con saldo contra su naturaleza (con lista de excepciones).
   - Cuentas que no existen o están mal ubicadas en el PUC.
   - Suma de terceros vs saldo de la cuenta.
   - Terceros que no existen o están cancelados (contra la base RUES).
5. **El dashboard** muestra los totales, el cuadre y las incidencias (primero las de naturaleza).
6. **El generador** (`template_engine.py`) arma los XML de la DIAN según la plantilla del formato (p. ej. 1001) y las reglas de parametrización (`template_rules`).
7. **El usuario descarga** el XML y lo sube a la DIAN.

## Estructura de carpetas

```
exogena-app/
├── backend/                  # Python + FastAPI
│   ├── app/
│   │   ├── main.py           # Punto de entrada (arranca la API)
│   │   ├── database.py       # Conexión a la base de datos
│   │   ├── models.py         # Tablas de la base de datos
│   │   ├── services/         # La lógica de negocio
│   │   │   ├── puc_loader.py        # Carga el PUC
│   │   │   ├── balance_importer.py  # Importa el balance
│   │   │   ├── validator.py         # Valida
│   │   │   └── template_engine.py   # Genera XML
│   │   └── routers/          # Servicios web (API)
│   ├── scripts/              # Programas de mantenimiento
│   │   ├── seed.py                 # Arranque inicial
│   │   └── cargar_terceros.py      # Carga los terceros RUES
│   ├── tests/                # Pruebas automáticas (pytest)
│   ├── data/                 # Base SQLite, PUC, terceros de muestra
│   └── requirements*.txt     # Dependencias
├── frontend/                 # Next.js
│   ├── app/                  # Páginas (dashboard, empresas, subir, generar)
│   └── lib/api.js            # Cómo hablar con el backend
├── docs/                     # Esta documentación
└── README.md                 # Resumen general
```
