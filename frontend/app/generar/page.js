"use client";

import { useEffect, useState } from "react";
import { API, apiGet, apiPost } from "@/lib/api";

export default function Generar() {
  const [empresas, setEmpresas] = useState([]);
  const [empresa, setEmpresa] = useState("1");
  const [archivos, setArchivos] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [cargandoExcel, setCargandoExcel] = useState(false);

  async function cargarArchivos() {
    try {
      setArchivos(await apiGet(`/api/companies/${empresa}/files`));
    } catch {
      /* sin archivos todavía */
    }
  }

  useEffect(() => {
    apiGet("/api/companies").then(setEmpresas).catch(() => {});
  }, []);

  useEffect(() => {
    cargarArchivos();
  }, [empresa]);

  async function exportarExcel() {
    setError("");
    setCargandoExcel(true);
    try {
      const res = await fetch(`${API}/api/companies/${empresa}/export-excel?formato=1001`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Formato_1001_v11.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(String(err));
    } finally {
      setCargandoExcel(false);
    }
  }

  async function generar() {
    setError("");
    setCargando(true);
    setResultado(null);
    try {
      const r = await apiPost(`/api/companies/${empresa}/generate?formato=1001`, {});
      setResultado(r);
      cargarArchivos();
    } catch (err) {
      setError(String(err));
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📄 Generar archivos para la DIAN</h1>
        <p className="mt-1 text-sm text-gray-500">
          Genera el XML del <b>formato 1001</b> (Pagos o Abonos en Cuenta y Retenciones practicadas,
          Versión 11) según la estructura del anexo de la resolución.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4 shadow-sm">
        <select
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>

        <button
          onClick={generar}
          disabled={cargando}
          className="rounded-lg bg-green-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-green-800 disabled:opacity-50"
        >
          {cargando ? "Generando…" : "Generar formato 1001"}
        </button>

        <button
          onClick={exportarExcel}
          disabled={cargandoExcel || archivos.length === 0}
          className="rounded-lg border border-green-600 bg-white px-4 py-2 text-sm font-medium text-green-700 transition hover:bg-green-50 disabled:opacity-50"
        >
          {cargandoExcel ? "Generando Excel…" : "📥 Exportar Excel"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {resultado && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-5">
          <h3 className="text-lg font-semibold text-green-800">✅ Archivos generados</h3>
          <div className="mt-2 space-y-1">
            {resultado.archivos.map((a) => (
              <div key={a.file_name} className="flex items-center gap-3 text-sm">
                <span className="font-mono font-medium">{a.file_name}</span>
                <span className="text-gray-500">·</span>
                <span>{a.registros} registros</span>
                <span className="text-gray-500">·</span>
                <span className="font-semibold">
                  {a.valor_total.toLocaleString("es-CO")} COP
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Las reglas usan conceptos de ejemplo (9001-9006); reemplázalas por el catálogo oficial
            de la resolución en la parametrización.
          </p>
        </div>
      )}

      {/* Archivos generados antes */}
      <div>
        <h2 className="text-lg font-semibold">Archivos generados antes</h2>
        <div className="mt-2 overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Archivo</th>
                <th className="px-4 py-3 font-medium">Formato</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {archivos.map((f) => (
                <tr key={f.id} className="border-b last:border-0 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs">{f.file_name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {f.format_code}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{f.created_at}</td>
                  <td className="px-4 py-3">
                    <a
                      href={`${API}/api/files/${f.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                    >
                      ⬇ Descargar
                    </a>
                  </td>
                </tr>
              ))}
              {archivos.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    No hay archivos generados todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
