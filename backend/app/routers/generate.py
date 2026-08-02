# -*- coding: utf-8 -*-
"""Rutas de generación de archivos XML para la DIAN."""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Balance, GeneratedFile, Tenant
from app.services.template_engine import generar_formato

router = APIRouter(prefix="/api", tags=["generacion"])


@router.post("/companies/{tenant_id}/generate")
def generar(tenant_id: int, formato: str = Query("1001"), db: Session = Depends(get_db)):
    bal = (db.query(Balance).filter_by(tenant_id=tenant_id)
           .order_by(Balance.id.desc()).first())
    if not bal:
        raise HTTPException(404, "Esta empresa aún no tiene balances importados.")
    try:
        archivos = generar_formato(bal.id, formato, db)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"format_code": formato, "archivos": archivos}


@router.get("/companies/{tenant_id}/files")
def listar_archivos(tenant_id: int, db: Session = Depends(get_db)):
    if not db.get(Tenant, tenant_id):
        raise HTTPException(404, "Empresa no encontrada.")
    return [
        {"id": f.id, "format_code": f.format_code, "file_name": f.file_name,
         "created_at": str(f.created_at or "")}
        for f in db.query(GeneratedFile).filter_by(tenant_id=tenant_id)
        .order_by(GeneratedFile.id.desc()).limit(100).all()
    ]


@router.get("/files/{file_id}/download", response_class=PlainTextResponse)
def descargar(file_id: int, db: Session = Depends(get_db)):
    gf = db.get(GeneratedFile, file_id)
    if not gf:
        raise HTTPException(404, "Archivo no encontrado.")
    return PlainTextResponse(gf.xml_content, media_type="application/xml")
