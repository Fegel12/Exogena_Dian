# ✅ Las validaciones contables (el corazón del sistema)

El motor de validaciones (`backend/app/services/validator.py`) revisa el balance importado y produce **incidencias claras**: cada una dice *qué pasó*, *dónde* y *qué hacer*. No hay códigos de error genéricos tipo "Error 501".

## Las 6 validaciones

### 1. Cuadre del balance
- **Débitos = Créditos** (diferencia ≤ $1).
- **Ecuación contable ampliada**: `ACTIVO = PASIVO + PATRIMONIO + (INGRESOS − GASTOS − COSTOS)`.
- En el balance de muestra: ✅ ambas pasan con diferencia **$0,00**.

### 2. Cuentas que no cumplen su naturaleza (se muestran PRIMERO en el dashboard)
El saldo de cada cuenta se normaliza según su clase:
- Clases 1, 5, 6, 7, 8 (débito): `saldo = débitos − créditos`
- Clases 2, 3, 4, 9 (crédito): `saldo = créditos − débitos`

Si el resultado es negativo → la cuenta va **contra su naturaleza** → incidencia de error.

**Excepciones configuradas** (cuentas que legítimamente pueden verse negativas):
| Cuenta(s) | Por qué |
|---|---|
| `1592*` | Depreciación acumulada (contra-cuenta del activo) |
| `310510`, `310515` | Capital por suscribir / por cobrar (DB) |
| `240802*` | IVA descontable (por convención del programa) |
| Terceros DIAN | Filas de compensación de retenciones/IVA |

**Resultado en el balance de muestra**: 28 violaciones reales, encabezadas por los **inventarios `143501xx` (−$961 millones)** — el famoso caso del tercero "la propia empresa" que hay que revisar en el cierre.

### 3. Cuentas contra el PUC
- Grupo (2 dígitos) y cuenta (4 dígitos) que no existen en el PUC → **error**.
- Subcuenta (6) o auxiliar (8) fuera del PUC → **aviso** (pueden ser cuentas internas del programa contable, legales con tabla de equivalencias).
- Si el PUC no está cargado, esta validación se omite (evita falsas alarmas).

### 4. Jerarquía del balance vs PUC
Si una cuenta aparece bajo un grupo que no es el suyo (p. ej. `371005` Pérdidas acumuladas bajo el grupo `34` Revalorización), se reporta. Es el problema de "los programas no suman los grupos según la estructura del balance" que mencionó el usuario.

### 5. Suma de terceros vs saldo de la cuenta
Para cada cuenta con desglose por terceros: `Σ saldos de los terceros = saldo de la cuenta` (tolerancia $1). Así se detecta que falta un tercero, sobra uno, o hay movimientos sin tercero.

### 6. Terceros contra la base RUES (cámaras de comercio)
Solo se activa cuando hay terceros cargados (`third_parties`):
- Tercero del balance que **no existe** en la base → aviso "verifique si el NIT está bien digitado".
- Tercero con estado **diferente de ACTIVA** → aviso "tercero cancelado".
- La búsqueda es tolerante al **dígito de verificación** del NIT.

## Tipos de incidencia

| Tipo | Severidad | Significado |
|---|---|---|
| `CUADRE` | error | El balance no cuadra |
| `NATURE_VIOLATION` | error | Cuenta con saldo contra su naturaleza |
| `PUC_HIERARCHY` | error | Cuenta bajo el grupo equivocado |
| `PUC_MISSING` | error/aviso | Cuenta que no está en el PUC |
| `THIRD_PARTY_SUM` | error | La suma de terceros no cuadra con la cuenta |
| `THIRD_PARTY_NOT_FOUND` | aviso | Tercero que no aparece en cámaras de comercio |
| `THIRD_PARTY_CANCELLED` | aviso | Tercero con matrícula cancelada |

## Cómo se prueban

`backend/tests/test_smoke.py` verifica automáticamente que:
- el PUC cargue (2.658 cuentas),
- el balance importe y cuadre,
- haya exactamente 28 violaciones de naturaleza (coincide con el análisis manual),
- no haya falsos positivos de cuadre/PUC/suma de terceros,
- todos los errores tengan su "qué hacer",
- el XML del formato 1001 se genere con la estructura correcta,
- la API responda.

Ejecutar: `cd backend && .venv/Scripts/python.exe -m pytest tests/ -q`
