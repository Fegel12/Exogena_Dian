export const dynamic = "force-dynamic";

import Link from "next/link";
import { BotonesExportar } from "./botones";

async function getDashboard() {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/companies/1/dashboard", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const COLORES = {
  NATURE_VIOLATION: "bg-red-100 text-red-800 border-red-300",
  THIRD_PARTY_SUM: "bg-amber-100 text-amber-800 border-amber-300",
  CUADRE: "bg-red-100 text-red-800 border-red-300",
  PUC_HIERARCHY: "bg-amber-100 text-amber-800 border-amber-300",
  PUC_MISSING: "bg-blue-100 text-blue-800 border-blue-300",
  THIRD_PARTY_NOT_FOUND: "bg-blue-100 text-blue-800 border-blue-300",
};

function formatoCOP(v) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(v || 0);
}

export default async function Dashboard() {
  const data = await getDashboard();

  if (!data) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-amber-800 font-medium">No hay balances importados</p>
        <p className="text-sm text-amber-600 mt-1">
          Ve a "Subir balance" para importar un archivo de WorldOffice.
        </p>
      </div>
    );
  }

  const { balance, totales, cuadre, incidencias, resumen_incidencias } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📊 Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {balance.period} — {balance.file_name}
        </p>
      </div>

      <BotonesExportar />

      {/* Totales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          ["Activo", "activo"],
          ["Pasivo", "pasivo"],
          ["Patrimonio", "patrimonio"],
          ["Ingresos", "ingresos"],
          ["Gastos", "gastos"],
          ["Costos", "costos"],
        ].map(([label, key]) => (
          <div key={key} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-gray-500 uppercase">{label}</div>
            <div className="mt-1 text-lg font-bold text-gray-900">
              {formatoCOP(totales[key])}
            </div>
          </div>
        ))}
      </div>

      {/* Cuadre */}
      <div className="flex flex-wrap gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-semibold ${
            cuadre.debitos_igual_creditos
              ? "border-green-300 bg-green-50 text-green-700"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {cuadre.debitos_igual_creditos ? "✅" : "❌"} Débitos = Créditos
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-semibold ${
            cuadre.ecuacion_contable
              ? "border-green-300 bg-green-50 text-green-700"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {cuadre.ecuacion_contable ? "✅" : "❌"} Activo = Pasivo + Patrimonio
        </span>
      </div>

      {/* Resumen incidencias */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(resumen_incidencias.por_tipo || {}).map(([tipo, n]) => {
          const c = COLORES[tipo] || "bg-gray-100 text-gray-800 border-gray-300";
          const nombres = {
            NATURE_VIOLATION: "Contra su naturaleza",
            PUC_MISSING: "Cuenta PUC no hallada",
            THIRD_PARTY_NOT_FOUND: "Tercero no hallado",
            THIRD_PARTY_SUM: "Suma de terceros",
            CUADRE: "Cuadre",
            PUC_HIERARCHY: "Jerarquía PUC",
          };
          return (
            <span
              key={tipo}
              className={`rounded-full border px-3 py-0.5 text-xs font-medium ${c}`}
            >
              {nombres[tipo] || tipo}: <b>{n}</b>
            </span>
          );
        })}
      </div>

      {/* Tabla incidencias */}
      <h2 className="text-lg font-semibold text-gray-900">
        ⚠️ Incidencias ({incidencias.length})
      </h2>
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium text-gray-700">Tipo</th>
              <th className="px-3 py-2 font-medium text-gray-700">Cuenta</th>
              <th className="px-3 py-2 font-medium text-gray-700">Tercero</th>
              <th className="px-3 py-2 font-medium text-gray-700 text-right">Monto</th>
              <th className="px-3 py-2 font-medium text-gray-700">Qué pasó / Qué hacer</th>
            </tr>
          </thead>
          <tbody>
            {incidencias.slice(0, 50).map((i) => {
              const c = COLORES[i.issue_type] || "bg-gray-100 text-gray-800 border-gray-300";
              return (
                <tr key={i.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded-md border px-1.5 py-0.5 text-[11px] font-semibold uppercase ${c}`}
                    >
                      {i.issue_type?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <b className="text-gray-900">{i.code}</b>
                    <br />
                    <span className="text-gray-500 text-xs">{i.account_name}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-700">{i.third_party || "—"}</td>
                  <td className="px-3 py-2 text-right font-mono text-gray-900">
                    {i.amount != null ? formatoCOP(i.amount) : "—"}
                  </td>
                  <td className="px-3 py-2 max-w-md">
                    <div className="text-gray-800">{i.message}</div>
                    <div className="mt-1 text-sm font-medium text-green-700">
                      👉 {i.action}
                    </div>
                  </td>
                </tr>
              );
            })}
            {incidencias.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  🎉 Sin incidencias
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
