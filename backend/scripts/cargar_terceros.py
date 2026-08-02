# -*- coding: utf-8 -*-
"""Carga el archivo TXT de terceros (RUES / cámaras de comercio, datos.gov.co)
a la tabla third_parties de la base de datos.

El TXT es un CSV con comillas (~36 columnas) descargado del portal de datos
abiertos. Este script entiende su estructura y guarda solo lo que el sistema
necesita para validar terceros: tipo y número de documento, nombre, cámara,
matrícula, estado y actividad económica (CIIU).

Uso:
    python scripts/cargar_terceros.py [ruta_del_txt] [--limpiar]

Ejemplo:
    python scripts/cargar_terceros.py "C:/ruta/terceros.txt"
    python scripts/cargar_terceros.py "C:/ruta/terceros.txt" --limpiar   # borra los anteriores

Nota: con ~3 millones de registros tarda unos minutos. La tabla queda lista
para que el motor de validación avise si un tercero del balance no existe o
está cancelado en la cámara de comercio.
"""
import csv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal  # noqa: E402
from app.models import ThirdParty  # noqa: E402

# Columnas del TXT de RUES (índices dentro de cada fila del CSV)
COL_CAMARA_COD = 0
COL_CAMARA_NOM = 1
COL_MATRICULA = 2
COL_NOMBRE = 4
COL_TIPO_DOC_NOM = 11        # "NIT", "CEDULA DE CIUDADANIA", ...
COL_NUMERO_DOC = 12          # número de identificación (a veces trae el DV)
COL_CIIU_INICIO = 15         # CIIU principal + secundarios (hasta la 18)
COL_ESTADO_NOM = 31          # "ACTIVA", "CANCELADA", ...
COL_ACTUALIZACION = 35       # fecha de actualización del registro

# Traduce el nombre del tipo de documento del RUES al código corto del sistema
TIPOS_DOC = {
    "NIT": "NIT",
    "CEDULA DE CIUDADANIA": "CC",
    "CEDULA DE EXTRANJERIA": "CE",
    "PASAPORTE": "PA",
    "TARJETA DE IDENTIDAD": "TI",
    "NIT MENOR": "NIT",
}


def _digitos(s):
    return "".join(ch for ch in (s or "") if ch.isdigit())


def cargar_terceros(ruta, limpiar=False):
    db = SessionLocal()
    if limpiar:
        borrados = db.query(ThirdParty).delete()
        db.commit()
        print(f"  Terceros anteriores eliminados: {borrados}")

    total = 0
    duplicados = 0
    vistos = set()
    buffer = []
    with open(ruta, encoding="utf-8", errors="replace", newline="") as f:
        reader = csv.reader(f, delimiter=",", quotechar='"')
        for i, fila in enumerate(reader):
            if not fila or not any(c.strip() for c in fila):
                continue
            # saltar encabezado si el archivo lo trae
            if i == 0 and "CAMARA" in fila[0].upper():
                continue
            while len(fila) < 36:
                fila.append("")

            numero = _digitos(fila[COL_NUMERO_DOC])
            nombre = fila[COL_NOMBRE].strip()
            tdoc = TIPOS_DOC.get(fila[COL_TIPO_DOC_NOM].strip().upper(),
                                 fila[COL_TIPO_DOC_NOM].strip())
            if not numero:
                continue
            llave = (tdoc, numero)
            if llave in vistos:
                duplicados += 1
                continue
            vistos.add(llave)

            ciiu = ",".join(c.strip() for c in fila[COL_CIIU_INICIO:COL_CIIU_INICIO + 4] if c.strip())
            estado = fila[COL_ESTADO_NOM].strip()
            buffer.append(ThirdParty(
                doc_type=tdoc,
                doc_number=numero,
                name=nombre[:300],
                camara_code=fila[COL_CAMARA_COD].strip(),
                camara_name=fila[COL_CAMARA_NOM].strip(),
                matricula=fila[COL_MATRICULA].strip(),
                estado=estado,
                ciiu=ciiu,
                updated_at=fila[COL_ACTUALIZACION].strip()[:30],
            ))
            total += 1
            if len(buffer) >= 5000:
                db.bulk_save_objects(buffer)
                buffer = []
                db.commit()
                print(f"  {total:,} terceros cargados…")
    if buffer:
        db.bulk_save_objects(buffer)
        db.commit()
    db.close()
    return total, duplicados


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    ruta = sys.argv[1]
    limpiar = "--limpiar" in sys.argv
    if not os.path.exists(ruta):
        print(f"ERROR: no se encontró el archivo {ruta}")
        sys.exit(1)
    print(f"Cargando terceros desde: {ruta}")
    total, duplicados = cargar_terceros(ruta, limpiar)
    print(f"LISTO: {total:,} terceros cargados ({duplicados:,} duplicados omitidos)")


if __name__ == "__main__":
    main()
