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
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" }}>
      <p><Link href="/">← Inicio</Link></p>
      <h1>🏢 Empresas</h1>
      <p style={{ color: "#666" }}>Vista de <b>superusuario</b>: todas las empresas del portal.</p>

      {error && <p style={{ background: "#fdecea", padding: ".8rem", borderRadius: 8, color: "#b3261e" }}>{error}</p>}
      {ok && <p style={{ background: "#e6f4ea", padding: ".8rem", borderRadius: 8, color: "#1e7e34" }}>{ok}</p>}

      <form onSubmit={crear} style={{ display: "flex", gap: ".5rem", margin: "1rem 0", flexWrap: "wrap" }}>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de la empresa" required
          style={{ padding: ".6rem", borderRadius: 8, border: "1px solid #ccc", flex: 2, minWidth: 220 }} />
        <input value={nit} onChange={(e) => setNit(e.target.value)} placeholder="NIT"
          style={{ padding: ".6rem", borderRadius: 8, border: "1px solid #ccc", flex: 1, minWidth: 140 }} />
        <button type="submit" style={{ padding: ".6rem 1.2rem", borderRadius: 8, border: 0, background: "#1a73e8", color: "#fff", cursor: "pointer" }}>Crear</button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
            <th style={{ padding: ".5rem" }}>#</th>
            <th style={{ padding: ".5rem" }}>Nombre</th>
            <th style={{ padding: ".5rem" }}>NIT</th>
            <th style={{ padding: ".5rem" }}></th>
          </tr>
        </thead>
        <tbody>
          {empresas.map((e) => (
            <tr key={e.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: ".5rem" }}>{e.id}</td>
              <td style={{ padding: ".5rem" }}>{e.name}</td>
              <td style={{ padding: ".5rem" }}>{e.nit || "—"}</td>
              <td style={{ padding: ".5rem" }}>
                <Link href={`/dashboard?empresa=${e.id}`} style={{ color: "#1a73e8" }}>Ver dashboard →</Link>
              </td>
            </tr>
          ))}
          {empresas.length === 0 && (
            <tr><td colSpan={4} style={{ padding: "1rem", color: "#888" }}>No hay empresas todavía.</td></tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
