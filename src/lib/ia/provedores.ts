// Chamada server-side a modelos com camada gratuita (Gemini ou Groq). Só roda no servidor.
import "server-only";

export type Provedor = "gemini" | "groq";

export function provedorAtivo(): Provedor | null {
  const pref = process.env.IA_PROVEDOR?.toLowerCase();
  const temGemini = Boolean(process.env.GEMINI_API_KEY);
  const temGroq = Boolean(process.env.GROQ_API_KEY);
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

async function gemini(sistema: string, usuario: string): Promise<string> {
  const modelo = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sistema }] },
      contents: [{ role: "user", parts: [{ text: usuario }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.9, maxOutputTokens: 2048 },
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!r.ok) throw new Error(`Gemini respondeu ${r.status}`);
  const j = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const t = j.candidates?.[0]?.content?.parts?.map((x) => x.text ?? "").join("") ?? "";
  if (!t) throw new Error("Gemini não devolveu texto");
  return t;
}

async function groq(sistema: string, usuario: string): Promise<string> {
  const modelo = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.GROQ_API_KEY}` },
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
  if (!r.ok) throw new Error(`Groq respondeu ${r.status}`);
  const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  const t = j.choices?.[0]?.message?.content ?? "";
  if (!t) throw new Error("Groq não devolveu texto");
  return t;
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
