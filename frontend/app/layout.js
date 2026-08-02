import "./globals.css";

export const metadata = {
  title: "Portal Exógena DIAN",
  description: "Balance de prueba → validación → archivos XML para la DIAN",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
