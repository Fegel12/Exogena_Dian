import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Portal Exógena DIAN",
  description: "Balance de prueba → validación → archivos XML para la DIAN",
};

const navItems = [
  { href: "/empresas", label: "🏢 Empresas" },
  { href: "/dashboard", label: "📊 Dashboard" },
  { href: "/subir", label: "📤 Subir" },
  { href: "/generar", label: "📄 Generar" },
  { href: "/parametrizar", label: "⚙️ Parametrizar" },
];

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">
        <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <Link
              href="/"
              className="text-lg font-bold text-blue-700 hover:text-blue-900"
            >
              🇨🇴 Portal Exógena DIAN
            </Link>
            <div className="flex flex-wrap items-center gap-1 text-sm font-medium">
              {navItems.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-lg px-3 py-1.5 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
