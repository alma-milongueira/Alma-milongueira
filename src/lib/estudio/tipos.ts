export type Instrumento = "voz" | "violao" | "gaita" | "bombo" | "baixo" | "percussao" | "outro";

export const INSTRUMENTOS: Record<Instrumento, { nome: string; cor: string; corOnda: string }> = {
  voz: { nome: "Voz", cor: "#b8232b", corOnda: "#f6c9c4" },
  violao: { nome: "Violão", cor: "#8b5a2b", corOnda: "#f0d7b0" },
  gaita: { nome: "Gaita", cor: "#1f7a3e", corOnda: "#bfe6c9" },
  bombo: { nome: "Bombo", cor: "#6e4b33", corOnda: "#e6cdb6" },
  baixo: { nome: "Baixo", cor: "#3b4a8a", corOnda: "#c7cff2" },
  percussao: { nome: "Percussão", cor: "#c27c0e", corOnda: "#fbe2a6" },
  outro: { nome: "Outro", cor: "#5c5c5c", corOnda: "#dddddd" },
};

export type Faixa = {
  id: string;
  projetoId: string;
  nome: string;
  instrumento: Instrumento;
  ordem: number;
  offsetMs: number;
  latenciaMs: number;
  volume: number;
  mudo: boolean;
  solo: boolean;
  eqGrave: number;
  eqMedio: number;
  eqAgudo: number;
  duracaoMs: number | null;
  taxaAmostragem: number | null;
  audioPath: string | null;
};

export type AlteracaoFaixa = Partial<Omit<Faixa, "id" | "projetoId">>;

export function faixaNova(projetoId: string, id: string, ordem: number, instrumento: Instrumento = "voz"): Faixa {
  return {
    id,
    projetoId,
    nome: INSTRUMENTOS[instrumento].nome,
    instrumento,
    ordem,
    offsetMs: 0,
    latenciaMs: 0,
    volume: 1,
    mudo: false,
    solo: false,
    eqGrave: 0,
    eqMedio: 0,
    eqAgudo: 0,
    duracaoMs: null,
    taxaAmostragem: null,
    audioPath: null,
  };
}

/** Ordem para inserir uma faixa acima (antes) ou abaixo (depois) de `alvo`. */
export function ordemParaInserir(faixas: Faixa[], alvoId: string | null, lado: "acima" | "abaixo"): number {
  const ord = [...faixas].sort((a, b) => a.ordem - b.ordem);
  if (!ord.length) return 0;
  if (alvoId === null) return lado === "acima" ? ord[0].ordem - 1 : ord[ord.length - 1].ordem + 1;
  const i = ord.findIndex((f) => f.id === alvoId);
  if (i < 0) return ord[ord.length - 1].ordem + 1;
  if (lado === "acima") return i === 0 ? ord[0].ordem - 1 : (ord[i - 1].ordem + ord[i].ordem) / 2;
  return i === ord.length - 1 ? ord[i].ordem + 1 : (ord[i].ordem + ord[i + 1].ordem) / 2;
}

/** Faixas que soam considerando mudo e solo. */
export function audiveis<T extends Pick<Faixa, "mudo" | "solo">>(faixas: T[]): T[] {
  const temSolo = faixas.some((f) => f.solo);
  return faixas.filter((f) => !f.mudo && (!temSolo || f.solo));
}

/** Onde a faixa começa na linha do tempo, em segundos (offset manual menos a latência compensada). */
export function inicioNaLinha(f: Pick<Faixa, "offsetMs" | "latenciaMs">): number {
  return (f.offsetMs - f.latenciaMs) / 1000;
}
