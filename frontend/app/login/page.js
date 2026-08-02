"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const params = useSearchParams();
  const [error, setError] = useState(params.get("error") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCredentials = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      email: email || "dev@exogena.local",
      password,
      redirect: false,
      callbackUrl: "/",
    });
    if (result?.error) {
      setError("Contraseña incorrecta. Usa: exogena2025");
    }
    setLoading(false);
  };

  const oauthProviders = [
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
            Balance de prueba → validación → archivos XML para la DIAN
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error === "Configuration" || error === "OAuthSignin"
              ? "Proveedor no configurado todavía."
              : error}
          </div>
        )}

        {/* Login rápido de desarrollo */}
        <form onSubmit={handleCredentials} className="space-y-3 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            🛠️ Modo desarrollo
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (cualquiera)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña (exogena2025)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Entrando…" : "🔑 Entrar (desarrollo)"}
          </button>
          <p className="text-center text-[11px] text-blue-600">
            Contraseña: <code className="rounded bg-blue-100 px-1">exogena2025</code>
          </p>
        </form>

        <div className="flex items-center gap-3">
          <hr className="flex-1 border-gray-200" />
          <span className="text-xs text-gray-400">o ingresa con</span>
          <hr className="flex-1 border-gray-200" />
        </div>

        <div className="space-y-3">
          {oauthProviders.map((p) => (
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
          Los proveedores OAuth requieren credenciales en{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5">.env.local</code>.
          El modo desarrollo funciona sin configuración.
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
