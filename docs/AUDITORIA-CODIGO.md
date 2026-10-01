# Auditoría del código — Exogena_Dian

Fecha: 28-sep-2026 · Repo auditado: `Fegel12/Exogena_Dian` (rama `main`, commit c5f9f3d)
Alcance: backend FastAPI (19 archivos .py) + frontend Next.js (18 .js). ~3.900 líneas.
Estado de pruebas: **12/12 tests pasan** (`pytest` en `backend/.venv`).

---

## 1. Crítico — seguridad

### 1.1 Contraseña escrita en el código (visible en GitHub)
`frontend/lib/auth.js:23`
```js
if (credentials.password === "exogena2025") { ... }
```
Cualquiera que vea el repositorio conoce el usuario y la contraseña. Además el placeholder
del formulario (`auth.js:20`) la muestra en pantalla.

**Acción:** mover a variable de entorno y usar hash; rotar la clave ya.

### 1.2 El login no protege nada
- `frontend/middleware.js.disabled` — el middleware está apagado: todas las páginas son públicas.
- El backend **no pide credenciales en ninguna ruta** (`backend/app/main.py`). El modelo `User`
  existe en la base (`models.py:24`) pero nadie lo usa para autorizar.
- `main.py:16`: CORS abierto a cualquier origen (`allow_origins=["*"]`).

**Acción:** activar middleware + dependencia de autenticación en los routers del backend.

### 1.3 Subida de archivos — nombre sin limpiar
`backend/app/routers/balances.py:25`
```python
destino = os.path.join(UPLOADS, f"t{tenant_id}_{file.filename}")
```
Comprobado: un nombre como `../../evil.xlsx` escribe **fuera** de `data/uploads/`.
Además el archivo subido nunca se borra (crecimiento de disco).

**Acción:** `os.path.basename()` + límite de tamaño + validación de contenido.

### 1.4 Descarga sin dueño
`backend/app/routers/generate.py:72` — `/api/files/{file_id}/download` entrega cualquier archivo
por su ID, sin verificar empresa ni usuario.

---

## 2. Importante — afecta el resultado contable

### 2.1 Desactivar una regla no sirve de nada
`backend/app/services/template_engine.py:142`
```python
reglas = db.query(TemplateRule).filter_by(format_code=format_code).all()
```
La generación **ignora el campo `active`**. Hoy las 735 reglas están activas, así que el fallo
está latente: en cuanto desactive una, el sistema la seguirá usando.
`generar_formato` tampoco valida que la regla esté activa antes de generar.

**Acción:** añadir `.filter_by(active=True)` en `_build_records`.

### 2.2 Las reglas no están separadas por empresa
`template_engine.py:142`, `generate.py:116`, `generate.py:284` filtran solo por formato.
En la base, las 735 reglas tienen `tenant_id = NULL`. Con varias empresas, la parametrización
de una se aplica a los formatos de otra.

**Acción:** filtrar también por `tenant_id` (o por plantilla global explícita).

### 2.3 El frontend siempre usa la empresa 1
Hay 3 empresas creadas (`IMDEGHUELES ATHINATY SAS`, `Empresa Prueba`, `Test Company`) pero todas
las llamadas están fijas a la empresa 1: `dashboard/page.js:8`, `dashboard/botones.js:7`,
`generar/actions.js:42`, `generar/page.js:18`, `parametrizar/actions.js`.
El selector de empresa no cambia los datos.

---

## 3. Mantenimiento del repositorio

| Hallazgo | Ubicación | Efecto |
|---|---|---|
| 16 archivos `.pyc` compilados en GitHub | `backend/app/**/__pycache__/` | Ruido y ruido de revisión |
| `.gitignore` ignora `*.json` | `.gitignore:11` | Un archivo de configuración nuevo **nunca** llegará a GitHub |
| `requirements.txt` sin versiones | `backend/requirements.txt` | En otro PC se instala otra versión y puede romperse |
| Documentación desactualizada | `README.md:85` dice "aún no hay login" | El login sí existe (con clave en duro) |
| `plantilla_conceptos_dian.xlsx` (binario) en git | `backend/data/` | No se puede revisar cambios |

---

## 4. Menores

- Excel: los nombres de terceros se escriben tal cual; un nombre que empiece por `=` se convierte
  en fórmula al abrir el Excel (`balances.py:121`). Conviene prefijar con `'`.
- Rendimiento: `validator.py:120` hace una consulta por cada tercero (N+1) sobre 7,9 M de filas;
  y `validator.py:73` carga todo el PUC en memoria en cada validación.
- Importaciones sin usar: `balances.py:3` (`io`, `shutil` sí se usa), `template_engine.py` etc.
- En la vista previa de generación no se avisa si un tercero queda sin `doc_type`
  (`template_engine.py:167` deja `tdoc` vacío en un campo numérico → la DIAN lo rechaza).

---

## 5. Lo que está bien

- Separación clara: importador / validador / motor de plantillas.
- Mensajes de incidencia con "qué pasó" y "qué hacer" — muy útil para el contador.
- Normalización de saldo según naturaleza de la clase (1,5,6,7,8 débito; 2,3,4,9 crédito) correcta.
- Manejo de celdas combinadas, filas de terceros y jerarquía PUC bien resuelto.
- 12 pruebas automatizadas y todas pasan.

---

## Prioridad sugerida

1. Sacar la contraseña del código y activar el middleware (1.1, 1.2).
2. Arreglar `active` (2.1) y el filtro por empresa (2.2).
3. Limpiar el nombre del archivo subido (1.3).
4. Limpieza del repo (sección 3).
