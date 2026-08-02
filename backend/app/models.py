# -*- coding: utf-8 -*-
"""Modelos de datos. Todas las tablas de negocio llevan tenant_id (multiusuario)."""
from datetime import datetime, timezone
from sqlalchemy import (Column, Integer, String, Float, Text, DateTime,
                        ForeignKey, Boolean, JSON)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def _ahora():
    return datetime.now(timezone.utc)


class Tenant(Base):
    """Empresa/compañía. El superusuario puede ver todas; el usuario solo las suyas."""
    __tablename__ = "tenants"
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    nit = Column(String(20), unique=True)
    created_at = Column(DateTime, default=_ahora)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(200), default="")
    role = Column(String(20), default="user")  # superuser | user
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)  # None = superusuario


class PucAccount(Base):
    """Catálogo del Plan Único de Cuentas (Decreto 2650/1993)."""
    __tablename__ = "puc_accounts"
    id = Column(Integer, primary_key=True)
    code = Column(String(12), unique=True, index=True)
    name = Column(String(300))
    level = Column(Integer)      # 1, 2, 4 o 6 dígitos
    class_id = Column(Integer)   # 1..9
    nature = Column(String(1))   # D = débito, C = crédito


class Balance(Base):
    __tablename__ = "balances"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True)
    period = Column(String(10))
    nit_empresa = Column(String(20))
    file_name = Column(String(300))
    imported_at = Column(DateTime, default=_ahora)
    total_debitos = Column(Float, default=0)
    total_creditos = Column(Float, default=0)
    total_activo = Column(Float, default=0)
    total_pasivo = Column(Float, default=0)
    total_patrimonio = Column(Float, default=0)
    total_ingresos = Column(Float, default=0)
    total_gastos = Column(Float, default=0)
    total_costos = Column(Float, default=0)


class BalanceRow(Base):
    """Filas del balance: cuentas y desglose por terceros."""
    __tablename__ = "balance_rows"
    id = Column(Integer, primary_key=True)
    balance_id = Column(Integer, ForeignKey("balances.id"), index=True)
    tenant_id = Column(Integer, index=True)
    row_type = Column(String(10))        # account | thirdparty
    code = Column(String(12), index=True)
    account_name = Column(String(300))
    level = Column(Integer)
    class_id = Column(Integer)
    nature = Column(String(1))           # D/C según la clase
    third_party_name = Column(String(300))
    doc_type = Column(String(20))        # NIT | CC | SIN | ...
    doc_number = Column(String(30))
    opening = Column(Float, default=0)
    debits = Column(Float, default=0)
    credits = Column(Float, default=0)
    closing = Column(Float, default=0)
    saldo_normalized = Column(Float, default=0)  # >= 0 si cumple su naturaleza


class ValidationIssue(Base):
    __tablename__ = "validation_issues"
    id = Column(Integer, primary_key=True)
    balance_id = Column(Integer, ForeignKey("balances.id"), index=True)
    tenant_id = Column(Integer, index=True)
    issue_type = Column(String(40))
    severity = Column(String(10))        # error | warning | info
    code = Column(String(12))
    account_name = Column(String(300))
    third_party = Column(String(300))
    amount = Column(Float)
    message = Column(Text)               # qué pasó
    action = Column(Text)                # qué hacer
    created_at = Column(DateTime, default=_ahora)


class ThirdParty(Base):
    """Terceros RUES (cámaras de comercio) cargados desde datos.gov.co."""
    __tablename__ = "third_parties"
    id = Column(Integer, primary_key=True)
    doc_type = Column(String(10), index=True)
    doc_number = Column(String(30), index=True)
    name = Column(String(300))
    camara_code = Column(String(10))
    camara_name = Column(String(100))
    matricula = Column(String(30))
    estado = Column(String(50))
    ciiu = Column(String(200))
    updated_at = Column(String(30))


class FormatTemplate(Base):
    """Definición de un formato DIAN (estructura de campos por anexo)."""
    __tablename__ = "format_templates"
    id = Column(Integer, primary_key=True)
    code = Column(String(10), unique=True)
    name = Column(String(200))
    version = Column(String(10))
    year = Column(Integer)
    definition = Column(JSON)            # cab + contenido + reglas de nombre


class TemplateRule(Base):
    """Regla de parametrización: qué cuentas alimentan qué concepto del formato."""
    __tablename__ = "template_rules"
    id = Column(Integer, primary_key=True)
    format_code = Column(String(10), index=True)
    concepto = Column(Integer)
    concepto_nombre = Column(String(200))
    cuentas_desde = Column(String(12))
    cuentas_hasta = Column(String(12))
    doc_types = Column(String(100))      # NIT,CC,SIN (vacío = todos)
    campo_valor = Column(String(30))     # closing | debits | credits
    notas = Column(Text)


class GeneratedFile(Base):
    __tablename__ = "generated_files"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, index=True)
    balance_id = Column(Integer, ForeignKey("balances.id"))
    format_code = Column(String(10))
    file_name = Column(String(300))
    xml_content = Column(Text)
    created_at = Column(DateTime, default=_ahora)
