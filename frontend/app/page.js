import Link from "next/link";

const tarjetas = [
  {
    href: "/empresas",
    titulo: "🏢 Empresas",
    texto: "Superusuario: crea y administra las empresas.",
    color: "border-l-blue-500",
  },
  {
    href: "/dashboard",
    titulo: "📊 Dashboard",
    texto: "Balance, cuadre y cuentas que no cumplen su naturaleza.",
    color: "border-l-green-500",
  },
  {
    href: "/subir",
    titulo: "📤 Subir balance",
    texto: "Importa el balance de prueba de WorldOffice.",
    color: "border-l-amber-500",
  },
  {
    href: "/generar",
    titulo: "📄 Generar XML",
    texto: "Crea los archivos para la DIAN (formato 1001).",
    color: "border-l-purple-500",
  },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          🇨🇴 Portal Exógena DIAN
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-gray-500">
          Sube el balance de prueba con terceros, valida la contabilidad y genera los archivos
          XML para la información exógena.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tarjetas.map(({ href, titulo, texto, color }) => (
          <Link key={href} href={href} className="group">
            <div
              className={`h-full rounded-xl border border-gray-200 border-l-4 bg-white p-6 shadow-sm transition group-hover:shadow-md ${color}`}
            >
              <h2 className="text-lg font-semibold text-gray-900">{titulo}</h2>
              <p className="mt-1 text-sm text-gray-500">{texto}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center text-sm text-blue-700">
        💡 <b>Tip:</b> Empieza creando una empresa en <b>Empresas</b>, luego sube su balance en{" "}
        <b>Subir balance</b> y revisa las incidencias en el <b>Dashboard</b>.
      </div>
    </div>
  );
}
