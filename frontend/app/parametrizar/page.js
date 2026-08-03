"use client";

import { useState, useEffect } from "react";

const API = "http://127.0.0.1:8000";

export default function Parametrizar() {
  const [conceptos, setConceptos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/template-rules?formato=1001&tenant_id=1`).then(r=>r.json()),
      fetch(`${API}/api/cuentas-balance?tenant_id=1`).then(r=>r.json()),
    ]).then(([c, cu]) => {
      setConceptos(Array.isArray(c) ? c : []);
      setCuentas(Array.isArray(cu) ? cu : []);
    }).catch(e => setMsg("Error: " + e.message));
  }, []);

  function expandir(cpt) {
    setExpanded(prev => prev === cpt ? null : cpt);
  }

  async function toggle(ruleId, active) {
    await fetch(`${API}/api/template-rules/${ruleId}`, {
      method: "PATCH", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ active: !active }),
    });
    const r = await fetch(`${API}/api/template-rules?formato=1001`).then(r=>r.json());
    setConceptos(Array.isArray(r) ? r : []);
  }

  async function eliminar(ruleId) {
    if (!confirm("¿Eliminar esta cuenta?")) return;
    await fetch(`${API}/api/template-rules/${ruleId}`, { method: "DELETE" });
    const r = await fetch(`${API}/api/template-rules?formato=1001`).then(r=>r.json());
    setConceptos(Array.isArray(r) ? r : []);
  }

  async function agregar(concepto, nombre, cuenta) {
    await fetch(`${API}/api/template-rules`, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ format_code: "1001", concepto: parseInt(concepto), concepto_nombre: nombre, cuenta, campo_valor: "closing" }),
    });
    const r = await fetch(`${API}/api/template-rules?formato=1001`).then(r=>r.json());
    setConceptos(Array.isArray(r) ? r : []);
  }

  async function autoPropuesta() {
    setMsg("Generando...");
    const r = await fetch(`${API}/api/template-rules/auto-propose?tenant_id=1&formato=1001`, { method: "POST" });
    const d = await r.json();
    setMsg(`Creadas ${d.creados} asignaciones`);
    const r2 = await fetch(`${API}/api/template-rules?formato=1001`).then(r=>r.json());
    setConceptos(Array.isArray(r2) ? r2 : []);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between">
        <h1 className="text-xl font-bold text-gray-900">Parametrizacion DIAN → PUC</h1>
        <div className="flex gap-2 text-sm">
          <a href={`${API}/api/template-rules/export?formato=1001&fmt=xlsx`}
             className="rounded border px-3 py-1.5 text-gray-600 hover:bg-gray-50 no-underline">Exportar</a>
          <button onClick={autoPropuesta}
            className="rounded bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700">Auto-propuesta</button>
        </div>
      </div>

      {msg && <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{msg}</div>}

      <table className="w-full border-collapse border border-gray-200">
        <thead><tr className="bg-gray-50 border-b border-gray-200">
          <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-700 w-[150px]">Concepto DIAN</th>
          <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-700">Cuentas PUC</th>
        </tr></thead>
        <tbody>
          {conceptos.map(c => {
            const open = expanded === c.concepto;
            const activas = (c.cuentas||[]).filter(a=>a.active);
            const inactivas = (c.cuentas||[]).filter(a=>!a.active);
            const asignadas = new Set((c.cuentas||[]).map(a=>a.cuenta));
            const libres = cuentas.filter(x=>!asignadas.has(x.codigo)&&x.codigo.length>=2);
            return (
              <tr key={c.concepto} className={`border-b ${open?"bg-blue-50":""}`}>
                <td className="px-4 py-3 cursor-pointer" onClick={()=>expandir(c.concepto)}>
                  <span className="font-mono font-bold text-blue-700">{c.concepto}</span>
                  <div className="text-xs text-gray-500">{c.concepto_nombre}</div>
                  <div className="text-[10px] text-gray-400">{activas.length} activas {open?"▲":"▼"}</div>
                </td>
                <td className="px-4 py-3">
                  {activas.map(a=>(
                    <span key={a.rule_id} className="inline-flex items-center gap-1 mr-1 mb-1 rounded border border-green-300 bg-green-50 px-2 py-0.5 text-xs">
                      <input type="checkbox" checked onChange={()=>toggle(a.rule_id, a.active)} className="h-3 w-3 accent-green-600"/>
                      <span className="font-mono text-green-700">{a.cuenta}</span>
                      <button onClick={()=>eliminar(a.rule_id)} className="text-red-400 hover:text-red-600 font-bold">×</button>
                    </span>
                  ))}
                  {open && inactivas.map(a=>(
                    <span key={a.rule_id} className="inline-flex items-center gap-1 mr-1 mb-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs">
                      <input type="checkbox" onChange={()=>toggle(a.rule_id, a.active)} className="h-3 w-3"/>
                      <span className="font-mono text-gray-400 line-through">{a.cuenta}</span>
                      <button onClick={()=>eliminar(a.rule_id)} className="text-red-400 hover:text-red-600 font-bold">×</button>
                    </span>
                  ))}
                  <button onClick={()=>expandir(c.concepto)} className="mr-1 mb-1 rounded border border-dashed border-blue-400 bg-blue-50 px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-100">
                    + Agregar
                  </button>
                  {open && (
                    <div className="w-full mt-2 pt-2 border-t border-dashed border-gray-200">
                      <p className="text-xs text-gray-600 mb-2">Cuentas disponibles ({libres.length}):</p>
                      <div className="flex flex-wrap gap-1 max-h-40 overflow-auto">
                        {libres.slice(0,80).map(x=>(
                          <button key={x.codigo} onClick={()=>agregar(c.concepto, c.concepto_nombre, x.codigo)}
                            className="rounded border border-gray-200 bg-white px-2 py-0.5 text-xs font-mono hover:bg-blue-50">
                            <span className="text-green-600">{x.codigo}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
