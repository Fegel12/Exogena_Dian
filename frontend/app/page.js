import Link from "next/link";

const tarjetas = [
  {
    href: "/empresas",
    titulo: "Empresas",
    texto: "Crea y administra las empresas — NIT, razón social, tipo de contribuyente.",
    color: "border-l-blue-500 hover:border-l-blue-600",
    icono: "🏢",
    bgHover: "hover:bg-blue-50",
  },
  {
    href: "/dashboard",
    titulo: "Dashboard",
    texto: "Balance, cuadre contable e incidencias de validación en tiempo real.",
    color: "border-l-green-500 hover:border-l-green-600",
    icono: "📊",
    bgHover: "hover:bg-green-50",
  },
  {
    href: "/subir",
    titulo: "Subir balance",
    texto: "Importa el balance de prueba desde WorldOffice (.xlsx) y valida al instante.",
    color: "border-l-amber-500 hover:border-l-amber-600",
    icono: "📤",
    bgHover: "hover:bg-amber-50",
  },
  {
    href: "/generar",
    titulo: "Generar XML",
    texto: "Crea los archivos XML por formato DIAN listos para presentar.",
    color: "border-l-purple-500 hover:border-l-purple-600",
    icono: "📄",
    bgHover: "hover:bg-purple-50",
  },
  {
    href: "/parametrizar",
    titulo: "Parametrizar",
    texto: "Asigna conceptos DIAN a cuentas del PUC contable colombiano.",
    color: "border-l-teal-500 hover:border-l-teal-600",
    icono: "⚙️",
    bgHover: "hover:bg-teal-50",
  },
];

const pasos = [
  { num: "1", titulo: "Crea la empresa", texto: "Registra NIT, razón social y datos del contribuyente." },
  { num: "2", titulo: "Sube el balance", texto: "Importa el archivo .xlsx exportado por WorldOffice." },
  { num: "3", titulo: "Revisa incidencias", texto: "Corrige cuentas sin PUC, terceros no hallados y más." },
  { num: "4", titulo: "Parametriza", texto: "Mapea conceptos DIAN a las cuentas de tu empresa." },
  { num: "5", titulo: "Genera XML", texto: "Crea los archivos XML listos para presentar a la DIAN." },
];

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center py-10 sm:py-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 mb-5">
          🇨🇴 Información exógena tributaria
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
          Portal Exógena{" "}
          <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">
            DIAN
          </span>
        </h1>
        <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
          Convierte tu balance de prueba de WorldOffice en archivos XML válidos para la DIAN
          en minutos. Validación automática, detección de incidencias y parametrización
          inteligente de conceptos.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/subir"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition-colors"
          >
            📤 Subir balance
          </Link>
          <Link
            href="/parametrizar"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ⚙️ Parametrizar
          </Link>
        </div>
      </section>

      {/* Cómo funciona */}
      <section>
        <h2 className="text-center text-2xl font-bold text-gray-900 mb-8">
          ¿Cómo funciona?
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {pasos.map(({ num, titulo, texto }) => (
            <div
              key={num}
              className="relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="absolute -top-3 -left-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow">
                {num}
              </div>
              <h3 className="mt-2 font-semibold text-gray-900">{titulo}</h3>
              <p className="mt-1 text-sm text-gray-500">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Secciones */}
      <section>
        <h2 className="text-center text-2xl font-bold text-gray-900 mb-8">
          Secciones del portal
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tarjetas.map(({ href, titulo, texto, color, icono, bgHover }) => (
            <Link key={href} href={href} className="group">
              <div
                className={`h-full rounded-xl border border-l-4 bg-white p-6 shadow-sm transition-all group-hover:shadow-md ${color} ${bgHover}`}
              >
                <div className="text-3xl mb-3">{icono}</div>
                <h2 className="font-semibold text-gray-900 text-lg">{titulo}</h2>
                <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                  {texto}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
