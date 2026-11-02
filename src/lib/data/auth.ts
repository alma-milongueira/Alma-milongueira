// Ajudantes de login (e-mail e senha).

export const SENHA_MINIMA = 8;

export function normalizarEmail(e: string): string {
  return e.trim().toLowerCase();
}

export function emailValido(e: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length <= 254;
}

/** Confere a senha nova e devolve a mensagem de problema, ou null se estiver boa. */
export function problemaSenha(senha: string, repetida: string): string | null {
  if (senha.length < SENHA_MINIMA) return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  if (senha !== repetida) return "As duas senhas não conferem.";
  return null;
}

/** Traduz erros comuns do Supabase Auth para o português. */
export function traduzirErroAuth(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha não conferem.";
  if (m.includes("email not confirmed")) return "Falta confirmar o e-mail: abre o link que chegou na tua caixa de entrada.";
  if (m.includes("user already registered") || m.includes("already been registered")) return "Esse e-mail já tem conta. Usa “Entrar”.";
  if (m.includes("password should be at least") || m.includes("weak password"))
    return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas seguidas. Espera um pouco e tenta de novo.";
  if (m.includes("invalid email") || m.includes("unable to validate email")) return "Esse e-mail não parece válido.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Sem conexão. Confere a internet e tenta de novo.";
  if (m.includes("invalid path specified"))
    return "Endereço do Supabase errado na Vercel (NEXT_PUBLIC_SUPABASE_URL). Use só https://SEU-PROJETO.supabase.co.";
  if (m.includes("invalid api key") || m.includes("no api key"))
    return "Chave do Supabase errada na Vercel (NEXT_PUBLIC_SUPABASE_ANON_KEY).";
  return msg;
}
