import { describe, expect, it } from "vitest";
import { emailValido, LIMITE_ACESSOS, normalizarEmail, traduzirErroAuth } from "../data/acessos";

describe("acessos", () => {
  it("limite de 10", () => expect(LIMITE_ACESSOS).toBe(10));
  it("normaliza e valida e-mail", () => {
    expect(normalizarEmail("  Luiscanabarro@Hotmail.com ")).toBe("luiscanabarro@hotmail.com");
    expect(emailValido("a@b.com")).toBe(true);
    expect(emailValido("sem-arroba")).toBe(false);
  });
  it("traduz erros do login", () => {
    expect(traduzirErroAuth("Invalid login credentials")).toBe("E-mail ou senha não conferem.");
    expect(traduzirErroAuth("Este e-mail não está na lista de acessos do Alma Milongueira.")).toMatch(/lista de acessos/);
  });
});
