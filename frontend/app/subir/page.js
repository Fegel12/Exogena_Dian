"use client";

import { useState } from "react";

export default function Subir() {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return setMsg("Selecciona un archivo Excel");
    setLoading(true);
    setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/companies/1/balances", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      setMsg(`✅ Importado! ${data.validacion?.total || "?"} incidencias`);
    } catch (err) {
      setMsg(`❌ ${err}`);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">📤 Subir balance de prueba</h1>
      <p className="text-sm text-gray-500">
        Archivo exportado por WorldOffice (balance con terceros, formato .xlsx)
      </p>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-5 shadow-sm">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files[0])}
          className="text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Importando..." : "Importar y validar"}
        </button>
      </form>

      {msg && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${msg.startsWith("✅") ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {msg}
        </div>
      )}
    </div>
  );
}
