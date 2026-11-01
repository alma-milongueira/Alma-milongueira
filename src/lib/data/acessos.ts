// Lista de acessos (até 10 e-mails). Quem manda: papel "admin".
import type { SupabaseClient } from "@supabase/supabase-js";

export const LIMITE_ACESSOS = 10;

export type Acesso = { email: string; papel: "admin" | "membro"; criadoEm: string };
export type SituacaoAcesso = "carregando" | "liberado" | "negado" | "erro";

export function normalizarEmail(e: string): string {
  return e.trim().toLowerCase();
}

export function emailValido(e: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length <= 254;
}

/** Confere se o e-mail da sessão está na lista (a RLS só deixa ver a própria linha). */
export async function minhaSituacao(sb: SupabaseClient, email: string): Promise<{ situacao: SituacaoAcesso; admin: boolean }> {
  const { data, error } = await sb.from("acessos").select("papel").eq("email", normalizarEmail(email)).maybeSingle();
  if (error) return { situacao: "erro", admin: false };
  if (!data) return { situacao: "negado", admin: false };
  return { situacao: "liberado", admin: data.papel === "admin" };
}

export async function listarAcessos(sb: SupabaseClient): Promise<Acesso[]> {
  const { data, error } = await sb.from("acessos").select("email,papel,criado_em").order("papel").order("criado_em");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ email: r.email, papel: r.papel, criadoEm: r.criado_em }));
}

export async function adicionarAcesso(sb: SupabaseClient, email: string): Promise<void> {
  const e = normalizarEmail(email);
  if (!emailValido(e)) throw new Error("E-mail inválido.");
  const { error } = await sb.from("acessos").insert({ email: e, papel: "membro" });
  if (error) {
    if (error.code === "23505") throw new Error("Esse e-mail já está na lista.");
    if (error.message.includes("Limite")) throw new Error(`Limite de ${LIMITE_ACESSOS} acessos atingido. Remova alguém antes.`);
    throw new Error(error.message);
  }
}

export async function removerAcesso(sb: SupabaseClient, email: string): Promise<void> {
  const { error, count } = await sb.from("acessos").delete({ count: "exact" }).eq("email", email).eq("papel", "membro");
  if (error) throw new Error(error.message);
  if (!count) throw new Error("Não foi possível remover (o administrador não pode ser removido).");
}

/** Traduz erros comuns do Supabase Auth para o português. */
export function traduzirErroAuth(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha não conferem.";
  if (m.includes("email not confirmed")) return "Falta confirmar o e-mail: abre o link que chegou na tua caixa de entrada.";
  if (m.includes("lista de acessos") || m.includes("hook"))
    return "Este e-mail não está na lista de acessos. Pede ao administrador pra liberar.";
  if (m.includes("user already registered")) return "Esse e-mail já tem conta. Usa “Entrar”.";
  if (m.includes("password should be at least")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas seguidas. Espera um pouco e tenta de novo.";
  return msg;
}
