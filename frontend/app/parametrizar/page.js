import Link from "next/link";

export const dynamic = "force-dynamic";

const CONCEPTOS_DIAN = [
  { codigo: "5002", nombre: "Honorarios" },
  { codigo: "5003", nombre: "Comisiones" },
  { codigo: "5004", nombre: "Servicios" },
  { codigo: "5005", nombre: "Arrendamientos" },
  { codigo: "5006", nombre: "Intereses y rendimientos financieros" },
  { codigo: "5010", nombre: "Aportes parafiscales" },
  { codigo: "5011", nombre: "Pagos a EPS y Riesgos Laborales" },
  { codigo: "5012", nombre: "Aportes para pensiones" },
  { codigo: "5015", nombre: "Impuestos solicitados como deduccion" },
  { codigo: "5016", nombre: "Demas costos y deducciones" },
  { codigo: "5055", nombre: "Viaticos" },
  { codigo: "5063", nombre: "Intereses efectivamente pagados" },
];

const API = "http://127.0.0.1:8000";

async function getData() {
  try {
    const [rulesRes, cuentasRes] = await Promise.all([
      fetch(`${API}/api/template-rules?formato=1001&tenant_id=1`, { cache: "no-store" }),
      fetch(`${API}/api/cuentas-balance?tenant_id=1`, { cache: "no-store" }),
    ]);
    const rules = await rulesRes.json();
    const cuentas = await cuentasRes.json();
    return { rules, cuentas: Array.isArray(cuentas) ? cuentas : [] };
  } catch {
    return { rules: [], cuentas: [] };
  }
}

export default async function Parametrizar() {
  const { rules, cuentas } = await getData();

  const grouped = CONCEPTOS_DIAN.map(c => {
    const grupo = Array.isArray(rules) ? rules.find(g => g.concepto === parseInt(c.codigo)) : rules.find?.(g => g.concepto === parseInt(c.codigo));
    return { ...c, cuentas: grupo?.cuentas || [] };
  });

  return (
    <div className="space-y-3" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Parametrizacion DIAN → PUC</h2>
        <div className="flex gap-2 text-sm">
          <a href={`${API}/api/template-rules/export?formato=1001&fmt=xlsx`}
             className="rounded border px-3 py-1.5 text-gray-600 hover:bg-gray-50 no-underline">Exportar</a>
          <a href={`${API}/api/template-rules/auto-propose?tenant_id=1&formato=1001`}
             className="rounded bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700 no-underline">Auto-propuesta</a>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e0e0e0" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th style={{ padding: "10px 12px", textAlign: "left", width: 160, fontWeight: 600 }}>Concepto DIAN</th>
            <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600 }}>Cuentas PUC asignadas</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map(c => {
            const activas = (c.cuentas || []).filter(a => a.active);
            return (
              <tr key={c.codigo} style={{ borderBottom: "1px solid #eee", verticalAlign: "top" }}>
                <td style={{ padding: 10 }}>
                  <b style={{ color: "#1a73e8", fontSize: 14 }}>{c.codigo}</b>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{c.nombre}</div>
                </td>
                <td style={{ padding: 10 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {activas.length === 0 ? (
                      <span style={{ color: "#ccc", fontSize: 13 }}>Sin cuentas asignadas</span>
                    ) : (
                      activas.map(a => (
                        <span key={a.cuenta} style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "4px 8px", border: "1px solid #4caf50", borderRadius: 6,
                          background: "#e8f5e9", fontSize: 13,
                        }}>
                          <span style={{ fontFamily: "monospace", color: "#2e7d32" }}>{a.cuenta}</span>
                        </span>
                      ))
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
