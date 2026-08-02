# 🚀 Guía de uso (paso a paso)

## 1. Arrancar el programa

### Backend (primero)
```bash
cd C:\Users\egelv\exogena-app\backend
.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```
Debe quedar corriendo (se ve "Uvicorn running on http://127.0.0.1:8000").

### Frontend (segundo, en otra ventana)
```bash
cd C:\Users\egelv\exogena-app\frontend
npm run dev
```
Abrir el navegador en **http://localhost:3000**

### Si es la primera vez (una sola vez)
```bash
cd C:\Users\egelv\exogena-app\backend
.venv\Scripts\python.exe scripts\seed.py
```
Esto crea la base, carga el PUC (2.658 cuentas), crea la empresa demo "IMDEGHUELES ATHINATY SAS", importa el balance de muestra y lo valida.

## 2. Usar el programa

| Paso | Dónde | Qué hacer |
|---|---|---|
| 1. Crear empresa | Página **Empresas** | Escribir nombre y NIT → "Crear" (vista de superusuario) |
| 2. Subir el balance | Página **Subir balance** | Elegir la empresa, seleccionar el Excel de WorldOffice → "Importar y validar" |
| 3. Revisar | Página **Dashboard** | Ver totales, cuadre ✅/❌ e incidencias (primero las de naturaleza) |
| 4. Corregir | — | Cada incidencia dice qué pasó y qué hacer |
| 5. Generar | Página **Generar XML** | Botón "Generar formato 1001" → descargar los XML |
| 6. Reportar | — | Subir los XML a la DIAN (portal MUISCA) |

## 3. Cargar los terceros (cámaras de comercio)

```bash
cd C:\Users\egelv\exogena-app\backend
.venv\Scripts\python.exe scripts\cargar_terceros.py "C:\ruta\tus_terceros.txt"
```
Ver el documento `08-TERCEROS-RUES.md`.

## 4. Probar que todo funciona

```bash
cd C:\Users\egelv\exogena-app\backend
.venv\Scripts\python.exe -m pytest tests\ -q
```
Deben pasar todas las pruebas (10/10).

## Preguntas frecuentes

**¿"Error 501"?** — No existe en este sistema: cada problema tiene un mensaje claro con *qué pasó* y *qué hacer*.

**¿El balance no cuadra?** — El dashboard muestra cuál de las dos reglas falla (débitos≠créditos o la ecuación contable) con la diferencia exacta en pesos.

**¿Cuentas negativas?** — El sistema distingue: contra-cuentas legítimas (depreciación, capital por suscribir), convenciones del programa (IVA descontable, filas DIAN) y errores reales (como los inventarios −$961M del balance de muestra).

**¿Formatos 2276/2277?** — Ya no existen: la Resolución 000227/2025 los reemplazó por la numeración nueva (1001, 1005, 1647, 2821…). El generador produce XML, no archivo plano.

**¿Cómo cambio los conceptos del formato 1001?** — Se editan las reglas en la tabla `template_rules` (los actuales son de ejemplo). Cuando se construya la plantilla Excel de parametrización, se podrá hacer sin tocar la base directamente.
