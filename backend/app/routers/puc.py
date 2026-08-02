# -*- coding: utf-8 -*-
"""Rutas del PUC (catálogo de cuentas)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import PucAccount

router = APIRouter(prefix="/api/puc", tags=["puc"])


@router.get("")
def buscar(search: str = Query(""), limit: int = Query(100), db: Session = Depends(get_db)):
    q = db.query(PucAccount)
    if search:
        q = q.filter(PucAccount.code.like(f"{search}%") | PucAccount.name.ilike(f"%{search}%"))
    return [{"code": p.code, "name": p.name, "level": p.level, "nature": p.nature}
            for p in q.order_by(PucAccount.code).limit(limit).all()]
