"use client";

import { useState, useEffect, useMemo } from "react";

const FORMATOS = [
  { code: "1001", name: "Pagos y retenciones practicadas" },
  { code: "1005", name: "IVA descontable" },
  { code: "1647", name: "Ingresos recibidos para terceros" },
  { code: "2821", name: "APC - Certificados CUC" },
  { code: "2822", name: "Certificaciones beneficios Ley 1715" },
  { code: "2854", name: "Ingresos terceros del exterior" },
  { code: "1476", name: "Registros catastrales / predial" },
  { code: "2574", name: "No causación impuesto al carbono" },
];

const API = "http://127.0.0.1:8000";

export default function Parametrizar() {
  const [formato, setFormato] = useState("1001");
  const [reglas, setReglas] = useState([]);
  const [conceptos, setConceptos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [msg, setMsg] = useState("");
  const [fileMsg, setFileMsg] = useState("");

  // Filtros para dropdowns
  const [filtroConcepto, setFiltroConcepto] = useState("");
  const [filtroCuenta, setFiltroCuenta] = useState("");

  // Formulario
  const [form, setForm] = useState({
    concepto: "", concepto_nombre: "", cuentas_desde: "", cuentas_hasta: "",
    doc_types: "NIT,CC", campo_valor: "closing",
  });

  // Cargar conceptos y cuentas al cambiar formato
  useEffect(() => {
    fetch(`${API}/api/conceptos-dian?formato=${formato}`)
      .then(r => r.json()).then(setConceptos).catch(() => {});
    fetch(`${API}/api/cuentas-balance?tenant_id=1`)
      .then(r => r.json()).then(setCuentas).catch(() => {});
    fetch(`${API}/api/template-rules?formato=${formato}`)
      .then(r => r.json()).then(setReglas).catch(() => {});
  }, [formato]);

  // Filtrar dropdowns por búsqueda
  const conceptosFiltrados = useMemo(() => {
    if (!filtroConcepto) return conceptos;
    const q = filtroConcepto.toLowerCase();
    return conceptos.filter(c =>
      String(c.codigo).includes(q) || (c.nombre || "").toLowerCase().includes(q)
    );
  }, [conceptos, filtroConcepto]);

  const cuentasFiltradas = useMemo(() => {
    if (!filtroCuenta) return cuentas;
    const q = filtroCuenta.toLowerCase();
    return cuentas.filter(c =>
      String(c.codigo).includes(q) || (c.nombre || "").toLowerCase().includes(q)
    );
  }, [cuentas, filtroCuenta]);

  // Al seleccionar concepto del dropdown, auto-llenar
  function seleccionarConcepto(codigo) {
    const c = conceptos.find(x => String(x.codigo) === String(codigo));
    if (c) {
      setForm({
        ...form,
        concepto: String(c.codigo),
        concepto_nombre: c.nombre || "",
        cuentas_desde: c.cuentas_desde || "",
        cuentas_hasta: c.cuentas_hasta || "",
      });
    }
  }

  async function crear(e) {
    e.preventDefault();
    if (!form.concepto) return setMsg("❌ Selecciona un concepto");
    try {
      const res = await fetch(`${API}/api/template-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          format_code: formato,
          concepto: parseInt(form.concepto),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg(`✅ Regla creada: concepto ${form.concepto}`);
      const r = await fetch(`${API}/api/template-rules?formato=${formato}`);
      setReglas(await r.json());
      // Recargar conceptos
      const c = await fetch(`${API}/api/conceptos-dian?formato=${formato}`);
      setConceptos(await c.json());
    } catch (err) {
      setMsg(`❌ ${err}`);
    }
  }

  // Subir archivo plano CSV/TXT
  async function uploadFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileMsg("Cargando...");
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim() && !l.startsWith("#"));
      let count = 0;
      for (const line of lines) {
        // Formato: concepto|nombre|desde|hasta|tipo_doc|campo_valor
        const parts = line.includes("\t") ? line.split("\t") : line.includes("|") ? line.split("|") : line.split(",");
        const [concepto, nombre, desde, hasta, docs, campo] = parts.map(p => (p || "").trim());
        if (!concepto || isNaN(parseInt(concepto))) continue;
        await fetch(`${API}/api/template-rules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            format_code: formato,
            concepto: parseInt(concepto),
            concepto_nombre: nombre,
            cuentas_desde: desde,
            cuentas_hasta: hasta,
            doc_types: docs || "NIT,CC",
            campo_valor: campo || "closing",
          }),
        });
        count++;
      }
      setFileMsg(`✅ ${count} reglas importadas`);
      const r = await fetch(`${API}/api/template-rules?formato=${formato}`);
      setReglas(await r.json());
    } catch (err) {
      setFileMsg(`❌ ${err}`);
    }
  }

  // Generar todos los formatos
  async function generarTodos() {
    setMsg("⏳ Generando todos los formatos...");
    try {
      const res = await fetch(`${API}/api/companies/1/generate-all`, { method: "POST" });
      const data = await res.json();
      setMsg(`✅ ${data.generados}/${data.total_formatos} formatos generados`);
    } catch (err) {
      setMsg(`❌ ${err}`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">⚙️ Parametrizar conceptos DIAN</h1>
        <p className="mt-1 text-sm text-gray-500">
          Asigna cuentas del PUC a cada concepto DIAN por formato. Usa los filtros para buscar.
        </p>
      </div>

      {/* Selector de formato */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-white p-4 shadow-sm">
        <label className="text-sm font-semibold text-gray-700">Formato:</label>
        <select value={formato} onChange={e => setFormato(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900">
          {FORMATOS.map(f => (
            <option key={f.code} value={f.code}>{f.code} — {f.name}</option>
          ))}
        </select>
        <button onClick={generarTodos}
          className="ml-auto rounded-lg bg-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-green-800">
          🚀 Generar TODOS los formatos
        </button>
      </div>

      {msg && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${msg.startsWith("✅") ? "border-green-200 bg-green-50 text-green-700" : msg.startsWith("⏳") ? "border-blue-200 bg-blue-50 text-blue-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {msg}
        </div>
      )}

      {/* Área de trabajo: 2 columnas */}
      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* COLUMNA IZQ: Formulario */}
        <div className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900">Agregar regla manual</h2>

          {/* Concepto DIAN (dropdown con filtro) */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Concepto DIAN *</label>
            <input
              type="text"
              value={filtroConcepto}
              onChange={e => setFiltroConcepto(e.target.value)}
              placeholder="🔍 Buscar por código o nombre..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
            <select
              size={6}
              value={form.concepto}
              onChange={e => seleccionarConcepto(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 text-sm text-gray-900">
              <option value="">— Selecciona —</option>
              {conceptosFiltrados.map(c => (
                <option key={c.codigo} value={c.codigo}>
                  {c.codigo} — {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Campo valor */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Campo valor</label>
            <select value={form.campo_valor} onChange={e => setForm({...form, campo_valor: e.target.value})}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
              <option value="closing">Saldo final</option>
              <option value="debits">Débitos</option>
              <option value="credits">Créditos</option>
            </select>
          </div>

          {/* Cuenta desde / hasta (dropdown con filtro) */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Cuenta contable</label>
            <input
              type="text"
              value={filtroCuenta}
              onChange={e => setFiltroCuenta(e.target.value)}
              placeholder="🔍 Filtrar cuentas..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
            <select
              size={6}
              value={form.cuentas_desde}
              onChange={e => {
                const c = cuentas.find(x => x.codigo === e.target.value);
                setForm({...form, cuentas_desde: e.target.value, cuentas_hasta: e.target.value});
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 text-sm text-gray-900">
              <option value="">— Selecciona —</option>
              {cuentasFiltradas.map(c => (
                <option key={c.codigo} value={c.codigo}>
                  {c.codigo} — {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <button onClick={crear}
            className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
            + Agregar regla
          </button>
        </div>

        {/* COLUMNA DER: Archivo + Reglas */}
        <div className="space-y-4">
          {/* Subir archivo */}
          <div className="rounded-xl border bg-amber-50 p-5 shadow-sm">
            <h2 className="font-semibold text-amber-900">📂 Subir archivo plano</h2>
            <p className="mt-1 text-xs text-amber-700">
              Formato: <code className="rounded bg-amber-100 px-1">concepto|nombre|cuenta_desde|cuenta_hasta|tipo_doc|campo_valor</code>
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Separador: pipe (|), coma (,), o tab. Líneas con # se ignoran.
            </p>
            <div className="mt-2 flex gap-2">
              <a href="http://127.0.0.1:8000/static/plantilla_conceptos_dian.xlsx"
                 className="text-xs text-blue-700 underline hover:text-blue-900">
                📥 Descargar plantilla Excel
              </a>
              <a href="http://127.0.0.1:8000/static/plantilla_ejemplo.txt"
                 className="text-xs text-blue-700 underline hover:text-blue-900">
                📥 Descargar ejemplo TXT
              </a>
            </div>
            <p className="mt-2 text-[11px] text-amber-800 bg-amber-100 rounded p-2">
              ⚠️ Los códigos de concepto cargados son aproximados. Verifica contra la resolución DIAN oficial y ajústalos en la plantilla antes de subir.
            </p>
            <input type="file" accept=".csv,.txt,.xlsx" onChange={uploadFile}
              className="mt-3 text-sm" />
            {fileMsg && <p className="mt-2 text-sm text-amber-800">{fileMsg}</p>}
          </div>

          {/* Tabla de reglas */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="border-b bg-gray-50 px-4 py-2">
              <span className="text-sm font-semibold text-gray-700">
                Reglas ({reglas.length}) — Formato {formato}
              </span>
            </div>
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Concepto</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Nombre</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Cuenta</th>
                  </tr>
                </thead>
                <tbody>
                  {reglas.map(r => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono font-bold text-blue-700">{r.concepto}</td>
                      <td className="px-3 py-2 text-gray-700">{r.concepto_nombre}</td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">
                        {r.cuentas_desde}{r.cuentas_hasta !== r.cuentas_desde ? ` → ${r.cuentas_hasta}` : ""}
                      </td>
                    </tr>
                  ))}
                  {reglas.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400">Sin reglas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
