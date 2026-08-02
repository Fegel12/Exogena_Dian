# -*- coding: utf-8 -*-
"""Arranque: crea la base, carga el PUC, crea empresa/usuarios de ejemplo,
carga reglas de ejemplo del formato 1001 e importa + valida el balance de muestra.

Uso:  python scripts/seed.py [ruta_al_balance.xlsx]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, SessionLocal  # noqa: E402
import app.models  # noqa: F401, E402
from app.models import Base, Tenant, User, TemplateRule  # noqa: E402
from app.services.puc_loader import cargar_puc  # noqa: E402
from app.services.balance_importer import importar_balance  # noqa: E402
from app.services.validator import validar_balance  # noqa: E402

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUC_TXT = os.path.join(BASE, "data", "puc.txt")
BALANCE_DEFECTO = (r"C:/Users/egelv/OneDrive - GVA GROUP SAS/Potal WEB/Insumos/"
                   "2025 12 Balance prueba  CON TERCEROS_1.xlsx")

# Reglas de EJEMPLO para el formato 1001 — REEMPLAZAR con el catálogo oficial de
# conceptos de la resolución vigente (las páginas del catálogo están escaneadas).
REGLAS_1001_EJEMPLO = [
    ("9001", "EJEMPLO: Pagos por honorarios", "5110", "511099", "NIT,CC", "pago"),
    ("9002", "EJEMPLO: Pagos por servicios", "5135", "513599", "NIT,CC", "pago"),
    ("9003", "EJEMPLO: Pagos por arrendamientos", "5120", "512099", "NIT,CC", "pago"),
    ("9004", "EJEMPLO: Retenciones practicadas", "2365", "236599", "NIT,CC", "retp"),
    ("9005", "EJEMPLO: Retención IVA", "2367", "236799", "NIT,CC", "comun"),
    ("9006", "EJEMPLO: IVA descontable", "2408", "240899", "NIT,CC", "ided"),
]


def main():
    balance_path = sys.argv[1] if len(sys.argv) > 1 else BALANCE_DEFECTO
    print("=== SIEMBRA DEL PORTAL EXÓGENA DIAN ===")

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 1) PUC
    n_puc = cargar_puc(PUC_TXT, db)
    print(f"1. PUC cargado: {n_puc} cuentas")

    # 2) Empresa y usuarios de ejemplo
    t = Tenant(name="IMDEGHUELES ATHINATY SAS", nit="117718959-8")
    db.add(t)
    db.flush()
    db.add(User(username="superadmin", role="superuser", tenant_id=None))
    db.add(User(username="usuario1", role="user", tenant_id=t.id))
    print(f"2. Empresa demo creada (id={t.id}) + superusuario y usuario")

    # 3) Reglas de ejemplo formato 1001
    for concepto, nombre, desde, hasta, doc_t, campo in REGLAS_1001_EJEMPLO:
        db.add(TemplateRule(format_code="1001", concepto=int(concepto),
                            concepto_nombre=nombre, cuentas_desde=desde,
                            cuentas_hasta=hasta, doc_types=doc_t,
                            campo_valor=campo,
                            notas="REGLA DE EJEMPLO: reemplazar con el catálogo oficial "
                                  "de conceptos de la resolución."))
    print(f"3. {len(REGLAS_1001_EJEMPLO)} reglas de ejemplo del formato 1001 creadas")

    # 4) Importar el balance de muestra
    if not os.path.exists(balance_path):
        print(f"4. AVISO: no se encontró el balance en {balance_path}")
        db.commit()
        return
    bal = importar_balance(balance_path, t.id, db)
    print(f"4. Balance importado (id={bal.id}, periodo={bal.period})")

    # 5) Validar
    res = validar_balance(bal.id, db)
    print(f"5. Validación: {res['total']} incidencias "
          f"({res['errores']} errores, {res['advertencias']} advertencias)")

    print("=== LISTO ===")
    print("Inicie el backend con:  uvicorn app.main:app --reload --port 8000")


if __name__ == "__main__":
    main()
