import Link from "next/link";

const tarjetas = [
  { href: "/empresas", titulo: "🏢 Empresas", texto: "Crea y administra las empresas.", color: "border-l-blue-500" },
  { href: "/dashboard", titulo: "📊 Dashboard", texto: "Balance, cuadre e incidencias.", color: "border-l-green-500" },
  { href: "/subir", titulo: "📤 Subir balance", texto: "Importa el balance de WorldOffice.", color: "border-l-amber-500" },
  { href: "/generar", titulo: "📄 Generar XML", texto: "Crea los archivos para la DIAN.", color: "border-l-purple-500" },
  { href: "/parametrizar", titulo: "⚙️ Parametrizar", texto: "Conceptos DIAN → cuentas del PUC.", color: "border-l-teal-500" },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center py-6">
        <h1 className="text-3xl font-bold text-gray-900">🇨🇴 Portal Exógena DIAN</h1>
        <p className="mt-3 text-gray-500 max-w-xl mx-auto">
          Balance de prueba → validación contable → archivos XML para la DIAN
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tarjetas.map(({ href, titulo, texto, color }) => (
          <Link key={href} href={href}>
            <div className={`h-full rounded-xl border border-l-4 bg-white p-5 shadow-sm hover:shadow-md transition ${color}`}>
              <h2 className="font-semibold text-gray-900">{titulo}</h2>
              <p className="mt-1 text-sm text-gray-500">{texto}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
