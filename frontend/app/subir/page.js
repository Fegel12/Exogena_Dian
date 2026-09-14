"use client";

import { useState, useRef, useCallback } from "react";

const API = "http://127.0.0.1:8000";

export default function Subir() {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) {
      const ext = dropped.name.split(".").pop()?.toLowerCase();
      if (ext === "xlsx" || ext === "xls") {
        setFile(dropped);
        setResultado(null);
        setMsg("");
      } else {
        setMsg("❌ Solo archivos Excel (.xlsx, .xls)");
      }
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setResultado(null);
      setMsg("");
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return setMsg("❌ Seleccione un archivo Excel (.xlsx) primero. Arrastre el archivo a la zona punteada o haga clic para elegirlo.");
    setLoading(true);
    setMsg("");
    setResultado(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${API}/api/companies/1/balances`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        const detalle = typeof data.detail === "string" ? data.detail : "";
        if (detalle.includes("Excel") || detalle.includes("xlsx")) {
          throw new Error("El archivo no parece ser un balance de WorldOffice válido. Asegúrese de que sea un .xlsx exportado desde WorldOffice con el formato correcto (código, nombre, terceros, débitos, créditos).");
        }
        throw new Error(detalle || "El servidor rechazó el archivo. Verifique el formato.");
      }
      setMsg(`✅ ¡Balance importado exitosamente!`);
      setResultado(data);
    } catch (err) {
      const msg = err.message || "Error";
      if (msg.includes("fetch failed") || msg.includes("NetworkError")) {
        setMsg("❌ No se pudo conectar con el servidor. Verifique que el backend esté abierto en http://127.0.0.1:8000.");
      } else {
        setMsg(`❌ ${msg}`);
      }
    }
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📤 Subir balance de prueba</h1>
        <p className="mt-1 text-sm text-gray-500">
          Archivo exportado por WorldOffice (balance con terceros, formato .xlsx)
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragOver
              ? "border-blue-400 bg-blue-50"
              : file
              ? "border-green-300 bg-green-50/50"
              : "border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50/30"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />

          {file ? (
            <div className="space-y-2">
              <div className="text-4xl">📋</div>
              <div>
                <p className="font-semibold text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{formatSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setResultado(null);
                  setMsg("");
                }}
                className="text-xs text-red-500 hover:text-red-700 underline"
              >
                Cambiar archivo
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-5xl">📤</div>
              <div>
                <p className="font-semibold text-gray-700">
                  Arrastra tu archivo Excel aquí
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  o haz clic para seleccionarlo
                </p>
              </div>
              <p className="text-xs text-gray-400">Formatos: .xlsx, .xls</p>
            </div>
          )}
        </div>

        {/* Botón de subir */}
        <div className="mt-5 flex items-center gap-4">
          <button
            type="submit"
            disabled={loading || !file}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Importando...
              </span>
            ) : (
              "Importar y validar"
            )}
          </button>
          {file && !loading && (
            <span className="text-sm text-gray-400">
              Listo para importar: <span className="font-medium text-gray-600">{file.name}</span>
            </span>
          )}
        </div>
      </form>

      {/* Mensaje */}
      {msg && (
        <div
          className={`rounded-xl border px-5 py-4 text-sm ${
            msg.startsWith("✅")
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg">{msg.startsWith("✅") ? "✅" : "❌"}</span>
            <div>
              <p className="font-semibold">{msg.startsWith("✅") ? "Éxito" : "Error"}</p>
              <p className="mt-0.5">{msg.replace(/^[✅❌]\s*/, "")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Resultado */}
      {resultado?.validacion && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b bg-gray-50 px-5 py-3">
            <h3 className="font-semibold text-gray-900">📋 Resultado de la validación</h3>
          </div>
          <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              ["Total registros", resultado.validacion.total || 0],
              ["Incidencias", resultado.validacion.incidencias || 0],
              ["Período", resultado.validacion.periodo || "—"],
              ["Archivo", resultado.validacion.file_name || "—"],
            ].map(([label, val]) => (
              <div key={label}>
                <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
                <div className="mt-1 text-lg font-bold text-gray-900">{val}</div>
              </div>
            ))}
          </div>
          {resultado.validacion.incidencias > 0 && (
            <div className="border-t bg-amber-50 px-5 py-3">
              <a href="/dashboard" className="text-sm font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1">
                ⚠️ Ver {resultado.validacion.incidencias} incidencias en el Dashboard →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
