import { toggleCuenta, eliminarCuenta, agregarCuenta, autoPropuesta } from "./actions";

export const dynamic = "force-dynamic";

const API = "http://127.0.0.1:8000";
const FORMATOS = ["1001","1005","1647","2821","2822","2854","1476","2574"];

async function getData(formato) {
  try {
    const [r, c] = await Promise.all([
      fetch(`${API}/api/template-rules?formato=${formato}&tenant_id=1`, { cache: "no-store" }).then(r => r.json()),
      fetch(`${API}/api/cuentas-balance?tenant_id=1`, { cache: "no-store" }).then(r => r.json()),
    ]);
    return { conceptos: Array.isArray(r) ? r : [], cuentas: Array.isArray(c) ? c : [] };
  } catch {
    return { conceptos: [], cuentas: [] };
  }
}

export default async function Parametrizar({ searchParams }) {
  const formato = searchParams?.formato || "1001";
  const { conceptos, cuentas } = await getData(formato);

  return (
    <div className="space-y-3">
      {/* Selector de formato + acciones */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 flex-wrap">
          {FORMATOS.map(f => (
            <a key={f} href={`/parametrizar?formato=${f}`}
               className={`rounded px-3 py-1 text-sm font-medium no-underline ${formato===f?"bg-blue-600 text-white":"bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {f}
            </a>
          ))}
        </div>
        <div className="flex gap-2 text-sm">
          <a href={`${API}/api/template-rules/export?formato=${formato}&fmt=xlsx`}
             className="rounded border px-3 py-1.5 text-gray-600 hover:bg-gray-50 no-underline">Exportar</a>

          <form action={autoPropuesta}>
            <input type="hidden" name="formato" value={formato}/>
            <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700">
              Auto-propuesta
            </button>
          </form>
        </div>
      </div>

      <table className="w-full border-collapse border border-gray-200">
        <thead><tr className="bg-gray-50">
          <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-700 w-[150px]">Concepto DIAN</th>
          <th className="px-4 py-2.5 text-left text-sm font-semibold text-gray-700">Cuentas PUC de ESTA empresa</th>
        </tr></thead>
        <tbody>
          {conceptos.length === 0 ? (
            <tr><td colSpan={2} className="py-10 text-center text-gray-500">
              <p>Sin conceptos para formato {formato}</p>
              <form action={autoPropuesta} className="mt-2">
                <input type="hidden" name="formato" value={formato}/>
                <button className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Generar Auto-propuesta</button>
              </form>
            </td></tr>
          ) : (
            conceptos.map(c => {
              const activas = (c.cuentas||[]).filter(a=>a.active);
              const inactivas = (c.cuentas||[]).filter(a=>!a.active);
              const asignadas = new Set((c.cuentas||[]).map(a=>a.cuenta));
              const libres = cuentas.filter(x=>!asignadas.has(x.codigo)&&x.codigo.length>=2);
              return (
                <tr key={c.concepto} className="border-b">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-blue-700">{c.concepto}</span>
                    <div className="text-xs text-gray-500">{c.concepto_nombre}</div>
                    <div className="text-[10px] text-gray-400">{activas.length} activas</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5 items-start">
                      {activas.map(a=>(
                        <div key={a.rule_id} className="inline-flex items-center gap-1 rounded border border-green-300 bg-green-50 px-2 py-0.5 text-xs">
                          {/* Toggle: form con submit inmediato */}
                          <form action={toggleCuenta.bind(null, a.rule_id, a.active)} className="contents">
                            <button type="submit" className="mr-1 text-[10px] font-bold text-green-600 hover:text-green-800">
                              {a.active ? "☑" : "☐"}
                            </button>
                          </form>
                          <span className="font-mono text-green-700">{a.cuenta}</span>
                          {/* Eliminar */}
                          <form action={eliminarCuenta.bind(null, a.rule_id)} className="contents">
                            <button type="submit" className="text-red-400 hover:text-red-600 font-bold ml-0.5">×</button>
                          </form>
                        </div>
                      ))}

                      {/* Inactivas */}
                      {inactivas.map(a=>(
                        <div key={a.rule_id} className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs">
                          <form action={toggleCuenta.bind(null, a.rule_id, a.active)} className="contents">
                            <button type="submit" className="mr-1 text-[10px] text-gray-400 hover:text-gray-600">☐</button>
                          </form>
                          <span className="font-mono text-gray-400 line-through">{a.cuenta}</span>
                          <form action={eliminarCuenta.bind(null, a.rule_id)} className="contents">
                            <button type="submit" className="text-red-400 hover:text-red-600 font-bold ml-0.5">×</button>
                          </form>
                        </div>
                      ))}

                      {/* Form para agregar: input + submit */}
                      <form action={agregarCuenta} className="contents">
                        <input type="hidden" name="formato" value={formato}/>
                        <input type="hidden" name="concepto" value={c.concepto}/>
                        <input type="hidden" name="nombre" value={c.concepto_nombre}/>
                        <select name="cuenta" className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700 h-6">
                          <option value="">+ Agregar</option>
                          {libres.slice(0,100).map(x=>(
                            <option key={x.codigo} value={x.codigo}>{x.codigo} — {x.nombre?.substring(0,30)}</option>
                          ))}
                        </select>
                        <button type="submit" className="rounded border border-dashed border-blue-400 bg-blue-50 px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-100">
                          Agregar
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
