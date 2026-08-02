import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET no está definido en .env.local");
}

// Determinar qué proveedores están configurados realmente
const providers = [];

// Credenciales (modo desarrollo: email=cualquiera, password=exogena2025)
providers.push(
  Credentials({
    name: "Desarrollo",
    credentials: {
      email: { label: "Email", type: "email", placeholder: "dev@exogena.local" },
      password: { label: "Contraseña", type: "password", placeholder: "exogena2025" },
    },
    async authorize(credentials) {
      if (credentials.password === "exogena2025") {
        return {
          id: "dev-user-1",
          name: credentials.email || "Desarrollador",
          email: credentials.email || "dev@exogena.local",
        };
      }
      return null;
    },
  })
);

// Google — solo si hay credenciales reales
if (process.env.AUTH_GOOGLE_ID?.startsWith?.("TU_CLI") !== true && process.env.AUTH_GOOGLE_ID) {
  providers.push(Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET }));
}

// Microsoft Entra ID — solo si configurado
if (process.env.AUTH_MICROSOFT_ID?.startsWith?.("TU_CLI") !== true && process.env.AUTH_MICROSOFT_ID) {
  providers.push(MicrosoftEntraID({ clientId: process.env.AUTH_MICROSOFT_ID, clientSecret: process.env.AUTH_MICROSOFT_SECRET }));
}

// Apple — solo si configurado
if (process.env.AUTH_APPLE_ID?.startsWith?.("TU_CLI") !== true && process.env.AUTH_APPLE_ID) {
  providers.push(Apple({ clientId: process.env.AUTH_APPLE_ID, clientSecret: process.env.AUTH_APPLE_SECRET }));
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.provider = account.provider;
        token.accessToken = account.access_token;
      }
      if (profile) {
        token.email = profile.email;
        token.name = profile.name || profile.email;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.provider = token.provider;
      session.user.id = token.sub;
      return session;
    },
  },
});
