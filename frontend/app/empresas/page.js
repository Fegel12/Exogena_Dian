export const dynamic = "force-dynamic";

async function getEmpresas() {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/companies", {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function Empresas() {
  const empresas = await getEmpresas();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🏢 Empresas</h1>
        <p className="mt-1 text-sm text-gray-500">
          Vista de superusuario: todas las empresas del portal.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">#</th>
              <th className="px-4 py-3 font-medium text-gray-700">Nombre</th>
              <th className="px-4 py-3 font-medium text-gray-700">NIT</th>
              <th className="px-4 py-3 font-medium text-gray-700">Balances</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((e) => (
              <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{e.id}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{e.name}</td>
                <td className="px-4 py-3 text-gray-500">{e.nit || "—"}</td>
                <td className="px-4 py-3 text-gray-500">
                  {e.balance_count || 0} balance(s)
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`/dashboard?empresa=${e.id}`}
                    className="text-blue-600 hover:underline text-sm font-medium"
                  >
                    Ver dashboard →
                  </a>
                </td>
              </tr>
            ))}
            {empresas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No hay empresas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
