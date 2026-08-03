"use client";

import { useState, useEffect } from "react";

export default function Parametrizar() {
  const [reglas, setReglas] = useState([]);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    concepto: "", concepto_nombre: "", cuentas_desde: "", cuentas_hasta: "",
    doc_types: "NIT,CC", campo_valor: "closing", notas: "",
  });

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/template-rules?formato=1001")
      .then(r => r.json()).then(setReglas).catch(() => {});
  }, []);

  async function crear(e) {
    e.preventDefault();
    if (!form.concepto) return setMsg("❌ El código de concepto es obligatorio");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/template-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, concepto: parseInt(form.concepto) }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg("✅ Regla creada");
      setForm({ ...form, concepto: "", concepto_nombre: "", cuentas_desde: "", cuentas_hasta: "", notas: "" });
      const r = await fetch("http://127.0.0.1:8000/api/template-rules?formato=1001");
      setReglas(await r.json());
    } catch (err) {
      setMsg(`❌ ${err}`);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">⚙️ Parametrizar conceptos DIAN</h1>
      <p className="text-sm text-gray-500">
        Asigna cuentas del PUC a cada concepto DIAN del formato 1001
      </p>

      {msg && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${msg.startsWith("✅") ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {msg}
        </div>
      )}

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
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Sin reglas</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
