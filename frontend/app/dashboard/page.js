"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiGet, formatoCOP } from "@/lib/api";

const COLORES = {
  NATURE_VIOLATION: { fondo: "#fdecea", borde: "#e57373", etq: "Contra su naturaleza" },
  THIRD_PARTY_SUM: { fondo: "#fef7e0", borde: "#f9c74f", etq: "Suma de terceros" },
  CUADRE: { fondo: "#fdecea", borde: "#e57373", etq: "Cuadre" },
  PUC_HIERARCHY: { fondo: "#fef7e0", borde: "#f9c74f", etq: "Jerarquía PUC" },
  PUC_MISSING: { fondo: "#e8f0fe", borde: "#8ab4f8", etq: "Cuenta PUC" },
  THIRD_PARTY_NOT_FOUND: { fondo: "#e8f0fe", borde: "#8ab4f8", etq: "Tercero no hallado" },
  THIRD_PARTY_CANCELLED: { fondo: "#e8f0fe", borde: "#8ab4f8", etq: "Tercero cancelado" },
};

export default function Dashboard() {
  return (
    <Suspense fallback={<p>Cargando…</p>}>
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

  useEffect(() => {
    apiGet("/api/companies").then(setEmpresas).catch(() => {});
  }, []);

  useEffect(() => {
    if (!empresa) return;
    setError("");
    apiGet(`/api/companies/${empresa}/dashboard`)
      .then(setData)
      .catch((e) => setError(String(e)));
  }, [empresa]);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" }}>
      <p><Link href="/">← Inicio</Link></p>
      <h1>📊 Dashboard del balance</h1>

      <label style={{ marginRight: ".5rem" }}>Empresa:</label>
      <select value={empresa} onChange={(e) => setEmpresa(e.target.value)}
        style={{ padding: ".5rem", borderRadius: 8, border: "1px solid #ccc", marginBottom: "1rem" }}>
        {empresas.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>

      {error && <p style={{ background: "#fdecea", padding: ".8rem", borderRadius: 8, color: "#b3261e" }}>{error}</p>}
      {!data && !error && <p>Cargando…</p>}

      {data && (
        <>
          <p style={{ color: "#666" }}>
            Balance {data.balance.period} · {data.balance.file_name}
          </p>

          <div style={{ display: "grid", gap: ".8rem", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginBottom: "1.2rem" }}>
            <TarjetaTotal etiqueta="Activo" valor={data.totales.activo} />
            <TarjetaTotal etiqueta="Pasivo" valor={data.totales.pasivo} />
            <TarjetaTotal etiqueta="Patrimonio" valor={data.totales.patrimonio} />
            <TarjetaTotal etiqueta="Ingresos" valor={data.totales.ingresos} />
            <TarjetaTotal etiqueta="Gastos" valor={data.totales.gastos} />
            <TarjetaTotal etiqueta="Costos" valor={data.totales.costos} />
          </div>

          <div style={{ display: "flex", gap: ".8rem", marginBottom: "1.2rem", flexWrap: "wrap" }}>
            <Insignia ok={data.cuadre.debitos_igual_creditos} texto="Débitos = Créditos" />
            <Insignia ok={data.cuadre.ecuacion_contable} texto="Activo = Pasivo + Patrimonio + Utilidad" />
          </div>

          <div style={{ display: "flex", gap: ".5rem", marginBottom: "1.2rem", flexWrap: "wrap" }}>
            {Object.entries(data.resumen_incidencias.por_tipo).map(([tipo, n]) => {
              const c = COLORES[tipo] || { fondo: "#eee", borde: "#999" };
              return (
                <span key={tipo} style={{ background: c.fondo, border: `1px solid ${c.borde}`, borderRadius: 20, padding: ".3rem .8rem", fontSize: ".85rem" }}>
                  {c.etq}: <b>{n}</b>
                </span>
              );
            })}
          </div>

          <h2 style={{ fontSize: "1.1rem" }}>⚠️ Incidencias (primero las cuentas que no cumplen su naturaleza)</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".9rem" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: ".4rem" }}>Tipo</th>
                <th style={{ padding: ".4rem" }}>Cuenta</th>
                <th style={{ padding: ".4rem" }}>Tercero</th>
                <th style={{ padding: ".4rem" }}>Monto</th>
                <th style={{ padding: ".4rem" }}>Qué pasó / Qué hacer</th>
              </tr>
            </thead>
            <tbody>
              {data.incidencias.map((i) => {
                const c = COLORES[i.issue_type] || { fondo: "#eee", borde: "#999" };
                return (
                  <tr key={i.id} style={{ borderBottom: "1px solid #eee", verticalAlign: "top" }}>
                    <td style={{ padding: ".4rem" }}>
                      <span style={{ background: c.fondo, border: `1px solid ${c.borde}`, borderRadius: 6, padding: ".15rem .5rem", fontSize: ".78rem", whiteSpace: "nowrap" }}>
                        {i.issue_type}
                      </span>
                    </td>
                    <td style={{ padding: ".4rem", whiteSpace: "nowrap" }}>
                      <b>{i.code}</b><br /><span style={{ color: "#666" }}>{i.account_name}</span>
                    </td>
                    <td style={{ padding: ".4rem" }}>{i.third_party || "—"}</td>
                    <td style={{ padding: ".4rem", textAlign: "right", whiteSpace: "nowrap" }}>{i.amount != null ? formatoCOP(i.amount) : "—"}</td>
                    <td style={{ padding: ".4rem", maxWidth: 420 }}>
                      <div>{i.message}</div>
                      <div style={{ color: "#1e7e34", marginTop: ".2rem" }}>👉 {i.action}</div>
                    </td>
                  </tr>
                );
              })}
              {data.incidencias.length === 0 && (
                <tr><td colSpan={5} style={{ padding: "1rem", color: "#888" }}>🎉 ¡Sin incidencias! El balance está listo para generar.</td></tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}

function TarjetaTotal({ etiqueta, valor }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: ".8rem", background: "#fafafa" }}>
      <div style={{ color: "#666", fontSize: ".85rem" }}>{etiqueta}</div>
      <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{formatoCOP(valor)}</div>
    </div>
  );
}

function Insignia({ ok, texto }) {
  return (
    <span style={{
      background: ok ? "#e6f4ea" : "#fdecea",
      border: `1px solid ${ok ? "#34a853" : "#e57373"}`,
      color: ok ? "#1e7e34" : "#b3261e",
      borderRadius: 20, padding: ".35rem .9rem", fontWeight: 600,
    }}>
      {ok ? "✅" : "❌"} {texto}
    </span>
  );
}
