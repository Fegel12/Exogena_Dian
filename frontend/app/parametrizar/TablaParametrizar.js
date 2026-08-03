"use client";

import { useState } from "react";

const API = "http://127.0.0.1:8000";
const FORMATOS = ["1001","1005","1647","2821","2822","2854","1476","2574"];

export default function TablaParametrizar({ initialConceptos, initialCuentas }) {
  const [formato, setFormato] = useState("1001");
  const [conceptos, setConceptos] = useState(initialConceptos);
  const [cuentas, setCuentas] = useState(initialCuentas);
  const [expanded, setExpanded] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function cargar(fmt) {
    setLoading(true);
    const f = fmt || formato;
    try {
      const [r, c] = await Promise.all([
        fetch(`${API}/api/template-rules?formato=${f}&tenant_id=1`).then(r => r.json()),
        fetch(`${API}/api/cuentas-balance?tenant_id=1`).then(r => r.json()),
      ]);
      setConceptos(Array.isArray(r) ? r : []);
      setCuentas(Array.isArray(c) ? c : []);
    } catch (e) { setMsg("Error: " + e.message); }
    finally { setLoading(false); }
  }

  function cambiarFormato(f) { setFormato(f); setExpanded(null); cargar(f); }

  async function toggle(ruleId, currentActive) {
    setConceptos(prev => prev.map(c => ({
      ...c, cuentas: (c.cuentas || []).map(a => a.rule_id === ruleId ? {...a, active: !currentActive} : a)
    })));
    try {
      await fetch(`${API}/api/template-rules/${ruleId}`, {
        method: "PATCH", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ active: !currentActive }),
      });
    } catch (e) { cargar(); }
  }

  async function removeAccount(ruleId) {
    setConceptos(prev => prev.map(c => ({
      ...c, cuentas: (c.cuentas || []).filter(a => a.rule_id !== ruleId)
    })));
    try { await fetch(`${API}/api/template-rules/${ruleId}`, { method: "DELETE" }); }
    catch (e) { cargar(); }
  }

  async function addAccount(concepto, nombre, cuenta) {
    setConceptos(prev => prev.map(c => {
      if (c.concepto !== parseInt(concepto)) return c;
      if ((c.cuentas || []).find(a => a.cuenta === cuenta)) {
        return { ...c, cuentas: c.cuentas.map(a => a.cuenta === cuenta ? {...a, active: true} : a) };
      }
      return { ...c, cuentas: [...(c.cuentas || []), { cuenta, active: true, rule_id: Date.now(), campo_valor: "closing" }] };
    }));
    try {
      const res = await fetch(`${API}/api/template-rules`, {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ format_code: formato, concepto: parseInt(concepto), concepto_nombre: nombre, cuenta, campo_valor: "closing" }),
      });
      if (!res.ok) throw new Error(await res.text());
      cargar();
    } catch (e) { setMsg("Error: " + e.message); cargar(); }
  }

  async function autoPropuesta() {
    setMsg("Generando...");
    const r = await fetch(`${API}/api/template-rules/auto-propose?tenant_id=1&formato=${formato}`, { method: "POST" });
    const d = await r.json();
    setMsg(`Creadas ${d.creados || 0} asignaciones`);
    cargar();
    setTimeout(() => setMsg(""), 4000);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 flex-wrap">
          {FORMATOS.map(f => (
            <button key={f} onClick={() => cambiarFormato(f)}
              className={`rounded px-3 py-1 text-sm font-medium ${formato === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{f}</button>
          ))}
        </div>
        <div className="flex gap-2 text-sm">
          <a href={`${API}/api/template-rules/export?formato=${formato}&fmt=xlsx`}
             className="rounded border px-3 py-1.5 text-gray-600 hover:bg-gray-50 no-underline">Exportar</a>
          <button onClick={autoPropuesta}
            className="rounded bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700">Auto-propuesta</button>
        </div>
      </div>

      {msg && <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{msg}</div>}
      {loading && <div className="text-center text-sm text-gray-400 py-4">Cargando formato {formato}...</div>}

      <table className="w-full border-collapse border border-gray-200">
        <thead><tr className="bg-gray-50 border-b border-gray-200">
          <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-700">Concepto DIAN</th>
          <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-700">Cuentas PUC</th>
        </tr></thead>
        <tbody>
          {!loading && conceptos.length === 0 ? (
            <tr><td colSpan={2} className="py-10 text-center text-gray-500">
              <p>Sin conceptos para formato <b>{formato}</b></p>
              <button onClick={autoPropuesta} className="mt-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Generar Auto-propuesta</button>
            </td></tr>
          ) : (conceptos.map(c => {
            const isOpen = expanded === c.concepto;
            const activas = (c.cuentas || []).filter(a => a.active);
            const inactivas = (c.cuentas || []).filter(a => !a.active);
            const asignadas = new Set((c.cuentas || []).map(a => a.cuenta));
            const disponibles = cuentas.filter(ct => !asignadas.has(ct.codigo));

            return (
              <tr key={c.concepto} className={`border-b border-gray-100 ${isOpen ? "bg-blue-50/30" : ""}`}>
                {/* CONCEPTO - siempre clickeable */}
                <td className="px-4 py-3 cursor-pointer" onClick={() => setExpanded(isOpen ? null : c.concepto)}>
                  <span className="font-mono font-bold text-blue-700">{c.concepto}</span>
                  <div className="text-xs text-gray-500">{c.concepto_nombre}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {activas.length} activas {isOpen ? "▲" : "▼"}
                  </div>
                </td>

                {/* CUENTAS */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5 items-start">
                    {/* Activas */}
                    {activas.map(a => (
                      <label key={a.rule_id} className="inline-flex items-center gap-1 rounded border border-green-300 bg-green-50 px-2 py-0.5 text-xs cursor-pointer">
                        <input type="checkbox" checked onChange={() => toggle(a.rule_id, true)} className="h-3 w-3 accent-green-600" />
                        <span className="font-mono font-medium text-green-700">{a.cuenta}</span>
                      </label>
                    ))}

                    {/* Inactivas (solo expandido) */}
                    {isOpen && inactivas.map(a => (
                      <div key={a.rule_id} className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs">
                        <input type="checkbox" onChange={() => toggle(a.rule_id, false)} className="h-3 w-3" />
                        <span className="font-mono text-gray-400 line-through">{a.cuenta}</span>
                        <button onClick={() => removeAccount(a.rule_id)} className="text-red-400 hover:text-red-600 font-bold">&times;</button>
                      </div>
                    ))}

                    {/* BOTÓN + (siempre visible, más prominente cuando expandido) */}
                    {isOpen ? (
                      <div className="w-full mt-2 pt-2 border-t border-dashed border-gray-200">
                        <p className="text-xs font-semibold text-gray-600 mb-2">+ Agregar cuentas del balance ({disponibles.length} disponibles):</p>
                        <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto p-1">
                          {disponibles.slice(0, 100).map(a => (
                            <button key={a.codigo} onClick={() => addAccount(c.concepto, c.concepto_nombre, a.codigo)}
                              className="inline-flex gap-1 rounded border border-gray-200 bg-white px-2 py-0.5 text-xs hover:bg-blue-50 hover:border-blue-300 cursor-pointer font-mono">
                              <span className="text-green-600 font-medium">{a.codigo}</span>
                              {a.nombre && <span className="text-gray-400 text-[10px] truncate max-w-[100px]">{a.nombre.substring(0, 18)}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button className="rounded border border-dashed border-blue-300 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
                        onClick={(e) => { e.stopPropagation(); setExpanded(c.concepto); }}>
                        + Agregar cuenta
                      </button>
                    )}

                    {!isOpen && activas.length === 0 && (
                      <span className="text-xs text-gray-300 italic">▼</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          }))}
        </tbody>
      </table>
    </div>
  );
}
