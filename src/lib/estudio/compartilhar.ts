// Envio do MP3: Web Share API com o arquivo; se não der, baixa e abre o WhatsApp (wa.me) com link.

export function nomeArquivo(titulo: string): string {
  const base = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${base || "galpao"}.mp3`;
}

export function podeCompartilharArquivo(arquivo: File): boolean {
  return typeof navigator !== "undefined" && !!navigator.canShare && navigator.canShare({ files: [arquivo] });
}

export function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function linkWhatsApp(texto: string): string {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

/**
 * Tenta mandar o arquivo direto (abre a folha de compartilhar do celular, onde aparece o WhatsApp).
 * Retorna "compartilhado", "cancelado" ou "sem-suporte".
 */
export async function compartilharArquivo(blob: Blob, nome: string, texto: string): Promise<"compartilhado" | "cancelado" | "sem-suporte"> {
  const arquivo = new File([blob], nome, { type: "audio/mpeg" });
  if (!podeCompartilharArquivo(arquivo)) return "sem-suporte";
  try {
    await navigator.share({ files: [arquivo], title: nome, text: texto });
    return "compartilhado";
  } catch (e) {
    if ((e as DOMException).name === "AbortError") return "cancelado";
    return "sem-suporte";
  }
}
