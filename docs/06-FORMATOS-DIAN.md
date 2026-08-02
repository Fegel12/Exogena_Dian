# 📄 Formatos DIAN y generador XML

## Contexto: qué cambió en 2025

Para el año gravable 2025 (Resolución 000227 de 23-SEP-2025), la DIAN **renumeró los formatos** de información exógena y **eliminó el archivo plano**:

- ❌ Los formatos clásicos **2276, 2277, 2278, 2279 ya no existen**.
- ✅ Los formatos ahora son (numeración nueva): **2821, 2822, 2823, 2824, 2825, 2829, 2840, 2854, 2856** (nuevos) y **1001, 1005, 1476, 1647, 2574, 5247-5252** (continúan con versiones nuevas).
- ✅ Todo se entrega en **XML con esquema XSD** (ya no TXT plano).

El PDF de la resolución (que el usuario subió como "000233" pero contiene los anexos de la 000227) fue extraído a texto y se encuentra en `C:\Users\egelv\pdf_extract\resolucion_000233_2025.txt`. Allí está la estructura exacta de cada formato (campos, tipos, longitudes, validaciones) y los XSD completos.

## Estructura de un archivo XML (según el anexo)

Todos los formatos siguen el mismo molde:

```
Dmuisca_ccmmmmmvvaaaacccccccc.xml
  │
  ├─ <mas>                  ← elemento raíz
  │   ├─ <Cab>              ← encabezado (obligatorio)
  │   │   ├─ <Ano>2025</Ano>
  │   │   ├─ <CodCpt>1</CodCpt>            (1=inserción, 2=reemplazo)
  │   │   ├─ <Formato>1001</Formato>
  │   │   ├─ <Version>11</Version>
  │   │   ├─ <NumEnvio>00000001</NumEnvio>
  │   │   ├─ <FecEnvio>…</FecEnvio>
  │   │   ├─ <FecInicial>2025-01-01</FecInicial>
  │   │   ├─ <FecFinal>2025-12-31</FecFinal>
  │   │   ├─ <ValorTotal>…</ValorTotal>    (debe ser la suma del contenido)
  │   │   └─ <CantReg>89</CantReg>         (máx. 5.000 por archivo)
  │   └─ <pagos>            ← un elemento por registro
  │       ├─ <cpt>…</cpt>   (concepto)
  │       ├─ <tdoc>…</tdoc> (tipo de documento)
  │       ├─ <nid>…</nid>   (número de identificación)
  │       ├─ <apl1><apl2><nom1><nom2>  (persona natural)
  │       ├─ <raz>…</raz>   (persona jurídica)
  │       ├─ <dir><dpto><mun><pais>
  │       └─ <pago><pnded><ided><inded><retp><reta><comun><ndom>  (valores)
```

Reglas de la DIAN aplicadas automáticamente:
- **Máximo 5.000 registros por archivo** → el sistema parte la información en varios archivos.
- **`ValorTotal` = suma del contenido** → se calcula y verifica.
- **Llave única** (cpt + tdoc + nid) → no debe repetirse.
- **Codificación ISO-8859-1** y nombre de archivo `Dmuisca_…`.
- Números: positivos, enteros, sin puntos ni comas.

## Cómo funciona el generador (template_engine.py)

1. La **plantilla** del formato (campos del `Cab` y del contenido) está definida en código como `FORMATO_1001` y también se guarda en la tabla `format_templates` (JSON). Cuando la DIAN cambie un formato, se actualiza la plantilla, no el código.
2. Las **reglas de parametrización** están en `template_rules`: qué rango de cuentas del PUC alimenta cada concepto, con qué tipos de documento y qué valor se envía (saldo/débitos/créditos).
3. El generador toma los terceros del balance, aplica las reglas, agrupa por la llave única y escribe los XML.

## ⚠️ Pendiente: el catálogo oficial de conceptos

Los conceptos actuales (9001-9006) son **de ejemplo**. El catálogo oficial (`cpt`) está en las páginas **escaneadas** del PDF de la resolución. Para usarlos en producción:

1. Extraer el catálogo de conceptos del anexo (OCR de las primeras páginas escaneadas o el anexo de conceptos).
2. Cargarlos como reglas en `template_rules` (o desde una plantilla Excel de parametrización, pendiente de construir).
3. Regenerar y verificar contra el XSD oficial.

## Formatos identificados en la resolución 000227/2025

| Formato | Anexo | Nombre |
|---|---|---|
| 1001 (v11) | T3.18 | Pagos o abonos en cuenta y retenciones practicadas |
| 1005 (v9) | T3.21 | Impuesto a las ventas por pagar (descontable) |
| 1476 (v13) | T3.46 | Registros catastrales y de impuesto predial |
| 1647 (v3) | T3.26 | Ingresos recibidos para terceros residentes fiscales |
| 2574 (v3) | T3.56 | No causación del impuesto al carbono |
| 2821 (v1) | T3.70 | Certificados de utilidad común CUC |
| 2822 (v1) | T3.71 | Certificaciones de beneficios Ley 1715 |
| 2823-2825, 2829, 2840 | — | Resoluciones de beneficios, cine, crédito fiscal, primer empleo |
| 2854 (v1) | T3.72 | Ingresos recibidos para terceros del exterior |
| 2856 (v1) | T3.73 | Operaciones con activos digitales |
| 5247-5252 (v2) | T3.31-36 | Colaboración empresarial (pagos, ingresos, IVA, saldos) |
