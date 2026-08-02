# -*- coding: utf-8 -*-
"""Carga el catálogo del PUC (Decreto 2650/1993) desde el texto extraído del PDF.

El texto alterna código/denominación, pero a veces un código no tiene nombre
(línea en blanco) y el nombre siguiente pertenece al código posterior.
Máquina de estados: un código pendiente se empareja con la PRIMERA línea de
nombre que aparezca después (sin saltar códigos intermedios).
"""
import re
from app.models import PucAccount

COD = re.compile(r"^\s*(\d{1,6})\s*$")
COD_NOMBRE = re.compile(r"^\s*(\d{1,6})\s+(.+?)\s*$")   # código y nombre en la misma línea
NAT = {1: "D", 2: "C", 3: "C", 4: "C", 5: "D", 6: "D", 7: "D", 8: "D", 9: "C"}
ESTRUCTURAL = ("CODIGO", "DENOMINACION", "CATALOGO DE CUENTAS")


def _es_estructural(ln):
    return ln in ESTRUCTURAL or ln.startswith("=====") or "PAGINA" in ln


def cargar_puc(path, db, limpiar=True):
    if limpiar:
        db.query(PucAccount).delete()
    with open(path, encoding="utf-8") as f:
        lines = f.readlines()

    inicio = next((i for i, ln in enumerate(lines) if "CATALOGO DE CUENTAS" in ln), None)
    if inicio is None:
        raise ValueError("No se encontró el catálogo de cuentas en el PUC")

    n = 0
    vistos = set()
    pendiente = None

    def guardar(cod, nombre):
        nonlocal n
        if len(cod) in (1, 2, 4, 6) and cod not in vistos and nombre:
            vistos.add(cod)
            db.add(PucAccount(code=cod, name=nombre, level=len(cod),
                              class_id=int(cod[0]), nature=NAT[int(cod[0])]))
            n += 1

    for i in range(inicio + 1, len(lines)):
        ln = lines[i].strip()
        if not ln or _es_estructural(ln):
            continue
        m = COD.match(ln)
        if m:
            # código puro: el pendiente anterior se descarta (no tenía nombre)
            pendiente = m.group(1)
            continue
        m2 = COD_NOMBRE.match(ln)
        if m2:
            # código + nombre en la misma línea
            guardar(m2.group(1), m2.group(2))
            pendiente = None
            continue
        # línea de nombre: empareja con el código pendiente
        if pendiente:
            guardar(pendiente, ln)
            pendiente = None

    db.commit()
    return n
