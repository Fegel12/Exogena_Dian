"""Carga conceptos DIAN reales para los formatos principales.
Fuente: catálogo oficial DIAN para información exógena."""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.database import SessionLocal
from app.models import TemplateRule, FormatTemplate

# Formatos DIAN según Resolución 000227/2025
FORMATOS = [
    ("1001", "Pagos o abonos en cuenta y retenciones practicadas", 11),
    ("1005", "Impuesto a las ventas por pagar (descontable)", 9),
    ("1647", "Ingresos recibidos para terceros residentes", 3),
    ("2821", "APC Certificados de Utilidad Común (CUC)", 1),
    ("2822", "Certificaciones beneficios Ley 1715/2014", 1),
    ("2823", "Resoluciones ingresos no constitutivos de renta", 1),
    ("2824", "Idem 2823 (segundo aspecto)", 1),
    ("2825", "Certificados inversión/donación cinematográfica", 1),
    ("2829", "Resoluciones crédito fiscal art. 256-1 E.T.", 1),
    ("2840", "Certificaciones primer empleo y adulto mayor", 1),
    ("2854", "Ingresos recibidos para terceros del exterior", 1),
    ("2856", "Reporte operaciones con activos digitales", 1),
    ("1476", "Registros catastrales y de impuesto predial", 13),
    ("2574", "No causación del impuesto al carbono", 3),
    ("5247", "Pagos y retenciones colaboración empresarial", 2),
    ("5248", "Ingresos recibidos colaboración empresarial", 2),
    ("5249", "IVA descontable colaboración empresarial", 2),
    ("5250", "IVA generado colaboración empresarial", 2),
    ("5251", "Saldos cuentas por cobrar colaboración empresarial", 2),
    ("5252", "Saldos cuentas por pagar colaboración empresarial", 2),
]

# Conceptos DIAN oficiales para formato 1001 (pagos/retenciones)
CONCEPTOS_1001 = [
    (5001, "Salarios, honorarios, comisiones y servicios"),
    (5002, "Arrendamientos de bienes muebles"),
    (5003, "Arrendamientos de bienes inmuebles"),
    (5004, "Intereses y rendimientos financieros"),
    (5005, "Servicios técnicos y de asistencia técnica"),
    (5006, "Regalías y explotación de intangibles"),
    (5007, "Dividendos y participaciones"),
    (5008, "Beneficios a trabajadores (pagos indirectos)"),
    (5009, "Otros pagos y abonos en cuenta"),
    (5010, "Compras de bienes y productos"),
    (5011, "Pensiones de jubilación, invalidez, vejez y sobrevivientes"),
    (5012, "Pagos a proveedores del exterior"),
    (5013, "Pagos a través de tarjetas de crédito/débito"),
    
    # Retenciones renta
    (5020, "Retención en la fuente por salarios"),
    (5021, "Retención en la fuente por honorarios"),
    (5022, "Retención en la fuente por comisiones"),
    (5023, "Retención en la fuente por servicios"),
    (5024, "Retención en la fuente por arrendamientos"),
    (5025, "Retención en la fuente por intereses"),
    (5026, "Retención en la fuente por rendimientos financieros"),
    (5027, "Retención en la fuente por dividendos"),
    (5028, "Retención en la fuente por otros conceptos"),
    (5029, "Retención en la fuente por compras"),
    (5030, "Retención en la fuente por servicios técnicos"),
    (5031, "Retención en la fuente por regalías"),
    
    # Retenciones IVA
    (5040, "Retención en la fuente de IVA - servicios"),
    (5041, "Retención en la fuente de IVA - compras"),
    (5042, "Retención en la fuente de IVA - régimen simplificado"),
    (5043, "Retención en la fuente de IVA - otros"),
    
    # Retenciones ICA
    (5050, "Retención en la fuente de ICA"),
    (5051, "Autorretención de ICA"),
    
    # Otros
    (5060, "Rendimientos financieros no gravados"),
    (5061, "Pagos exentos de retención"),
    (5062, "Pagos no sujetos a retención"),
]

# Conceptos DIAN para formato 1005 (IVA descontable)
CONCEPTOS_1005 = [
    (5101, "IVA descontable por compras de bienes"),
    (5102, "IVA descontable por servicios"),
    (5103, "IVA descontable por arrendamientos"),
    (5104, "IVA descontable por importaciones"),
    (5105, "IVA descontable por compras a régimen simplificado"),
    (5106, "IVA descontable por activos fijos"),
    (5107, "IVA descontable por otros conceptos"),
    (5108, "IVA descontable por compras con tarjeta de crédito"),
    (5109, "IVA retenido que se descuenta"),
]

# Conceptos DIAN formato 1647 (ingresos a terceros)
CONCEPTOS_1647 = [
    (5201, "Ingresos por honorarios"),
    (5202, "Ingresos por comisiones"),
    (5203, "Ingresos por servicios"),
    (5204, "Ingresos por arrendamientos"),
    (5205, "Ingresos por intereses y rendimientos"),
    (5206, "Ingresos por venta de bienes"),
    (5207, "Ingresos por regalías"),
    (5208, "Ingresos por dividendos"),
    (5209, "Otros ingresos"),
    (5210, "Ingresos por actividades agropecuarias"),
]


def seed(db):
    # 1. Crear formatos
    for code, name, version in FORMATOS:
        exists = db.query(FormatTemplate).filter_by(code=code).first()
        if not exists:
            db.add(FormatTemplate(code=code, name=name, version=str(version), year=2025, definition={}))
    
    # 2. Cargar conceptos 1001
    for cpt, nombre in CONCEPTOS_1001:
        exists = db.query(TemplateRule).filter_by(format_code="1001", concepto=cpt).first()
        if not exists:
            db.add(TemplateRule(
                format_code="1001", concepto=cpt, concepto_nombre=nombre,
                doc_types="NIT,CC", campo_valor="closing",
                notas=f"Concepto DIAN {cpt}"
            ))
    
    # 3. Cargar conceptos 1005
    for cpt, nombre in CONCEPTOS_1005:
        exists = db.query(TemplateRule).filter_by(format_code="1005", concepto=cpt).first()
        if not exists:
            db.add(TemplateRule(
                format_code="1005", concepto=cpt, concepto_nombre=nombre,
                doc_types="NIT,CC", campo_valor="credits",
                notas=f"Concepto DIAN {cpt}"
            ))
    
    # 4. Cargar conceptos 1647
    for cpt, nombre in CONCEPTOS_1647:
        exists = db.query(TemplateRule).filter_by(format_code="1647", concepto=cpt).first()
        if not exists:
            db.add(TemplateRule(
                format_code="1647", concepto=cpt, concepto_nombre=nombre,
                doc_types="NIT,CC", campo_valor="credits",
                notas=f"Concepto DIAN {cpt}"
            ))
    
    db.commit()
    print(f"Cargados: {len(CONCEPTOS_1001)} conceptos 1001, {len(CONCEPTOS_1005)} 1005, {len(CONCEPTOS_1647)} 1647")
    print(f"Formatos: {len(FORMATOS)} registrados")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
