"use server";

import { revalidatePath } from "next/cache";

const API = "http://127.0.0.1:8000";

export async function toggleCuenta(ruleId, active) {
  await fetch(`${API}/api/template-rules/${ruleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active: !active }),
  });
  revalidatePath("/parametrizar");
}

export async function eliminarCuenta(ruleId) {
  await fetch(`${API}/api/template-rules/${ruleId}`, { method: "DELETE" });
  revalidatePath("/parametrizar");
}

export async function agregarCuenta(formData) {
  const concepto = formData.get("concepto");
  const nombre = formData.get("nombre");
  const cuenta = formData.get("cuenta");
  const formato = formData.get("formato") || "1001";

  await fetch(`${API}/api/template-rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      format_code: formato,
      concepto: parseInt(concepto),
      concepto_nombre: nombre,
      cuenta,
      campo_valor: "closing",
    }),
  });
  revalidatePath("/parametrizar");
}

export async function autoPropuesta(formData) {
  const formato = formData.get("formato") || "1001";
  await fetch(`${API}/api/template-rules/auto-propose?tenant_id=1&formato=${formato}`, { method: "POST" });
  revalidatePath("/parametrizar");
}

export async function importarConfig(formData) {
  const file = formData.get("file");
  const formato = formData.get("formato") || "1001";
  if (!file || file.size === 0) return;

  const fd = new FormData();
  fd.append("file", file);
  await fetch(`${API}/api/template-rules/import?formato=${formato}`, {
    method: "POST",
    body: fd,
  });
  revalidatePath("/parametrizar");
}
