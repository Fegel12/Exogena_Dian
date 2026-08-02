import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "3rem 1rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>🇨🇴 Portal Exógena DIAN</h1>
      <p style={{ fontSize: "1.1rem", color: "#444" }}>
        Sube el balance de prueba con terceros, valida la contabilidad y genera los archivos XML
        para la información exógena.
      </p>
      <div style={{ display: "grid", gap: "1rem", marginTop: "2rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <Tarjeta href="/empresas" titulo="🏢 Empresas" texto="Superusuario: crea y administra las empresas." />
        <Tarjeta href="/dashboard" titulo="📊 Dashboard" texto="Balance, cuadre y cuentas que no cumplen su naturaleza." />
        <Tarjeta href="/subir" titulo="📤 Subir balance" texto="Importa el balance de prueba de WorldOffice." />
        <Tarjeta href="/generar" titulo="📄 Generar XML" texto="Crea los archivos para la DIAN (formato 1001)." />
      </div>
    </main>
  );
}

function Tarjeta({ href, titulo, texto }) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: "1.2rem", height: "100%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.08)" }}>
        <h3 style={{ margin: "0 0 .5rem" }}>{titulo}</h3>
        <p style={{ margin: 0, color: "#555", fontSize: ".95rem" }}>{texto}</p>
      </div>
    </Link>
  );
}
