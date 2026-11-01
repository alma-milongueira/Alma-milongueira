// Escolha automática de modelo quando o configurado é aposentado (o provedor responde 404).
// Funções puras, testáveis.

export const GEMINI_PADRAO = "gemini-3.5-flash";
export const GROQ_PADRAO = "llama-3.3-70b-versatile";

export type ModeloGemini = { name: string; supportedGenerationMethods?: string[] };

function versao(nome: string): number[] {
  const m = /gemini-(\d+(?:\.\d+)*)/.exec(nome);
  return m ? m[1].split(".").map(Number) : [0];
}

function compararVersao(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/** Entre os modelos da chave, escolhe o "flash" de texto mais novo, preferindo versões estáveis. */
export function escolherModeloGemini(lista: ModeloGemini[]): string | null {
  const nomes = lista.filter((m) => m.supportedGenerationMethods?.includes("generateContent")).map((m) => m.name.replace(/^models\//, ""));
  const texto = nomes.filter((n) => /flash/.test(n) && !/(lite|image|tts|audio|live|embedding|vision|thinking|robotics)/.test(n));
  const flashVersao = texto.filter((n) => /^gemini-\d/.test(n));
  if (flashVersao.length) {
    const estaveis = flashVersao.filter((n) => !/(preview|exp)/.test(n));
    const base = estaveis.length ? estaveis : flashVersao;
    // mais nova primeiro; empate: nome mais curto (sem sufixo de data)
    return [...base].sort((a, b) => compararVersao(versao(b), versao(a)) || a.length - b.length)[0];
  }
  if (texto.includes("gemini-flash-latest")) return "gemini-flash-latest";
  return texto[0] ?? null;
}

/** Modelo mais leve (flash-lite) para quando o principal está sobrecarregado. */
export function escolherModeloGeminiLeve(lista: ModeloGemini[]): string | null {
  const nomes = lista
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((n) => /^gemini-\d/.test(n) && /flash-lite/.test(n) && !/(image|tts|audio|live|preview|exp)/.test(n));
  return [...nomes].sort((a, b) => compararVersao(versao(b), versao(a)) || a.length - b.length)[0] ?? null;
}

export type ModeloGroq = { id: string; active?: boolean };

export function escolherModeloGroq(lista: ModeloGroq[]): string | null {
  const ativos = lista.filter((m) => m.active !== false).map((m) => m.id);
  const chat = ativos.filter((id) => !/(whisper|guard|tts|playai|distil|embed|prompt-guard|compound)/i.test(id));
  return (
    chat.find((id) => /llama/i.test(id) && /versatile/i.test(id)) ??
    chat.find((id) => /70b/i.test(id)) ??
    chat.find((id) => /llama|gpt-oss|qwen|mixtral|gemma/i.test(id)) ??
    chat[0] ??
    null
  );
}

/** Limpa o nome vindo da variável de ambiente ("models/gemini-x" → "gemini-x"). */
export function limparNomeModelo(nome: string | undefined): string | undefined {
  const n = nome?.trim().replace(/^models\//, "");
  return n || undefined;
}
