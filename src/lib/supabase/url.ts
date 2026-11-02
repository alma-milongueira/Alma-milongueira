/**
 * Limpa o endereço do Supabase colado nas variáveis de ambiente.
 * O painel às vezes mostra "https://xxxx.supabase.co/rest/v1/"; com esse pedaço a mais,
 * o login responde "Invalid path specified in request URL". Aqui sobra só a raiz do projeto.
 */
export function limparUrlSupabase(bruta: string | undefined): string | undefined {
  if (!bruta) return undefined;
  let u = bruta.trim().replace(/^["']|["']$/g, "");
  if (!u) return undefined;
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const url = new URL(u);
    return `${url.protocol}//${url.host}`;
  } catch {
    return u.replace(/\/+(rest|auth|storage|realtime|functions)\/v1.*$/i, "").replace(/\/+$/, "");
  }
}

/** Tira espaços e aspas que às vezes vêm junto ao colar a chave. */
export function limparChave(bruta: string | undefined): string | undefined {
  const c = bruta?.trim().replace(/^["']|["']$/g, "");
  return c || undefined;
}
