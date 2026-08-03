"use client";

import { useState, useEffect } from "react";

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

export default function Parametrizar() {
  const [formato, setFormato] = useState("1001");
  const [reglas, setReglas] = useState([]);
  const [msg, setMsg] = useState("");
  const [fileMsg, setFileMsg] = useState("");
  const [form, setForm] = useState({
    concepto: "", concepto_nombre: "", cuentas_desde: "", cuentas_hasta: "",
    doc_types: "NIT,CC", campo_valor: "closing", notas: "",
  });

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/template-rules?formato=${formato}`)
      .then(r => r.json()).then(setReglas).catch(() => {});
  }, [formato]);

  async function crear(e) {
    e.preventDefault();
    if (!form.concepto) return setMsg("❌ El código de concepto es obligatorio");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/template-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, format_code: formato, concepto: parseInt(form.concepto) }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg("✅ Regla creada");
      setForm({ ...form, concepto: "", concepto_nombre: "", cuentas_desde: "", cuentas_hasta: "", notas: "" });
      const r = await fetch(`http://127.0.0.1:8000/api/template-rules?formato=${formato}`);
      setReglas(await r.json());
    } catch (err) {
      setMsg(`❌ ${err}`);
    }
  }

  async function uploadFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileMsg("Cargando...");
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      let count = 0;
      for (const line of lines) {
        // Formato: concepto|nombre|desde|hasta|doc_types|campo_valor
        const parts = line.includes("\t") ? line.split("\t") : line.split(",");
        if (parts.length < 4) continue;
        const [concepto, nombre, desde, hasta, docs, campo] = parts;
        if (isNaN(parseInt(concepto))) continue;
        await fetch("http://127.0.0.1:8000/api/template-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            format_code: formato,
            concepto: parseInt(concepto.trim()),
            concepto_nombre: (nombre || "").trim(),
            cuentas_desde: (desde || "").trim(),
            cuentas_hasta: (hasta || "").trim(),
            doc_types: (docs || "NIT,CC").trim(),
            campo_valor: (campo || "closing").trim(),
          }),
        });
        count++;
      }
      setFileMsg(`✅ ${count} reglas importadas`);
      const r = await fetch(`http://127.0.0.1:8000/api/template-rules?formato=${formato}`);
      setReglas(await r.json());
    } catch (err) {
      setFileMsg(`❌ Error: ${err}`);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">⚙️ Parametrizar conceptos DIAN</h1>
      <p className="text-sm text-gray-500">
        Asigna cuentas del PUC a cada concepto DIAN. Selecciona el formato, crea reglas o sube un archivo plano (CSV/TXT).
      </p>

      {msg && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${msg.startsWith("✅") ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {msg}
        </div>
      )}

      {/* Selector de formato */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4 shadow-sm">
        <label className="text-sm font-medium text-gray-700">Formato:</label>
        <select value={formato} onChange={e => setFormato(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
          {FORMATOS.map(f => (
            <option key={f.code} value={f.code}>{f.code} - {f.name}</option>
          ))}
        </select>

        {/* Subir archivo plano */}
        <span className="text-gray-300">|</span>
        <input type="file" accept=".csv,.txt,.xlsx" onChange={uploadFile}
          className="text-sm" />
        <span className="text-xs text-gray-400">CSV/TXT: concepto,nombre,desde,hasta</span>
      </div>
      {fileMsg && <p className="text-sm text-gray-600">{fileMsg}</p>}

      {/* Formulario manual */}
      <form onSubmit={crear} className="grid gap-3 rounded-xl border bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <input value={form.concepto} onChange={e => setForm({...form, concepto: e.target.value})}
          placeholder="Concepto * (ej. 5001)" required
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
        <input value={form.concepto_nombre} onChange={e => setForm({...form, concepto_nombre: e.target.value})}
          placeholder="Nombre del concepto"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
        <input value={form.cuentas_desde} onChange={e => setForm({...form, cuentas_desde: e.target.value})}
          placeholder="Cuenta desde (ej. 2365)"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
        <input value={form.cuentas_hasta} onChange={e => setForm({...form, cuentas_hasta: e.target.value})}
          placeholder="Cuenta hasta (ej. 236599)"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
        <select value={form.campo_valor} onChange={e => setForm({...form, campo_valor: e.target.value})}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
          <option value="closing">Saldo final</option>
          <option value="debits">Débitos</option>
          <option value="credits">Créditos</option>
        </select>
        <button type="submit"
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
          + Agregar regla
        </button>
      </form>

      {/* Tabla de reglas */}
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-3 py-2 font-medium text-gray-700 text-left">Concepto</th>
              <th className="px-3 py-2 font-medium text-gray-700 text-left">Nombre</th>
              <th className="px-3 py-2 font-medium text-gray-700 text-left">Desde</th>
              <th className="px-3 py-2 font-medium text-gray-700 text-left">Hasta</th>
              <th className="px-3 py-2 font-medium text-gray-700 text-left">Valor</th>
            </tr>
          </thead>
          <tbody>
            {reglas.map(r => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-3 py-2 font-mono font-bold text-gray-900">{r.concepto}</td>
                <td className="px-3 py-2 text-gray-700">{r.concepto_nombre}</td>
                <td className="px-3 py-2 font-mono text-gray-500">{r.cuentas_desde}</td>
                <td className="px-3 py-2 font-mono text-gray-500">{r.cuentas_hasta}</td>
                <td className="px-3 py-2 text-gray-500">{r.campo_valor}</td>
              </tr>
            ))}
            {reglas.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Sin reglas para este formato</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
