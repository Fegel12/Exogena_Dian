# -*- coding: utf-8 -*-
"""Configuración de pytest: agrega el backend al path y expone la base temporal."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base
import app.models  # noqa: F401

BALANCE_REAL = os.environ.get(
    "EXOGENA_BALANCE",
    r"C:/Users/egelv/OneDrive - GVA GROUP SAS/Potal WEB/Insumos/"
    r"2025 12 Balance prueba  CON TERCEROS_1.xlsx",
)

PUC_TXT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                       "data", "puc.txt")


@pytest.fixture()
def db(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    from app.services.puc_loader import cargar_puc
    cargar_puc(PUC_TXT, session)  # el catálogo PUC disponible en todos los tests
    yield session
    session.close()
    engine.dispose()


@pytest.fixture()
def balance_real():
    if not os.path.exists(BALANCE_REAL):
        pytest.skip(f"No se encontró el balance de muestra: {BALANCE_REAL}")
    return BALANCE_REAL
