"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./signout-button";

const navItems = [
  { href: "/empresas", label: "🏢 Empresas" },
  { href: "/dashboard", label: "📊 Dashboard" },
  { href: "/subir", label: "📤 Subir" },
  { href: "/generar", label: "📄 Generar" },
  { href: "/parametrizar", label: "⚙️ Parametrizar" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center gap-1 text-sm font-medium">
      {navItems.map(({ href, label }) => {
        const isActive = pathname === href || pathname.startsWith(href + "?");
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              isActive
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
            }`}
          >
            {label}
          </Link>
        );
      })}
      <SignOutButton />
    </div>
  );
}
