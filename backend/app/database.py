# -*- coding: utf-8 -*-
"""Conexión a la base de datos (SQLite para desarrollo, lista para PostgreSQL)."""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "exogena.db")

# Para pasar a PostgreSQL en producción solo se cambia la URL y se habilita RLS
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=True, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
