"use client";

export default function Error({ error, reset }) {
  const msg = error?.message || "";

  let explicacion = "Ocurrió un error inesperado.";
  let solucion = "Intente recargar la página. Si el problema persiste, revise que el servidor backend esté funcionando en http://127.0.0.1:8000.";

  if (msg.includes("fetch failed") || msg.includes("connect")) {
    explicacion = "No se pudo conectar con el servidor de datos.";
    solucion = "Verifique que el programa backend esté abierto y funcionando en http://127.0.0.1:8000. Si está cerrado, ábralo desde la terminal de Windows.";
  } else if (msg.includes("500") || msg.includes("Internal")) {
    explicacion = "El servidor encontró un problema al procesar la solicitud.";
    solucion = "Recargue la página e intente de nuevo. Si el error continúa, revise que el balance esté importado correctamente.";
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-lg text-center space-y-6">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900">Algo salió mal</h2>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-left space-y-3">
          <div>
            <p className="text-sm font-semibold text-amber-800">¿Qué pasó?</p>
            <p className="text-sm text-amber-700 mt-0.5">{explicacion}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">¿Cómo se soluciona?</p>
            <p className="text-sm text-amber-700 mt-0.5">{solucion}</p>
          </div>
        </div>
        <button
          onClick={() => reset()}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
