"use client";

import { useState, useEffect } from "react";

const CONCEPTOS_DIAN = [
  { codigo: "5002", nombre: "Honorarios" },
  { codigo: "5003", nombre: "Comisiones" },
  { codigo: "5004", nombre: "Servicios" },
  { codigo: "5005", nombre: "Arrendamientos" },
  { codigo: "5006", nombre: "Intereses y rendimientos financieros" },
  { codigo: "5007", nombre: "Compra de activos movibles" },
  { codigo: "5008", nombre: "Compra de activos fijos" },
  { codigo: "5010", nombre: "Aportes parafiscales" },
  { codigo: "5011", nombre: "Pagos a EPS y Riesgos Laborales" },
  { codigo: "5012", nombre: "Aportes para pensiones" },
  { codigo: "5013", nombre: "Donaciones en dinero" },
  { codigo: "5014", nombre: "Donaciones en activos" },
  { codigo: "5015", nombre: "Impuestos solicitados como deduccion" },
  { codigo: "5016", nombre: "Demas costos y deducciones" },
  { codigo: "5020", nombre: "Compra activos fijos productivos" },
  { codigo: "5055", nombre: "Viaticos" },
  { codigo: "5056", nombre: "Gastos de representacion" },
  { codigo: "5063", nombre: "Intereses efectivamente pagados" },
  { codigo: "5066", nombre: "Impuesto al consumo" },
];

const API = "http://127.0.0.1:8000";
const TENANT_ID = 1;

export default function Parametrizar() {
  const [mappings, setMappings] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/template-rules?formato=1001&tenant_id=${TENANT_ID}`).then(r => r.json()),
      fetch(`${API}/api/cuentas-balance?tenant_id=${TENANT_ID}`).then(r => r.json()),
    ]).then(([m, c]) => {
      setMappings(m);
      setCuentas(c.filter(x => x.codigo && x.codigo.length >= 4));
    }).catch(e => setMsg("Error: " + e.message))
      .finally(() => setLoading(false));
  }, []);

  const grouped = CONCEPTOS_DIAN.map(c => {
    const grupo = mappings.find(g => g.concepto === parseInt(c.codigo));
    return {
      ...c,
      cuentas: grupo?.cuentas || [],
    };
  });

  async function toggle(concepto, cuenta, ruleId, currentActive) {
    if (ruleId) {
      await fetch(`${API}/api/template-rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentActive }),
      });
    } else {
      const nombre = CONCEPTOS_DIAN.find(c => c.codigo === concepto)?.nombre || "";
      await fetch(`${API}/api/template-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format_code: "1001", concepto: parseInt(concepto),
          concepto_nombre: nombre, cuenta, campo_valor: "closing",
        }),
      });
    }
    const m = await fetch(`${API}/api/template-rules?formato=1001`).then(r => r.json());
    setMappings(m);
  }

  async function autoPropuesta() {
    setMsg("Generando...");
    const r = await fetch(`${API}/api/template-rules/auto-propose?tenant_id=${TENANT_ID}&formato=1001`, { method: "POST" });
    const d = await r.json();
    setMsg(`Propuesta: ${d.creados} cuentas asignadas`);
    const m = await fetch(`${API}/api/template-rules?formato=1001`).then(r => r.json());
    setMappings(m);
  }

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setMsg("Importando...");
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(`${API}/api/template-rules/import?formato=1001`, { method: "POST", body: fd });
    const d = await r.json();
    setMsg(`Importado: ${d.creados} nuevas, ${d.actualizados} actualizadas`);
    const m = await fetch(`${API}/api/template-rules?formato=1001`).then(r => r.json());
    setMappings(m);
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-gray-400">Cargando parametrizacion...</div>;
  }

  return (
    <div className="space-y-3" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Parametrizacion DIAN → PUC</h2>
        <div className="flex gap-2">
          <a href={`${API}/api/template-rules/export?formato=1001&fmt=xlsx`}
             className="rounded border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 no-underline">
            Exportar
          </a>
          <label className="cursor-pointer rounded border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
            Importar
            <input type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden" onChange={handleUpload} />
          </label>
          <button onClick={autoPropuesta}
             className="rounded bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">
            Auto-propuesta
          </button>
        </div>
      </div>

      {msg && <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{msg}</div>}

      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e0e0e0", borderRadius: 8, overflow: "hidden" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th style={{ padding: "10px 12px", textAlign: "left", width: 160, fontWeight: 600 }}>Concepto DIAN</th>
            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Cuentas PUC (checkboxes editables)</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map(c => {
            const isOpen = expanded === c.codigo;
            const activas = c.cuentas.filter(a => a.active);
            const inactivas = c.cuentas.filter(a => !a.active);
            const idsAsignadas = new Set(c.cuentas.map(a => a.cuenta));
            const disponibles = cuentas.filter(ct => !idsAsignadas.has(ct.codigo));

            return (
              <tr key={c.codigo} style={{ borderBottom: "1px solid #eee", verticalAlign: "top" }}>
                <td style={{ padding: 10, cursor: "pointer" }} onClick={() => setExpanded(isOpen ? null : c.codigo)}>
                  <b style={{ color: "#1a73e8", fontSize: 14 }}>{c.codigo}</b>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{c.nombre}</div>
                </td>
                <td style={{ padding: 10 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    {activas.map(a => {
                      const cuentaInfo = cuentas.find(ct => ct.codigo === a.cuenta);
                      return (
                        <label key={a.cuenta} style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "4px 8px", border: "1px solid #4caf50", borderRadius: 6,
                          background: "#e8f5e9", fontSize: 13, cursor: "pointer",
                        }}>
                          <input type="checkbox" checked={true}
                            onChange={() => toggle(c.codigo, a.cuenta, a.rule_id, true)}
                            style={{ accentColor: "#4caf50" }} />
                          <span style={{ fontFamily: "monospace", color: "#2e7d32" }}>{a.cuenta}</span>
                          {cuentaInfo && <span style={{ fontSize: 10, color: "#999" }}>{cuentaInfo.nombre?.substring(0, 25)}</span>}
                        </label>
                      );
                    })}

                    {isOpen && inactivas.map(a => (
                      <label key={a.cuenta} style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6,
                        background: "#fafafa", fontSize: 13, cursor: "pointer",
                      }}>
                        <input type="checkbox" checked={false}
                          onChange={() => toggle(c.codigo, a.cuenta, a.rule_id, false)}
                          style={{ accentColor: "#999" }} />
                        <span style={{ fontFamily: "monospace", color: "#999", textDecoration: "line-through" }}>{a.cuenta}</span>
                      </label>
                    ))}

                    {isOpen && (
                      <div style={{ width: "100%", marginTop: 8, padding: 8, background: "#fafafa", borderRadius: 8 }}>
                        <p style={{ fontSize: 12, color: "#666", margin: "0 0 6px 0" }}>+ Agregar cuentas del balance:</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {disponibles.slice(0, 60).map(a => (
                            <label key={a.codigo} style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              padding: "3px 6px", border: "1px solid #e0e0e0", borderRadius: 4,
                              fontSize: 12, cursor: "pointer",
                            }}>
                              <input type="checkbox"
                                onChange={() => toggle(c.codigo, a.codigo, null, false)}
                                style={{ accentColor: "#1a73e8" }} />
                              <span style={{ fontFamily: "monospace" }}>{a.codigo}</span>
                              <span style={{ fontSize: 10, color: "#999" }}>{a.nombre?.substring(0, 20)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {!isOpen && activas.length === 0 && (
                      <span style={{ color: "#bbb", fontSize: 13, fontStyle: "italic" }}>Click para ver cuentas</span>
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
