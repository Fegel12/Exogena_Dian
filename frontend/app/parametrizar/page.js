export const dynamic = "force-dynamic";

// ── Cargar conceptos desde la API ──
async function getConceptos(formato) {
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/conceptos-dian?formato=${formato}`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

async function getCuentas() {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/cuentas-balance?tenant_id=1", { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

async function getReglas(formato) {
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/template-rules?formato=${formato}`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

const FORMATOS = [
  { code: "1001", name: "Pagos y retenciones practicadas" },
  { code: "1005", name: "IVA descontable" },
  { code: "1647", name: "Ingresos recibidos para terceros" },
  { code: "2821", name: "APC - Certificados CUC" },
  { code: "2822", name: "Certificaciones beneficios Ley 1715" },
  { code: "2854", name: "Ingresos terceros del exterior" },
  { code: "1476", name: "Registros catastrales / predial" },
  { code: "2574", name: "No causación impuesto al carbono" },
];

export default async function Parametrizar({ searchParams }) {
  const formato = searchParams?.formato || "1001";
  const [conceptos, cuentas, reglas] = await Promise.all([
    getConceptos(formato),
    getCuentas(),
    getReglas(formato),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">⚙️ Parametrizar conceptos DIAN</h1>
        <p className="mt-1 text-sm text-gray-500">
          Asigna cuentas del PUC a cada concepto DIAN. Selecciona el formato para ver sus conceptos.
        </p>
      </div>

      {/* Selector de formato */}
      <div className="flex flex-wrap gap-2 rounded-xl border bg-white p-4 shadow-sm">
        {FORMATOS.map(f => (
          <a key={f.code}
            href={`/parametrizar?formato=${f.code}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              formato === f.code
                ? "bg-blue-700 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f.code}
          </a>
        ))}
        <span className="ml-2 text-sm text-gray-500 self-center">
          — {FORMATOS.find(f => f.code === formato)?.name || ""}
        </span>
      </div>

      {/* Contenido: dos columnas */}
      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* Columna IZQ: Conceptos */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b bg-gray-50 px-4 py-3">
            <h2 className="font-semibold text-gray-900">
              📋 Conceptos DIAN — Formato {formato}
            </h2>
            <p className="text-xs text-gray-500">{conceptos.length} conceptos disponibles</p>
          </div>
          <div className="max-h-[500px] overflow-auto p-2">
            {conceptos.length === 0 ? (
              <p className="p-4 text-center text-gray-400">
                No hay conceptos cargados para este formato.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Código</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Nombre</th>
                  </tr>
                </thead>
                <tbody>
                  {conceptos.map(c => (
                    <tr key={c.codigo} className="border-b last:border-0 hover:bg-blue-50">
                      <td className="px-3 py-2 font-mono font-bold text-blue-700">{c.codigo}</td>
                      <td className="px-3 py-2 text-gray-700">{c.nombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Columna DER: Cuentas del balance */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b bg-gray-50 px-4 py-3">
            <h2 className="font-semibold text-gray-900">
              📊 Cuentas del Balance
            </h2>
            <p className="text-xs text-gray-500">{cuentas.length} cuentas contables</p>
          </div>
          <div className="max-h-[500px] overflow-auto p-2">
            {cuentas.length === 0 ? (
              <p className="p-4 text-center text-gray-400">No hay cuentas cargadas.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Código</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-700">Nombre</th>
                  </tr>
                </thead>
                <tbody>
                  {cuentas.slice(0, 300).map(c => (
                    <tr key={c.codigo} className="border-b last:border-0 hover:bg-green-50">
                      <td className="px-3 py-2 font-mono text-xs text-green-700">{c.codigo}</td>
                      <td className="px-3 py-2 text-gray-700 text-sm">{c.nombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Reglas configuradas */}
      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b bg-gray-50 px-4 py-3">
          <h2 className="font-semibold text-gray-900">⚙️ Reglas configuradas ({reglas.length})</h2>
          <p className="text-xs text-gray-500">Formato {formato}</p>
        </div>
        <div className="max-h-[400px] overflow-auto">
          {reglas.length === 0 ? (
            <p className="p-6 text-center text-gray-400">Sin reglas para este formato.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Concepto</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Nombre</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Cuenta</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Valor</th>
                </tr>
              </thead>
              <tbody>
                {reglas.map(r => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono font-bold text-blue-700">{r.concepto}</td>
                    <td className="px-3 py-2 text-gray-700">{r.concepto_nombre}</td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-500">
                      {r.cuentas_desde}{r.cuentas_hasta !== r.cuentas_desde ? ` → ${r.cuentas_hasta}` : ""}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{r.campo_valor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Links de descarga */}
      <div className="rounded-xl border bg-amber-50 p-4">
        <h3 className="font-semibold text-amber-900">📂 Descargar plantillas</h3>
        <div className="mt-2 flex gap-4">
          <a href="http://127.0.0.1:8000/static/plantilla_conceptos_dian.xlsx"
             className="text-sm text-blue-700 underline hover:text-blue-900">
            📥 Plantilla Excel
          </a>
          <a href="http://127.0.0.1:8000/static/plantilla_ejemplo.txt"
             className="text-sm text-blue-700 underline hover:text-blue-900">
            📥 Ejemplo TXT
          </a>
        </div>
        <p className="mt-2 text-xs text-amber-700">
          Formato del archivo plano: <code className="bg-amber-100 px-1 rounded">concepto|nombre|cuenta_desde|cuenta_hasta|tipo_doc|campo_valor</code>
        </p>
      </div>
    </div>
  );
}
