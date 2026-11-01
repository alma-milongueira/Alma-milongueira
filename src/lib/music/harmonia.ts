// Motor de regras: graus → acordes, campo harmônico e variações.
import { formatarAcorde, parseAcorde } from "./acordes";
import { mod12, parseTom, tomPrefereBemol, type Tom } from "./notas";
import { RITMOS, type RitmoId, type ProgressaoModelo } from "./ritmos";

const ESCALA_MAIOR = [0, 2, 4, 5, 7, 9, 11];
const ROMANOS = ["VII", "VI", "IV", "V", "III", "II", "I"]; // ordem importa para o regex
const VALOR: Record<string, number> = { I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6 };

/** Converte um grau ("V7", "bIII", "ii", "V7/vi", "#i°") em cifra no tom. */
export function grauParaAcorde(grau: string, tom: Tom): string | null {
  const t = parseTom(tom);
  if (!t) return null;
  const bemol = tomPrefereBemol(tom);
  const [principal, alvo] = grau.split("/");
  let tonica = t.tonica;
  if (alvo) {
    // Dominante secundária: raiz relativa ao grau-alvo.
    const raizAlvo = raizDoGrau(alvo);
    if (raizAlvo === null) return null;
    tonica = mod12(t.tonica + raizAlvo);
  }
  const m = new RegExp(`^([b#]?)(${ROMANOS.join("|")}|${ROMANOS.map((r) => r.toLowerCase()).join("|")})(.*)$`).exec(principal);
  if (!m) return null;
  const romano = m[2];
  const maiusculo = romano === romano.toUpperCase();
  let semi = ESCALA_MAIOR[VALOR[romano.toUpperCase()]];
  if (m[1] === "b") semi -= 1;
  if (m[1] === "#") semi += 1;
  let sufixo = m[3];
  let qualidade = maiusculo ? "" : "m";
  if (sufixo.startsWith("°") || sufixo.startsWith("ø")) qualidade = "";
  if (sufixo.startsWith("ø")) sufixo = "m7(b5)" + sufixo.slice(1);
  return formatarAcorde({ raiz: mod12(tonica + semi), raizNome: "", sufixo: qualidade + sufixo }, bemol);
}

function raizDoGrau(grau: string): number | null {
  const m = /^([b#]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)/.exec(grau);
  if (!m) return null;
  let s = ESCALA_MAIOR[VALOR[m[2].toUpperCase()]];
  if (m[1] === "b") s -= 1;
  if (m[1] === "#") s += 1;
  return s;
}

export function campoHarmonico(tom: Tom): { grau: string; acorde: string }[] {
  const t = parseTom(tom);
  if (!t) return [];
  const graus = t.menor ? ["i", "ii°", "bIII", "iv", "V7", "bVI", "bVII"] : ["I", "ii", "iii", "IV", "V7", "vi", "vii°"];
  return graus.map((g) => ({ grau: g, acorde: grauParaAcorde(g, tom)! }));
}

/** Notas da escala do tom (para checar se um acorde é diatônico). */
export function notasDoTom(tom: Tom): Set<number> {
  const t = parseTom(tom);
  if (!t) return new Set();
  const intervalos = t.menor ? [0, 2, 3, 5, 7, 8, 10, 11] : ESCALA_MAIOR; // menor harmônica + natural
  return new Set(intervalos.map((i) => mod12(t.tonica + i)));
}

export type Progressao = {
  nome: string;
  graus: string[];
  acordes: string[];
  comentario: string;
  origem: "regra" | "variacao" | "ia";
};

export function progressoesDoRitmo(ritmo: RitmoId, tom: Tom): Progressao[] {
  const t = parseTom(tom);
  if (!t) return [];
  const r = RITMOS[ritmo];
  const modo = t.menor ? "menor" : "maior";
  let modelos = r.progressoes.filter((p) => p.modo === modo);
  if (!modelos.length) modelos = adaptarModo(r.progressoes, modo);
  return modelos.map((p) => ({
    nome: p.nome,
    graus: p.graus,
    acordes: p.graus.map((g) => grauParaAcorde(g, tom) ?? "?"),
    comentario: p.comentario,
    origem: "regra" as const,
  }));
}

// Se o ritmo é "maior" e o tom é menor (ou vice-versa), troca a qualidade dos graus principais.
function adaptarModo(modelos: ProgressaoModelo[], modo: "maior" | "menor"): ProgressaoModelo[] {
  const mapa: Record<string, string> =
    modo === "menor"
      ? { I: "i", IV: "iv", vi: "bVI", ii: "iv", I7: "i", "V7/vi": "bIII", VI7: "bVI", bVII: "bVII", iii: "bIII" }
      : { i: "I", iv: "IV", bIII: "vi", bVI: "IV", bVII: "V7" };
  return modelos.map((p) => ({
    ...p,
    modo,
    nome: p.nome + (modo === "menor" ? " (em menor)" : " (em maior)"),
    graus: p.graus.map((g) => mapa[g] ?? g),
  }));
}

/** Gera variações por regras de teoria a partir de uma progressão base. */
export function variacoes(base: Progressao, tom: Tom): Progressao[] {
  const t = parseTom(tom);
  if (!t) return [];
  const menor = t.menor;
  const out: Progressao[] = [];
  const tonica = menor ? "i" : "I";
  const mk = (nome: string, graus: string[], comentario: string): Progressao => ({
    nome,
    graus,
    acordes: graus.map((g) => grauParaAcorde(g, tom) ?? "?"),
    comentario,
    origem: "variacao",
  });

  // 1) ii–V antes da dominante
  const iV = base.graus.findIndex((g) => g.startsWith("V7") && !g.includes("/"));
  if (iV > 0) {
    const g = [...base.graus];
    g.splice(iV, 0, menor ? "iiø" : "ii");
    out.push(mk("Preparação ii–V", g, "Acrescenta o segundo grau antes da dominante: cadência mais redonda."));
  }

  // 2) Dominante secundária antes de um acorde que não é a tônica
  const iAlvo = base.graus.findIndex((g, i) => i > 0 && !/^[iI]$/.test(g) && !g.startsWith("V") && !g.includes("/"));
  if (iAlvo > 0) {
    const g = [...base.graus];
    const alvo = g[iAlvo].replace(/[^b#ivIV]+$/, "");
    g.splice(iAlvo, 0, `V7/${alvo}`);
    out.push(mk("Dominante secundária", g, `Um V7 emprestado empurrando para o ${alvo}.`));
  }

  // 3) Relativo no lugar da tônica do meio
  const iTon = base.graus.findIndex((g, i) => i > 0 && g === tonica);
  if (iTon > 0) {
    const g = [...base.graus];
    g[iTon] = menor ? "bIII" : "vi";
    out.push(mk("Troca pelo relativo", g, menor ? "O relativo maior clareia o verso." : "O relativo menor dá um tom de saudade."));
  }

  // 4) Empréstimo modal (iv em tom maior) ou bVI em menor
  if (!menor && base.graus.includes("IV")) {
    const g = base.graus.flatMap((x) => (x === "IV" ? ["IV", "iv"] : [x]));
    out.push(mk("Quarta menor emprestada", g, "IV seguido de iv: um suspiro antes de voltar."));
  }
  if (menor && !base.graus.includes("bVI")) {
    const g = [...base.graus];
    const iDom = g.findIndex((x) => x.startsWith("V7"));
    if (iDom > 0) {
      g.splice(iDom, 0, "bVI");
      out.push(mk("Sexto grau abaixado", g, "O bVI antes da dominante dá aquele drama de milonga."));
    }
  }

  // 5) Diminuto de passagem entre I e ii (tom maior)
  if (!menor) {
    const iI = base.graus.indexOf("I");
    if (iI >= 0 && iI < base.graus.length - 1) {
      const g = [...base.graus];
      g.splice(iI + 1, 0, "#i°");
      if (g[iI + 2] !== "ii") g.splice(iI + 2, 0, "ii");
      out.push(mk("Diminuto de passagem", g, "Baixo subindo cromático: I → #I° → ii."));
    }
  }

  // 6) Bordão: tônica com baixo na quinta antes da dominante (cadencial)
  return out.filter((p) => p.acordes.every((a) => a !== "?"));
}

/** Diz se o acorde é diatônico ao tom (todas as notas da tríade estão na escala). */
export function acordeNoTom(acorde: string, tom: Tom): boolean {
  const a = parseAcorde(acorde);
  if (!a) return false;
  const escala = notasDoTom(tom);
  const terca = /^m(?!aj)|°|dim|ø/.test(a.sufixo) ? 3 : /sus/.test(a.sufixo) ? 5 : 4;
  const quinta = /°|dim|ø|b5/.test(a.sufixo) ? 6 : /aug|\+/.test(a.sufixo) ? 8 : 7;
  return [0, terca, quinta].every((i) => escala.has(mod12(a.raiz + i)));
}

const NOMES_SUST = ["Dó", "Dó♯", "Ré", "Ré♯", "Mi", "Fá", "Fá♯", "Sol", "Sol♯", "Lá", "Lá♯", "Si"];
const NOMES_BEM = ["Dó", "Ré♭", "Ré", "Mi♭", "Mi", "Fá", "Sol♭", "Sol", "Lá♭", "Lá", "Si♭", "Si"];

export function nomeDoTomPorExtenso(tom: Tom): string {
  const t = parseTom(tom);
  if (!t) return tom;
  const nome = (tomPrefereBemol(tom) ? NOMES_BEM : NOMES_SUST)[t.tonica];
  return `${nome} ${t.menor ? "menor" : "maior"}`;
}
