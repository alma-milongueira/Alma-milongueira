import { describe, expect, it } from "vitest";
import { escolherModeloGemini, escolherModeloGroq, limparNomeModelo } from "../ia/modelos";

const gc = ["generateContent", "countTokens"];

describe("descoberta de modelo", () => {
  it("Gemini: escolhe o flash estável mais novo, ignorando lite/imagem/preview", () => {
    const lista = [
      { name: "models/gemini-2.0-flash", supportedGenerationMethods: gc },
      { name: "models/gemini-3.5-flash", supportedGenerationMethods: gc },
      { name: "models/gemini-3.5-flash-lite", supportedGenerationMethods: gc },
      { name: "models/gemini-3.6-flash-preview", supportedGenerationMethods: gc },
      { name: "models/gemini-3.5-flash-image", supportedGenerationMethods: gc },
      { name: "models/gemini-3.5-pro", supportedGenerationMethods: gc },
      { name: "models/text-embedding-004", supportedGenerationMethods: ["embedContent"] },
    ];
    expect(escolherModeloGemini(lista)).toBe("gemini-3.5-flash");
  });
  it("Gemini: sem estável, aceita preview; sem nada, usa o alias", () => {
    expect(escolherModeloGemini([{ name: "models/gemini-4.0-flash-preview", supportedGenerationMethods: gc }])).toBe(
      "gemini-4.0-flash-preview",
    );
    expect(escolherModeloGemini([{ name: "models/gemini-flash-latest", supportedGenerationMethods: gc }])).toBe("gemini-flash-latest");
    expect(escolherModeloGemini([])).toBeNull();
  });
  it("Groq: prefere llama versatile ativo", () => {
    const lista = [
      { id: "whisper-large-v3", active: true },
      { id: "llama-guard-4-12b", active: true },
      { id: "llama-3.3-70b-versatile", active: false },
      { id: "llama-4-maverick-versatile", active: true },
      { id: "qwen3-32b", active: true },
    ];
    expect(escolherModeloGroq(lista)).toBe("llama-4-maverick-versatile");
  });
  it("limpa nome vindo da variável", () => {
    expect(limparNomeModelo(" models/gemini-3.5-flash ")).toBe("gemini-3.5-flash");
    expect(limparNomeModelo("")).toBeUndefined();
  });
});

import { escolherModeloGeminiLeve } from "../ia/modelos";
describe("modelo leve", () => {
  it("escolhe o flash-lite mais novo", () => {
    const gc = ["generateContent"];
    expect(
      escolherModeloGeminiLeve([
        { name: "models/gemini-3.5-flash", supportedGenerationMethods: gc },
        { name: "models/gemini-2.5-flash-lite", supportedGenerationMethods: gc },
        { name: "models/gemini-3.5-flash-lite", supportedGenerationMethods: gc },
      ]),
    ).toBe("gemini-3.5-flash-lite");
    expect(escolherModeloGeminiLeve([])).toBeNull();
  });
});
