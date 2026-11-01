// Chamada server-side a modelos com camada gratuita (Gemini ou Groq). Só roda no servidor.
import "server-only";
import {
  escolherModeloGemini,
  escolherModeloGroq,
  GEMINI_PADRAO,
  GROQ_PADRAO,
  limparNomeModelo,
  type ModeloGemini,
  type ModeloGroq,
} from "./modelos";

export type Provedor = "gemini" | "groq";

export function provedorAtivo(): Provedor | null {
  const pref = process.env.IA_PROVEDOR?.trim().toLowerCase();
  const temGemini = Boolean(process.env.GEMINI_API_KEY?.trim());
  const temGroq = Boolean(process.env.GROQ_API_KEY?.trim());
  if (pref === "groq" && temGroq) return "groq";
  if (pref === "gemini" && temGemini) return "gemini";
  if (temGemini) return "gemini";
  if (temGroq) return "groq";
  return null;
}

/** Pede uma resposta em JSON ao modelo. Lança erro em falha/timeout. */
export async function pedirJSON(sistema: string, usuario: string): Promise<unknown> {
  const p = provedorAtivo();
  if (!p) throw new Error("Nenhuma chave de IA configurada");
  const texto = p === "gemini" ? await gemini(sistema, usuario) : await groq(sistema, usuario);
  return extrairJSON(texto);
}

class ModeloIndisponivel extends Error {}

// Modelo descoberto automaticamente fica guardado enquanto a instância do servidor viver.
let geminiDescoberto: string | null = null;
let groqDescoberto: string | null = null;

// ---------------- Gemini ----------------

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta";
const chaveGemini = () => process.env.GEMINI_API_KEY!.trim();

async function gemini(sistema: string, usuario: string): Promise<string> {
  const configurado = limparNomeModelo(process.env.GEMINI_MODEL) ?? GEMINI_PADRAO;
  const primeiro = geminiDescoberto ?? configurado;
  try {
    return await geminiCom(primeiro, sistema, usuario);
  } catch (e) {
    if (!(e instanceof ModeloIndisponivel)) throw e;
    // O modelo foi aposentado ou não existe para esta chave: procura um disponível
    const novo = await descobrirGemini();
    if (!novo || novo === primeiro) throw new Error(`modelo "${primeiro}" indisponível no Gemini e não achei substituto`);
    console.warn(`[ia] Gemini: "${primeiro}" indisponível, usando "${novo}". Atualize GEMINI_MODEL.`);
    geminiDescoberto = novo;
    return geminiCom(novo, sistema, usuario);
  }
}

async function geminiCom(modelo: string, sistema: string, usuario: string): Promise<string> {
  const r = await fetch(`${GEMINI_URL}/models/${encodeURIComponent(modelo)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": chaveGemini() },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sistema }] },
      contents: [{ role: "user", parts: [{ text: usuario }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.9, maxOutputTokens: 4096 },
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (r.status === 404) throw new ModeloIndisponivel(modelo);
  if (!r.ok) throw new Error(await erroLegivel("Gemini", r));
  const j = (await r.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
  const t =
    j.candidates?.[0]?.content?.parts
      ?.filter((x) => !x.thought)
      .map((x) => x.text ?? "")
      .join("") ?? "";
  if (!t) throw new Error("Gemini não devolveu texto");
  return t;
}

async function descobrirGemini(): Promise<string | null> {
  const r = await fetch(`${GEMINI_URL}/models?pageSize=200`, {
    headers: { "x-goog-api-key": chaveGemini() },
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(await erroLegivel("Gemini", r));
  const j = (await r.json()) as { models?: ModeloGemini[] };
  return escolherModeloGemini(j.models ?? []);
}

// ---------------- Groq ----------------

const chaveGroq = () => process.env.GROQ_API_KEY!.trim();

async function groq(sistema: string, usuario: string): Promise<string> {
  const configurado = limparNomeModelo(process.env.GROQ_MODEL) ?? GROQ_PADRAO;
  const primeiro = groqDescoberto ?? configurado;
  try {
    return await groqCom(primeiro, sistema, usuario);
  } catch (e) {
    if (!(e instanceof ModeloIndisponivel)) throw e;
    const novo = await descobrirGroq();
    if (!novo || novo === primeiro) throw new Error(`modelo "${primeiro}" indisponível no Groq e não achei substituto`);
    console.warn(`[ia] Groq: "${primeiro}" indisponível, usando "${novo}". Atualize GROQ_MODEL.`);
    groqDescoberto = novo;
    return groqCom(novo, sistema, usuario);
  }
}

async function groqCom(modelo: string, sistema: string, usuario: string): Promise<string> {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${chaveGroq()}` },
    body: JSON.stringify({
      model: modelo,
      temperature: 0.9,
      max_tokens: 2048,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sistema },
        { role: "user", content: usuario },
      ],
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (r.status === 404) throw new ModeloIndisponivel(modelo);
  if (r.status === 400) {
    const corpo = await r.text();
    if (/decommission|model_not_found|does not exist/i.test(corpo)) throw new ModeloIndisponivel(modelo);
    throw new Error(`Groq respondeu 400`);
  }
  if (!r.ok) throw new Error(await erroLegivel("Groq", r));
  const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  const t = j.choices?.[0]?.message?.content ?? "";
  if (!t) throw new Error("Groq não devolveu texto");
  return t;
}

async function descobrirGroq(): Promise<string | null> {
  const r = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { authorization: `Bearer ${chaveGroq()}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(await erroLegivel("Groq", r));
  const j = (await r.json()) as { data?: ModeloGroq[] };
  return escolherModeloGroq(j.data ?? []);
}

// ---------------- util ----------------

async function erroLegivel(nome: string, r: Response): Promise<string> {
  const corpo = await r.text().catch(() => "");
  console.error(`[ia] ${nome} ${r.status}: ${corpo.slice(0, 500)}`);
  if (r.status === 400 && /api key not valid|API_KEY_INVALID/i.test(corpo)) return `chave do ${nome} inválida`;
  if (r.status === 401 || r.status === 403) return `chave do ${nome} recusada (${r.status})`;
  if (r.status === 429) return `${nome} sem cota agora, tenta daqui a pouco`;
  return `${nome} respondeu ${r.status}`;
}

function extrairJSON(t: string): unknown {
  const limpo = t
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    return JSON.parse(limpo);
  } catch {
    const i = limpo.indexOf("{");
    const f = limpo.lastIndexOf("}");
    if (i >= 0 && f > i) return JSON.parse(limpo.slice(i, f + 1));
    throw new Error("Resposta da IA não veio em JSON");
  }
}
