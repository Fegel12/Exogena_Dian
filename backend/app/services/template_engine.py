# -*- coding: utf-8 -*-
"""Motor de plantillas: genera XML y Excel para la DIAN.

Cada formato se define en FORMATS. Las reglas de negocio viven en template_rules.
Genera ambos formatos (XML + Excel) en una sola pasada sobre los datos.
"""
import datetime
import uuid
import xml.etree.ElementTree as ET
from io import BytesIO

from app.models import Balance, BalanceRow, GeneratedFile, TemplateRule, FormatTemplate

MAX_REGISTROS = 5000
TDOC = {"CC": "01", "NIT": "02", "CE": "03", "PA": "04", "SIN": "05"}
PAIS_COLOMBIA = "169"

# ── Definiciones de formatos ──────────────────────────────────────────────

FORMATOS = {
    "1001": {
        "code": "1001", "name": "Pagos o Abonos en Cuenta y Retenciones practicadas",
        "version": "11", "elemento": "pagos",
        "contenido": [
            ("cpt","int",4),("tdoc","int",2),("nid","string",20),
            ("apl1","string",60),("apl2","string",60),
            ("nom1","string",60),("nom2","string",60),
            ("raz","string",450),("dir","string",200),
            ("dpto","int",2),("mun","int",3),("pais","int",4),
            ("pago","long",18),("pnded","long",18),
            ("ided","long",18),("inded","long",18),
            ("retp","long",18),("reta","long",18),
            ("comun","long",18),("ndom","long",18),
        ],
    },
    "1005": {
        "code": "1005", "name": "Impuesto a las ventas por pagar (descontable)",
        "version": "9", "elemento": "iva",
        "contenido": [
            ("cpt","int",4),("tdoc","int",2),("nid","string",20),
            ("apl1","string",60),("apl2","string",60),
            ("nom1","string",60),("nom2","string",60),
            ("raz","string",450),("dir","string",200),
            ("dpto","int",2),("mun","int",3),("pais","int",4),
            ("iva","long",18),("base","long",18),("tarifa","double",6),
        ],
    },
    "1647": {
        "code": "1647", "name": "Ingresos recibidos para terceros residentes fiscales",
        "version": "3", "elemento": "ingresos",
        "contenido": [
            ("cpt","int",4),("tdoc","int",2),("nid","string",20),
            ("apl1","string",60),("apl2","string",60),
            ("nom1","string",60),("nom2","string",60),
            ("raz","string",450),("dir","string",200),
            ("dpto","int",2),("mun","int",3),("pais","int",4),
            ("ingr","long",18),("devr","long",18),("retf","long",18),
        ],
    },
    "2821": {
        "code": "2821", "name": "APC-Colombia Certificados de Utilidad Común (CUC)",
        "version": "1", "elemento": "cuc",
        "contenido": [
            ("cpt","int",4),("tdoc","int",2),("nid","string",20),
            ("apl1","string",60),("apl2","string",60),
            ("nom1","string",60),("nom2","string",60),
            ("raz","string",450),("dir","string",200),
            ("dpto","int",2),("mun","int",3),("pais","int",4),
            ("valor","long",18),
        ],
    },
    "2822": {
        "code": "2822", "name": "Certificaciones beneficios (Ley 1715/2014)",
        "version": "1", "elemento": "beneficios",
        "contenido": [
            ("cpt","int",4),("tdoc","int",2),("nid","string",20),
            ("apl1","string",60),("apl2","string",60),
            ("nom1","string",60),("nom2","string",60),
            ("raz","string",450),("dir","string",200),
            ("dpto","int",2),("mun","int",3),("pais","int",4),
            ("valor","long",18),
        ],
    },
    "2854": {
        "code": "2854", "name": "Ingresos recibidos para terceros del exterior",
        "version": "1", "elemento": "exterior",
        "contenido": [
            ("cpt","int",4),("tdoc","int",2),("nid","string",20),
            ("apl1","string",60),("apl2","string",60),
            ("nom1","string",60),("nom2","string",60),
            ("raz","string",450),("dir","string",200),
            ("dpto","int",2),("mun","int",3),("pais","int",4),
            ("ingr","long",18),("retf","long",18),
        ],
    },
    "1476": {
        "code": "1476", "name": "Registros catastrales y de impuesto predial",
        "version": "13", "elemento": "catastral",
        "contenido": [
            ("cpt","int",4),("tdoc","int",2),("nid","string",20),
            ("apl1","string",60),("apl2","string",60),
            ("nom1","string",60),("nom2","string",60),
            ("raz","string",450),("dir","string",200),
            ("dpto","int",2),("mun","int",3),("pais","int",4),
            ("valor","long",18),
        ],
    },
    "2574": {
        "code": "2574", "name": "No causación del impuesto al carbono",
        "version": "3", "elemento": "carbono",
        "contenido": [
            ("cpt","int",4),("tdoc","int",2),("nid","string",20),
            ("apl1","string",60),("apl2","string",60),
            ("nom1","string",60),("nom2","string",60),
            ("raz","string",450),("dir","string",200),
            ("dpto","int",2),("mun","int",3),("pais","int",4),
            ("valor","long",18),
        ],
    },
}

# ── Helpers ────────────────────────────────────────────────────────────────

def _nombre_archivo(format_code, version, year, consecutivo, ext="xml"):
    mmmmm = format_code.zfill(5)
    vv = version.zfill(2)
    return f"Dmuisca_01{mmmmm}{vv}{year}{str(consecutivo).zfill(8)}.{ext}"


def _dividir_nombre(nombre):
    partes = (nombre or "").split()
    return (
        partes[0] if len(partes) > 0 else "",
        partes[1] if len(partes) > 1 else "",
        partes[2] if len(partes) > 2 else "",
        partes[3] if len(partes) > 3 else "",
    )


def _build_records(balance_id, format_code, db):
    """Construye registros agrupados: reglas × terceros."""
    reglas = db.query(TemplateRule).filter_by(format_code=format_code).all()
    if not reglas:
        raise ValueError(
            f"No hay reglas de parametrización para el formato {format_code}. "
            f"Configure el mapeo en la página de Parametrizar antes de generar."
        )

    terceros = (db.query(BalanceRow)
                .filter_by(balance_id=balance_id, row_type="thirdparty")
                .order_by(BalanceRow.code).all())

    registros = []
    for regla in reglas:
        doc_types = [d.strip() for d in (regla.doc_types or "").split(",") if d.strip()]
        for r in terceros:
            if regla.cuentas_desde and r.code and r.code < regla.cuentas_desde:
                continue
            if regla.cuentas_hasta and r.code and r.code > regla.cuentas_hasta:
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
                apl1, apl2, nom1, nom2 = _dividir_nombre(r.third_party_name)
                raz = ""
            else:
                apl1 = apl2 = nom1 = nom2 = ""
                raz = (r.third_party_name or "")[:450]
            registros.append({
                "cpt": regla.concepto, "tdoc": tdoc, "nid": nid,
                "apl1": apl1, "apl2": apl2, "nom1": nom1, "nom2": nom2, "raz": raz,
                "campo": regla.campo_valor or "pago", "valor": abs(valor),
            })

    if not registros:
        raise ValueError(
            f"Las reglas del formato {format_code} no produjeron registros. "
            f"Revise los rangos de cuentas y tipos de documento."
        )

    agrupados = {}
    for rec in registros:
        llave = (rec["cpt"], rec["tdoc"], rec["nid"])
        g = agrupados.setdefault(llave, {**rec, "valores": {}})
        g["valores"][rec["campo"]] = g["valores"].get(rec["campo"], 0) + rec["valor"]

    return list(agrupados.values())


def _generar_xml(lista, formato, year):
    """Genera XML para un chunk de registros."""
    fec_ini = f"{year}-01-01"
    fec_fin = f"{year}-12-31"
    fec_envio = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    valor_total = sum(sum(v for v in rec["valores"].values()) for rec in lista)

    raiz = ET.Element("mas")
    cab = ET.SubElement(raiz, "Cab")
    campos = {
        "Ano": year, "CodCpt": "1", "Formato": formato["code"],
        "Version": formato["version"], "NumEnvio": str(1).zfill(8),
        "FecEnvio": fec_envio, "FecInicial": fec_ini, "FecFinal": fec_fin,
        "ValorTotal": f"{valor_total:.0f}", "CantReg": str(len(lista)),
    }
    for tag in ("Ano","CodCpt","Formato","Version","NumEnvio",
                 "FecEnvio","FecInicial","FecFinal","ValorTotal","CantReg"):
        ET.SubElement(cab, tag).text = campos[tag]

    tags_contenido = [c[0] for c in formato["contenido"]]

    for rec in lista:
        el = ET.SubElement(raiz, formato["elemento"])
        for tag in tags_contenido:
            if tag == "cpt":
                ET.SubElement(el, tag).text = str(rec["cpt"])
            elif tag == "tdoc":
                ET.SubElement(el, tag).text = rec["tdoc"] or ""
            elif tag == "nid":
                ET.SubElement(el, tag).text = rec["nid"] or ""
            elif tag in ("apl1","apl2","nom1","nom2"):
                ET.SubElement(el, tag).text = rec.get(tag, "") or ""
            elif tag == "raz":
                ET.SubElement(el, tag).text = rec["raz"] or ""
            elif tag in ("dir","dpto","mun"):
                ET.SubElement(el, tag).text = ""
            elif tag == "pais":
                ET.SubElement(el, tag).text = PAIS_COLOMBIA
            else:
                ET.SubElement(el, tag).text = str(int(rec["valores"].get(tag, 0)))

    ET.indent(raiz, space="  ")
    xml_bytes = ET.tostring(raiz, encoding="ISO-8859-1", xml_declaration=True)
    return xml_bytes.decode("ISO-8859-1"), valor_total


def _generar_excel(lista, formato, year):
    """Genera Excel para los registros (sin depender de DB)."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    wb = Workbook()
    ws = wb.active
    ws.title = f"Formato {formato['code']}"

    tags_contenido = [c[0] for c in formato["contenido"]]
    valor_tags = [t for t in tags_contenido if t not in (
        "cpt","tdoc","nid","apl1","apl2","nom1","nom2","raz","dir","dpto","mun","pais")]
    encabezados = ["Concepto","Tipo Doc","Nº ID",
                   "1er Apellido","2do Apellido","1er Nombre","2do Nombre",
                   "Razón Social"] + valor_tags

    header_fill = PatternFill(start_color="1A73E8", end_color="1A73E8", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True, size=11)
    thin_border = Border(left=Side(style="thin"), right=Side(style="thin"),
                         top=Side(style="thin"), bottom=Side(style="thin"))

    for col, name in enumerate(encabezados, 1):
        cell = ws.cell(row=1, column=col, value=name)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border

    for row_idx, rec in enumerate(lista, 2):
        vals = rec["valores"]
        row = [rec["cpt"], rec["tdoc"], rec["nid"],
               rec.get("apl1",""), rec.get("apl2",""),
               rec.get("nom1",""), rec.get("nom2",""), rec.get("raz","")]
        for tag in valor_tags:
            row.append(vals.get(tag, 0))
        for col, val in enumerate(row, 1):
            cell = ws.cell(row=row_idx, column=col, value=val)
            cell.border = thin_border
            if isinstance(val, (int, float)):
                cell.number_format = "#,##0"

    ws.column_dimensions["A"].width = 10
    ws.column_dimensions["C"].width = 18
    ws.column_dimensions["H"].width = 45
    from openpyxl.utils import get_column_letter
    for i in range(9, len(encabezados) + 1):
        ws.column_dimensions[get_column_letter(i)].width = 14

    # Resumen
    ws2 = wb.create_sheet("Resumen")
    total = sum(sum(v for v in rec["valores"].values()) for rec in lista)
    for row_idx, (nombre, valor) in enumerate([
        ("Formato", formato["name"]), ("Versión", formato["version"]),
        ("Año", year), ("Total registros", len(lista)),
        ("Valor total", total),
    ], 1):
        ws2.cell(row=row_idx, column=1, value=nombre).font = Font(bold=True)
        c = ws2.cell(row=row_idx, column=2, value=valor)
        if isinstance(valor, (int, float)):
            c.number_format = "#,##0"
    ws2.column_dimensions["A"].width = 30
    ws2.column_dimensions["B"].width = 20

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.getvalue()


# ── API pública ────────────────────────────────────────────────────────────

def generar_formato(balance_id, format_code, db, batch_id=None):
    """Genera XML + Excel para un formato. Guarda ambos en GeneratedFile."""
    bal = db.get(Balance, balance_id)
    if not bal:
        raise ValueError("Balance no encontrado.")

    formato = FORMATOS.get(format_code)
    if not formato:
        raise ValueError(
            f"Formato {format_code} no implementado. Disponibles: "
            f"{', '.join(sorted(FORMATOS.keys()))}"
        )

    if batch_id is None:
        batch_id = str(uuid.uuid4())

    # Guardar definición de plantilla
    if not db.query(FormatTemplate).filter_by(code=format_code).first():
        db.add(FormatTemplate(
            code=formato["code"], name=formato["name"],
            version=formato["version"], year=int(bal.period or 0),
            definition=formato,
        ))
        db.commit()

    # Construir registros (una sola vez para XML + Excel)
    lista = _build_records(balance_id, format_code, db)
    year = bal.period or str(datetime.date.today().year)

    archivos = []

    # ── Generar XML ──
    for i in range(0, len(lista), MAX_REGISTROS):
        chunk = lista[i:i + MAX_REGISTROS]
        consec = len([a for a in archivos if a["type"] == "xml"]) + 1
        nombre_xml = _nombre_archivo(format_code, formato["version"], year, consec, "xml")
        xml_text, valor_total = _generar_xml(chunk, formato, year)

        db.add(GeneratedFile(
            tenant_id=bal.tenant_id, balance_id=balance_id,
            format_code=format_code, file_name=nombre_xml,
            xml_content=xml_text, content_type="xml", batch_id=batch_id,
        ))
        archivos.append({
            "file_name": nombre_xml, "type": "xml",
            "registros": len(chunk), "valor_total": valor_total,
        })

    # ── Generar Excel ──
    excel_bytes = _generar_excel(lista, formato, year)
    nombre_xlsx = f"Formato_{format_code}_v{formato['version']}_{year}.xlsx"

    db.add(GeneratedFile(
        tenant_id=bal.tenant_id, balance_id=balance_id,
        format_code=format_code, file_name=nombre_xlsx,
        excel_content=excel_bytes, content_type="excel", batch_id=batch_id,
    ))
    archivos.append({
        "file_name": nombre_xlsx, "type": "excel",
        "registros": len(lista),
    })

    db.commit()
    return archivos


def exportar_excel(balance_id, format_code, db):
    """Descarga directa: genera Excel y devuelve bytes + nombre."""
    formato = FORMATOS.get(format_code)
    if not formato:
        raise ValueError(f"Formato {format_code} no implementado.")
    bal = db.get(Balance, balance_id)
    if not bal:
        raise ValueError("Balance no encontrado.")
    lista = _build_records(balance_id, format_code, db)
    year = bal.period or str(datetime.date.today().year)
    excel_bytes = _generar_excel(lista, formato, year)
    nombre = f"Formato_{format_code}_v{formato['version']}_{year}.xlsx"
    return excel_bytes, nombre
