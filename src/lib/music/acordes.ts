// Leitura de cifras, notas do acorde e transposição.
import { indiceNota, mod12, nomeNota } from "./notas";

export type Acorde = {
  raiz: number;
  raizNome: string;
  sufixo: string;
  baixo?: number;
  baixoNome?: string;
};

const RE_ACORDE = /^([A-G][#b]?)([^/\s]*)(?:\/([A-G][#b]?))?$/;

export function parseAcorde(txt: string): Acorde | null {
  const m = RE_ACORDE.exec(txt.trim());
  if (!m) return null;
  const raiz = indiceNota(m[1]);
  if (raiz === null) return null;
  const sufixo = m[2] ?? "";
  if (!sufixoValido(sufixo)) return null;
  const a: Acorde = { raiz, raizNome: m[1], sufixo };
  if (m[3]) {
    const b = indiceNota(m[3]);
    if (b === null) return null;
    a.baixo = b;
    a.baixoNome = m[3];
  }
  return a;
}

// Aceita sufixos usuais em cifra brasileira: m, 7, m7, 7M, maj7, °, ø, dim, aug, +, sus2, sus4, 6, 9, add9, 7(9), 4, 5...
const RE_SUFIXO =
  /^(m(?!aj))?(maj7|7M|7\+|M7)?(°7|°|ø|dim7?|aug|\+)?(sus[24]?|4|2)?(5)?(6)?(7)?(9|11|13)?(add[29]|add11)?(\((?:[#b+-]?\d{1,2}[,\s]*)+\))?(M7|7M)?$/;

export function sufixoValido(s: string): boolean {
  return RE_SUFIXO.test(s);
}

/** Intervalos (semitons a partir da raiz) obrigatórios e opcionais. */
export function intervalosDoAcorde(sufixo: string): { obrigatorios: number[]; opcionais: number[] } {
  const s = sufixo;
  const menor = /^m(?!aj)/.test(s);
  const dim = /°|dim/.test(s);
  const meioDim = /ø|m7\(b5\)|m7b5/.test(s);
  const aum = /aug|\+(?!\d)|^\+/.test(s) && !/7\+/.test(s);
  const sus4 = /sus4|sus(?!2)|(^|[^d1])4(?!\d)/.test(s) && !/11/.test(s);
  const sus2 = /sus2|^2$/.test(s);
  const power = /^5$/.test(s);
  const setimaMaior = /7M|maj7|7\+|M7/.test(s);
  const setima = !setimaMaior && /7/.test(s) && !/°7|dim7/.test(s);
  const dim7 = /°7|dim7/.test(s);
  const sexta = /6/.test(s);
  const nona = /9/.test(s);

  const obrig = new Set<number>([0]);
  const opc = new Set<number>();

  if (power) {
    obrig.add(7);
    return { obrigatorios: [...obrig], opcionais: [] };
  }

  let terca = menor || dim || meioDim ? 3 : 4;
  if (sus4) terca = 5;
  if (sus2) terca = 2;
  obrig.add(terca);

  if (dim || meioDim) obrig.add(6);
  else if (aum) obrig.add(8);
  else opc.add(7);

  if (setimaMaior) obrig.add(11);
  if (setima || meioDim) obrig.add(10);
  if (dim7) obrig.add(9);
  if (sexta) obrig.add(9);
  if (nona) {
    // Em cifra brasileira "C9" costuma ser add9; a nona entra como cor.
    obrig.add(2);
    if (obrig.size > 4) {
      obrig.delete(2);
      opc.add(2);
    }
  }
  if (/b9/.test(s)) opc.add(1);
  if (/#11|11/.test(s)) opc.add(5);
  if (/13/.test(s)) opc.add(9);
  return { obrigatorios: [...obrig], opcionais: [...opc] };
}

export function notasDoAcorde(a: Acorde): number[] {
  const { obrigatorios, opcionais } = intervalosDoAcorde(a.sufixo);
  return [...obrigatorios, ...opcionais].map((i) => mod12(a.raiz + i));
}

export function formatarAcorde(a: Acorde, preferirBemol: boolean): string {
  const raiz = nomeNota(a.raiz, preferirBemol);
  const baixo = a.baixo !== undefined ? "/" + nomeNota(a.baixo, preferirBemol) : "";
  return raiz + a.sufixo + baixo;
}

export function transporAcorde(txt: string, semitons: number, preferirBemol: boolean): string {
  const a = parseAcorde(txt);
  if (!a) return txt;
  return formatarAcorde({ ...a, raiz: a.raiz + semitons, baixo: a.baixo === undefined ? undefined : a.baixo + semitons }, preferirBemol);
}

// ---------- Cifra no formato ChordPro: "[G]Lá no meu [D]pago" ----------

export type Trecho = { acorde?: string; texto: string };

export function parseLinhaCifra(linha: string): Trecho[] {
  const trechos: Trecho[] = [];
  const re = /\[([^\]]*)\]/g;
  let ultimo = 0;
  let acordeAtual: string | undefined;
  let m: RegExpExecArray | null;
  while ((m = re.exec(linha))) {
    const texto = linha.slice(ultimo, m.index);
    if (texto || acordeAtual !== undefined) trechos.push({ acorde: acordeAtual, texto });
    acordeAtual = m[1].trim();
    ultimo = m.index + m[0].length;
  }
  const resto = linha.slice(ultimo);
  if (resto || acordeAtual !== undefined) trechos.push({ acorde: acordeAtual, texto: resto });
  return trechos;
}

export function transporCifra(cifra: string, semitons: number, preferirBemol: boolean): string {
  if (semitons === 0) return cifra;
  return cifra.replace(/\[([^\]]*)\]/g, (_, c: string) => `[${transporAcorde(c, semitons, preferirBemol)}]`);
}

/** Lista de acordes distintos usados na cifra, na ordem em que aparecem. */
export function acordesDaCifra(cifra: string): string[] {
  const vistos = new Set<string>();
  for (const m of cifra.matchAll(/\[([^\]]*)\]/g)) {
    const c = m[1].trim();
    if (parseAcorde(c)) vistos.add(c);
  }
  return [...vistos];
}
