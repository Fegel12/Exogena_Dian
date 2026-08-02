"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [nombre, setNombre] = useState("");
  const [nit, setNit] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    apiGet("/api/companies").then(setEmpresas).catch((e) => setError(String(e)));
  }, []);

  async function crear(e) {
    e.preventDefault();
    setError(""); setOk("");
    try {
      await apiPost("/api/companies", { name: nombre, nit });
      setOk(`Empresa "${nombre}" creada.`);
      setNombre(""); setNit("");
      setEmpresas(await apiGet("/api/companies"));
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🏢 Empresas</h1>
        <p className="mt-1 text-sm text-gray-500">
          Vista de <b>superusuario</b>: todas las empresas del portal.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {ok && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{ok}</div>
      )}

      <form onSubmit={crear} className="flex flex-wrap gap-3 rounded-xl border bg-white p-4 shadow-sm">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre de la empresa"
          required
          className="min-w-[220px] flex-[2] rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={nit}
          onChange={(e) => setNit(e.target.value)}
          placeholder="NIT (ej. 900.123.456-7)"
          className="min-w-[160px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          + Crear empresa
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">NIT</th>
              <th className="px-4 py-3 font-medium">Balances</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((e) => (
              <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50/50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.id}</td>
                <td className="px-4 py-3 font-medium">{e.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{e.nit || "—"}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {e.balance_count != null ? `${e.balance_count} balance(s)` : "—"}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard?empresa=${e.id}`}
                    className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                  >
                    Ver dashboard →
                  </Link>
                </td>
              </tr>
            ))}
            {empresas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No hay empresas todavía. Crea la primera arriba ↑
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
