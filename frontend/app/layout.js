import "./globals.css";
import Link from "next/link";
import { NavLinks } from "./nav-links";

export const metadata = {
  title: "Portal Exógena DIAN",
  description: "Balance de prueba → validación → archivos XML para la DIAN",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900 antialiased">
        <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <Link
              href="/"
              className="text-lg font-bold text-blue-700 hover:text-blue-800 transition-colors"
            >
              🇨🇴 Portal Exógena DIAN
            </Link>
            <NavLinks />
          </div>
        </nav>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
          {children}
        </main>

        <footer className="border-t border-gray-200 bg-white mt-auto">
          <div className="mx-auto max-w-7xl px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500">
            <span>© {new Date().getFullYear()} Exógena DIAN — Portal de información exógena tributaria</span>
            <span className="flex items-center gap-4">
              <Link href="/empresas" className="hover:text-blue-600 transition-colors">Empresas</Link>
              <Link href="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</Link>
              <Link href="/parametrizar" className="hover:text-blue-600 transition-colors">Parametrizar</Link>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
