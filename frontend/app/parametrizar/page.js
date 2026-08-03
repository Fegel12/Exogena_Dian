"use client";

import { useState, useEffect } from "react";

const FORMATOS = [
  "1001", "1005", "1647", "2821", "2822", "2854", "1476", "2574",
];

const API = "http://127.0.0.1:8000";

export default function Parametrizar() {
  const [formato, setFormato] = useState("1001");
  const [conceptos, setConceptos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [msg, setMsg] = useState("");

  function cargar() {
    Promise.all([
      fetch(`${API}/api/template-rules?formato=${formato}`).then(r => r.json()),
      fetch(`${API}/api/cuentas-balance?tenant_id=1`).then(r => r.json()),
    ]).then(([c, cu]) => { setConceptos(c); setCuentas(cu); }).catch(() => {});
  }

  useEffect(() => { cargar(); }, [formato]);

  async function agregar(concepto, nombre, cuenta, campoValor) {
    try {
      const res = await fetch(`${API}/api/template-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format_code: formato, concepto, concepto_nombre: nombre,
          cuenta, campo_valor: campoValor,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      cargar();
      setMsg(`✅ ${cuenta} → ${concepto}`);
      setTimeout(() => setMsg(""), 2000);
    } catch (e) { setMsg(`❌ ${e}`); }
  }

  async function eliminar(ruleId, cuenta, concepto) {
    try {
      await fetch(`${API}/api/template-rules/${ruleId}`, { method: "DELETE" });
      cargar();
      setMsg(`🗑️ ${cuenta} removida de ${concepto}`);
      setTimeout(() => setMsg(""), 2000);
    } catch (e) { setMsg(`❌ ${e}`); }
  }

  function cuentasLibres(concepto) {
    const asignadas = new Set((concepto?.cuentas || []).map(a => a.cuenta));
    return cuentas.filter(c => !asignadas.has(c.codigo) && c.codigo.length >= 4);
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-gray-900">⚙️ Parametrizar cuentas por concepto DIAN</h1>

      {/* Barra formato + mensaje */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-sm">
        {FORMATOS.map(f => (
          <button key={f} onClick={() => setFormato(f)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              formato === f ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{conceptos.length} conceptos · {cuentas.length} cuentas</span>
      </div>

      {msg && (
        <div className={`rounded-md border px-3 py-2 text-xs font-medium ${
          msg.startsWith("✅") ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"
        }`}>{msg}</div>
      )}

      {/* TABLA PRINCIPAL */}
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-700 w-[100px]">Concepto</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-700 w-[300px]">Nombre</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Cuentas asignadas</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-700 w-[280px]">Agregar cuenta</th>
            </tr>
          </thead>
          <tbody>
            {conceptos.map(c => (
              <ConceptoRow key={c.concepto}
                concepto={c} libres={cuentasLibres(c)}
                onAgregar={(cuenta, campo) => agregar(c.concepto, c.concepto_nombre, cuenta, campo)}
                onEliminar={(ruleId, cuenta) => eliminar(ruleId, cuenta, c.concepto)}
              />
            ))}
            {conceptos.length === 0 && (
              <tr><td colSpan={4} className="py-8 text-center text-gray-400">Sin conceptos para este formato</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Componente separado para cada fila (necesario para usar hooks dentro de map)
function ConceptoRow({ concepto, libres, onAgregar, onEliminar }) {
  const [cuentaSel, setCuentaSel] = useState("");
  const [campoVal, setCampoVal] = useState("closing");
  const [filtro, setFiltro] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const filtradas = libres.filter(c =>
    !filtro || c.codigo.includes(filtro) || (c.nombre || "").toLowerCase().includes(filtro.toLowerCase())
  ).slice(0, 80);

  return (
    <tr className="border-b hover:bg-gray-50/50 align-top">
      <td className="px-3 py-2.5 font-mono font-bold text-blue-700">{concepto.concepto}</td>
      <td className="px-3 py-2.5 text-gray-800">{concepto.concepto_nombre}</td>
      
      {/* Cuentas asignadas */}
      <td className="px-3 py-2.5">
        {!concepto.cuentas?.length ? (
          <span className="text-xs text-gray-300 italic">Sin cuentas</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {concepto.cuentas.map(a => (
              <span key={a.rule_id} className="inline-flex items-center gap-1 rounded bg-green-50 border border-green-200 px-1.5 py-0.5 text-xs font-mono text-green-700">
                {a.cuenta}
                <button onClick={() => onEliminar(a.rule_id, a.cuenta)}
                  className="text-red-400 hover:text-red-600 font-bold text-[10px] leading-none">&times;</button>
              </span>
            ))}
          </div>
        )}
      </td>

      {/* Agregar cuenta */}
      <td className="px-3 py-2.5">
        <div className="flex gap-1">
          <div className="relative flex-1">
            <input
              type="text"
              value={filtro}
              onChange={e => { setFiltro(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              placeholder="Buscar..."
              className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
            />
            {showDropdown && filtradas.length > 0 && (
              <div className="absolute z-10 mt-0.5 max-h-40 w-full overflow-auto rounded border bg-white shadow-lg">
                {filtradas.map(c => (
                  <div key={c.codigo}
                    className="cursor-pointer px-2 py-1 text-xs hover:bg-blue-50"
                    onMouseDown={() => { setCuentaSel(c.codigo); setFiltro(c.codigo + " — " + c.nombre); setShowDropdown(false); }}>
                    <span className="font-mono text-green-700">{c.codigo}</span>
                    <span className="ml-1 text-gray-500">{c.nombre}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <select value={campoVal} onChange={e => setCampoVal(e.target.value)}
            className="w-20 rounded border border-gray-300 px-1 py-1 text-xs text-gray-700">
            <option value="closing">Saldo</option>
            <option value="debits">Débito</option>
            <option value="credits">Crédito</option>
          </select>
          <button
            onClick={() => { if (cuentaSel) { onAgregar(cuentaSel, campoVal); setCuentaSel(""); setFiltro(""); } }}
            disabled={!cuentaSel}
            className="rounded bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
            +
          </button>
        </div>
      </td>
    </tr>
  );
}
