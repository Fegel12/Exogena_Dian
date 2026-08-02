# -*- coding: utf-8 -*-
"""Motor de validaciones. Cada error dice: qué pasó, dónde y qué hacer."""
from app.models import (Balance, BalanceRow, ValidationIssue, ThirdParty, PucAccount)

TOL = 1.0  # tolerancia de cuadre en pesos

# Cuentas que legítimamente pueden mostrar saldo contra su naturaleza
EXCEPTION_ACCOUNTS = ["310510", "310515"]      # Capital por suscribir / por cobrar (DB)
EXCEPTION_PREFIXES = ["1592", "240802"]        # Depreciación acumulada / IVA descontable
EXCEPTION_TP_NAME = ["impuestos y aduanas", "dian", "direccion de impuestos"]


def _norm(s):
    return "".join(ch for ch in (s or "") if ch.isdigit())


def es_excepcion(row):
    if row.code in EXCEPTION_ACCOUNTS:
        return True
    if any(row.code.startswith(p) for p in EXCEPTION_PREFIXES):
        return True
    nom = (row.third_party_name or "").lower()
    return any(k in nom for k in EXCEPTION_TP_NAME)


def _add(db, balance_id, tenant_id, tipo, severidad, code, nombre, tercero, monto, msg, accion):
    db.add(ValidationIssue(balance_id=balance_id, tenant_id=tenant_id, issue_type=tipo,
                           severity=severidad, code=code, account_name=nombre,
                           third_party=tercero, amount=monto, message=msg, action=accion))


def validar_balance(balance_id, db, limpiar=True):
    bal = db.get(Balance, balance_id)
    if limpiar:
        db.query(ValidationIssue).filter_by(balance_id=balance_id).delete()
    t = bal.tenant_id

    # 1) Cuadre débitos vs créditos
    if abs(bal.total_debitos - bal.total_creditos) > TOL:
        _add(db, balance_id, t, "CUADRE", "error", None, None, None,
             abs(bal.total_debitos - bal.total_creditos),
             f"Los débitos ({bal.total_debitos:,.2f}) no cuadran con los créditos "
             f"({bal.total_creditos:,.2f}). Diferencia: {bal.total_debitos - bal.total_creditos:,.2f}.",
             "Revise los asientos del periodo; la suma de débitos debe ser igual a la de créditos.")

    # 2) Ecuación contable ampliada: ACTIVO = PASIVO + PATRIMONIO + (INGRESOS - GASTOS - COSTOS)
    utilidad = bal.total_ingresos - bal.total_gastos - bal.total_costos
    rhs = bal.total_pasivo + bal.total_patrimonio + utilidad
    tol = max(1.0, abs(bal.total_activo) * 0.0001)
    if abs(bal.total_activo - rhs) > tol:
        _add(db, balance_id, t, "CUADRE", "error", None, None, None,
             bal.total_activo - rhs,
             f"El balance no cuadra: ACTIVO ({bal.total_activo:,.2f}) ≠ PASIVO + PATRIMONIO + "
             f"UTILIDAD ({rhs:,.2f}). Diferencia: {bal.total_activo - rhs:,.2f}.",
             "Revise los totales por clase (activo, pasivo, patrimonio, ingresos, gastos, costos) "
             "del balance de prueba.")

    # 3) Cuentas que no cumplen su naturaleza (a nivel de tercero)
    terceros = (db.query(BalanceRow)
                .filter_by(balance_id=balance_id, row_type="thirdparty").all())
    for r in terceros:
        if r.saldo_normalized < -0.005 and not es_excepcion(r):
            _add(db, balance_id, t, "NATURE_VIOLATION", "error", r.code, r.account_name,
                 r.third_party_name, r.saldo_normalized,
                 f"La cuenta {r.code} ({r.account_name}) tiene saldo {r.saldo_normalized:,.2f} "
                 f"para el tercero {r.third_party_name}, en contra de su naturaleza de "
                 f"{'débito' if r.nature == 'D' else 'crédito'}.",
                 "Revise los movimientos de ese tercero en la cuenta: puede haber una transacción "
                 "al revés, un saldo mal clasificado o un error de digitación.")

    # 4) Existencia de cuentas en el PUC (solo si el catálogo está cargado)
    cuentas = (db.query(BalanceRow).filter_by(balance_id=balance_id, row_type="account").all())
    puc = {p.code for p in db.query(PucAccount).all()}
    if puc:
        puc6 = {c for c in puc if len(c) == 6}
        for r in cuentas:
            if r.level == 2 and r.code not in puc:
                _add(db, balance_id, t, "PUC_MISSING", "error", r.code, r.account_name, None, None,
                     f"El grupo {r.code} ({r.account_name}) no existe en el PUC oficial.",
                     "Verifique el código: puede ser un grupo creado internamente o un error de exportación.")
            elif r.level == 4 and r.code not in puc:
                _add(db, balance_id, t, "PUC_MISSING", "error", r.code, r.account_name, None, None,
                     f"La cuenta {r.code} ({r.account_name}) no existe en el PUC oficial.",
                     "Verifique el código de la cuenta o si usa una tabla de equivalencias.")
            elif r.level == 6 and r.code not in puc:
                _add(db, balance_id, t, "PUC_MISSING", "warning", r.code, r.account_name, None, None,
                     f"La subcuenta {r.code} ({r.account_name}) no está en el PUC oficial "
                     f"(puede ser una subcuenta interna creada por el programa contable).",
                     "Si es una subcuenta interna, registre la equivalencia en la parametrización; "
                     "si no, revise el código.")
            elif r.level >= 8 and r.code[:6] not in puc6:
                _add(db, balance_id, t, "PUC_MISSING", "warning", r.code, r.account_name, None, None,
                     f"La auxiliar {r.code} ({r.account_name}) cuelga de la subcuenta {r.code[:6]}, "
                     f"que no existe en el PUC oficial.",
                     "Verifique la subcuenta padre: puede ser un código erróneo.")

    # 5) Suma de terceros vs saldo de la cuenta
    por_cuenta = {}
    for r in terceros:
        por_cuenta.setdefault(r.code, 0.0)
        por_cuenta[r.code] += r.closing
    cuentas_rows = {r.code: r for r in cuentas if r.level >= 6}
    for code, suma in por_cuenta.items():
        acct = cuentas_rows.get(code)
        if acct and abs(suma - acct.closing) > TOL:
            _add(db, balance_id, t, "THIRD_PARTY_SUM", "error", code, acct.account_name, None,
                 suma - acct.closing,
                 f"La suma de los saldos de los terceros de la cuenta {code} es {suma:,.2f}, "
                 f"pero el saldo de la cuenta es {acct.closing:,.2f}. Diferencia: {suma - acct.closing:,.2f}.",
                 "Revise los movimientos por tercero de esa cuenta: falta un tercero por asignar, "
                 "sobra uno, o hay movimientos sin tercero que no cuadran.")

    # 6) Terceros contra la base RUES (solo si ya hay terceros cargados)
    if db.query(ThirdParty).count() > 0:
        for r in terceros:
            n = _norm(r.doc_number)
            if not n or r.doc_type in ("SIN",):
                continue
            # búsqueda tolerante al dígito de verificación: exacta y sin el último dígito
            tp = db.query(ThirdParty).filter_by(doc_number=n).first()
            if tp is None and len(n) >= 9:
                tp = db.query(ThirdParty).filter_by(doc_number=n[:-1]).first()
            if tp is None:
                _add(db, balance_id, t, "THIRD_PARTY_NOT_FOUND", "warning", r.code,
                     r.account_name, r.third_party_name, None,
                     f"El tercero {r.doc_type} {r.doc_number} ({r.third_party_name}) no aparece "
                     f"en la base de terceros de cámaras de comercio.",
                     "Verifique si el número de identificación está bien digitado o si el tercero "
                     "está registrado en el RUES.")
            elif tp.estado and "ACTIV" not in tp.estado.upper():
                _add(db, balance_id, t, "THIRD_PARTY_CANCELLED", "warning", r.code,
                     r.account_name, r.third_party_name, None,
                     f"El tercero {r.doc_type} {r.doc_number} ({r.third_party_name}) tiene "
                     f"estado '{tp.estado}' en la cámara de comercio.",
                     "Verifique si el tercero está vigente o si debe reportarse con otro estado.")

    db.commit()
    totales = db.query(ValidationIssue).filter_by(balance_id=balance_id)
    return {
        "total": totales.count(),
        "errores": totales.filter_by(severity="error").count(),
        "advertencias": totales.filter_by(severity="warning").count(),
    }
