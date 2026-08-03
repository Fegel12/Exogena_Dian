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

  function toggleExpand(cpt) {
    setExpanded(prev => prev === cpt ? null : cpt);
  }

  async function toggle(ruleId, currentActive) {
    setConceptos(prev => prev.map(c => ({
      ...c, cuentas: (c.cuentas || []).map(a => a.rule_id === ruleId ? {...a, active: !currentActive} : a)
    })));
    try {
      await fetch(`${API}/api/template-rules/${ruleId}`, {
        method: "PATCH", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ active: !currentActive }),
      });
    } catch { cargar(); }
  }

  async function eliminarCuenta(ruleId, cuenta) {
    if (!confirm(`¿Eliminar cuenta ${cuenta}?`)) return;
    setConceptos(prev => prev.map(c => ({
      ...c, cuentas: (c.cuentas || []).filter(a => a.rule_id !== ruleId)
    })));
    try { await fetch(`${API}/api/template-rules/${ruleId}`, { method: "DELETE" }); }
    catch (e) { cargar(); setMsg("Error al eliminar"); }
  }

  async function addAccount(concepto, nombre, cuenta) {
    setConceptos(prev => prev.map(c => {
      if (String(c.concepto) !== String(concepto)) return c;
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
          <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-700 w-[150px]">Concepto DIAN</th>
          <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-700">Cuentas PUC de ESTA empresa</th>
        </tr></thead>
        <tbody>
          {!loading && conceptos.length === 0 ? (
            <tr><td colSpan={2} className="py-10 text-center text-gray-500">
              <p>Sin conceptos para formato <b>{formato}</b></p>
              <button onClick={autoPropuesta} className="mt-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Generar Auto-propuesta</button>
            </td></tr>
          ) : (conceptos.map(c => {
            const cpt = c.concepto;
            const isOpen = expanded === cpt;
            const activas = (c.cuentas || []).filter(a => a.active);
            const inactivas = (c.cuentas || []).filter(a => !a.active);
            const asignadas = new Set((c.cuentas || []).map(a => a.cuenta));
            const disponibles = cuentas.filter(ct => !asignadas.has(ct.codigo) && ct.codigo.length >= 2);

            return (
              <tr key={cpt} className={`border-b border-gray-100 ${isOpen ? "bg-blue-50/30" : ""}`}>
                {/* CONCEPTO - click expande */}
                <td className="px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={() => toggleExpand(cpt)}>
                  <span className="font-mono font-bold text-blue-700">{cpt}</span>
                  <div className="text-xs text-gray-500">{c.concepto_nombre}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    {activas.length} activas {isOpen ? "▲" : "▼"}
                  </div>
                </td>

                {/* CUENTAS */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5 items-start">
                    {/* ACTIVAS con botón ELIMINAR */}
                    {activas.map(a => (
                      <div key={a.rule_id} className="inline-flex items-center gap-1 rounded border border-green-300 bg-green-50 px-2 py-0.5 text-xs">
                        <input type="checkbox" checked onChange={() => toggle(a.rule_id, true)} className="h-3 w-3 accent-green-600" />
                        <span className="font-mono font-medium text-green-700">{a.cuenta}</span>
                        <button onClick={(e) => { e.stopPropagation(); eliminarCuenta(a.rule_id, a.cuenta); }}
                          className="ml-0.5 text-red-400 hover:text-red-600 font-bold text-sm leading-none" title="Eliminar cuenta">
                          ×
                        </button>
                      </div>
                    ))}

                    {/* INACTIVAS (expandido) */}
                    {isOpen && inactivas.map(a => (
                      <div key={a.rule_id} className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs">
                        <input type="checkbox" onChange={() => toggle(a.rule_id, false)} className="h-3 w-3" />
                        <span className="font-mono text-gray-400 line-through">{a.cuenta}</span>
                        <button onClick={(e) => { e.stopPropagation(); eliminarCuenta(a.rule_id, a.cuenta); }}
                          className="ml-0.5 text-red-400 hover:text-red-600 font-bold text-sm leading-none" title="Eliminar cuenta">
                          ×
                        </button>
                      </div>
                    ))}

                    {/* BOTÓN + (siempre visible) */}
                    <button onClick={(e) => { e.stopPropagation(); toggleExpand(cpt); }}
                      className="rounded border border-dashed border-blue-400 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-100 hover:border-blue-500">
                      + Agregar
                    </button>

                    {/* EXPANDIDO: selector de cuentas */}
                    {isOpen && (
                      <div className="w-full mt-2 pt-2 border-t border-dashed border-gray-200">
                        <p className="text-xs font-semibold text-gray-600 mb-2">
                          Selecciona cuentas del balance para agregar ({disponibles.length} disponibles):
                        </p>
                        <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto p-1">
                          {disponibles.slice(0, 100).map(a => (
                            <button key={a.codigo} onClick={() => addAccount(cpt, c.concepto_nombre, a.codigo)}
                              className="inline-flex gap-1 rounded border border-gray-200 bg-white px-2 py-0.5 text-xs hover:bg-blue-50 hover:border-blue-300 cursor-pointer font-mono">
                              <span className="text-green-600 font-medium">{a.codigo}</span>
                              {a.nombre && <span className="text-gray-400 text-[10px] truncate max-w-[100px]">{a.nombre.substring(0, 15)}</span>}
                            </button>
                          ))}
                          {disponibles.length > 100 && (
                            <span className="text-xs text-gray-400">...y {disponibles.length - 100} más</span>
                          )}
                        </div>
                      </div>
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
