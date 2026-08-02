# -*- coding: utf-8 -*-
"""Punto de entrada del backend (FastAPI)."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.models import Base
import app.models  # noqa: F401  (registra los modelos)
from app.routers import companies, balances, generate, puc

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Portal Exógena DIAN", version="0.1.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(companies.router)
app.include_router(balances.router)
app.include_router(generate.router)
app.include_router(puc.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "Portal Exógena DIAN"}
