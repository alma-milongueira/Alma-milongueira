import { describe, expect, it } from "vitest";
import { calcularPicos, caminhoOnda, detectarAtaques, mediana, parearAtrasos } from "../estudio/analise";
import { escolherBitrate, MB, tamanhoEstimado } from "../estudio/mp3";
import { audiveis, faixaNova, inicioNaLinha, ordemParaInserir } from "../estudio/tipos";
import { nomeArquivo } from "../estudio/compartilhar";

describe("bitrate automático (5–7 MB)", () => {
  it("música de 4 min fica entre 5 e 7 MB", () => {
    const e = escolherBitrate(240);
    expect(e.situacao).toBe("na-faixa");
    expect(e.bytesEstimados).toBeGreaterThanOrEqual(5 * MB);
    expect(e.bytesEstimados).toBeLessThanOrEqual(7 * MB);
  });
  it("cobre durações típicas de 2:15 a 25 min dentro da faixa", () => {
    for (let s = 135; s <= 1500; s += 15) {
      const e = escolherBitrate(s);
      expect(e.bytesEstimados, `${s}s @${e.kbps}`).toBeLessThanOrEqual(7 * MB);
      if (e.situacao === "na-faixa") expect(e.bytesEstimados).toBeGreaterThanOrEqual(5 * MB);
    }
  });
  it("música curta usa 320 kbps e avisa; muito longa usa 32 kbps", () => {
    expect(escolherBitrate(60)).toMatchObject({ kbps: 320, situacao: "curta" });
    expect(escolherBitrate(3600)).toMatchObject({ kbps: 32, situacao: "longa" });
    expect(tamanhoEstimado(240, 192)).toBeGreaterThan(5 * MB);
  });
});

describe("faixas", () => {
  const f = (id: string, ordem: number) => ({ ...faixaNova("p", id, ordem) });
  it("insere acima e abaixo mantendo a ordem", () => {
    const l = [f("a", 0), f("b", 1), f("c", 2)];
    expect(ordemParaInserir(l, "b", "acima")).toBe(0.5);
    expect(ordemParaInserir(l, "b", "abaixo")).toBe(1.5);
    expect(ordemParaInserir(l, "a", "acima")).toBe(-1);
    expect(ordemParaInserir(l, "c", "abaixo")).toBe(3);
    expect(ordemParaInserir([], null, "abaixo")).toBe(0);
  });
  it("mudo e solo", () => {
    const l = [
      { id: "a", mudo: false, solo: false },
      { id: "b", mudo: true, solo: false },
      { id: "c", mudo: false, solo: false },
    ];
    expect(audiveis(l).map((x) => x.id)).toEqual(["a", "c"]);
    l[2].solo = true;
    expect(audiveis(l).map((x) => x.id)).toEqual(["c"]);
  });
  it("início na linha do tempo desconta a latência", () => {
    expect(inicioNaLinha({ offsetMs: 2000, latenciaMs: 180 })).toBeCloseTo(1.82);
  });
  it("nome de arquivo", () => {
    expect(nomeArquivo("Milonga do Pago Velho!")).toBe("milonga-do-pago-velho.mp3");
  });
});

describe("análise de áudio", () => {
  const taxa = 48000;
  function sinal(ataques: number[], dur = 6, ruido = 0.003) {
    const d = new Float32Array(taxa * dur);
    let s = 1;
    for (let i = 0; i < d.length; i++) {
      s = (s * 16807) % 2147483647;
      d[i] = (s / 2147483647 - 0.5) * ruido;
    }
    for (const a of ataques) {
      const i0 = Math.round(a * taxa);
      for (let i = 0; i < taxa * 0.04; i++) d[i0 + i] += Math.sin(i * 0.3) * 0.7 * Math.exp(-i / (taxa * 0.01));
    }
    return d;
  }
  it("detecta palmas com precisão de ~1 ms", () => {
    const reais = [0.5, 1.25, 2.0, 2.75, 3.5];
    const achados = detectarAtaques(sinal(reais), taxa);
    expect(achados.length).toBe(reais.length);
    achados.forEach((a, i) => expect(Math.abs(a - reais[i])).toBeLessThan(0.0015));
  });
  it("mede a latência pareando clicks e palmas", () => {
    const clicks = [0.5, 1.25, 2.0, 2.75, 3.5, 4.25];
    const lat = 0.212;
    const ataques = detectarAtaques(sinal(clicks.map((c) => c + lat)), taxa);
    const atrasos = parearAtrasos(clicks, ataques);
    expect(Math.abs(mediana(atrasos) - lat)).toBeLessThan(0.002);
  });
  it("picos e caminho da onda", () => {
    const p = calcularPicos(sinal([0.1], 1), taxa);
    expect(p.max.length).toBe(100);
    expect(caminhoOnda(p).startsWith("M0")).toBe(true);
  });
});
