"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API, apiGet, apiPost } from "@/lib/api";

export default function Generar() {
  const [empresas, setEmpresas] = useState([]);
  const [empresa, setEmpresa] = useState("1");
  const [archivos, setArchivos] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function cargarArchivos() {
    try {
      setArchivos(await apiGet(`/api/companies/${empresa}/files`));
    } catch { /* sin archivos todavía */ }
  }

  useEffect(() => {
    apiGet("/api/companies").then(setEmpresas).catch(() => {});
  }, []);

  useEffect(() => { cargarArchivos(); /* eslint-disable-next-line */ }, [empresa]);

  async function generar() {
    setError(""); setCargando(true); setResultado(null);
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
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" }}>
      <p><Link href="/">← Inicio</Link></p>
      <h1>📄 Generar archivos para la DIAN</h1>
      <p style={{ color: "#666" }}>
        Genera el XML del <b>formato 1001</b> (Pagos o Abonos en Cuenta y Retenciones practicadas,
        Versión 11) según la estructura del anexo de la resolución.
      </p>

      <div style={{ display: "flex", gap: ".8rem", alignItems: "center", margin: "1rem 0", flexWrap: "wrap" }}>
        <select value={empresa} onChange={(e) => setEmpresa(e.target.value)}
          style={{ padding: ".6rem", borderRadius: 8, border: "1px solid #ccc" }}>
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <button onClick={generar} disabled={cargando}
          style={{ padding: ".6rem 1.4rem", borderRadius: 8, border: 0, background: "#188038", color: "#fff", cursor: "pointer" }}>
          {cargando ? "Generando…" : "Generar formato 1001"}
        </button>
      </div>

      {error && <p style={{ background: "#fdecea", padding: ".8rem", borderRadius: 8, color: "#b3261e" }}>{error}</p>}

      {resultado && (
        <div style={{ background: "#e6f4ea", border: "1px solid #34a853", borderRadius: 10, padding: "1rem", marginBottom: "1rem" }}>
          <h3 style={{ margin: "0 0 .5rem" }}>✅ Archivos generados</h3>
          {resultado.archivos.map((a) => (
            <p key={a.file_name} style={{ margin: ".2rem 0" }}>
              <b>{a.file_name}</b> · {a.registros} registros · total {a.valor_total.toLocaleString("es-CO")}
            </p>
          ))}
          <p style={{ margin: ".6rem 0 0", color: "#666", fontSize: ".85rem" }}>
            Recuerde: las reglas usan conceptos de ejemplo (9001-9006); reemplácelas por el
            catálogo oficial de la resolución en la parametrización.
          </p>
        </div>
      )}

      <h2 style={{ fontSize: "1.1rem" }}>Archivos generados antes</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".9rem" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
            <th style={{ padding: ".4rem" }}>Archivo</th>
            <th style={{ padding: ".4rem" }}>Formato</th>
            <th style={{ padding: ".4rem" }}>Fecha</th>
            <th style={{ padding: ".4rem" }}></th>
          </tr>
        </thead>
        <tbody>
          {archivos.map((f) => (
            <tr key={f.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: ".4rem" }}>{f.file_name}</td>
              <td style={{ padding: ".4rem" }}>{f.format_code}</td>
              <td style={{ padding: ".4rem" }}>{f.created_at}</td>
              <td style={{ padding: ".4rem" }}>
                <a href={`${API}/api/files/${f.id}/download`} target="_blank" rel="noreferrer"
                  style={{ color: "#1a73e8" }}>⬇ Descargar</a>
              </td>
            </tr>
          ))}
          {archivos.length === 0 && (
            <tr><td colSpan={4} style={{ padding: "1rem", color: "#888" }}>No hay archivos generados todavía.</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
