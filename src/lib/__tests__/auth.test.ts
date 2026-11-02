import { describe, expect, it } from "vitest";
import { emailValido, normalizarEmail, problemaSenha, traduzirErroAuth } from "../data/auth";

describe("login", () => {
  it("normaliza e valida e-mail", () => {
    expect(normalizarEmail("  Fulano@Hotmail.com ")).toBe("fulano@hotmail.com");
    expect(emailValido("a@b.com")).toBe(true);
    expect(emailValido("sem-arroba")).toBe(false);
  });
  it("confere senha nova", () => {
    expect(problemaSenha("curta", "curta")).toMatch(/8 caracteres/);
    expect(problemaSenha("milonga2026", "milonga2025")).toMatch(/não conferem/);
    expect(problemaSenha("milonga2026", "milonga2026")).toBeNull();
  });
  it("traduz erros do Supabase", () => {
    expect(traduzirErroAuth("Invalid login credentials")).toBe("E-mail ou senha não conferem.");
    expect(traduzirErroAuth("User already registered")).toMatch(/já tem conta/);
    expect(traduzirErroAuth("Failed to fetch")).toMatch(/Sem conexão/);
  });
});
