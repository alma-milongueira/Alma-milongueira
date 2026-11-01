// Notas, tonalidades e transposição.

export const SUSTENIDOS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
export const BEMOIS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;

const BASE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Índice cromático (0–11) de um nome de nota como "F#", "Bb", "E". */
export function indiceNota(nome: string): number | null {
  const m = /^([A-Ga-g])([#b]*)$/.exec(nome.trim());
  if (!m) return null;
  let i = BASE[m[1].toUpperCase()];
  for (const ch of m[2]) i += ch === "#" ? 1 : -1;
  return ((i % 12) + 12) % 12;
}

export function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

export function nomeNota(indice: number, preferirBemol: boolean): string {
  return (preferirBemol ? BEMOIS : SUSTENIDOS)[mod12(indice)];
}

/** Tonalidade no formato "G", "Em", "Bb", "F#m". */
export type Tom = string;

export function parseTom(tom: Tom): { tonica: number; menor: boolean } | null {
  const m = /^([A-G][#b]?)(m?)$/.exec(tom.trim());
  if (!m) return null;
  const tonica = indiceNota(m[1]);
  if (tonica === null) return null;
  return { tonica, menor: m[2] === "m" };
}

// Tons que se escrevem com bemóis (armadura com bemóis).
const MAIORES_BEMOL = new Set([5, 10, 3, 8, 1]); // F Bb Eb Ab Db
const MENORES_BEMOL = new Set([2, 7, 0, 5, 10, 3]); // Dm Gm Cm Fm Bbm Ebm

export function tomPrefereBemol(tom: Tom): boolean {
  const p = parseTom(tom);
  if (!p) return false;
  return p.menor ? MENORES_BEMOL.has(p.tonica) : MAIORES_BEMOL.has(p.tonica);
}

/** Nome "canônico" de um tom a partir do índice (escolhe a grafia mais comum). */
export function nomeTom(tonica: number, menor: boolean): Tom {
  const t = mod12(tonica);
  // Gb vira F# (mais comum no violão); D#m vira Ebm.
  const bemol = menor ? MENORES_BEMOL.has(t) : MAIORES_BEMOL.has(t);
  return nomeNota(t, bemol) + (menor ? "m" : "");
}

export function transporTom(tom: Tom, semitons: number): Tom {
  const p = parseTom(tom);
  if (!p) return tom;
  return nomeTom(p.tonica + semitons, p.menor);
}

export const TONS_MAIORES: Tom[] = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
export const TONS_MENORES: Tom[] = ["Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"];
export const TODOS_TONS: Tom[] = [...TONS_MAIORES, ...TONS_MENORES];
