# -*- coding: utf-8 -*-
"""Pruebas de humo (smoke) del Portal Exógena DIAN.

Cubren: carga del PUC, importador del balance, motor de validación,
generador XML del formato 1001 y endpoints de la API.
"""
import os
from app.models import (PucAccount, Tenant, BalanceRow, ValidationIssue,
                        TemplateRule, GeneratedFile)


# ---------- PUC ----------

def test_puc_se_carga(db):
    from app.services.puc_loader import cargar_puc
    puc_txt = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                           "data", "puc.txt")
    n = cargar_puc(puc_txt, db)
    assert n > 2000


def test_puc_tiene_cuentas_clave(db):
    from app.services.puc_loader import cargar_puc
    puc_txt = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                           "data", "puc.txt")
    cargar_puc(puc_txt, db)
    for cod in ("1", "1105", "1330", "2210", "2335", "143501", "17"):
        assert db.query(PucAccount).filter_by(code=cod).first() is not None, cod


# ---------- Importador ----------

def _importar(db, balance_real):
    from app.services.balance_importer import importar_balance
    t = Tenant(name="Empresa de prueba", nit="0-0")
    db.add(t)
    db.flush()
    return importar_balance(balance_real, t.id, db)


def test_importa_periodo_y_cuadre(db, balance_real):
    bal = _importar(db, balance_real)
    assert bal.period == "2025"
    assert abs(bal.total_debitos - bal.total_creditos) < 1.0
    assert bal.total_activo > 0


def test_importa_filas(db, balance_real):
    bal = _importar(db, balance_real)
    n = db.query(BalanceRow).filter_by(balance_id=bal.id).count()
    assert n > 500


# ---------- Validador ----------

def test_validacion_naturaleza(db, balance_real):
    from app.services.validator import validar_balance
    bal = _importar(db, balance_real)
    res = validar_balance(bal.id, db)
    assert res["total"] > 0
    nat = (db.query(ValidationIssue)
           .filter_by(balance_id=bal.id, issue_type="NATURE_VIOLATION", severity="error").count())
    assert nat == 28  # coincide con el análisis manual del balance de muestra


def test_validacion_sin_falsos_cuadre(db, balance_real):
    from app.services.validator import validar_balance
    bal = _importar(db, balance_real)
    validar_balance(bal.id, db)
    assert db.query(ValidationIssue).filter_by(balance_id=bal.id, issue_type="CUADRE").count() == 0
    assert (db.query(ValidationIssue)
            .filter_by(balance_id=bal.id, issue_type="PUC_MISSING", severity="error").count()) == 0
    assert (db.query(ValidationIssue)
            .filter_by(balance_id=bal.id, issue_type="THIRD_PARTY_SUM").count()) == 0


def test_errores_con_accion(db, balance_real):
    from app.services.validator import validar_balance
    bal = _importar(db, balance_real)
    validar_balance(bal.id, db)
    mensajes = db.query(ValidationIssue).filter_by(balance_id=bal.id).limit(30).all()
    assert all((i.action or "").strip() for i in mensajes)


# ---------- Generador XML ----------

def test_genera_xml_1001(db, balance_real):
    from app.services.template_engine import generar_formato
    bal = _importar(db, balance_real)
    db.add(TemplateRule(format_code="1001", concepto=9001, concepto_nombre="ejemplo",
                        cuentas_desde="5110", cuentas_hasta="511099",
                        doc_types="NIT,CC", campo_valor="pago"))
    db.commit()
    archivos = generar_formato(bal.id, "1001", db)
    assert len(archivos) >= 1
    gf = db.query(GeneratedFile).order_by(GeneratedFile.id.desc()).first()
    xml = gf.xml_content
    assert gf.file_name.startswith("Dmuisca_") and gf.file_name.endswith(".xml")
    assert "<mas>" in xml and "</mas>" in xml
    for k in ("Ano", "CodCpt", "Formato", "Version", "NumEnvio", "FecEnvio",
              "FecInicial", "FecFinal", "ValorTotal", "CantReg"):
        assert f"<{k}>" in xml, k
    for k in ("cpt", "tdoc", "nid", "raz", "pais", "pago", "retp"):
        assert f"<{k}>" in xml, k
    assert "ISO-8859-1" in xml


# ---------- Terceros RUES ----------

def test_carga_terceros_muestra(tmp_path, monkeypatch):
    """El cargador de terceros lee el TXT de muestra y guarda datos correctos."""
    import app.database as db_mod
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.models import Base as B, ThirdParty
    import app.models  # noqa: F401

    engine = create_engine(f"sqlite:///{tmp_path / 'terceros.db'}")
    B.metadata.create_all(engine)
    monkeypatch.setattr(db_mod, "SessionLocal", sessionmaker(bind=engine))

    from cargar_terceros import cargar_terceros
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                    "scripts"))
    muestra = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                           "data", "terceros_muestra.txt")
    total, duplicados = cargar_terceros(muestra)
    assert total == 16
    assert duplicados == 0
    sesion = db_mod.SessionLocal()
    assert sesion.query(ThirdParty).count() == 16
    nit = sesion.query(ThirdParty).filter_by(doc_number="901955673").first()
    assert nit is not None and nit.name.startswith("ANGELICAL") and nit.estado == "ACTIVA"
    cc = sesion.query(ThirdParty).filter_by(doc_number="52233283").first()
    assert cc is not None and cc.estado == "CANCELADA"
    sesion.close()
    engine.dispose()


def test_validacion_terceros_tolerante_dv(db):
    """La validación contra RUES tolera el dígito de verificación y detecta cancelados."""
    from app.models import Tenant, Balance, BalanceRow
    from app.services.validator import validar_balance
    from app.services.puc_loader import cargar_puc
    puc_txt = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                           "data", "puc.txt")
    cargar_puc(puc_txt, db)
    from app.models import ThirdParty
    db.add(ThirdParty(doc_type="NIT", doc_number="901955673", name="ANGELICAL Y MANANTIAL SAS",
                      estado="ACTIVA"))
    db.add(ThirdParty(doc_type="CC", doc_number="52233283", name="OSANA ROJAS CORDOBA",
                      estado="CANCELADA"))
    db.commit()
    t = Tenant(name="T", nit="0")
    db.add(t)
    db.flush()
    bal = Balance(tenant_id=t.id, period="2025")
    db.add(bal)
    db.flush()
    db.add(BalanceRow(balance_id=bal.id, tenant_id=t.id, row_type="thirdparty", code="2205",
                      account_name="PROVEEDORES", level=4, class_id=2, nature="C",
                      third_party_name="ANGELICAL Y MANANTIAL SAS", doc_type="NIT",
                      doc_number="9019556735", credits=100, closing=100, saldo_normalized=100))
    db.add(BalanceRow(balance_id=bal.id, tenant_id=t.id, row_type="thirdparty", code="1305",
                      account_name="CLIENTES", level=4, class_id=1, nature="D",
                      third_party_name="OSANA ROJAS CORDOBA", doc_type="CC",
                      doc_number="52233283", debits=10, closing=10, saldo_normalized=10))
    db.add(BalanceRow(balance_id=bal.id, tenant_id=t.id, row_type="thirdparty", code="2205",
                      account_name="PROVEEDORES", level=4, class_id=2, nature="C",
                      third_party_name="EMPRESA FANTASMA SAS", doc_type="NIT",
                      doc_number="999999999", credits=10, closing=10, saldo_normalized=10))
    db.commit()
    validar_balance(bal.id, db)
    nf = db.query(ValidationIssue).filter_by(balance_id=bal.id,
                                             issue_type="THIRD_PARTY_NOT_FOUND").count()
    nc = db.query(ValidationIssue).filter_by(balance_id=bal.id,
                                             issue_type="THIRD_PARTY_CANCELLED").count()
    assert nf == 1  # el NIT con DV coincide con RUES; solo la fantasma no existe
    assert nc == 1  # el CC cancelado se detecta


# ---------- API ----------

def test_api_health():
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)
    assert client.get("/api/health").status_code == 200


def test_api_companies_y_dashboard():
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)
    assert client.get("/api/companies").status_code == 200
    r = client.get("/api/companies/1/dashboard")
    assert r.status_code == 200
    assert "totales" in r.json()
