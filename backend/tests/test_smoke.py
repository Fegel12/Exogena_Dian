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
