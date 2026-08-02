# 🌐 Referencia de la API (servicios web)

El backend expone servicios HTTP en `http://localhost:8000`. El frontend los consume con `fetch` (ver `frontend/lib/api.js`).

## Resumen de rutas

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/health` | Estado del servicio |
| GET | `/api/companies` | Lista las empresas (superusuario) |
| POST | `/api/companies` | Crea una empresa `{name, nit}` |
| GET | `/api/companies/{id}` | Detalle de una empresa + sus balances |
| POST | `/api/companies/{id}/balances` | Sube un Excel y lo importa + valida (multipart `file`) |
| GET | `/api/companies/{id}/dashboard` | Totales, cuadre, resumen e incidencias |
| GET | `/api/companies/{id}/issues?tipo=&balance_id=` | Incidencias filtradas |
| POST | `/api/companies/{id}/generate?formato=1001` | Genera el XML |
| GET | `/api/companies/{id}/files` | Lista los XML generados |
| GET | `/api/files/{file_id}/download` | Descarga el XML |
| GET | `/api/puc?search=1105` | Busca cuentas del PUC |

## Ejemplos

### Crear una empresa
```bash
curl -X POST http://localhost:8000/api/companies \
  -H "Content-Type: application/json" \
  -d '{"name":"Mi Empresa SAS","nit":"900123456-7"}'
```

### Subir un balance
```bash
curl -X POST http://localhost:8000/api/companies/1/balances \
  -F "file=@balance.xlsx"
```

### Ver el dashboard
```bash
curl http://localhost:8000/api/companies/1/dashboard
```
Respuesta (resumida):
```json
{
  "balance": {"id": 1, "period": "2025", "file_name": "…"},
  "totales": {"activo": 2242688523.12, "pasivo": …, "ingresos": …, …},
  "cuadre": {"debitos_igual_creditos": true, "ecuacion_contable": true, "diferencia_ecuacion": 0.0},
  "resumen_incidencias": {"por_tipo": {"NATURE_VIOLATION": 28, …}, "por_severidad": {"error": 28, "warning": 34}, "total": 62},
  "incidencias": [ {"id":1, "issue_type":"NATURE_VIOLATION", "severity":"error", "code":"14350101",
                    "message":"…", "action":"…"}, … ]
}
```

### Generar el XML del formato 1001
```bash
curl -X POST "http://localhost:8000/api/companies/1/generate?formato=1001"
```
Respuesta:
```json
{"format_code":"1001","archivos":[{"file_name":"Dmuisca_010100111202500000001.xml","registros":89,"valor_total":1110743010}]}
```

### Descargar el XML
```bash
curl http://localhost:8000/api/files/1/download
```

> Nota: la documentación interactiva de FastAPI está en `http://localhost:8000/docs` (puedes probar todo desde el navegador).
