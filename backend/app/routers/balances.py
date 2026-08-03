# -*- coding: utf-8 -*-
"""Rutas de balances: importar archivo, dashboard, exportar incidencias, informe terceros."""
import os, io, shutil
from datetime import datetime
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.database import get_db, DATA_DIR
from app.models import Balance, BalanceRow, Tenant, ValidationIssue, ThirdParty
from app.services.balance_importer import importar_balance
from app.services.validator import validar_balance
import openpyxl

router = APIRouter(prefix="/api/companies/{tenant_id}", tags=["balances"])
UPLOADS = os.path.join(DATA_DIR, "uploads")
os.makedirs(UPLOADS, exist_ok=True)


@router.post("/balances")
async def importar(tenant_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not db.get(Tenant, tenant_id):
        raise HTTPException(404, "Empresa no encontrada.")
    if not (file.filename or "").lower().endswith((".xlsx", ".xls")):
        raise HTTPException(400, "El archivo debe ser Excel (.xlsx o .xls).")
    destino = os.path.join(UPLOADS, f"t{tenant_id}_{file.filename}")
    with open(destino, "wb") as f:
        shutil.copyfileobj(file.file, f)
    try:
        bal = importar_balance(destino, tenant_id, db)
    except ValueError as e:
        raise HTTPException(400, str(e))
    resultado = validar_balance(bal.id, db)
    return {"balance_id": bal.id, "period": bal.period, "validacion": resultado}


@router.get("/dashboard")
def dashboard(tenant_id: int, db: Session = Depends(get_db)):
    bal = (db.query(Balance).filter_by(tenant_id=tenant_id)
           .order_by(Balance.id.desc()).first())
    if not bal:
        raise HTTPException(404, "Esta empresa aún no tiene balances importados.")
    utilidad = bal.total_ingresos - bal.total_gastos - bal.total_costos
    rhs = bal.total_pasivo + bal.total_patrimonio + utilidad
    tol = max(1.0, abs(bal.total_activo) * 0.0001)

    issues = db.query(ValidationIssue).filter_by(balance_id=bal.id).all()
    por_tipo = {}
    por_severidad = {"error": 0, "warning": 0, "info": 0}
    for i in issues:
        por_tipo[i.issue_type] = por_tipo.get(i.issue_type, 0) + 1
        por_severidad[i.severity] = por_severidad.get(i.severity, 0) + 1

    # las cuentas que no cumplen su naturaleza van primero
    orden = {"NATURE_VIOLATION": 0, "THIRD_PARTY_SUM": 1, "CUADRE": 2,
             "PUC_HIERARCHY": 3, "PUC_MISSING": 4, "THIRD_PARTY_NOT_FOUND": 5,
             "THIRD_PARTY_CANCELLED": 6}
    issues_sorted = sorted(issues, key=lambda i: (orden.get(i.issue_type, 9),
                                                  i.amount if i.amount else 0))

    return {
        "balance": {"id": bal.id, "period": bal.period, "file_name": bal.file_name},
        "totales": {
            "activo": bal.total_activo, "pasivo": bal.total_pasivo,
            "patrimonio": bal.total_patrimonio, "ingresos": bal.total_ingresos,
            "gastos": bal.total_gastos, "costos": bal.total_costos,
            "debitos": bal.total_debitos, "creditos": bal.total_creditos,
            "utilidad": utilidad,
        },
        "cuadre": {
            "debitos_igual_creditos": abs(bal.total_debitos - bal.total_creditos) <= 1.0,
            "ecuacion_contable": abs(bal.total_activo - rhs) <= tol,
            "diferencia_ecuacion": bal.total_activo - rhs,
        },
        "resumen_incidencias": {"por_tipo": por_tipo, "por_severidad": por_severidad,
                                "total": len(issues)},
        "incidencias": [
            {"id": i.id, "issue_type": i.issue_type, "severity": i.severity,
             "code": i.code, "account_name": i.account_name, "third_party": i.third_party,
             "amount": i.amount, "message": i.message, "action": i.action}
            for i in issues_sorted[:200]
        ],
    }


@router.get("/issues")
def incidencias(tenant_id: int, balance_id: int = None, tipo: str = None,
                db: Session = Depends(get_db)):
    q = db.query(ValidationIssue).join(Balance, ValidationIssue.balance_id == Balance.id)
    q = q.filter(Balance.tenant_id == tenant_id)
    if balance_id:
        q = q.filter(ValidationIssue.balance_id == balance_id)
    if tipo:
        q = q.filter(ValidationIssue.issue_type == tipo)
    return [
        {"id": i.id, "issue_type": i.issue_type, "severity": i.severity,
         "code": i.code, "account_name": i.account_name, "third_party": i.third_party,
         "amount": i.amount, "message": i.message, "action": i.action}
        for i in q.order_by(ValidationIssue.id).limit(500).all()
    ]


# ── Exportar incidencias a Excel ──

@router.get("/issues/export")
def exportar_incidencias(tenant_id: int, db: Session = Depends(get_db)):
    bal = (db.query(Balance).filter_by(tenant_id=tenant_id)
           .order_by(Balance.id.desc()).first())
    if not bal:
        raise HTTPException(404, "No hay balances importados.")

    issues = (db.query(ValidationIssue).filter_by(balance_id=bal.id)
              .order_by(ValidationIssue.issue_type, ValidationIssue.amount).all())

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Incidencias"
    ws.append(["Tipo", "Severidad", "Cuenta", "Nombre Cuenta", "Tercero",
               "Monto", "Qué pasó", "Qué hacer"])

    for i in issues:
        ws.append([i.issue_type, i.severity, i.code, i.account_name,
                   i.third_party, i.amount, i.message, i.action])

    # Auto-ancho
    for col in ws.columns:
        max_len = max((len(str(c.value or "")) for c in col), default=10)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 2, 60)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=incidencias_empresa{tenant_id}.xlsx"},
    )


# ── Informe de terceros (no encontrados + cancelados) ──

@router.get("/terceros/reporte")
def reporte_terceros(tenant_id: int, fmt: str = Query("json"),
                     db: Session = Depends(get_db)):
    bal = (db.query(Balance).filter_by(tenant_id=tenant_id)
           .order_by(Balance.id.desc()).first())
    if not bal:
        raise HTTPException(404, "No hay balances importados.")

    # No encontrados (vienen de validation_issues - rápido)
    not_found = [
        {"cuenta": i.code, "cuenta_nombre": i.account_name,
         "tercero": i.third_party, "monto": i.amount}
        for i in db.query(ValidationIssue)
        .filter_by(balance_id=bal.id, issue_type="THIRD_PARTY_NOT_FOUND").all()
    ]

    # Cancelados: consulta SQL directa (mucho más rápido que ORM anidado)
    cancelados = []
    from sqlalchemy import text
    sql = text("""
        SELECT DISTINCT br.doc_type, br.doc_number, br.third_party_name,
               tp.estado, tp.updated_at, tp.matricula, tp.camara_name
        FROM balance_rows br
        JOIN third_parties tp ON tp.doc_type = br.doc_type AND tp.doc_number = br.doc_number
        WHERE br.balance_id = :bid
          AND br.row_type = 'thirdparty'
          AND tp.estado LIKE '%CANCEL%'
        LIMIT 200
    """)
    rows = db.execute(sql, {"bid": bal.id}).fetchall()
    for r in rows:
        cancelados.append({
            "doc_type": r[0], "doc_number": r[1], "name": r[2],
            "estado": r[3], "fecha_actualizacion": r[4],
            "matricula": r[5], "camara": r[6],
        })

    # Contar total terceros en balance
    total = db.query(BalanceRow).filter_by(
        balance_id=bal.id, row_type="thirdparty").count()

    if fmt == "csv":
        import csv, io as io_mod
        out = io_mod.StringIO()
        w = csv.writer(out)
        w.writerow(["Tipo","Cuenta","Nombre Cuenta","Tercero","Monto","Estado","Fecha Cancelación"])
        for nf in not_found:
            w.writerow(["NO ENCONTRADO", nf["cuenta"], nf["cuenta_nombre"],
                        nf["tercero"], nf["monto"], "", ""])
        for c in cancelados:
            w.writerow(["CANCELADO", "", "", c["name"], "",
                        c["estado"], c["fecha_actualizacion"]])
        out.seek(0)
        return Response(
            content=out.getvalue().encode("utf-8-sig"),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=terceros_empresa{tenant_id}.csv"},
        )

    if fmt == "excel":
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Terceros"
        ws.append(["Tipo","Cuenta","Nombre Cuenta","Tercero","Monto","Estado","Fecha Cancelación"])
        for nf in not_found:
            ws.append(["NO ENCONTRADO", nf["cuenta"], nf["cuenta_nombre"],
                       nf["tercero"], nf["monto"], "", ""])
        for c in cancelados:
            ws.append(["CANCELADO", "", "", c["name"], "",
                       c["estado"], c["fecha_actualizacion"]])
        out = io.BytesIO()
        wb.save(out); out.seek(0)
        return Response(
            content=out.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=terceros_empresa{tenant_id}.xlsx"},
        )

    return {
        "total_terceros_balance": total,
        "no_encontrados": not_found,
        "total_no_encontrados": len(not_found),
        "cancelados": cancelados,
        "total_cancelados": len(cancelados),
    }
