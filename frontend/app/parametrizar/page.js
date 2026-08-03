import TablaParametrizar from "./TablaParametrizar";

export const dynamic = "force-dynamic";

const API = "http://127.0.0.1:8000";

async function getData(formato) {
  try {
    const [rulesRes, cuentasRes] = await Promise.all([
      fetch(`${API}/api/template-rules?formato=${formato}&tenant_id=1`, { cache: "no-store" }),
      fetch(`${API}/api/cuentas-balance?tenant_id=1`, { cache: "no-store" }),
    ]);
    const rules = await rulesRes.json();
    const cuentas = await cuentasRes.json();
    return { rules: Array.isArray(rules) ? rules : [], cuentas: Array.isArray(cuentas) ? cuentas : [] };
  } catch {
    return { rules: [], cuentas: [] };
  }
}

export default async function Parametrizar() {
  const { rules, cuentas } = await getData("1001");
  return <TablaParametrizar initialConceptos={rules} initialCuentas={cuentas} />;
}
