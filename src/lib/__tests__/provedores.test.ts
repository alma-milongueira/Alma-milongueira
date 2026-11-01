import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type Resp = { status: number; body: unknown };
function resposta({ status, body }: Resp) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
}
const ok = (texto: string) => ({ status: 200, body: { candidates: [{ content: { parts: [{ text: texto }] } }] } });
const lista = {
  status: 200,
  body: {
    models: [
      { name: "models/gemini-3.5-flash", supportedGenerationMethods: ["generateContent"] },
      { name: "models/gemini-3.5-flash-lite", supportedGenerationMethods: ["generateContent"] },
    ],
  },
};

describe("pedirJSON (Gemini com tentativas)", () => {
  let chamadas: { url: string; body?: Record<string, unknown> }[];
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 50 });
    process.env.GEMINI_API_KEY = "teste";
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_MODEL;
    chamadas = [];
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function simular(fila: Resp[]) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        chamadas.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
        const r = fila.shift();
        if (!r) throw new Error("sem resposta simulada");
        return resposta(r);
      }),
    );
  }

  it("usa thinkingLevel low no gemini-3.5-flash", async () => {
    simular([ok('{"a":1}')]);
    const { pedirJSON } = await import("../ia/provedores");
    expect(await pedirJSON("s", "u")).toEqual({ a: 1 });
    expect(chamadas[0].url).toContain("gemini-3.5-flash:generateContent");
    expect((chamadas[0].body!.generationConfig as Record<string, unknown>).thinkingConfig).toEqual({ thinkingLevel: "low" });
  });

  it("503 duas vezes → tenta o flash-lite e responde", async () => {
    simular([{ status: 503, body: "overloaded" }, { status: 503, body: "overloaded" }, lista, ok('{"ok":true}')]);
    const { pedirJSON } = await import("../ia/provedores");
    expect(await pedirJSON("s", "u")).toEqual({ ok: true });
    expect(chamadas[3].url).toContain("gemini-3.5-flash-lite:generateContent");
  });

  it("modelo recusa thinkingConfig → repete sem ele", async () => {
    simular([{ status: 400, body: "Unknown name thinkingLevel in thinking_config" }, ok('{"b":2}')]);
    const { pedirJSON } = await import("../ia/provedores");
    expect(await pedirJSON("s", "u")).toEqual({ b: 2 });
    expect((chamadas[1].body!.generationConfig as Record<string, unknown>).thinkingConfig).toBeUndefined();
  });

  it("Gemini fora do ar → usa o Groq de reserva", async () => {
    process.env.GROQ_API_KEY = "g";
    simular([
      { status: 503, body: "x" },
      { status: 503, body: "x" },
      { status: 500, body: "erro" }, // listar modelos falha
      { status: 503, body: "x" },
      { status: 200, body: { choices: [{ message: { content: '{"groq":1}' } }] } },
    ]);
    const { pedirJSON } = await import("../ia/provedores");
    expect(await pedirJSON("s", "u")).toEqual({ groq: 1 });
    expect(chamadas.at(-1)!.url).toContain("api.groq.com");
  });
});
