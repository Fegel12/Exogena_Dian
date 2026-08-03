"use client";

import { useState, useEffect } from "react";

const FORMATOS = [
  { code: "1001", name: "Pagos y retenciones" },
  { code: "1005", name: "IVA descontable" },
  { code: "1647", name: "Ingresos terceros" },
  { code: "2821", name: "APC - Certificados CUC" },
  { code: "2822", name: "Certificaciones Ley 1715" },
  { code: "2854", name: "Ingresos exterior" },
  { code: "1476", name: "Catastral / predial" },
  { code: "2574", name: "Impuesto al carbono" },
];

const API = "http://127.0.0.1:8000";

export default function Parametrizar() {
  const [formato, setFormato] = useState("1001");
  const [conceptos, setConceptos] = useState([]);      // conceptos DIAN con cuentas asignadas
  const [cuentasBalance, setCuentasBalance] = useState([]); // todas las cuentas del balance
  const [selected, setSelected] = useState(null);        // concepto seleccionado
  const [msg, setMsg] = useState("");
  const [filtroCuenta, setFiltroCuenta] = useState("");

  // Cargar datos
  function cargar() {
    fetch(`${API}/api/template-rules?formato=${formato}`)
      .then(r => r.json()).then(setConceptos).catch(() => {});
    fetch(`${API}/api/cuentas-balance?tenant_id=1`)
      .then(r => r.json()).then(setCuentasBalance).catch(() => {});
  }

  useEffect(() => { cargar(); }, [formato]);

  // Agregar cuenta a un concepto
  async function agregarCuenta(concepto, conceptoNombre) {
    if (!selected?.cuentaNueva) return;
    const cuenta = selected.cuentaNueva;
    try {
      const res = await fetch(`${API}/api/template-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format_code: formato,
          concepto: concepto,
          concepto_nombre: conceptoNombre,
          cuenta: cuenta,
          campo_valor: "closing",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      cargar();
      setMsg(`✅ Cuenta ${cuenta} asignada a concepto ${concepto}`);
    } catch (e) { setMsg(`❌ ${e}`); }
  }

  // Eliminar cuenta de un concepto
  async function eliminarCuenta(ruleId, cuenta, concepto) {
    try {
      await fetch(`${API}/api/template-rules/${ruleId}`, { method: "DELETE" });
      cargar();
      setMsg(`🗑️ Cuenta ${cuenta} removida del concepto ${concepto}`);
    } catch (e) { setMsg(`❌ ${e}`); }
  }

  // Cuentas disponibles (no asignadas a este concepto)
  function cuentasDisponibles(concepto) {
    const asignadas = new Set((concepto?.cuentas || []).map(c => c.cuenta));
    return cuentasBalance.filter(c => !asignadas.has(c.codigo) && c.codigo.length >= 4);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">⚙️ Parametrizar: Conceptos → Cuentas</h1>
        <p className="mt-1 text-sm text-gray-500">
          Asigna cuentas contables del balance a cada concepto DIAN. Cada empresa tiene su propia parametrización.
        </p>
      </div>

      {/* Barra formato */}
      <div className="flex flex-wrap gap-1 rounded-xl border bg-white p-2 shadow-sm">
        {FORMATOS.map(f => (
          <button key={f.code} onClick={() => { setFormato(f.code); setSelected(null); }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              formato === f.code ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}>
            {f.code}
          </button>
        ))}
        <span className="ml-2 self-center text-xs text-gray-400">
          {FORMATOS.find(f => f.code === formato)?.name}
        </span>
      </div>

      {msg && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${msg.startsWith("✅") ? "border-green-200 bg-green-50 text-green-700" : msg.startsWith("🗑️") ? "border-amber-200 bg-amber-50 text-amber-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {msg}
        </div>
      )}

      {/* Grid principal */}
      <div className="grid gap-4 lg:grid-cols-3">
        
        {/* COLUMNA 1: Lista de conceptos */}
        <div className="rounded-xl border bg-white shadow-sm lg:col-span-1">
          <div className="border-b bg-gray-50 px-4 py-3">
            <h2 className="font-semibold text-gray-900">📋 Conceptos ({conceptos.length})</h2>
          </div>
          <div className="max-h-[600px] overflow-auto">
            {conceptos.map(c => (
              <button key={c.concepto}
                onClick={() => setSelected({...c, cuentaNueva: ""})}
                className={`w-full border-b px-4 py-3 text-left transition hover:bg-blue-50 ${
                  selected?.concepto === c.concepto ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
                }`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-blue-700">{c.concepto}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {c.cuentas?.length || 0} cuentas
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-gray-700">{c.concepto_nombre}</p>
                {c.cuentas?.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {c.cuentas.slice(0, 5).map(a => (
                      <span key={a.cuenta} className="rounded bg-green-100 px-1.5 py-0.5 text-[11px] font-mono text-green-700">
                        {a.cuenta}
                      </span>
                    ))}
                    {c.cuentas.length > 5 && (
                      <span className="text-[11px] text-gray-400">+{c.cuentas.length - 5} más</span>
                    )}
                  </div>
                )}
              </button>
            ))}
            {conceptos.length === 0 && (
              <p className="p-6 text-center text-gray-400">Sin conceptos para este formato.</p>
            )}
          </div>
        </div>

        {/* COLUMNA 2-3: Detalle del concepto seleccionado */}
        <div className="rounded-xl border bg-white shadow-sm lg:col-span-2">
          {!selected ? (
            <div className="flex h-64 items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-4xl">👈</p>
                <p className="mt-2">Selecciona un concepto para asignarle cuentas</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-5">
              {/* Cabecera del concepto */}
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {selected.concepto} — {selected.concepto_nombre}
                </h2>
                <p className="text-xs text-gray-500">
                  Cuentas contables asignadas: {selected.cuentas?.length || 0}
                </p>
              </div>

              {/* Cuentas ya asignadas */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">✅ Cuentas asignadas</h3>
                {!selected.cuentas?.length ? (
                  <p className="text-sm text-gray-400 italic">Ninguna cuenta asignada todavía.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selected.cuentas.map(a => (
                      <span key={a.rule_id}
                        className="inline-flex items-center gap-1 rounded-lg bg-green-50 border border-green-200 px-3 py-1.5 text-sm font-mono text-green-700">
                        {a.cuenta}
                        <button onClick={() => eliminarCuenta(a.rule_id, a.cuenta, selected.concepto)}
                          className="ml-1 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 px-1 text-xs"
                          title="Quitar cuenta">
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Agregar nueva cuenta */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">➕ Agregar cuenta del balance</h3>
                <div className="flex gap-2">
                  <input type="text" placeholder="Filtrar cuentas..."
                    value={filtroCuenta}
                    onChange={e => setFiltroCuenta(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <select
                    value={selected.cuentaNueva || ""}
                    onChange={e => setSelected({...selected, cuentaNueva: e.target.value})}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                    <option value="">— Selecciona cuenta —</option>
                    {cuentasDisponibles(selected)
                      .filter(c => !filtroCuenta || c.codigo.includes(filtroCuenta) || (c.nombre||"").toLowerCase().includes(filtroCuenta.toLowerCase()))
                      .slice(0, 100)
                      .map(c => (
                        <option key={c.codigo} value={c.codigo}>
                          {c.codigo} — {c.nombre}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={() => agregarCuenta(selected.concepto, selected.concepto_nombre)}
                    disabled={!selected.cuentaNueva}
                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
                    + Agregar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
