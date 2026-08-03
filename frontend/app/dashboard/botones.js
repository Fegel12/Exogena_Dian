"use client";

export function BotonesExportar() {
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href="http://127.0.0.1:8000/api/companies/1/issues/export"
        className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
      >
        📥 Exportar incidencias (Excel)
      </a>
      <a
        href="http://127.0.0.1:8000/api/companies/1/terceros/reporte"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 rounded-lg border border-blue-600 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
      >
        📋 Informe de terceros
      </a>
    </div>
  );
}
