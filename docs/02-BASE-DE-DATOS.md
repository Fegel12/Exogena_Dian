# 🗄️ Base de datos

Todas las tablas viven en `backend/app/models.py`. Usa **SQLAlchemy** (un "traductor" que permite cambiar de base de datos sin tocar el código: hoy SQLite, mañana PostgreSQL).

## Tablas

### `tenants` — Las empresas
| Campo | Tipo | Qué es |
|---|---|---|
| `id` | entero | Identificador |
| `name` | texto | Nombre de la empresa |
| `nit` | texto | NIT (único) |
| `created_at` | fecha | Cuándo se creó |

### `users` — Los usuarios (multiusuario)
| Campo | Tipo | Qué es |
|---|---|---|
| `id` | entero | Identificador |
| `username` | texto | Nombre de usuario |
| `password_hash` | texto | Contraseña (aún sin login real, queda lista) |
| `role` | texto | `superuser` (ve todas) o `user` (ve las suyas) |
| `tenant_id` | entero | Empresa asignada (vacío = superusuario) |

### `puc_accounts` — Catálogo del PUC (Decreto 2650/1993)
| Campo | Tipo | Qué es |
|---|---|---|
| `code` | texto (único) | Código de la cuenta (1, 11, 1105, 110505…) |
| `name` | texto | Nombre de la cuenta |
| `level` | entero | Nivel: 1=clase, 2=grupo, 4=cuenta, 6=subcuenta |
| `class_id` | entero | Clase (1..9) |
| `nature` | texto | `D` = débito, `C` = crédito |

**Naturaleza por clase** (regla contable colombiana):
- Clases 1 (Activo), 5 (Gastos), 6 (Costos de ventas), 7 (Costos de producción), 8 (Cuentas de orden deudoras) → **débito**
- Clases 2 (Pasivo), 3 (Patrimonio), 4 (Ingresos), 9 (Cuentas de orden acreedoras) → **crédito**

### `balances` — Un balance importado
| Campo | Tipo | Qué es |
|---|---|---|
| `id` | entero | Identificador |
| `tenant_id` | entero | A qué empresa pertenece |
| `period` | texto | Año gravable (p. ej. "2025") |
| `nit_empresa` | texto | NIT de la empresa (del encabezado del Excel) |
| `file_name` | texto | Nombre del archivo subido |
| `imported_at` | fecha | Cuándo se importó |
| `total_debitos` / `total_creditos` | número | Totales (deben cuadrar) |
| `total_activo`, `total_pasivo`, `total_patrimonio`, `total_ingresos`, `total_gastos`, `total_costos` | número | Totales por clase |

### `balance_rows` — Las filas del balance
Cada fila es una **cuenta** o un **tercero**:
| Campo | Tipo | Qué es |
|---|---|---|
| `balance_id` | entero | Balance al que pertenece |
| `tenant_id` | entero | Empresa |
| `row_type` | texto | `account` (cuenta) o `thirdparty` (tercero) |
| `code` | texto | Código de la cuenta (p. ej. "14350101") |
| `account_name` | texto | Nombre de la cuenta |
| `level` | entero | Nivel de dígitos |
| `class_id` / `nature` | — | Clase y naturaleza (D/C) |
| `third_party_name` | texto | Nombre del tercero (si es fila de tercero) |
| `doc_type` / `doc_number` | texto | Tipo y número de identificación del tercero (NIT, CC…) |
| `opening`, `debits`, `credits`, `closing` | número | Saldo inicial, débitos, créditos, saldo final |
| `saldo_normalized` | número | Saldo según la naturaleza: **negativo = va contra su naturaleza** |

### `validation_issues` — Las incidencias (errores claros)
| Campo | Tipo | Qué es |
|---|---|---|
| `balance_id` / `tenant_id` | entero | Balance y empresa |
| `issue_type` | texto | `NATURE_VIOLATION`, `CUADRE`, `PUC_MISSING`, `PUC_HIERARCHY`, `THIRD_PARTY_SUM`, `THIRD_PARTY_NOT_FOUND`, `THIRD_PARTY_CANCELLED` |
| `severity` | texto | `error` o `warning` |
| `code` / `account_name` / `third_party` | texto | Dónde está el problema |
| `amount` | número | Monto afectado |
| `message` | texto | **Qué pasó** (en lenguaje claro) |
| `action` | texto | **Qué hacer** para corregirlo |

### `third_parties` — Terceros RUES (cámaras de comercio)
| Campo | Tipo | Qué es |
|---|---|---|
| `doc_type` | texto | `NIT`, `CC`, `CE`, `PA`, `TI` |
| `doc_number` | texto | Número de identificación (solo dígitos) |
| `name` | texto | Razón social / nombre |
| `camara_code` / `camara_name` | texto | Cámara de comercio |
| `matricula` | texto | Número de matrícula |
| `estado` | texto | `ACTIVA`, `CANCELADA`, `MATRÍCULA CANCELADA LEY 1429`… |
| `ciiu` | texto | Actividades económicas (CIIU) separadas por coma |
| `updated_at` | texto | Fecha de actualización del registro |

### `format_templates` — Definición de un formato DIAN
Guarda en `definition` (JSON) la estructura del anexo de la resolución: campos del encabezado (`Cab`) y del contenido. Hoy está definido el **formato 1001**.

### `template_rules` — La parametrización (qué cuentas alimentan cada concepto)
| Campo | Tipo | Qué es |
|---|---|---|
| `format_code` | texto | Formato (p. ej. "1001") |
| `concepto` | entero | Código del concepto DIAN (`cpt`) |
| `concepto_nombre` | texto | Nombre del concepto |
| `cuentas_desde` / `cuentas_hasta` | texto | Rango de cuentas del PUC que alimentan el concepto |
| `doc_types` | texto | Tipos de documento incluidos (NIT,CC…) |
| `campo_valor` | texto | Qué valor se envía: `closing` (saldo), `debits`, `credits` |
| `notas` | texto | Notas para el contador |

### `generated_files` — Archivos XML generados
| Campo | Tipo | Qué es |
|---|---|---|
| `tenant_id` / `balance_id` | entero | Empresa y balance |
| `format_code` | texto | Formato generado |
| `file_name` | texto | Nombre tipo `Dmuisca_010100111202500000001.xml` |
| `xml_content` | texto | El contenido completo del XML |
| `created_at` | fecha | Cuándo se generó |
