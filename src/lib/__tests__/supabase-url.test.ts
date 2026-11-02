import { describe, expect, it } from "vitest";
import { limparChave, limparUrlSupabase } from "../supabase/url";

describe("endereço do Supabase", () => {
  it.each([
    ["https://abcd.supabase.co", "https://abcd.supabase.co"],
    ["https://abcd.supabase.co/", "https://abcd.supabase.co"],
    ["https://abcd.supabase.co/rest/v1/", "https://abcd.supabase.co"],
    ["https://abcd.supabase.co/rest/v1", "https://abcd.supabase.co"],
    ["https://abcd.supabase.co/auth/v1/", "https://abcd.supabase.co"],
    ["  https://abcd.supabase.co/rest/v1/  ", "https://abcd.supabase.co"],
    ['"https://abcd.supabase.co"', "https://abcd.supabase.co"],
    ["abcd.supabase.co", "https://abcd.supabase.co"],
  ])("%s → %s", (entrada, saida) => {
    expect(limparUrlSupabase(entrada)).toBe(saida);
  });
  it("vazio vira indefinido", () => {
    expect(limparUrlSupabase("")).toBeUndefined();
    expect(limparUrlSupabase(undefined)).toBeUndefined();
    expect(limparChave("  ")).toBeUndefined();
    expect(limparChave(" eyJabc ")).toBe("eyJabc");
  });
});
