# -*- coding: utf-8 -*-
"""Importador del balance de prueba exportado por WorldOffice (u otro programa con la misma forma).

Detalles que maneja:
- Celdas combinadas: a veces "codigo" y "nombre" vienen en una sola celda y a veces separados.
- Filas de terceros (col B = "NIT 098968020-5", "CC 4344944054", "SIN 9543"...).
- Filas TOTAL (se usan para capturar los totales por clase).
- El saldo normalizado: positivo = cumple la naturaleza de su clase.
"""
import os
import re
from app.models import Balance, BalanceRow, ValidationIssue

NAT = {1: "D", 2: "C", 3: "C", 4: "C", 5: "D", 6: "D", 7: "D", 8: "D", 9: "C"}
COD_ONLY = re.compile(r"^(\d{1,12})$")
COD_NAME = re.compile(r"^(\d{1,12})\s+(.+)$")

CLAVES_TOTAL = [
    ("total_activo", "TOTAL ACTIVO"),
    ("total_pasivo", "TOTAL PASIVO"),
    ("total_patrimonio", "TOTAL PATRIMONIO"),
    ("total_ingresos", "TOTAL INGRESOS"),
    ("total_gastos", "TOTAL GASTOS"),
    ("total_costos", "TOTAL COSTOS"),  # cubre "TOTAL COSTOS DE VENTAS" y "DE PRODUCCIÓN"
]


def _num(x):
    try:
        return float(x or 0)
    except Exception:
        return 0.0


def parse_doc_id(b):
    """'NIT 098968020-5' -> ('NIT','098968020-5'); 'SIN 9543' -> ('SIN','9543')."""
    b = (b or "").strip()
    if not b:
        return "", ""
    partes = b.split(None, 1)
    t = partes[0].upper()
    n = partes[1].strip() if len(partes) > 1 else ""
    return t, n


def importar_balance(file_path, tenant_id, db):
    import openpyxl
    wb = openpyxl.load_workbook(file_path, data_only=True, read_only=True)
    ws = wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))

    start = next((i for i, r in enumerate(rows) if r and r[0] and "Código Cuenta" in str(r[0])), None)
    if start is None:
        raise ValueError("No se encontró el encabezado del balance (columna 'Código Cuenta'). "
                         "¿Es un balance de prueba de WorldOffice?")

    # Periodo y NIT de la empresa desde el bloque superior del archivo
    period, nit_emp = "", ""
    for r in rows[:start]:
        for c in r:
            s = str(c or "")
            m = re.search(r"Entre 01/\d{2}/(\d{4}) y 31/12/\d{4}", s)
            if m:
                period = m.group(1)
            m2 = re.search(r"NIT\s+([\d\-]+)", s)
            if m2 and not nit_emp:
                nit_emp = m2.group(1)

    bal = Balance(tenant_id=tenant_id, period=period, nit_empresa=nit_emp,
                  file_name=os.path.basename(file_path))
    db.add(bal)
    db.flush()

    cuenta_actual, nombre_cuenta, nivel = None, "", 0
    pila = []  # para validar jerarquía: (nivel, codigo)
    filas_cuenta = {}  # nombre normalizado -> fila de cuenta (para asignar subtotales)

    def _nom(n):
        return re.sub(r"\s+", " ", (n or "")).strip().upper()

    def add_issue(tipo, severidad, cod, nombre, tercero, monto, msg, accion):
        db.add(ValidationIssue(balance_id=bal.id, tenant_id=tenant_id, issue_type=tipo,
                               severity=severidad, code=cod, account_name=nombre,
                               third_party=tercero, amount=monto, message=msg, action=accion))

    for r in rows[start + 1:]:
        a = str(r[0]).strip() if r[0] is not None else ""
        b = str(r[1]).strip() if r[1] is not None else ""
        si, deb, cred, sal = _num(r[2]), _num(r[3]), _num(r[4]), _num(r[5])
        if not a:
            continue
        up = a.upper()

        if up.startswith("TOTAL"):
            for clave, etq in CLAVES_TOTAL:
                if up.startswith(etq):
                    setattr(bal, clave, sal)
            if up == "TOTAL DEBITOS Y CREDITOS":
                bal.total_debitos = deb
                bal.total_creditos = cred
            else:
                # subtotal de una cuenta: asignar a la fila de cuenta con ese nombre
                # (solo si la fila aún no tiene valores -> primer subtotal gana)
                fila = filas_cuenta.get(_nom(up[5:]))
                if fila is not None and abs(fila.closing) < 0.005 and abs(fila.debits) < 0.005:
                    fila.closing, fila.debits, fila.credits = sal, deb, cred
            continue

        m = COD_ONLY.match(a)
        if m:
            cuenta_actual, nombre_cuenta = m.group(1), b
        else:
            m2 = COD_NAME.match(a)
            if m2:
                cuenta_actual, nombre_cuenta = m2.group(1), m2.group(2)
            else:
                # fila de tercero
                if cuenta_actual:
                    cls = int(cuenta_actual[0])
                    nat = NAT[cls]
                    saldo_norm = (deb - cred) if nat == "D" else (cred - deb)
                    t, n = parse_doc_id(b)
                    db.add(BalanceRow(balance_id=bal.id, tenant_id=tenant_id, row_type="thirdparty",
                                      code=cuenta_actual, account_name=nombre_cuenta,
                                      level=len(cuenta_actual), class_id=cls, nature=nat,
                                      third_party_name=a, doc_type=t, doc_number=n,
                                      opening=si, debits=deb, credits=cred, closing=sal,
                                      saldo_normalized=saldo_norm))
                continue

        # fila de cuenta
        nivel = len(cuenta_actual)
        cls = int(cuenta_actual[0])
        nat = NAT[cls]
        saldo_norm = (deb - cred) if nat == "D" else (cred - deb)
        row_cuenta = BalanceRow(balance_id=bal.id, tenant_id=tenant_id, row_type="account",
                                code=cuenta_actual, account_name=nombre_cuenta, level=nivel,
                                class_id=cls, nature=nat, opening=si, debits=deb, credits=cred,
                                closing=sal, saldo_normalized=saldo_norm)
        db.add(row_cuenta)
        filas_cuenta[_nom(nombre_cuenta or cuenta_actual)] = row_cuenta

        # jerarquía: la cuenta debe colgar de su grupo (2 dígitos) correcto
        while pila and pila[-1][0] >= nivel:
            pila.pop()
        if nivel >= 4:
            grupo = cuenta_actual[:2]
            ancestro = next((p for p in reversed(pila) if p[0] <= 2), None)
            if ancestro and ancestro[0] == 2 and ancestro[1] != grupo:
                add_issue("PUC_HIERARCHY", "error", cuenta_actual, nombre_cuenta, None, None,
                          f"La cuenta {cuenta_actual} ({nombre_cuenta}) aparece dentro del grupo "
                          f"{ancestro[1]}, pero su código indica que pertenece al grupo {grupo}.",
                          f"Revise la exportación del balance: la cuenta {cuenta_actual} debe estar "
                          f"bajo el grupo {grupo} y no bajo {ancestro[1]}.")
        pila.append((nivel, cuenta_actual[:2]))

    db.commit()
    return bal
