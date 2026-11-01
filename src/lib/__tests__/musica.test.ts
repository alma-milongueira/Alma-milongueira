import { describe, expect, it } from "vitest";
import { parseAcorde, transporAcorde, transporCifra, parseLinhaCifra, acordesDaCifra } from "../music/acordes";
import { transporTom, tomPrefereBemol } from "../music/notas";
import { buscarPosicoes, semitonsDesenho } from "../music/afinacoes";
import { grauParaAcorde, progressoesDoRitmo, variacoes, campoHarmonico, acordeNoTom, nomeDoTomPorExtenso } from "../music/harmonia";
import { LISTA_RITMOS } from "../music/ritmos";
import { analisarPalavra, contarVerso, chaveRima, esquemaRimas } from "../letra/silabas";
import { sugerirRimas } from "../letra/rimas";

describe("acordes", () => {
  it("lê cifras comuns", () => {
    for (const c of ["G", "Em", "B7", "C7M", "Am7", "F#m7(b5)", "D/F#", "Bb", "E°", "Asus4", "C9", "G7(9)", "Dm6", "A4"]) {
      expect(parseAcorde(c), c).not.toBeNull();
    }
    expect(parseAcorde("H7")).toBeNull();
    expect(parseAcorde("Gxyz")).toBeNull();
  });
  it("transpõe acordes e cifras", () => {
    expect(transporAcorde("G", 2, false)).toBe("A");
    expect(transporAcorde("D/F#", 2, false)).toBe("E/G#");
    expect(transporAcorde("Em", 1, true)).toBe("Fm");
    expect(transporAcorde("B7", 1, false)).toBe("C7");
    expect(transporCifra("[G]Lá no [D7]pago", -2, true)).toBe("[F]Lá no [C7]pago");
    expect(transporTom("Em", 3)).toBe("Gm");
    expect(transporTom("G", -1)).toBe("F#");
    expect(tomPrefereBemol("Dm")).toBe(true);
  });
  it("separa trechos da cifra", () => {
    expect(parseLinhaCifra("[G]Lá no meu [D]pago")).toEqual([
      { acorde: "G", texto: "Lá no meu " },
      { acorde: "D", texto: "pago" },
    ]);
    expect(parseLinhaCifra("sem acorde")).toEqual([{ texto: "sem acorde" }]);
    expect(acordesDaCifra("[G]a [D]b [G]c")).toEqual(["G", "D"]);
  });
});

describe("afinações", () => {
  it("acha o G aberto na afinação padrão", () => {
    const p = buscarPosicoes("G", "padrao");
    expect(p.length).toBeGreaterThan(0);
    expect(p.map((x) => x.casas.join(","))).toContain("3,2,0,0,0,3");
  });
  it("acha Em e D na padrão", () => {
    expect(buscarPosicoes("Em", "padrao")[0].casas).toEqual([0, 2, 2, 0, 0, 0]);
    expect(buscarPosicoes("D", "padrao").map((x) => x.casas.join(","))).toContain("-1,-1,0,2,3,2");
  });
  it("acha posições em DADGAD e Drop D", () => {
    expect(buscarPosicoes("D", "dadgad").length).toBeGreaterThan(0);
    expect(buscarPosicoes("D", "dropD")[0].casas[0]).toBe(0);
  });
  it("calcula desenho com capo e meio tom abaixo", () => {
    expect(semitonsDesenho(2, "padrao")).toBe(-2);
    expect(semitonsDesenho(0, "meioTom")).toBe(1);
  });
});

describe("harmonia", () => {
  it("converte graus", () => {
    expect(grauParaAcorde("V7", "G")).toBe("D7");
    expect(grauParaAcorde("i", "Em")).toBe("Em");
    expect(grauParaAcorde("bIII", "Em")).toBe("G");
    expect(grauParaAcorde("V7/vi", "C")).toBe("E7");
    expect(grauParaAcorde("ii°", "Am")).toBe("B°");
    expect(grauParaAcorde("iiø", "Am")).toBe("Bm7(b5)");
  });
  it("gera progressões e variações válidas para todos os ritmos", () => {
    for (const r of LISTA_RITMOS) {
      for (const tom of ["G", "Em", "Bb", "F#m"]) {
        const ps = progressoesDoRitmo(r.id, tom);
        expect(ps.length, `${r.id} ${tom}`).toBeGreaterThan(0);
        for (const p of ps) {
          for (const a of p.acordes) expect(parseAcorde(a), `${r.id} ${tom} ${a}`).not.toBeNull();
          for (const v of variacoes(p, tom)) for (const a of v.acordes) expect(parseAcorde(a), a).not.toBeNull();
        }
      }
    }
  });
  it("campo harmônico e diatonia", () => {
    expect(campoHarmonico("G").map((c) => c.acorde)).toEqual(["G", "Am", "Bm", "C", "D7", "Em", "F#°"]);
    expect(acordeNoTom("D7", "G")).toBe(true);
    expect(acordeNoTom("Bb", "G")).toBe(false);
    expect(acordeNoTom("B7", "Em")).toBe(true);
    expect(nomeDoTomPorExtenso("Bb")).toBe("Si♭ maior");
  });
});

describe("sílabas", () => {
  const casos: [string, number][] = [
    ["pago", 2],
    ["querência", 4],
    ["chimarrão", 3],
    ["gaúcho", 3],
    ["saudade", 3],
    ["coração", 3],
    ["dia", 2],
    ["guitarra", 3],
    ["quero", 2],
    ["muito", 2],
    ["rainha", 3],
    ["país", 2],
    ["mãe", 1],
    ["cair", 2],
    ["fronteira", 3],
    ["água", 2],
  ];
  it.each(casos)("%s tem %i sílabas", (p, n) => {
    expect(analisarPalavra(p)?.silabas).toBe(n);
  });
  it("tonicidade", () => {
    expect(analisarPalavra("galpão")?.tonicaDoFim).toBe(1);
    expect(analisarPalavra("pago")?.tonicaDoFim).toBe(2);
    expect(analisarPalavra("lâmpada")?.tonicaDoFim).toBe(3);
    expect(analisarPalavra("amor")?.tonicaDoFim).toBe(1);
  });
  it("conta sílabas poéticas com sinalefa", () => {
    // Mi-nha que-rên-ci-a de cam-po_a-ber-(to): 10 até a tônica "ber"
    const c = contarVerso("Minha querência de campo aberto");
    expect(c.elisoes).toBe(1);
    expect(c.poeticas).toBe(10);
    // redondilha maior clássica
    expect(contarVerso("Lá no meu pago distante").poeticas).toBe(7);
  });
  it("rimas", () => {
    expect(chaveRima("querência")).toBe(chaveRima("ciência"));
    expect(chaveRima("galpão")).toBe(chaveRima("chimarrão"));
    expect(esquemaRimas(["no meu galpão", "sangue e suor", "um chimarrão", "um grande amor"])).toEqual(["A", "B", "A", "B"]);
    const s = sugerirRimas("galpão").map((x) => x.palavra);
    expect(s).toContain("chimarrão");
    expect(sugerirRimas("pago").length).toBeGreaterThan(0);
  });
});
