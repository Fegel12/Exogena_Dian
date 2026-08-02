# -*- coding: utf-8 -*-
"""Carga el archivo de terceros (RUES / datos.gov.co) a la tabla third_parties.

El archivo es un CSV con comillas y ENCABEZADO (~36 columnas). Este script lee el
encabezado y mapea las columnas POR NOMBRE, así funciona aunque cambie el orden.

Uso:
    python scripts/cargar_terceros.py [ruta_del_archivo] [--limpiar]

Ejemplo:
    python scripts/cargar_terceros.py "C:/ruta/Personas_Naturales,...txt"
    python scripts/cargar_terceros.py "C:/ruta/archivo.txt" --limpiar   # borra los anteriores

Nota: un archivo de ~3 GB (3 millones de registros) tarda varios minutos.
"""
import csv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine  # noqa: E402
from app.models import ThirdParty  # noqa: E402

# Nombres de columnas según el encabezado oficial del portal datos.gov.co
CAMPOS = {
    "camara_code": "codigo_camara",
    "camara_name": "camara_comercio",
    "matricula": "matricula",
    "nombre": "razon_social",
    "tipo_doc": "clase_identificacion",
    "numero": "numero_identificacion",
    "dv": "digito_verificacion",
    "ciiu": ["cod_ciiu_act_econ_pri", "cod_ciiu_act_econ_sec", "ciiu3", "ciiu4"],
    "estado": "estado_matricula",
    "actualizacion": "fecha_actualizacion",
}

# Posiciones fijas de respaldo por si el archivo no trae encabezado
FALLBACK = {
    "camara_code": 0, "camara_name": 1, "matricula": 2, "nombre": 4,
    "tipo_doc": 11, "numero": 12, "dv": 14, "ciiu": [15, 16, 17, 18],
    "estado": 31, "actualizacion": 35,
}

TIPOS_DOC = {
    "NIT": "NIT",
    "CEDULA DE CIUDADANIA": "CC",
    "CEDULA DE EXTRANJERIA": "CE",
    "PASAPORTE": "PA",
    "TARJETA DE IDENTIDAD": "TI",
}


def _digitos(s):
    return "".join(ch for ch in (s or "") if ch.isdigit())


def _parece_encabezado(fila):
    """True si la primera fila contiene nombres de columna conocidos."""
    if fila is None:
        return False
    nombres = [n.strip().strip('"').lower() for n in fila]
    conocidos = {"camara_comercio", "razon_social", "numero_identificacion",
                 "matricula", "clase_identificacion", "estado_matricula"}
    return any(n in conocidos for n in nombres)


def _indices(encabezado):
    """Convierte el encabezado (nombres) en un mapa nombre -> posición.

    Si el archivo no trae encabezado (o la primera fila no parece nombres de
    columna), usa las posiciones fijas conocidas del formato oficial.
    """
    if not _parece_encabezado(encabezado):
        return {k: v for k, v in FALLBACK.items()}
    nombres = [n.strip().strip('"').lower() for n in encabezado]
    pos = {nombre: i for i, nombre in enumerate(nombres)}
    idx = {}
    for campo, nombre in CAMPOS.items():
        if isinstance(nombre, list):
            idx[campo] = [pos[n] for n in nombre if n in pos] or None
        else:
            idx[campo] = pos.get(nombre)
    # números de respaldo si el encabezado usa otros nombres
    if idx["numero"] is None:
        idx["numero"] = pos.get("nit")
    if idx["estado"] is None:
        idx["estado"] = pos.get("codigo_estado_matricula")
    return idx


def cargar_terceros(ruta, limpiar=False):
    # acelerar SQLite para cargas masivas (no aplica a PostgreSQL)
    if engine.dialect.name == "sqlite":
        from sqlalchemy import text
        with engine.connect() as c:
            c.execute(text("PRAGMA journal_mode=WAL"))
            c.execute(text("PRAGMA synchronous=OFF"))
            c.execute(text("PRAGMA cache_size=-200000"))

    db = SessionLocal()
    if limpiar:
        borrados = db.query(ThirdParty).delete()
        db.commit()
        print(f"  Terceros anteriores eliminados: {borrados}")

    total = 0
    duplicados = 0
    vistos = {}  # (tipo, numero) -> objeto guardado (para preferir estado ACTIVA)
    buffer = []
    LOTE = 20000

    with open(ruta, encoding="utf-8", errors="replace", newline="") as f:
        reader = csv.reader(f, delimiter=",", quotechar='"')
        primera = next(reader, None)
        es_encabezado = _parece_encabezado(primera)
        idx = _indices(primera if es_encabezado else None)

        def procesar(fila):
            nonlocal total, duplicados, buffer
            if not fila or not any(c.strip() for c in fila):
                return
            while len(fila) < 36:
                fila.append("")

            def get(campo):
                p = idx[campo]
                if p is None:
                    return ""
                if isinstance(p, list):
                    return [fila[j] for j in p if j < len(fila)]
                return fila[p] if p < len(fila) else ""

            numero = _digitos(get("numero"))
            # OJO: numero_identificacion NO trae el dígito de verificación (va en la
            # columna aparte 'digito_verificacion'). Se guarda SIN DV; la validación
            # ya es tolerante al DV del lado del balance.
            nombre = get("nombre").strip()
            tdoc = TIPOS_DOC.get(get("tipo_doc").strip().upper(), get("tipo_doc").strip())
            if not numero:
                return

            llave = (tdoc, numero)
            if llave in vistos:
                duplicados += 1
                # si el nuevo registro está ACTIVA y el guardado no, se reemplaza
                estado_nuevo = get("estado").strip()
                if estado_nuevo == "ACTIVA" and vistos[llave].estado != "ACTIVA":
                    vistos[llave].estado = "ACTIVA"
                return
            vistos[llave] = None

            ciiu = ",".join(c.strip() for c in get("ciiu") if c and c.strip())
            tp = ThirdParty(
                doc_type=tdoc,
                doc_number=numero,
                name=nombre[:300],
                camara_code=get("camara_code").strip(),
                camara_name=get("camara_name").strip(),
                matricula=get("matricula").strip(),
                estado=get("estado").strip(),
                ciiu=ciiu,
                updated_at=get("actualizacion").strip()[:30],
            )
            vistos[llave] = tp
            buffer.append(tp)
            total += 1
            if len(buffer) >= LOTE:
                db.bulk_save_objects(buffer)
                buffer = []
                db.commit()
            if total % 200000 == 0:
                print(f"  {total:,} terceros procesados…")

        if primera is not None and not es_encabezado:
            procesar(primera)  # el archivo no traía encabezado: la 1ª fila es dato
        for fila in reader:
            procesar(fila)

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
