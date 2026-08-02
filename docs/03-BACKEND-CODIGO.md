# 🐍 El código del backend, explicado módulo por módulo

Este documento explica **cada archivo del backend** para que cualquier persona entienda el código con solo leerlo. Los archivos están en `backend/app/`.

---

## `database.py` — La conexión a la base de datos

```python
engine = create_engine(f"sqlite:///{DB_PATH}", ...)   # crea el motor de base de datos
SessionLocal = sessionmaker(bind=engine, ...)          # fábrica de "sesiones"
```

- **Motor (engine)**: la conexión a la base. Hoy apunta a `backend/data/exogena.db` (SQLite).
- **Sesión (session)**: cada operación usa una sesión; es como "una hoja de trabajo" con la base.
- **`get_db()`**: función que entrega una sesión a cada petición web y la cierra al terminar.
- **Para pasar a PostgreSQL**: solo se cambia la URL del motor. El resto del código no cambia.

---

## `models.py` — Las tablas (ver documento 02)

Define cada tabla como una clase Python. Cada atributo de la clase es una columna. Ejemplo:

```python
class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    ...
```

La clase `Base` es el "registro maestro" de todas las tablas. `Base.metadata.create_all(engine)` crea las tablas que falten.

---

## `services/puc_loader.py` — Carga el PUC

**Qué hace**: lee el catálogo del PUC (texto extraído del PDF del Decreto 2650/1993) y lo guarda en `puc_accounts`.

**Detalle técnico**: el texto alterna líneas de código y líneas de nombre, pero a veces un código no tiene nombre (línea en blanco). Por eso usa una **máquina de estados**:

```python
pendiente = None          # código esperando su nombre
for línea in líneas:
    if es_código(línea):
        pendiente = código # si había otro pendiente, se descarta (no tenía nombre)
    elif pendiente:
        guardar(pendiente, línea)   # el nombre empareja con el código pendiente
        pendiente = None
```

También maneja "código y nombre en la misma línea" (ej. `221001 a`) y salta páginas/encabezados.

**Naturaleza**: cada cuenta guarda `nature` según su clase (tabla `NAT`): clases 1,5,6,7,8 → débito; 2,3,4,9 → crédito.

---

## `services/balance_importer.py` — Importa el balance de WorldOffice

**Qué hace**: lee el Excel del balance y lo convierte en filas de la base.

**Las 3 formas de fila que entiende** (¡esto fue clave!):

| Tipo de fila | Ejemplo | Cómo se detecta |
|---|---|---|
| Cuenta (código y nombre en celdas separadas) | `11050501` \| `Caja general` | Col A = solo dígitos |
| Cuenta (código y nombre en UNA celda, celdas combinadas) | `14350101 MERCANCÍAS…` | Col A = dígitos + texto |
| Tercero | `INGIKDIONES ZURELA SAS` \| `NIT 098968020-5` | Col A = texto, col B = tipo + número |
| Total | `TOTAL ACTIVO …` | Col A empieza con "TOTAL" |

**Flujo del importador**:

```python
1. Buscar el encabezado ("Código Cuenta…")   → empieza a leer ahí
2. Leer el periodo y el NIT del bloque superior del Excel
3. Por cada fila:
   - TOTAL → capturar totales por clase (ACTIVO, PASIVO…) y asignar subtotales a las cuentas
   - Cuenta → guardar fila tipo "account", registrar en la "pila" de jerarquía
   - Tercero → calcular saldo_normalized y guardar fila tipo "thirdparty"
4. Guardar el balance con sus totales
```

**El saldo normalizado** (la idea central):

```python
si la clase es de DÉBITO:   saldo_normalizado = débitos − créditos
si la clase es de CRÉDITO:  saldo_normalizado = créditos − débitos
```

Si `saldo_normalized` es **negativo**, la cuenta va **contra su naturaleza** → el validador lo reporta.

**Validación de jerarquía en vivo**: mientras recorre las cuentas mantiene una pila de niveles; si una cuenta aparece bajo un grupo que no es el suyo (p. ej. `371005` bajo el grupo `34`), crea una incidencia `PUC_HIERARCHY`.

**Los subtotales `TOTAL`**: en WorldOffice el valor real de una cuenta está en la fila `TOTAL <nombre>` (la fila de la cuenta a veces viene vacía). El importador empareja cada `TOTAL` con la fila de cuenta que tiene el mismo nombre (normalizado) y solo asigna el valor si la fila aún está vacía (así el primer subtotal —el directo— gana sobre el agregado final).

---

## `services/validator.py` — El motor de validaciones

**Qué hace**: revisa el balance importado y guarda incidencias claras en `validation_issues`. Cada incidencia tiene `message` (qué pasó) y `action` (qué hacer).

**Las 6 validaciones**:

1. **CUADRE**: `|débitos − créditos| ≤ 1` y la ecuación ampliada
   `ACTIVO = PASIVO + PATRIMONIO + (INGRESOS − GASTOS − COSTOS)`.
2. **NATURALEZA**: por cada fila de tercero, si `saldo_normalized < 0` → incidencia. Pero **respeta excepciones** configuradas (cuentas contra-natura legítimas): `1592*` (depreciación), `310510/310515` (capital por suscribir DB), `240802*` (IVA descontable) y terceros con "impuestos y aduanas"/"dian" en el nombre.
3. **PUC**: cada cuenta del balance debe existir en el PUC (niveles 2 y 4 → error; 6 y 8 → aviso, porque pueden ser subcuentas internas). Si el PUC no está cargado, **omite** esta validación (para no generar falsas alarmas).
4. **SUMA DE TERCEROS**: la suma de los saldos de los terceros de una cuenta debe ser igual al saldo de la cuenta (tolerancia $1).
5. **TERCEROS RUES** (solo si hay terceros cargados): si un NIT/CC del balance no existe en `third_parties` → aviso "no aparece en cámaras de comercio"; si existe pero su estado no es ACTIVA → aviso "tercero cancelado". La búsqueda es **tolerante al dígito de verificación** (compara sin el último dígito si no hay coincidencia exacta).

**Mensajes claros**: todos se escriben en español de contador. Ejemplo:

> "La cuenta 14350101 (MERCANCÍAS NO FABRICADAS POR LA EMPRESA) tiene saldo -773.750.346,72 para el tercero IMDEGHUELES ATHINATY SAS, en contra de su naturaleza de débito."
> 👉 "Revise los movimientos de ese tercero en la cuenta: puede haber una transacción al revés, un saldo mal clasificado o un error de digitación."

---

## `services/template_engine.py` — Genera los XML de la DIAN

**Qué hace**: arma los archivos XML según la estructura del anexo de la resolución.

**La plantilla del formato 1001** (`FORMATO_1001`) define:
- `cab`: los 10 campos del encabezado (`Ano`, `CodCpt`, `Formato`, `Version`, `NumEnvio`, `FecEnvio`, `FecInicial`, `FecFinal`, `ValorTotal`, `CantReg`).
- `contenido`: los 20 campos del registro `pagos` (`cpt`, `tdoc`, `nid`, apellidos/nombres, `raz`, `dir`, `dpto`, `mun`, `pais`, y los valores `pago`, `pnded`, `ided`, `inded`, `retp`, `reta`, `comun`, `ndom`).

**Flujo de generación**:

```python
1. Leer las reglas de parametrización (template_rules) del formato
2. Por cada regla: filtrar los terceros del balance cuyo código de cuenta
   está en el rango de la regla → calcular el valor (saldo/débitos/créditos)
3. Agrupar por la llave única de la DIAN: (cpt + tdoc + nid) sumando valores
4. Partir en archivos de máximo 5.000 registros (exigencia de la DIAN)
5. Por cada archivo: calcular ValorTotal y CantReg, armar el XML con
   raíz <mas>, encabezado <Cab> y registros <pagos>
6. Nombre: Dmuisca_ccmmmmmvvaaaacccccccc.xml  (ej. Dmuisca_010100111202500000001.xml)
7. Guardar en generated_files (codificado ISO-8859-1, como exige la DIAN)
```

**Separación de nombres**: si el tercero es persona natural (CC/CE), el nombre se parte en apellido1, apellido2, nombre1, nombre2; si es jurídico, va en `raz`.

**⚠️ Los conceptos (`cpt`) actuales son de EJEMPLO** (9001-9006). El catálogo oficial de la resolución está en las páginas escaneadas del PDF; se cargan como reglas en `template_rules` sin tocar el código.

---

## `routers/` — Los servicios web (API)

Cada archivo expone rutas HTTP (ver documento 04):

- `companies.py` → `/api/companies` (crear y listar empresas)
- `balances.py` → subir balance, dashboard, incidencias
- `generate.py` → generar y descargar XML
- `puc.py` → buscar cuentas del PUC

---

## `main.py` — El punto de entrada

```python
app = FastAPI(title="Portal Exógena DIAN")     # crea la aplicación
app.add_middleware(CORSMiddleware, ...)         # permite que el frontend la llame
app.include_router(companies.router)            # registra las rutas
Base.metadata.create_all(bind=engine)           # crea las tablas si faltan
```

Se arranca con: `uvicorn app.main:app --port 8000`

---

## `scripts/seed.py` — Arranque inicial

Crea la base desde cero y carga: PUC, empresa demo, usuarios, reglas de ejemplo del formato 1001, e importa + valida el balance de muestra. Ver documento 09 para los comandos.

## `scripts/cargar_terceros.py` — Carga de terceros RUES

Ver documento 08.
