"use client";

import { useState, useEffect } from "react";

const FORMATOS = ["1001","1005","1647","2821","2822","2854","1476","2574"];
const API = "http://127.0.0.1:8000";

export default function Parametrizar() {
  const [formato, setFormato] = useState("1001");
  const [conceptos, setConceptos] = useState([]);
  const [cuentasBalance, setCuentasBalance] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  function cargar() {
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/template-rules?formato=${formato}`).then(r=>r.json()),
      fetch(`${API}/api/cuentas-balance?tenant_id=1`).then(r=>r.json()),
    ]).then(([c,cu]) => { setConceptos(c); setCuentasBalance(cu); })
      .catch(e => setMsg("Error al cargar: " + e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { cargar(); }, [formato]);

  async function toggleActive(ruleId, active) {
    await fetch(`${API}/api/template-rules/${ruleId}`, {
      method: "PATCH", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({active: !active}),
    });
    cargar();
  }

  async function agregarCuenta(concepto, nombre, cuenta) {
    await fetch(`${API}/api/template-rules`, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({format_code: formato, concepto, concepto_nombre: nombre, cuenta, campo_valor:"closing"}),
    });
    cargar();
  }

  async function eliminarCuenta(ruleId) {
    await fetch(`${API}/api/template-rules/${ruleId}`, { method: "DELETE" });
    cargar();
  }

  async function autoProponer() {
    setMsg("Generando propuesta...");
    const r = await fetch(`${API}/api/template-rules/auto-propose?tenant_id=1&formato=${formato}`, { method:"POST" });
    const d = await r.json();
    setMsg(`✅ ${d.creados} asignaciones nuevas`);
    cargar();
  }

  function cuentasLibres(concepto) {
    const asignadas = new Set((concepto?.cuentas||[]).map(a=>a.cuenta));
    return cuentasBalance.filter(c => !asignadas.has(c.codigo) && c.codigo.length >= 4);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-gray-900">⚙️ Parametrizar: Conceptos DIAN → Cuentas PUC</h1>
        <div className="flex gap-2">
          <a href={`${API}/api/template-rules/export?formato=${formato}&fmt=xlsx`}
             className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
            📥 Exportar
          </a>
          <label className="cursor-pointer rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
            📤 Importar
            <input type="file" accept=".csv,.txt,.xlsx,.xls" className="hidden"
              onChange={async e => {
                const f = e.target.files[0]; if(!f) return;
                const fd = new FormData(); fd.append("file", f);
                setMsg("Importando...");
                const r = await fetch(`${API}/api/template-rules/import?formato=${formato}`, {method:"POST", body:fd});
                const d = await r.json();
                setMsg(`✅ ${d.creados} nuevas, ${d.actualizados} actualizadas${d.warnings?.length ? `, ${d.warnings.length} advertencias` : ""}`);
                cargar();
              }} />
          </label>
          <button onClick={autoProponer}
            className="rounded bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800">
            🤖 Auto-propuesta
          </button>
        </div>
      </div>

      <div className="flex gap-1 rounded-lg border bg-white px-2 py-1.5 shadow-sm">
        {FORMATOS.map(f => (
          <button key={f} onClick={() => { setFormato(f); setExpanded(null); }}
            className={`rounded px-3 py-1 text-xs font-medium ${
              formato===f ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>{f}</button>
        ))}
        <span className="ml-auto self-center text-[11px] text-gray-400">{conceptos.length} conceptos</span>
      </div>

      {msg && <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">{msg}</div>}

      {/* TABLA */}
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-700 w-[90px]">Concepto</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Cuentas PUC de ESTA empresa</th>
            </tr>
          </thead>
          <tbody>
            {conceptos.map(c => {
              const isOpen = expanded === c.concepto;
              const activas = (c.cuentas||[]).filter(a => a.active);
              const libres = cuentasLibres(c);
              return (
                <tr key={c.concepto} className="border-b hover:bg-gray-50/30">
                  <td className="px-3 py-2.5 align-top">
                    <button onClick={() => setExpanded(isOpen ? null : c.concepto)}
                      className="text-left">
                      <span className="font-mono font-bold text-blue-700">{c.concepto}</span>
                      <br/>
                      <span className="text-[11px] text-gray-500">{c.concepto_nombre}</span>
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    {/* Cuentas activas: checkboxes */}
                    <div className="flex flex-wrap gap-1.5">
                      {activas.map(a => (
                        <label key={a.rule_id}
                          className="inline-flex items-center gap-1 rounded border border-green-300 bg-green-50 px-2 py-1 text-xs cursor-pointer hover:bg-green-100">
                          <input type="checkbox" checked={a.active}
                            onChange={() => toggleActive(a.rule_id, a.active)}
                            className="h-3 w-3 accent-green-600" />
                          <span className="font-mono text-green-700">{a.cuenta}</span>
                          <button onClick={(e) => { e.preventDefault(); eliminarCuenta(a.rule_id); }}
                            className="ml-1 text-red-400 hover:text-red-600 font-bold">&times;</button>
                        </label>
                      ))}
                      {/* Inactivas (solo visibles expandido) */}
                      {isOpen && (c.cuentas||[]).filter(a => !a.active).map(a => (
                        <label key={a.rule_id}
                          className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs cursor-pointer hover:bg-gray-100">
                          <input type="checkbox" checked={false}
                            onChange={() => toggleActive(a.rule_id, a.active)}
                            className="h-3 w-3" />
                          <span className="font-mono text-gray-400 line-through">{a.cuenta}</span>
                          <button onClick={(e) => { e.preventDefault(); eliminarCuenta(a.rule_id); }}
                            className="ml-1 text-red-400 hover:text-red-600 font-bold">&times;</button>
                        </label>
                      ))}
                      
                      {/* "+ Add account" — solo visible expandido */}
                      {isOpen && (
                        <AddAccountButton libres={libres}
                          onSelect={(cuenta) => agregarCuenta(c.concepto, c.concepto_nombre, cuenta)} />
                      )}

                      {!isOpen && activas.length === 0 && (
                        <span className="text-xs text-gray-300 italic">Click para expandir</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {loading && (
              <tr><td colSpan={2} className="py-10 text-center text-gray-400">⏳ Cargando conceptos...</td></tr>
            )}
            {!loading && conceptos.length === 0 && (
              <tr><td colSpan={2} className="py-10 text-center text-gray-400">Sin conceptos para este formato. Usa Auto-propuesta o Importar.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Componente: botón "+ Add account" con buscador
function AddAccountButton({ libres, onSelect }) {
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState("");

  const filtradas = libres.filter(c =>
    !filtro || c.codigo.includes(filtro) || (c.nombre||"").toLowerCase().includes(filtro.toLowerCase())
  ).slice(0, 60);

  return (
    <span className="relative inline-block">
      <button onClick={() => setOpen(!open)}
        className="rounded border border-dashed border-blue-300 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100">
        + Add account
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border bg-white shadow-xl">
          <input type="text" placeholder="Buscar cuenta..." autoFocus
            value={filtro} onChange={e => setFiltro(e.target.value)}
            className="w-full border-b px-3 py-2 text-xs outline-none" />
          <div className="max-h-48 overflow-auto">
            {filtradas.map(c => (
              <div key={c.codigo} onClick={() => { onSelect(c.codigo); setOpen(false); setFiltro(""); }}
                className="cursor-pointer px-3 py-1.5 text-xs hover:bg-blue-50 border-b last:border-0">
                <span className="font-mono text-green-700">{c.codigo}</span>
                <span className="ml-2 text-gray-500">{c.nombre}</span>
              </div>
            ))}
            {filtradas.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-400">Sin resultados</p>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
