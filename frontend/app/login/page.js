"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const params = useSearchParams();
  const [error, setError] = useState(params.get("error") || "");

  const providers = [
    {
      id: "google",
      name: "Google",
      icon: "🔵",
      description: "Cuenta personal de Google / Gmail",
      color: "bg-white hover:bg-gray-50 border-gray-300 text-gray-700",
    },
    {
      id: "microsoft-entra-id",
      name: "Microsoft (empresa)",
      icon: "🟦",
      description: "Office 365 / Azure AD (cuenta del trabajo)",
      color: "bg-white hover:bg-gray-50 border-gray-300 text-gray-700",
    },
    {
      id: "microsoft",
      name: "Microsoft (personal)",
      icon: "🟩",
      description: "Outlook.com / Hotmail / Live",
      color: "bg-white hover:bg-gray-50 border-gray-300 text-gray-700",
    },
    {
      id: "apple",
      name: "Apple",
      icon: "⚫",
      description: "Iniciar sesión con Apple ID",
      color: "bg-black hover:bg-gray-900 border-gray-700 text-white",
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">🇨🇴 Portal Exógena DIAN</h1>
          <p className="mt-2 text-sm text-gray-500">
            Inicia sesión con tu cuenta de Google, Microsoft o Apple
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error === "Configuration" || error === "OAuthSignin"
              ? "Proveedor no configurado todavía. Agrega las credenciales en .env.local"
              : error}
          </div>
        )}

        <div className="space-y-3">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => signIn(p.id, { callbackUrl: "/" })}
              className={`flex w-full items-center gap-3 rounded-xl border px-5 py-3.5 text-left transition ${p.color}`}
            >
              <span className="text-2xl">{p.icon}</span>
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs opacity-70">{p.description}</div>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400">
          Para configurar los proveedores, edita el archivo{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5">frontend/.env.local</code>{" "}
          con tus credenciales de OAuth.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Cargando…</div>}>
      <LoginForm />
    </Suspense>
  );
}
