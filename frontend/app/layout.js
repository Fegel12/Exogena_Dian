"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";
import "./globals.css";
import Link from "next/link";

const navItems = [
  { href: "/empresas", label: "🏢 Empresas" },
  { href: "/dashboard", label: "📊 Dashboard" },
  { href: "/subir", label: "📤 Subir" },
  { href: "/generar", label: "📄 Generar" },
  { href: "/parametrizar", label: "⚙️ Parametrizar" },
];

function NavBar() {
  const { data: session } = useSession();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight text-blue-700 hover:text-blue-900">
          🇨🇴 Portal Exógena DIAN
        </Link>
        <div className="flex flex-wrap items-center gap-1 text-sm font-medium">
          {navItems.map(({ href, label }) => (
            <Link key={href} href={href}
              className="rounded-lg px-3 py-1.5 text-gray-700 transition hover:bg-blue-50 hover:text-blue-700">
              {label}
            </Link>
          ))}
          <span className="mx-2 h-5 w-px bg-gray-200" />
          {session ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{session.user?.name || session.user?.email}</span>
              <button onClick={() => signOut()}
                className="rounded-lg px-3 py-1.5 text-gray-500 transition hover:bg-red-50 hover:text-red-600">
                Salir
              </button>
            </div>
          ) : (
            <Link href="/login"
              className="rounded-lg bg-blue-700 px-4 py-1.5 text-white transition hover:bg-blue-800">
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900 antialiased">
        <SessionProvider>
          <NavBar />
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
