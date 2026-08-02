"use client";

import { useEffect, useState } from "react";
import { API, apiGet, apiPost } from "@/lib/api";

export default function Parametrizar() {
  const [reglas, setReglas] = useState([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState({
    formato: "1001", concepto: "", concepto_nombre: "",
    cuentas_desde: "", cuentas_hasta: "", doc_types: "NIT,CC",
    campo_valor: "closing", notas: "",
  });

  useEffect(() => { cargarReglas(); }, []);

  async function cargarReglas() {
    try {
      setReglas(await apiGet("/api/template-rules?formato=1001"));
    } catch (e) {
      setError(String(e));
    }
  }

  async function crear(e) {
    e.preventDefault();
    setError(""); setOk("");
    if (!form.concepto) { setError("El código de concepto es obligatorio."); return; }
    try {
      await apiPost("/api/template-rules", { ...form, concepto: parseInt(form.concepto) });
      setOk("Regla creada.");
      setForm({ ...form, concepto: "", concepto_nombre: "", cuentas_desde: "", cuentas_hasta: "", notas: "" });
      cargarReglas();
    } catch (err) {
      setError(String(err));
    }
  }

  async function eliminar(id) {
    setError(""); setOk("");
    try {
      await fetch(`${API}/api/template-rules/${id}`, { method: "DELETE" });
      setOk("Regla eliminada.");
      cargarReglas();
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">⚙️ Parametrización de cuentas (configurador de formatos DIAN)</h1>
      <p className="text-sm text-gray-600">
        Aquí defines qué <b>cuentas del PUC</b> alimentan cada <b>concepto de la DIAN</b> (cpt) en el formato 1001.
        Esto es <b>opcional</b>: si no se configura, el sistema usa las reglas de ejemplo.
      </p>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}
      {ok && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">{ok}</div>}

      {/* Formulario */}
      <form onSubmit={crear} className="grid gap-3 rounded-xl border bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <input value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })}
          placeholder="Concepto * (ej. 3001)" required
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input value={form.concepto_nombre} onChange={(e) => setForm({ ...form, concepto_nombre: e.target.value })}
          placeholder="Nombre del concepto"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input value={form.cuentas_desde} onChange={(e) => setForm({ ...form, cuentas_desde: e.target.value })}
          placeholder="Cuenta desde (ej. 5110)"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input value={form.cuentas_hasta} onChange={(e) => setForm({ ...form, cuentas_hasta: e.target.value })}
          placeholder="Cuenta hasta (ej. 511099)"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input value={form.doc_types} onChange={(e) => setForm({ ...form, doc_types: e.target.value })}
          placeholder="Tipos doc (NIT,CC)"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <select value={form.campo_valor} onChange={(e) => setForm({ ...form, campo_valor: e.target.value })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="closing">Saldo final (closing)</option>
          <option value="debits">Débitos (debits)</option>
          <option value="credits">Créditos (credits)</option>
        </select>
        <input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })}
          placeholder="Notas"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2" />
        <button type="submit"
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800">
          + Agregar regla
        </button>
      </form>

      {/* Tabla de reglas */}
      <h2 className="text-lg font-semibold">Reglas actuales (formato 1001)</h2>
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Concepto</th>
              <th className="px-3 py-2 font-medium">Nombre</th>
              <th className="px-3 py-2 font-medium">Desde</th>
              <th className="px-3 py-2 font-medium">Hasta</th>
              <th className="px-3 py-2 font-medium">Tipos Doc</th>
              <th className="px-3 py-2 font-medium">Campo Valor</th>
              <th className="px-3 py-2 font-medium">Notas</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {reglas.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50/50">
                <td className="px-3 py-2 font-mono text-xs font-bold">{r.concepto}</td>
                <td className="px-3 py-2">{r.concepto_nombre}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.cuentas_desde}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.cuentas_hasta}</td>
                <td className="px-3 py-2 text-xs">{r.doc_types}</td>
                <td className="px-3 py-2 text-xs">{r.campo_valor}</td>
                <td className="px-3 py-2 text-xs text-gray-500 max-w-[200px] truncate">{r.notas}</td>
                <td className="px-3 py-2">
                  <button onClick={() => eliminar(r.id)}
                    className="rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-200">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {reglas.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">
                No hay reglas configuradas todavía.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">
        Las reglas se usan en "Generar XML" y "Exportar Excel". Si no hay reglas, esas funciones no generarán registros.
      </p>
    </div>
  );
}
