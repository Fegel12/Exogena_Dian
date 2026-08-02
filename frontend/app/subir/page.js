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
    if (!archivo) { setError("Seleccione un archivo Excel (.xlsx)."); return; }
    setError(""); setCargando(true); setResultado(null);
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
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" }}>
      <p><Link href="/">← Inicio</Link></p>
      <h1>📤 Subir balance de prueba</h1>
      <p style={{ color: "#666" }}>
        Archivo exportado por WorldOffice (balance de prueba <b>con terceros</b>). El sistema detecta
        la estructura, importa y valida automáticamente.
      </p>

      {error && <p style={{ background: "#fdecea", padding: ".8rem", borderRadius: 8, color: "#b3261e" }}>{error}</p>}

      <form onSubmit={subir} style={{ display: "flex", gap: ".8rem", flexWrap: "wrap", alignItems: "center", margin: "1rem 0" }}>
        <select value={empresa} onChange={(e) => setEmpresa(e.target.value)}
          style={{ padding: ".6rem", borderRadius: 8, border: "1px solid #ccc" }}>
          {empresas.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={(e) => setArchivo(e.target.files[0])}
          style={{ padding: ".4rem" }} />
        <button type="submit" disabled={cargando}
          style={{ padding: ".6rem 1.4rem", borderRadius: 8, border: 0, background: "#1a73e8", color: "#fff", cursor: "pointer" }}>
          {cargando ? "Importando…" : "Importar y validar"}
        </button>
      </form>

      {resultado && (
        <div style={{ background: "#e6f4ea", border: "1px solid #34a853", borderRadius: 10, padding: "1rem" }}>
          <h3 style={{ margin: "0 0 .5rem" }}>✅ Balance importado (id {resultado.balance_id}, periodo {resultado.period})</h3>
          <p style={{ margin: 0 }}>
            Validación: <b>{resultado.validacion.total}</b> incidencias
            (<b>{resultado.validacion.errores}</b> errores, <b>{resultado.validacion.advertencias}</b> advertencias).
          </p>
          <p style={{ margin: ".5rem 0 0" }}>
            <Link href={`/dashboard?empresa=${empresa}`} style={{ color: "#1a73e8" }}>Ver el dashboard →</Link>
          </p>
        </div>
      )}
    </main>
  );
}
