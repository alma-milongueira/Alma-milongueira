// Chamada server-side a modelos com camada gratuita (Gemini ou Groq). Só roda no servidor.
import "server-only";
import {
  escolherModeloGemini,
  escolherModeloGeminiLeve,
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

/** Pede uma resposta em JSON ao modelo. Se o principal falhar por sobrecarga, tenta o outro provedor. */
export async function pedirJSON(sistema: string, usuario: string): Promise<unknown> {
  const p = provedorAtivo();
  if (!p) throw new Error("Nenhuma chave de IA configurada");
  const prazo = Date.now() + 50_000; // a rota tem maxDuration de 60 s
  const reserva: Provedor | null =
    p === "gemini" ? (process.env.GROQ_API_KEY?.trim() ? "groq" : null) : process.env.GEMINI_API_KEY?.trim() ? "gemini" : null;
  try {
    return extrairJSON(p === "gemini" ? await gemini(sistema, usuario, prazo) : await groq(sistema, usuario));
  } catch (e) {
    if (!reserva || !(e instanceof Passageiro) || Date.now() > prazo - 8000) throw e;
    console.warn(`[ia] ${p} falhou (${e.message}); tentando ${reserva}`);
    return extrairJSON(reserva === "gemini" ? await gemini(sistema, usuario, prazo) : await groq(sistema, usuario));
  }
}

class ModeloIndisponivel extends Error {}
/** Erro passageiro (sobrecarga, cota momentânea, demora): vale tentar de novo ou outro modelo. */
class Passageiro extends Error {}

// Modelo descoberto automaticamente fica guardado enquanto a instância do servidor viver.
let geminiDescoberto: string | null = null;
let groqDescoberto: string | null = null;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------- Gemini ----------------

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta";
const chaveGemini = () => process.env.GEMINI_API_KEY!.trim();

async function gemini(sistema: string, usuario: string, prazo: number): Promise<string> {
  const configurado = limparNomeModelo(process.env.GEMINI_MODEL) ?? GEMINI_PADRAO;
  let modelo = geminiDescoberto ?? configurado;
  let ultimoErro: Error | null = null;
  // até 3 tentativas: mesmo modelo, de novo após pausa, e um modelo mais leve
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const resta = prazo - Date.now();
    if (resta < 6000) break;
    try {
      return await geminiCom(modelo, sistema, usuario, Math.min(22_000, resta - 2000));
    } catch (e) {
      if (e instanceof ModeloIndisponivel) {
        // aposentado ou inexistente para esta chave: procura um disponível
        const novo = await descobrirGemini();
        if (!novo || novo === modelo) throw new Error(`modelo "${modelo}" indisponível no Gemini e não achei substituto`);
        console.warn(`[ia] Gemini: "${modelo}" indisponível, usando "${novo}". Atualize GEMINI_MODEL.`);
        geminiDescoberto = novo;
        modelo = novo;
        continue;
      }
      if (!(e instanceof Passageiro)) throw e;
      ultimoErro = e;
      if (tentativa === 0) await esperar(1200);
      else if (tentativa === 1) {
        // segue sobrecarregado: tenta um modelo mais leve (ex.: flash-lite)
        const leve = await descobrirGemini(true).catch(() => null);
        if (leve && leve !== modelo) {
          console.warn(`[ia] Gemini "${modelo}" sobrecarregado; tentando "${leve}"`);
          modelo = leve;
        }
      }
    }
  }
  throw ultimoErro ?? new Passageiro("Gemini demorou demais");
}

/** Raciocínio ("thinking") no mínimo: a tarefa é criativa e curta, e assim responde bem mais rápido. */
function configRaciocinio(modelo: string): Record<string, unknown> | null {
  if (/gemini-2\.5/.test(modelo)) return /pro/.test(modelo) ? { thinkingBudget: 128 } : { thinkingBudget: 0 };
  if (/gemini-[3-9]/.test(modelo) || /latest/.test(modelo)) return { thinkingLevel: "low" };
  return null;
}

const semRaciocinio = new Set<string>(); // modelos que recusaram o thinkingConfig

async function geminiCom(modelo: string, sistema: string, usuario: string, limiteMs: number): Promise<string> {
  const raciocinio = semRaciocinio.has(modelo) ? null : configRaciocinio(modelo);
  let r: Response;
  try {
    r = await fetch(`${GEMINI_URL}/models/${encodeURIComponent(modelo)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": chaveGemini() },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sistema }] },
        contents: [{ role: "user", parts: [{ text: usuario }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.9,
          maxOutputTokens: 4096,
          ...(raciocinio ? { thinkingConfig: raciocinio } : {}),
        },
      }),
      signal: AbortSignal.timeout(limiteMs),
    });
  } catch (e) {
    const nome = (e as Error).name;
    if (nome === "TimeoutError" || nome === "AbortError") throw new Passageiro("Gemini demorou demais");
    throw new Passageiro(`sem conexão com o Gemini`);
  }
  if (r.status === 404) throw new ModeloIndisponivel(modelo);
  if (r.status === 400 && raciocinio) {
    const corpo = await r.clone().text();
    if (/thinking/i.test(corpo)) {
      // este modelo não aceita a configuração de raciocínio: repete sem ela
      semRaciocinio.add(modelo);
      return geminiCom(modelo, sistema, usuario, limiteMs);
    }
  }
  if (r.status === 503 || r.status === 500 || r.status === 502 || r.status === 504) throw new Passageiro(await erroLegivel("Gemini", r));
  if (r.status === 429) throw new Passageiro(await erroLegivel("Gemini", r));
  if (!r.ok) throw new Error(await erroLegivel("Gemini", r));
  const j = (await r.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
  const t =
    j.candidates?.[0]?.content?.parts
      ?.filter((x) => !x.thought)
      .map((x) => x.text ?? "")
      .join("") ?? "";
  if (!t) throw new Passageiro("Gemini não devolveu texto");
  return t;
}

async function descobrirGemini(leve = false): Promise<string | null> {
  const r = await fetch(`${GEMINI_URL}/models?pageSize=200`, {
    headers: { "x-goog-api-key": chaveGemini() },
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(await erroLegivel("Gemini", r));
  const j = (await r.json()) as { models?: ModeloGemini[] };
  return leve ? escolherModeloGeminiLeve(j.models ?? []) : escolherModeloGemini(j.models ?? []);
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
    signal: AbortSignal.timeout(20_000),
  }).catch((e: Error) => {
    throw new Passageiro(e.name === "TimeoutError" ? "Groq demorou demais" : "sem conexão com o Groq");
  });
  if (r.status === 404) throw new ModeloIndisponivel(modelo);
  if (r.status === 429 || r.status >= 500) throw new Passageiro(await erroLegivel("Groq", r));
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
  if (r.status === 503) return `${nome} sobrecarregado no momento`;
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
