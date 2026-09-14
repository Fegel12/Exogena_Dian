import { generarFormato, generarTodosAction, eliminarArchivo, eliminarLote } from "./actions";

const API = "http://127.0.0.1:8000";

const FORMATOS = [
  { codigo: "1001", nombre: "Pagos o abonos en cuenta y retenciones", icono: "💳" },
  { codigo: "1005", nombre: "Retenciones por impuestos y contribuciones", icono: "📋" },
  { codigo: "1647", nombre: "Ingresos recibidos", icono: "💰" },
  { codigo: "2821", nombre: "Deudas de difícil cobro", icono: "⚠️" },
  { codigo: "2822", nombre: "Créditos otorgados y otros pasivos", icono: "🏦" },
  { codigo: "2854", nombre: "Operaciones con vinculados", icono: "🔗" },
  { codigo: "1476", nombre: "Impuesto a las ventas (IVA)", icono: "🧾" },
  { codigo: "2574", nombre: "Autorretenciones", icono: "📊" },
];

async function getLotes() {
  try {
    const res = await fetch(`${API}/api/companies/1/files`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function Generar({ searchParams }) {
  const params = await searchParams;
  const formato = params?.formato || "1001";
  const msg = params?.msg || "";
  const ok = params?.ok === "1";

  const formatoSel = FORMATOS.find((f) => f.codigo === formato);
  const lotes = await getLotes();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📄 Generar archivos para la DIAN</h1>
        <p className="mt-1 text-sm text-gray-500">
          Cada generación crea XML + Excel y queda registrada como un lote independiente.
        </p>
      </div>

      {/* Selector de formato */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FORMATOS.map((f) => {
          const selected = formato === f.codigo;
          return (
            <a
              key={f.codigo}
              href={`/generar?formato=${f.codigo}`}
              className={`text-left rounded-xl border-2 p-4 transition-all no-underline ${
                selected
                  ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{f.icono}</span>
                <span className="font-mono font-bold text-sm text-blue-700">{f.codigo}</span>
              </div>
              <p className="mt-1.5 text-xs text-gray-600 leading-relaxed">{f.nombre}</p>
            </a>
          );
        })}
      </div>

      {/* Acciones */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {formatoSel && (
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">Formato seleccionado:</p>
              <p className="font-semibold text-gray-900">
                {formatoSel.icono} {formatoSel.codigo} — {formatoSel.nombre}
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <form action={generarFormato}>
              <input type="hidden" name="formato" value={formato} />
              <button
                type="submit"
                className="rounded-xl bg-green-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-800 transition-colors"
              >
                Generar formato {formato}
              </button>
            </form>
            <form action={generarTodosAction}>
              <button
                type="submit"
                className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Generar todos (8 formatos)
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Mensaje */}
      {msg && (
        <div
          className={`rounded-xl border px-5 py-4 text-sm ${
            ok
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg">{ok ? "✅" : "❌"}</span>
            <div>
              <p className="font-semibold">{ok ? "Éxito" : "Error"}</p>
              <p className="mt-0.5">{decodeURIComponent(msg)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Lotes (versiones) */}
      {lotes.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            📦 Historial de versiones ({lotes.length} lote{lotes.length !== 1 ? "s" : ""})
          </h2>

          {lotes.map((lote) => {
            const fecha = lote.fecha ? new Date(lote.fecha) : null;
            const fechaStr = fecha
              ? fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
                + " " + fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
              : "Fecha desconocida";
            const esSinLote = lote.batch_id === "sin-lote";

            return (
              <div key={lote.batch_id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {/* Cabecera del lote */}
                <div className="border-b bg-gray-50 px-5 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {esSinLote ? "📂 Archivos anteriores (sin lote)" : `📦 Lote del ${fechaStr}`}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {lote.archivos.length} archivo{lote.archivos.length !== 1 ? "s" : ""}
                      {" · "}
                      {new Set(lote.archivos.map(a => a.format_code)).size} formato(s)
                      {" · "}
                      {lote.archivos.filter(a => a.content_type === "xml").length} XML
                      {" · "}
                      {lote.archivos.filter(a => a.content_type === "excel").length} Excel
                    </p>
                  </div>
                  {(
                    <form action={eliminarLote}>
                      <input type="hidden" name="batch_id" value={lote.batch_id} />
                      <button type="submit" className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors">
                        🗑 Eliminar lote
                      </button>
                    </form>
                  )}
                </div>

                {/* Archivos del lote */}
                <div className="divide-y">
                  {lote.archivos.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 hover:bg-gray-50 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg flex-shrink-0">
                          {a.content_type === "excel" ? "📊" : "📄"}
                        </span>
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-medium text-gray-900 truncate">
                            {a.file_name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="inline-block rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                              {a.format_code}
                            </span>
                            <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              a.content_type === "excel" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                            }`}>
                              {a.content_type === "excel" ? "Excel" : "XML"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`${API}/api/files/${a.id}/download`}
                          download
                          className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors flex-shrink-0 no-underline"
                        >
                          ⬇ Descargar
                        </a>
                        <form action={eliminarArchivo}>
                          <input type="hidden" name="file_id" value={a.id} />
                          <button
                            type="submit"
                            className="rounded-md px-2 py-1.5 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                            title="Eliminar archivo"
                          >
                            🗑
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
