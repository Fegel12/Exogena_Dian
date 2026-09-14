"use client";

export default function GlobalError({ error, reset }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="max-w-lg text-center space-y-6">
            <div className="text-6xl">🔧</div>
            <h1 className="text-2xl font-bold text-gray-900">Portal Exógena DIAN</h1>
            <h2 className="text-lg font-semibold text-gray-700">Error del sistema</h2>

            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-left space-y-3">
              <div>
                <p className="text-sm font-semibold text-red-800">¿Qué pasó?</p>
                <p className="text-sm text-red-700 mt-0.5">
                  El sistema encontró un error que no puede resolver automáticamente.
                  Esto puede ocurrir si el servidor de datos (backend) no está funcionando
                  o si hubo un problema de conexión.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-800">¿Cómo se soluciona?</p>
                <ol className="text-sm text-red-700 mt-0.5 space-y-1 list-decimal list-inside">
                  <li>Recargue la página con el botón de abajo</li>
                  <li>Verifique que el backend esté funcionando en http://127.0.0.1:8000</li>
                  <li>Si el backend está cerrado, ábralo desde la terminal de Windows</li>
                  <li>Si el problema persiste, cierre y vuelva a abrir ambos programas</li>
                </ol>
              </div>
            </div>

            <button
              onClick={() => reset()}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
