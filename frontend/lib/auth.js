import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Apple from "next-auth/providers/apple";

if (!process.env.NEXTAUTH_SECRET) {
  // En desarrollo genera uno con: openssl rand -base64 32
  throw new Error("NEXTAUTH_SECRET no está definido en .env.local");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    MicrosoftEntraID({
      // Microsoft Entra ID = cuentas empresariales / Office 365 / Azure AD
      clientId: process.env.AUTH_MICROSOFT_ID,
      clientSecret: process.env.AUTH_MICROSOFT_SECRET,
    }),
    Apple({
      clientId: process.env.AUTH_APPLE_ID,
      clientSecret: process.env.AUTH_APPLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // guardar el proveedor y el email en el token JWT
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
      // pasar datos del token a la sesión del navegador
      session.user.provider = token.provider;
      session.user.id = token.sub;
      return session;
    },
  },
});
