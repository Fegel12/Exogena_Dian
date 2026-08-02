"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiGet, apiUpload } from "@/lib/api";

export default function Subir() {
  const [empresas, setEmpresas] = useState([]);
  const [empresa, setEmpresa] = useState("1");
  const [archivo, setArchivo] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    apiGet("/api/companies").then(setEmpresas).catch(() => {});
  }, []);

  async function subir(e) {
    e.preventDefault();
    if (!archivo) {
      setError("Seleccione un archivo Excel (.xlsx).");
      return;
    }
    setError("");
    setCargando(true);
    setResultado(null);
    try {
      const r = await apiUpload(`/api/companies/${empresa}/balances`, archivo);
      setResultado(r);
    } catch (err) {
      setError(String(err));
    } finally {
      setCargando(false);
      if (inputRef.current) inputRef.current.value = "";
      setArchivo(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📤 Subir balance de prueba</h1>
        <p className="mt-1 text-sm text-gray-500">
          Archivo exportado por WorldOffice (balance de prueba <b>con terceros</b>).
          El sistema detecta la estructura, importa y valida automáticamente.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <form
        onSubmit={subir}
        className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-5 shadow-sm"
      >
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

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setArchivo(e.target.files[0])}
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        />

        <button
          type="submit"
          disabled={cargando}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {cargando ? "Importando…" : "Importar y validar"}
        </button>
      </form>

      {resultado && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-5">
          <h3 className="text-lg font-semibold text-green-800">
            ✅ Balance importado (id {resultado.balance_id}, periodo {resultado.period})
          </h3>
          <p className="mt-1 text-sm text-green-700">
            Validación: <b>{resultado.validacion.total}</b> incidencias (
            <b>{resultado.validacion.errores}</b> errores,{" "}
            <b>{resultado.validacion.advertencias}</b> advertencias).
          </p>
          <Link
            href={`/dashboard?empresa=${empresa}`}
            className="mt-3 inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            Ver el dashboard →
          </Link>
        </div>
      )}

      {!resultado && !error && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-gray-400">Selecciona un archivo Excel (.xlsx) para empezar</p>
          <p className="mt-1 text-xs text-gray-300">
            El balance debe tener la estructura de WorldOffice: código, nombre tercero, saldos, débitos, créditos
          </p>
        </div>
      )}
    </div>
  );
}
