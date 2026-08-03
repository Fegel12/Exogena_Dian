"use client";

import { useState } from "react";

export default function Generar() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function generar() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/companies/1/generate?formato=1001", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      setMsg(`✅ Generado! ${data.archivos?.length || 0} archivos`);
    } catch (err) {
      setMsg(`❌ ${err}`);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">📄 Generar archivos para la DIAN</h1>
      <p className="text-sm text-gray-500">
        Genera el XML del formato 1001 (Pagos o Abonos en Cuenta y Retenciones)
      </p>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <button
          onClick={generar}
          disabled={loading}
          className="rounded-lg bg-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
        >
          {loading ? "Generando..." : "Generar formato 1001"}
        </button>
      </div>

      {msg && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${msg.startsWith("✅") ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {msg}
        </div>
      )}
    </div>
  );
}
