"use client";

import { useState } from "react";

const API = "http://127.0.0.1:8000";

export default function TablaParametrizar({ initialConceptos, initialCuentas }) {
  const [conceptos, setConceptos] = useState(initialConceptos);
  const [cuentas, setCuentas] = useState(initialCuentas);
  const [expanded, setExpanded] = useState(null);
  const [msg, setMsg] = useState("");

  async function cargar() {
    try {
      const [r, c] = await Promise.all([
        fetch(`${API}/api/template-rules?formato=1001&tenant_id=1`).then(r => r.json()),
        fetch(`${API}/api/cuentas-balance?tenant_id=1`).then(r => r.json()),
      ]);
      setConceptos(Array.isArray(r) ? r : []);
      setCuentas(Array.isArray(c) ? c : []);
    } catch (e) { setMsg("Error: " + e.message); }
  }

  async function toggle(ruleId, currentActive) {
    await fetch(`${API}/api/template-rules/${ruleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !currentActive }),
    });
    await cargar();
  }

  async function addAccount(concepto, nombre, cuenta) {
    await fetch(`${API}/api/template-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format_code: "1001", concepto: parseInt(concepto), concepto_nombre: nombre, cuenta, campo_valor: "closing" }),
    });
    await cargar();
  }

  async function removeAccount(ruleId) {
    await fetch(`${API}/api/template-rules/${ruleId}`, { method: "DELETE" });
    await cargar();
  }

  async function autoPropuesta() {
    setMsg("Generando...");
    const r = await fetch(`${API}/api/template-rules/auto-propose?tenant_id=1&formato=1001`, { method: "POST" });
    const d = await r.json();
    setMsg(`Propuesta generada: ${d.creados || 0} cuentas`);
    await cargar();
    setTimeout(() => setMsg(""), 3000);
  }

  async function handleImport(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setMsg("Importando...");
    const fd = new FormData(); fd.append("file", f);
    const r = await fetch(`${API}/api/template-rules/import?formato=1001`, { method: "POST", body: fd });
    const d = await r.json();
    setMsg(`Importado: ${d.creados || 0} nuevas, ${d.actualizados || 0} actualizadas`);
    await cargar();
    setTimeout(() => setMsg(""), 3000);
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111" }}>Parametrizacion DIAN → PUC</h2>
        <div style={{ display: "flex", gap: 8, fontSize: 14 }}>
          <a href={`${API}/api/template-rules/export?formato=1001&fmt=xlsx`}
             style={{ padding: "6px 14px", border: "1px solid #ccc", borderRadius: 6, color: "#333", textDecoration: "none" }}>
            Exportar
          </a>
          <label style={{ padding: "6px 14px", border: "1px solid #ccc", borderRadius: 6, color: "#333", cursor: "pointer" }}>
            Importar
            <input type="file" accept=".csv,.txt,.xlsx,.xls" hidden onChange={handleImport} />
          </label>
          <button onClick={autoPropuesta}
            style={{ padding: "6px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            Auto-propuesta
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ padding: "6px 12px", marginBottom: 8, background: "#dbeafe", color: "#1e40af", borderRadius: 6, fontSize: 13, border: "1px solid #bfdbfe" }}>
          {msg}
        </div>
      )}

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
        <thead>
          <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: "10px 14px", textAlign: "left", width: 150, fontWeight: 600, fontSize: 13, color: "#374151" }}>
              Concepto DIAN
            </th>
            <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 13, color: "#374151" }}>
              Cuentas PUC de ESTA empresa
            </th>
          </tr>
        </thead>
        <tbody>
          {conceptos.map(c => {
            const isOpen = expanded === c.concepto;
            const activas = (c.cuentas || []).filter(a => a.active);
            const inactivas = (c.cuentas || []).filter(a => !a.active);
            const asignadas = new Set((c.cuentas || []).map(a => a.cuenta));
            const disponibles = cuentas.filter(ct => !asignadas.has(ct.codigo) && ct.codigo.length >= 2);

            return (
              <tr key={c.concepto} style={{ borderBottom: "1px solid #f3f4f6", verticalAlign: "top" }}>
                {/* Columna concepto */}
                <td style={{ padding: 10, cursor: "pointer" }}
                  onClick={() => setExpanded(isOpen ? null : c.concepto)}>
                  <b style={{ color: "#1d4ed8", fontSize: 14 }}>{c.concepto}</b>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>{c.concepto_nombre}</div>
                </td>

                {/* Columna cuentas */}
                <td style={{ padding: 10 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>

                    {/* Cuentas activas */}
                    {activas.map(a => (
                      <label key={a.rule_id} onClick={(e) => e.stopPropagation()} style={{
                        display: "inline-flex", alignItems: "center", gap: 3,
                        padding: "3px 7px", border: "1px solid #86efac", borderRadius: 4,
                        background: "#f0fdf4", fontSize: 12, cursor: "pointer",
                      }}>
                        <input type="checkbox" checked
                          onChange={() => toggle(a.rule_id, true)}
                          style={{ accentColor: "#16a34a", width: 13, height: 13 }} />
                        <span style={{ fontFamily: "monospace", color: "#166534", fontWeight: 500 }}>{a.cuenta}</span>
                      </label>
                    ))}

                    {/* Expandir: cuentas inactivas + disponibles */}
                    {isOpen && (
                      <>
                        {inactivas.map(a => (
                          <label key={a.rule_id} style={{
                            display: "inline-flex", alignItems: "center", gap: 3,
                            padding: "3px 7px", border: "1px solid #d1d5db", borderRadius: 4,
                            background: "#f9fafb", fontSize: 12, cursor: "pointer",
                          }}>
                            <input type="checkbox"
                              onChange={() => toggle(a.rule_id, false)}
                              style={{ accentColor: "#9ca3af", width: 13, height: 13 }} />
                            <span style={{ fontFamily: "monospace", color: "#9ca3af", textDecoration: "line-through" }}>{a.cuenta}</span>
                            <button onClick={(e) => { e.stopPropagation(); removeAccount(a.rule_id); }}
                              style={{ marginLeft: 2, color: "#ef4444", border: "none", background: "none", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>
                              ×
                            </button>
                          </label>
                        ))}

                        {/* Agregar cuentas */}
                        <div style={{ width: "100%", marginTop: 6, padding: 8, background: "#fafafa", borderRadius: 6, border: "1px dashed #d1d5db" }}>
                          <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 5px 0" }}>+ Agregar cuentas del balance:</p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                            {disponibles.slice(0, 50).map(a => (
                              <button key={a.codigo}
                                onClick={(e) => { e.stopPropagation(); addAccount(c.concepto, c.concepto_nombre, a.codigo); }}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 2,
                                  padding: "2px 5px", border: "1px solid #e5e7eb", borderRadius: 3,
                                  background: "#fff", fontSize: 11, cursor: "pointer", fontFamily: "monospace",
                                  color: "#374151",
                                }}>
                                <span style={{ color: "#059669", fontWeight: 500 }}>{a.codigo}</span>
                                {a.nombre && <span style={{ color: "#9ca3af", fontSize: 10 }}>{a.nombre.substring(0, 15)}</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Sin cuentas */}
                    {!isOpen && activas.length === 0 && (
                      <span style={{ color: "#d1d5db", fontSize: 12, fontStyle: "italic" }}>Click para configurar</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
