# -*- coding: utf-8 -*-
"""Rutas de generación de archivos XML para la DIAN."""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Balance, GeneratedFile, Tenant, TemplateRule
from app.services.template_engine import generar_formato, exportar_excel

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



@router.get("/files/{file_id}/download")
def descargar(file_id: int, db: Session = Depends(get_db)):
    gf = db.get(GeneratedFile, file_id)
    if not gf:
        raise HTTPException(404, "Archivo no encontrado.")
    return Response(
        content=gf.xml_content.encode("ISO-8859-1"),
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="{gf.file_name}"'},
    )


@router.post("/companies/{tenant_id}/export-excel")
def exportar_excel_endpoint(tenant_id: int, formato: str = Query("1001"),
                            db: Session = Depends(get_db)):
    bal = (db.query(Balance).filter_by(tenant_id=tenant_id)
           .order_by(Balance.id.desc()).first())
    if not bal:
        raise HTTPException(404, "Esta empresa aún no tiene balances importados.")
    try:
        contenido, nombre_archivo = exportar_excel(bal.id, formato, db)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return Response(
        content=contenido,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{nombre_archivo}"'},
    )


# ── Parametrización (configurador de cuentas) ──

@router.get("/template-rules")
def listar_reglas(formato: str = Query("1001"), db: Session = Depends(get_db)):
    reglas = db.query(TemplateRule).filter_by(format_code=formato).order_by(TemplateRule.concepto).all()
    return [
        {"id": r.id, "format_code": r.format_code, "concepto": r.concepto,
         "concepto_nombre": r.concepto_nombre, "cuentas_desde": r.cuentas_desde,
         "cuentas_hasta": r.cuentas_hasta, "doc_types": r.doc_types,
         "campo_valor": r.campo_valor, "notas": r.notas}
        for r in reglas
    ]


@router.post("/template-rules")
def crear_regla(payload: dict, db: Session = Depends(get_db)):
    r = TemplateRule(
        format_code=payload.get("format_code", "1001"),
        concepto=int(payload["concepto"]),
        concepto_nombre=payload.get("concepto_nombre", ""),
        cuentas_desde=payload.get("cuentas_desde", ""),
        cuentas_hasta=payload.get("cuentas_hasta", ""),
        doc_types=payload.get("doc_types", ""),
        campo_valor=payload.get("campo_valor", "closing"),
        notas=payload.get("notas", ""),
    )
    db.add(r)
    db.commit()
    return {"id": r.id, "concepto": r.concepto}


@router.delete("/template-rules/{rule_id}")
def eliminar_regla(rule_id: int, db: Session = Depends(get_db)):
    r = db.get(TemplateRule, rule_id)
    if not r:
        raise HTTPException(404, "Regla no encontrada.")
    db.delete(r)
    db.commit()
    return {"ok": True}

