# -*- coding: utf-8 -*-
"""Motor de plantillas: genera los archivos XML para la DIAN según la estructura del anexo.

La estructura de cada formato vive en la tabla format_templates (definición JSON).
Las reglas de negocio (qué cuentas alimentan cada concepto) viven en template_rules.
"""
import datetime
import xml.etree.ElementTree as ET
from app.models import Balance, BalanceRow, GeneratedFile, TemplateRule, FormatTemplate

MAX_REGISTROS = 5000  # la DIAN exige máximo 5.000 registros por archivo

# Mapeo de tipos de documento del balance a los códigos de la resolución.
# IMPORTANTE: confirmar contra el anexo de la resolución vigente.
TDOC = {"CC": "01", "NIT": "02", "CE": "03", "PA": "04", "SIN": "05"}
PAIS_COLOMBIA = "169"

FORMATO_1001 = {
    "code": "1001",
    "name": "Pagos o Abonos en Cuenta y Retenciones practicadas",
    "version": "11",
    "elemento": "pagos",
    "cab": [
        ("Ano", "int", 4), ("CodCpt", "int", 2), ("Formato", "int", 5),
        ("Version", "int", 2), ("NumEnvio", "int", 8), ("FecEnvio", "datetime", 19),
        ("FecInicial", "date", 10), ("FecFinal", "date", 10),
        ("ValorTotal", "double", 20), ("CantReg", "int", 4),
    ],
    "contenido": [
        ("cpt", "int", 4), ("tdoc", "int", 2), ("nid", "string", 20),
        ("apl1", "string", 60), ("apl2", "string", 60), ("nom1", "string", 60),
        ("nom2", "string", 60), ("raz", "string", 450), ("dir", "string", 200),
        ("dpto", "int", 2), ("mun", "int", 3), ("pais", "int", 4),
        ("pago", "long", 18), ("pnded", "long", 18), ("ided", "long", 18),
        ("inded", "long", 18), ("retp", "long", 18), ("reta", "long", 18),
        ("comun", "long", 18), ("ndom", "long", 18),
    ],
}


def nombre_archivo(formato, cod_cpt, year, consecutivo):
    """Dmuisca_ccmmmmmvvaaaacccccccc.xml"""
    mmmmm = formato["code"].zfill(5)
    cc = str(cod_cpt).zfill(2)
    vv = formato["version"].zfill(2)
    return f"Dmuisca_{cc}{mmmmm}{vv}{year}{str(consecutivo).zfill(8)}.xml"


def _dividir_nombre_persona(nombre):
    """Intenta separar 'APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2'."""
    partes = (nombre or "").split()
    apl1 = partes[0] if len(partes) > 0 else ""
    apl2 = partes[1] if len(partes) > 1 else ""
    nom1 = partes[2] if len(partes) > 2 else ""
    nom2 = partes[3] if len(partes) > 3 else ""
    return apl1, apl2, nom1, nom2


def generar_formato(balance_id, format_code, db):
    bal = db.get(Balance, balance_id)
    if format_code != "1001":
        raise ValueError(f"El formato {format_code} aún no tiene motor de generación. "
                         "Por ahora está disponible el 1001 (Pagos y Retenciones).")
    formato = FORMATO_1001
    # guardar/actualizar la definición de la plantilla
    plant = db.query(FormatTemplate).filter_by(code=format_code).first()
    if plant is None:
        db.add(FormatTemplate(code=formato["code"], name=formato["name"],
                              version=formato["version"], year=int(bal.period or 0),
                              definition=formato))
        db.commit()

    reglas = db.query(TemplateRule).filter_by(format_code=format_code).all()
    if not reglas:
        raise ValueError("No hay reglas de parametrización para el formato 1001. "
                         "Cargue la plantilla de parametrización (ver README) antes de generar.")

    terceros = (db.query(BalanceRow)
                .filter_by(balance_id=balance_id, row_type="thirdparty")
                .order_by(BalanceRow.code).all())

    # --- construir registros según las reglas ---
    registros = []  # (tdoc, nid, apl1, apl2, nom1, nom2, raz, dict_valores)
    for regla in reglas:
        doc_types = [d.strip() for d in (regla.doc_types or "").split(",") if d.strip()]
        for r in terceros:
            if r.code < regla.cuentas_desde or r.code > regla.cuentas_hasta:
                continue
            if doc_types and r.doc_type and r.doc_type not in doc_types:
                continue
            valor = {"closing": r.closing, "debits": r.debits, "credits": r.credits}.get(
                regla.campo_valor or "closing", r.closing)
            if abs(valor or 0) < 0.005:
                continue
            tdoc = TDOC.get(r.doc_type or "", "")
            nid = "".join(ch for ch in (r.doc_number or "") if ch.isdigit())[:20]
            if r.doc_type in ("CC", "CE", "TI", "PA"):
                apl1, apl2, nom1, nom2 = _dividir_nombre_persona(r.third_party_name)
                raz = ""
            else:
                apl1 = apl2 = nom1 = nom2 = ""
                raz = (r.third_party_name or "")[:450]
            registros.append({
                "cpt": regla.concepto, "tdoc": tdoc, "nid": nid,
                "apl1": apl1, "apl2": apl2, "nom1": nom1, "nom2": nom2, "raz": raz,
                "campo": regla.campo_valor or "pago", "valor": abs(valor),
                "nota": regla.notas or "",
            })

    if not registros:
        raise ValueError("Las reglas de parametrización no produjeron ningún registro. "
                         "Revise los rangos de cuentas y los tipos de documento.")

    # --- agrupar por llave única (cpt + tdoc + nid) sumando valores ---
    agrupados = {}
    for rec in registros:
        llave = (rec["cpt"], rec["tdoc"], rec["nid"])
        g = agrupados.setdefault(llave, {**rec, "valores": {}})
        g["valores"][rec["campo"]] = g["valores"].get(rec["campo"], 0) + rec["valor"]

    # --- generar archivos de máximo 5.000 registros ---
    lista = list(agrupados.values())
    year = bal.period or str(datetime.date.today().year)
    fec_ini = f"{year}-01-01"
    fec_fin = f"{year}-12-31"
    fec_envio = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

    archivos = []
    for i in range(0, len(lista), MAX_REGISTROS):
        chunk = lista[i:i + MAX_REGISTROS]
        consec = len(archivos) + 1
        nombre = nombre_archivo(formato, 1, year, consec)
        valor_total = sum(
            sum(v for k, v in rec["valores"].items() if k != "nota") for rec in chunk)

        raiz = ET.Element("mas")
        cab = ET.SubElement(raiz, "Cab")
        campos_cab = {
            "Ano": year, "CodCpt": "1", "Formato": formato["code"],
            "Version": formato["version"], "NumEnvio": str(consec).zfill(8),
            "FecEnvio": fec_envio, "FecInicial": fec_ini, "FecFinal": fec_fin,
            "ValorTotal": f"{valor_total:.0f}", "CantReg": str(len(chunk)),
        }
        for etiqueta in ("Ano", "CodCpt", "Formato", "Version", "NumEnvio", "FecEnvio",
                         "FecInicial", "FecFinal", "ValorTotal", "CantReg"):
            ET.SubElement(cab, etiqueta).text = campos_cab[etiqueta]

        for rec in chunk:
            el = ET.SubElement(raiz, formato["elemento"])
            ET.SubElement(el, "cpt").text = str(rec["cpt"])
            ET.SubElement(el, "tdoc").text = rec["tdoc"] or ""
            ET.SubElement(el, "nid").text = rec["nid"] or ""
            ET.SubElement(el, "apl1").text = rec["apl1"] or ""
            ET.SubElement(el, "apl2").text = rec["apl2"] or ""
            ET.SubElement(el, "nom1").text = rec["nom1"] or ""
            ET.SubElement(el, "nom2").text = rec["nom2"] or ""
            ET.SubElement(el, "raz").text = rec["raz"] or ""
            ET.SubElement(el, "dir").text = ""
            ET.SubElement(el, "dpto").text = ""
            ET.SubElement(el, "mun").text = ""
            ET.SubElement(el, "pais").text = PAIS_COLOMBIA
            for campo in ("pago", "pnded", "ided", "inded", "retp", "reta", "comun", "ndom"):
                ET.SubElement(el, campo).text = str(int(rec["valores"].get(campo, 0)))

        ET.indent(raiz, space="  ")
        xml_bytes = ET.tostring(raiz, encoding="ISO-8859-1", xml_declaration=True)
        xml_text = xml_bytes.decode("ISO-8859-1")

        gf = GeneratedFile(tenant_id=bal.tenant_id, balance_id=balance_id,
                           format_code=format_code, file_name=nombre, xml_content=xml_text)
        db.add(gf)
        archivos.append({"file_name": nombre, "registros": len(chunk),
                         "valor_total": valor_total})
    db.commit()
    return archivos
