"use client";

import { useState, useEffect } from "react";

const API = "http://127.0.0.1:8000";
const FORMATOS = ["1001","1005","1647","2821","2822","2854","1476","2574"];

export default function Parametrizar() {
  const [formato, setFormato] = useState("1001");
  const [conceptos, setConceptos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [msg, setMsg] = useState("");

  function cargar(fmt) {
    const f = fmt || formato;
    Promise.all([
      fetch(`${API}/api/template-rules?formato=${f}&tenant_id=1`).then(r=>r.json()),
      fetch(`${API}/api/cuentas-balance?tenant_id=1`).then(r=>r.json()),
    ]).then(([c, cu]) => {
      setConceptos(Array.isArray(c) ? c : []);
      setCuentas(Array.isArray(cu) ? cu : []);
    }).catch(e => setMsg("Error: " + e.message));
  }

  useEffect(() => { cargar("1001"); }, []);

  function cambiarFormato(f) { setFormato(f); setExpanded(null); cargar(f); }

  async function toggle(ruleId, active) {
    await fetch(`${API}/api/template-rules/${ruleId}`, {
      method: "PATCH", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ active: !active }),
    });
    cargar();
  }

  async function eliminar(ruleId) {
    if (!confirm("¿Eliminar esta cuenta?")) return;
    await fetch(`${API}/api/template-rules/${ruleId}`, { method: "DELETE" });
    cargar();
  }

  async function agregar(concepto, nombre, cuenta) {
    await fetch(`${API}/api/template-rules`, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ format_code: formato, concepto: parseInt(concepto), concepto_nombre: nombre, cuenta, campo_valor: "closing" }),
    });
    cargar();
  }

  async function autoPropuesta() {
    setMsg("Generando propuesta...");
    const r = await fetch(`${API}/api/template-rules/auto-propose?tenant_id=1&formato=${formato}`, { method: "POST" });
    const d = await r.json();
    setMsg(`Creadas ${d.creados || 0} asignaciones para formato ${formato}`);
    cargar();
    setTimeout(() => setMsg(""), 4000);
  }

  async function handleImport(e) {
    const f = e.target.files?.[0]; if (!f) return;
    setMsg("Importando...");
    const fd = new FormData(); fd.append("file", f);
    const r = await fetch(`${API}/api/template-rules/import?formato=${formato}`, { method: "POST", body: fd });
    const d = await r.json();
    setMsg(`Importado: ${d.creados || 0} nuevas, ${d.actualizados || 0} actualizadas`);
    cargar();
    setTimeout(() => setMsg(""), 4000);
  }

  return (
    <div className="space-y-3">
      {/* Header con formato + acciones */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 flex-wrap">
          {FORMATOS.map(f => (
            <button key={f} onClick={()=>cambiarFormato(f)}
              className={`rounded px-3 py-1 text-sm font-medium ${formato===f?"bg-blue-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2 text-sm">
          <a href={`${API}/api/template-rules/export?formato=${formato}&fmt=xlsx`}
             className="rounded border px-3 py-1.5 text-gray-600 hover:bg-gray-50 no-underline">Exportar</a>
          <label className="cursor-pointer rounded border px-3 py-1.5 text-gray-600 hover:bg-gray-50">
            Importar
            <input type="file" accept=".csv,.txt,.xlsx,.xls" hidden onChange={handleImport}/>
          </label>
          <button onClick={autoPropuesta}
            className="rounded bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700">Auto-propuesta</button>
        </div>
      </div>

      {msg && <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{msg}</div>}

      <table className="w-full border-collapse border border-gray-200">
        <thead><tr className="bg-gray-50 border-b border-gray-200">
          <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-700 w-[150px]">Concepto DIAN</th>
          <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-700">Cuentas PUC de ESTA empresa</th>
        </tr></thead>
        <tbody>
          {conceptos.length === 0 ? (
            <tr><td colSpan={2} className="py-10 text-center text-gray-500">
              <p>Sin conceptos para formato <b>{formato}</b></p>
              <button onClick={autoPropuesta} className="mt-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                Generar Auto-propuesta
              </button>
            </td></tr>
          ) : (
            conceptos.map(c => {
              const open = expanded === c.concepto;
              const activas = (c.cuentas||[]).filter(a=>a.active);
              const inactivas = (c.cuentas||[]).filter(a=>!a.active);
              const asignadas = new Set((c.cuentas||[]).map(a=>a.cuenta));
              const libres = cuentas.filter(x=>!asignadas.has(x.codigo)&&x.codigo.length>=2);
              return (
                <tr key={c.concepto} className={`border-b ${open?"bg-blue-50":""}`}>
                  <td className="px-4 py-3 cursor-pointer" onClick={()=>setExpanded(open?null:c.concepto)}>
                    <span className="font-mono font-bold text-blue-700">{c.concepto}</span>
                    <div className="text-xs text-gray-500">{c.concepto_nombre}</div>
                    <div className="text-[10px] text-gray-400">{activas.length} activas {open?"▲":"▼"}</div>
                  </td>
                  <td className="px-4 py-3">
                    {activas.map(a=>(
                      <span key={a.rule_id} className="inline-flex items-center gap-1 mr-1 mb-1 rounded border border-green-300 bg-green-50 px-2 py-0.5 text-xs">
                        <input type="checkbox" checked onChange={()=>toggle(a.rule_id,a.active)} className="h-3 w-3 accent-green-600"/>
                        <span className="font-mono text-green-700">{a.cuenta}</span>
                        <button onClick={()=>eliminar(a.rule_id)} className="text-red-400 hover:text-red-600 font-bold">×</button>
                      </span>
                    ))}
                    {open && inactivas.map(a=>(
                      <span key={a.rule_id} className="inline-flex items-center gap-1 mr-1 mb-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs">
                        <input type="checkbox" onChange={()=>toggle(a.rule_id,a.active)} className="h-3 w-3"/>
                        <span className="font-mono text-gray-400 line-through">{a.cuenta}</span>
                        <button onClick={()=>eliminar(a.rule_id)} className="text-red-400 hover:text-red-600 font-bold">×</button>
                      </span>
                    ))}
                    <button onClick={()=>setExpanded(open?null:c.concepto)} className="mr-1 mb-1 rounded border border-dashed border-blue-400 bg-blue-50 px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-100">
                      + Agregar
                    </button>
                    {open && (
                      <div className="w-full mt-2 pt-2 border-t border-dashed border-gray-200">
                        <p className="text-xs text-gray-600 mb-2">Cuentas del balance ({libres.length}):</p>
                        <div className="flex flex-wrap gap-1 max-h-40 overflow-auto">
                          {libres.slice(0,80).map(x=>(
                            <button key={x.codigo} onClick={()=>agregar(c.concepto,c.concepto_nombre,x.codigo)}
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
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
