"use client";

import { useState, useEffect } from "react";

export default function TestApi() {
  const [result, setResult] = useState("cargando...");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/health")
      .then(r => r.json())
      .then(d => setResult(JSON.stringify(d)))
      .catch(e => {
        setError(String(e));
        setResult("FALLÓ");
      });
  }, []);

  return (
    <div style={{ padding: 40, fontSize: 20 }}>
      <h1>Test API Connection</h1>
      <p>Resultado: <b>{result}</b></p>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
    </div>
  );
}
