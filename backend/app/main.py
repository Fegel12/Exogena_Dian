# -*- coding: utf-8 -*-
"""Punto de entrada del backend (FastAPI)."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, DATA_DIR
import os
from app.models import Base
import app.models  # noqa: F401  (registra los modelos)
from app.routers import companies, balances, generate, puc

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Portal Exógena DIAN", version="0.1.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Servir archivos estáticos (plantillas, ejemplos)
os.makedirs(DATA_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=DATA_DIR), name="static")

app.include_router(companies.router)
app.include_router(balances.router)
app.include_router(generate.router)
app.include_router(puc.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "Portal Exógena DIAN"}
