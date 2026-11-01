// Junta o motor de regras com o modelo: as regras dão a base e validam o que a IA propõe.
import { parseAcorde } from "../music/acordes";
import { acordeNoTom, nomeDoTomPorExtenso, progressoesDoRitmo, variacoes, type Progressao } from "../music/harmonia";
import { parseTom } from "../music/notas";
import { RITMOS, type RitmoId } from "../music/ritmos";
import { ideiasDeTema, TEMAS, type IdeiaTema, type TemaId } from "./temas";

export const SISTEMA = `Você é um parceiro de composição de música nativista do Rio Grande do Sul.
Conhece milonga, vaneira, chamamé, rancheira, chote, xote e valsa, e o vocabulário campeiro (pago, querência, fronteira, chimarrão, lida campeira).
Escreve em português do Brasil com sotaque gaúcho respeitoso, sem caricatura.
Responda SEMPRE e SOMENTE com um objeto JSON válido, no formato pedido. Cifras em notação americana (C, Dm, G7, F#m7(b5), D/F#).`;

export type ChordIA = { acorde: string; noTom: boolean };
export type ProgressaoIA = { nome: string; acordes: ChordIA[]; comentario: string };

export function regrasAcordes(ritmo: RitmoId, tom: string): Progressao[] {
  const base = progressoesDoRitmo(ritmo, tom);
  const vars = base.slice(0, 2).flatMap((p) =>
    variacoes(p, tom)
      .slice(0, 2)
      .map((v) => ({ ...v, nome: `${v.nome} (sobre "${p.nome}")` })),
  );
  return [...base, ...vars];
}

export function promptAcordes(ritmo: RitmoId, tom: string, pedido: string, regras: Progressao[]): string {
  const r = RITMOS[ritmo];
  return `Ritmo: ${r.nome} (compasso ${r.compasso}, ${r.bpm[0]}–${r.bpm[1]} BPM). Tom: ${tom} (${nomeDoTomPorExtenso(tom)}).
Batida típica: ${r.batida}
Progressões que o motor de teoria já gerou (não repita estas):
${regras.map((p) => `- ${p.nome}: ${p.acordes.join(" ")}`).join("\n")}
${pedido ? `Pedido do compositor: "${pedido}"` : ""}
Proponha 4 progressões NOVAS e idiomáticas para esse ritmo e tom, de 4 a 8 acordes cada, que soem bem no violão e na gaita.
Pode usar dominantes secundárias, empréstimos e baixos caminhando, mas explique.
Formato: {"progressoes":[{"nome":"...","acordes":["Em","Am","B7","Em"],"comentario":"por que funciona e onde usar (estrofe/refrão)"}],"dica":"uma dica curta de arranjo para o ritmo"}`;
}

/** Valida e anota a resposta do modelo: descarta acordes que não existem. */
export function validarAcordesIA(bruto: unknown, tom: string): { progressoes: ProgressaoIA[]; dica?: string } {
  const out: ProgressaoIA[] = [];
  const obj = (bruto ?? {}) as { progressoes?: unknown; dica?: unknown };
  const lista = Array.isArray(obj.progressoes) ? obj.progressoes : [];
  for (const item of lista.slice(0, 8)) {
    const p = item as { nome?: unknown; acordes?: unknown; comentario?: unknown };
    if (!Array.isArray(p.acordes) || p.acordes.length < 2 || p.acordes.length > 16) continue;
    const acordes = p.acordes.map((a) => String(a).trim());
    if (!acordes.every((a) => parseAcorde(a))) continue;
    out.push({
      nome: texto(p.nome, 80) || "Sugestão",
      comentario: texto(p.comentario, 400),
      acordes: acordes.map((a) => ({ acorde: a, noTom: acordeNoTom(a, tom) })),
    });
  }
  const dica = texto(obj.dica, 400);
  return { progressoes: out, ...(dica ? { dica } : {}) };
}

export function regrasTemas(tema: TemaId, ritmo: RitmoId, semente: number): IdeiaTema[] {
  return ideiasDeTema(tema, RITMOS[ritmo].nome, semente);
}

export function promptTemas(tema: TemaId, ritmo: RitmoId, pedido: string): string {
  const t = TEMAS[tema];
  const r = RITMOS[ritmo];
  return `Tema: ${t.nome}. Ritmo: ${r.nome} (${r.descricao})
Imagens de referência: ${t.imagens.join("; ")}.
${pedido ? `Pedido do compositor: "${pedido}"` : ""}
Crie 3 ideias de música nativista ORIGINAIS (não cite nem copie letras existentes).
Para cada: título, um mote (verso-chave de até 12 sílabas), 3 imagens poéticas concretas, 4 palavras do vocabulário campeiro e uma estrutura sugerida (estrofes, métrica, refrão).
Formato: {"ideias":[{"titulo":"...","mote":"...","imagens":["...","...","..."],"palavras":["...","...","...","..."],"estrutura":"..."}]}`;
}

export function validarTemasIA(bruto: unknown): IdeiaTema[] {
  const obj = (bruto ?? {}) as { ideias?: unknown };
  const lista = Array.isArray(obj.ideias) ? obj.ideias : [];
  return lista
    .slice(0, 5)
    .map((i) => {
      const x = i as Record<string, unknown>;
      return {
        titulo: texto(x.titulo, 100),
        mote: texto(x.mote, 200),
        imagens: arr(x.imagens, 5, 200),
        palavras: arr(x.palavras, 8, 40),
        estrutura: texto(x.estrutura, 300),
      };
    })
    .filter((i) => i.titulo && i.mote);
}

export function promptRimas(palavra: string, contexto: string): string {
  return `Palavra: "${palavra}". ${contexto ? `Verso: "${contexto}".` : ""}
Liste até 16 palavras que rimam com ela (rima consoante primeiro, depois toante), preferindo vocabulário campeiro gaúcho quando couber.
Formato: {"rimas":["...", "..."]}`;
}

export function validarRimasIA(bruto: unknown): string[] {
  const obj = (bruto ?? {}) as { rimas?: unknown };
  return arr(obj.rimas, 20, 30).filter((p) => /^[\p{L}-]+$/u.test(p));
}

export function tomValido(tom: unknown): tom is string {
  return typeof tom === "string" && parseTom(tom) !== null;
}

function texto(x: unknown, max: number): string {
  return typeof x === "string" ? x.trim().slice(0, max) : "";
}

function arr(x: unknown, n: number, max: number): string[] {
  return Array.isArray(x)
    ? x
        .slice(0, n)
        .map((v) => texto(v, max))
        .filter(Boolean)
    : [];
}
