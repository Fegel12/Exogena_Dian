"use server";

import { redirect } from "next/navigation";

const API = "http://127.0.0.1:8000";

const FORMATOS = [
  { codigo: "1001" }, { codigo: "1005" }, { codigo: "1647" },
  { codigo: "2821" }, { codigo: "2822" }, { codigo: "2854" },
  { codigo: "1476" }, { codigo: "2574" },
];

function mensajeAmigable(err, formato) {
  const msg = (typeof err === "string" ? err : err.message || "Error desconocido");

  if (msg.includes("No hay reglas de parametrización")) {
    return `El formato ${formato} no tiene cuentas asignadas. Vaya a Parametrizar → seleccione el formato ${formato} → asigne las cuentas del PUC a cada concepto DIAN.`;
  }
  if (msg.includes("no produjeron ningún registro") || msg.includes("no produjeron registros")) {
    return `El formato ${formato} tiene reglas pero ninguna coincide con los terceros del balance. Revise que las cuentas asignadas en Parametrizar tengan movimientos con terceros.`;
  }
  if (msg.includes("no implementado")) {
    return `El formato ${formato} no está disponible todavía. Formatos actuales: 1001, 1005, 1647, 2821, 2822, 2854, 1476, 2574.`;
  }
  if (msg.includes("no tiene balances")) {
    return "No hay balances importados. Vaya a Subir balance e importe un archivo de WorldOffice (.xlsx) primero.";
  }
  if (msg.includes("Balance no encontrado")) {
    return "No se encontró el balance. Importe un archivo de WorldOffice en la sección Subir balance.";
  }
  if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
    return "No se pudo conectar con el servidor. Verifique que el backend esté funcionando en http://127.0.0.1:8000.";
  }

  // Fallback: traducir errores comunes
  return `Error al generar el formato ${formato}: ${msg}. Si el problema persiste, revise que haya un balance importado y reglas configuradas en Parametrizar.`;
}

export async function generarFormato(formData) {
  const formato = formData.get("formato") || "1001";
  try {
    const res = await fetch(`${API}/api/companies/1/generate?formato=${formato}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = await res.json();
    if (!res.ok) {
      const err = typeof data.detail === "string" ? data.detail : JSON.stringify(data);
      redirect(`/generar?formato=${formato}&msg=${encodeURIComponent(mensajeAmigable(err, formato))}&ok=0`);
    }
    const n = data.archivos?.length || 0;
    redirect(`/generar?formato=${formato}&msg=${encodeURIComponent(`¡Listo! Se gener${n === 1 ? "ó" : "aron"} ${n} archivo${n === 1 ? "" : "s"} (XML + Excel). Puede descargarlo${n === 1 ? "" : "s"} abajo.`)}&ok=1`);
  } catch (err) {
    redirect(`/generar?formato=${formato}&msg=${encodeURIComponent(mensajeAmigable(err, formato))}&ok=0`);
  }
}

export async function generarTodosAction() {
  const archivos = [];
  const errores = [];
  for (const f of FORMATOS) {
    try {
      const res = await fetch(`${API}/api/companies/1/generate?formato=${f.codigo}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (!res.ok) {
        errores.push(`${f.codigo}: ${typeof data.detail === "string" ? data.detail : "Error"}`);
      } else if (data.archivos?.length) {
        archivos.push(...data.archivos);
      }
    } catch (err) {
      errores.push(`${f.codigo}: ${err.message || "Error de conexión"}`);
    }
  }
  if (archivos.length) {
    const extra = errores.length ? `. ${errores.length} formato(s) no generaron: revise sus reglas en Parametrizar.` : "";
    redirect(`/generar?formato=1001&msg=${encodeURIComponent(`¡Listo! ${archivos.length} archivos generados (XML + Excel). Puede descargarlos abajo.${extra}`)}&ok=1`);
  }
  redirect(`/generar?formato=1001&msg=${encodeURIComponent(`No se generó ningún archivo. Causas posibles: (1) no hay reglas de parametrización para estos formatos — vaya a Parametrizar, (2) los terceros del balance no coinciden con las reglas, (3) no hay balance importado.`)}&ok=0`);
}

export async function eliminarArchivo(formData) {
  const fileId = formData.get("file_id");
  await fetch(`http://127.0.0.1:8000/api/files/${fileId}`, { method: "DELETE" });
  redirect("/generar?formato=1001&msg=Archivo eliminado.&ok=1");
}

export async function eliminarLote(formData) {
  const batchId = formData.get("batch_id");
  await fetch(`http://127.0.0.1:8000/api/batches/${batchId}?tenant_id=1`, { method: "DELETE" });
  redirect("/generar?formato=1001&msg=Lote eliminado.&ok=1");
}
