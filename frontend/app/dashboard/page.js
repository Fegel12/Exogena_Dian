"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiGet, apiPost, API, formatoCOP } from "@/lib/api";

const COLORES = {
  NATURE_VIOLATION: { bg: "bg-red-50", border: "border-red-300", text: "text-red-800", chip: "Contra su naturaleza" },
  THIRD_PARTY_SUM: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-800", chip: "Suma de terceros" },
  CUADRE: { bg: "bg-red-50", border: "border-red-300", text: "text-red-800", chip: "Cuadre" },
  PUC_HIERARCHY: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-800", chip: "Jerarquía PUC" },
  PUC_MISSING: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-800", chip: "Cuenta PUC" },
  THIRD_PARTY_NOT_FOUND: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-800", chip: "Tercero no hallado" },
  THIRD_PARTY_CANCELLED: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-800", chip: "Tercero cancelado" },
};

export default function Dashboard() {
  return (
    <Suspense fallback={<p className="p-6 text-gray-500">Cargando…</p>}>
      <DashboardInner />
    </Suspense>
  );
}

function DashboardInner() {
  const params = useSearchParams();
  const [empresas, setEmpresas] = useState([]);
  const [empresa, setEmpresa] = useState(params.get("empresa") || "1");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { apiGet("/api/companies").then(setEmpresas).catch(() => {}); }, []);
  useEffect(() => {
    if (!empresa) return;
    setError("");
    apiGet(`/api/companies/${empresa}/dashboard`)
      .then(setData)
      .catch((e) => setError(String(e)));
  }, [empresa]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">📊 Dashboard</h1>
        <select value={empresa} onChange={(e) => setEmpresa(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}
      {!data && !error && <p className="text-gray-500">Cargando…</p>}

      {data && (
        <>
          <p className="text-sm text-gray-500">
            Balance {data.balance.period} · {data.balance.file_name}
          </p>

          {/* Tarjetas de totales */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {["Activo","Pasivo","Patrimonio","Ingresos","Gastos","Costos"].map((k) => (
              <div key={k} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{k}</div>
                <div className="mt-1 text-lg font-bold">{formatoCOP(data.totales[k.toLowerCase()])}</div>
              </div>
            ))}
          </div>

          {/* Cuadre */}
          <div className="flex flex-wrap gap-2">
            <Badge ok={data.cuadre.debitos_igual_creditos} text="Débitos = Créditos" />
            <Badge ok={data.cuadre.ecuacion_contable} text="Activo = Pasivo + Patrimonio + Utilidad" />
          </div>

          {/* Chips de incidencias */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.resumen_incidencias.por_tipo).map(([tipo, n]) => {
              const c = COLORES[tipo] || { bg: "bg-gray-100", border: "border-gray-300", chip: tipo };
              return (
                <span key={tipo} className={`rounded-full border px-3 py-0.5 text-xs font-medium ${c.bg} ${c.border} ${c.text}`}>
                  {c.chip}: <b>{n}</b>
                </span>
              );
            })}
          </div>

          {/* Tabla de incidencias */}
          <h2 className="text-lg font-semibold">⚠️ Incidencias (naturaleza primero)</h2>
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Cuenta</th>
                  <th className="px-3 py-2 font-medium">Tercero</th>
                  <th className="px-3 py-2 font-medium text-right">Monto</th>
                  <th className="px-3 py-2 font-medium">Qué pasó / Qué hacer</th>
                </tr>
              </thead>
              <tbody>
                {data.incidencias.map((i) => {
                  const c = COLORES[i.issue_type] || { bg: "bg-gray-50", border: "border-gray-200" };
                  return (
                    <tr key={i.id} className="border-b last:border-0 hover:bg-gray-50/50">
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded-md border px-1.5 py-0.5 text-[11px] font-semibold uppercase ${c.bg} ${c.border} ${c.text}`}>
                          {i.issue_type}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <b>{i.code}</b><br /><span className="text-gray-500">{i.account_name}</span>
                      </td>
                      <td className="px-3 py-2">{i.third_party || "—"}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap font-mono">
                        {i.amount != null ? formatoCOP(i.amount) : "—"}
                      </td>
                      <td className="px-3 py-2 max-w-md">
                        <div className="text-gray-800">{i.message}</div>
                        <div className="mt-1 text-sm font-medium text-green-700">👉 {i.action}</div>
                      </td>
                    </tr>
                  );
                })}
                {data.incidencias.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">🎉 Sin incidencias</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Badge({ ok, text }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-semibold ${
      ok ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-700"
    }`}>
      {ok ? "✅" : "❌"} {text}
    </span>
  );
}
