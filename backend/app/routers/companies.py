# -*- coding: utf-8 -*-
"""Rutas de empresas (multiusuario: el superusuario ve todas)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Tenant, Balance

router = APIRouter(prefix="/api/companies", tags=["empresas"])


@router.get("")
def listar_companies(db: Session = Depends(get_db)):
    tenants = db.query(Tenant).order_by(Tenant.id).all()
    return [
        {
            "id": t.id, "name": t.name, "nit": t.nit,
            "balance_count": db.query(Balance).filter_by(tenant_id=t.id).count(),
        }
        for t in tenants
    ]


@router.post("")
def crear_company(payload: dict, db: Session = Depends(get_db)):
    nombre = (payload.get("name") or "").strip()
    if not nombre:
        raise HTTPException(400, "El nombre de la empresa es obligatorio.")
    t = Tenant(name=nombre, nit=(payload.get("nit") or "").strip())
    db.add(t)
    db.commit()
    db.refresh(t)
    return {"id": t.id, "name": t.name, "nit": t.nit}


@router.get("/{tenant_id}")
def detalle_company(tenant_id: int, db: Session = Depends(get_db)):
    t = db.get(Tenant, tenant_id)
    if not t:
        raise HTTPException(404, "Empresa no encontrada.")
    balances = (db.query(Balance).filter_by(tenant_id=tenant_id)
                .order_by(Balance.id.desc()).all())
    return {
        "id": t.id, "name": t.name, "nit": t.nit,
        "balances": [{"id": b.id, "period": b.period, "file_name": b.file_name,
                      "imported_at": str(b.imported_at or "")} for b in balances],
    }
