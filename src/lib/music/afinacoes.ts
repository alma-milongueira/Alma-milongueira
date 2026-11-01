// Afinações do violão e busca automática de posições (desenhos) de acordes.
import { notasDoAcorde, parseAcorde, intervalosDoAcorde } from "./acordes";
import { mod12 } from "./notas";

export type AfinacaoId = "padrao" | "dropD" | "dadgad" | "meioTom";

export type Afinacao = {
  id: AfinacaoId;
  nome: string;
  cordas: string; // da 6ª para a 1ª
  midi: number[]; // altura real das cordas soltas, da 6ª (grave) para a 1ª
  /** Deslocamento em semitons do som em relação ao desenho (meio tom abaixo = -1). */
  deslocamento: number;
  dica: string;
};

export const AFINACOES: Record<AfinacaoId, Afinacao> = {
  padrao: {
    id: "padrao",
    nome: "Padrão",
    cordas: "E A D G B E",
    midi: [40, 45, 50, 55, 59, 64],
    deslocamento: 0,
    dica: "A de sempre, de galpão em galpão.",
  },
  dropD: {
    id: "dropD",
    nome: "Drop D",
    cordas: "D A D G B E",
    midi: [38, 45, 50, 55, 59, 64],
    deslocamento: 0,
    dica: "6ª corda em Ré: bordão grosso pra milonga em Ré.",
  },
  dadgad: {
    id: "dadgad",
    nome: "DADGAD",
    cordas: "D A D G A D",
    midi: [38, 45, 50, 55, 57, 62],
    deslocamento: 0,
    dica: "Afinação aberta, soa como bordoneio de campo.",
  },
  meioTom: {
    id: "meioTom",
    nome: "Meio tom abaixo",
    cordas: "Eb Ab Db Gb Bb Eb",
    midi: [39, 44, 49, 54, 58, 63],
    deslocamento: -1,
    dica: "Os desenhos são os de sempre, mas o som sai meio tom abaixo.",
  },
};

export const LISTA_AFINACOES = Object.values(AFINACOES);

/**
 * Quantos semitons o desenho na mão fica acima/abaixo do som real.
 * desenho = som - capo - deslocamento
 */
export function semitonsDesenho(capo: number, afinacao: AfinacaoId): number {
  return -capo - AFINACOES[afinacao].deslocamento;
}

/** Uma posição: casa por corda (6ª→1ª), -1 = abafada, 0 = solta (relativa ao capotraste). */
export type Posicao = { casas: number[]; pontuacao: number };

type Opcao = number; // casa ou -1

/**
 * Procura posições tocáveis do acorde (nome do SOM REAL) na afinação e capotraste dados.
 * Funciona para qualquer afinação, por isso serve para Drop D e DADGAD.
 */
export function buscarPosicoes(nomeAcorde: string, afinacao: AfinacaoId, capo = 0, max = 3): Posicao[] {
  const a = parseAcorde(nomeAcorde);
  if (!a) return [];
  const tuning = AFINACOES[afinacao].midi.map((m) => m + capo);
  const notas = new Set(notasDoAcorde(a));
  const { obrigatorios } = intervalosDoAcorde(a.sufixo);
  const obrig = obrigatorios.map((i) => mod12(a.raiz + i));
  const baixo = a.baixo ?? a.raiz;
  const vistos = new Set<string>();
  const resultados: Posicao[] = [];

  for (let base = 1; base <= 10; base++) {
    // Opções por corda: abafada, solta (se pertence) e casas base..base+3 que pertencem ao acorde.
    const opcoes: Opcao[][] = tuning.map((t) => {
      const ops: Opcao[] = [-1];
      if (notas.has(mod12(t))) ops.push(0);
      for (let f = base; f <= base + 3; f++) if (notas.has(mod12(t + f))) ops.push(f);
      return ops;
    });
    const atual: number[] = new Array(6).fill(-1);
    const rec = (s: number) => {
      if (s === 6) {
        const p = avaliar(atual, tuning, obrig, baixo);
        if (p !== null) {
          const chave = atual.join(",");
          if (!vistos.has(chave)) {
            vistos.add(chave);
            resultados.push({ casas: [...atual], pontuacao: p });
          }
        }
        return;
      }
      for (const o of opcoes[s]) {
        atual[s] = o;
        rec(s + 1);
      }
    };
    rec(0);
  }
  resultados.sort((x, y) => x.pontuacao - y.pontuacao);
  return resultados.slice(0, max);
}

function avaliar(casas: number[], tuning: number[], obrig: number[], baixo: number): number | null {
  // Abafadas só nas cordas graves, em sequência (sem "buraco" no meio).
  const primeira = casas.findIndex((c) => c >= 0);
  if (primeira < 0) return null;
  for (let s = primeira; s < 6; s++) if (casas[s] < 0) return null;
  const soando = 6 - primeira;
  if (soando < 4) return null;
  // Baixo certo na nota mais grave.
  if (mod12(tuning[primeira] + casas[primeira]) !== baixo) {
    // permite abafar mais uma corda se a seguinte for o baixo
    return null;
  }
  const presentes = new Set<number>();
  for (let s = primeira; s < 6; s++) presentes.add(mod12(tuning[s] + casas[s]));
  for (const n of obrig) if (!presentes.has(n)) return null;

  const presas = [] as number[];
  for (let s = primeira; s < 6; s++) if (casas[s] > 0) presas.push(casas[s]);
  let dedos = presas.length;
  let pestana = false;
  if (presas.length) {
    const min = Math.min(...presas);
    const max = Math.max(...presas);
    if (max - min > 3) return null;
    if (dedos > 4) {
      // pestana na menor casa: todas as cordas desde a primeira presa nessa casa ou acima
      const naMin = presas.filter((f) => f === min).length;
      if (naMin < 2) return null;
      const idx = casas.findIndex((c) => c === min);
      for (let s = idx; s < 6; s++) if (casas[s] >= 0 && casas[s] < min) return null;
      dedos = 1 + presas.filter((f) => f > min).length;
      pestana = true;
    }
    if (dedos > 4) return null;
  }
  const maxCasa = presas.length ? Math.max(...presas) : 0;
  const soltas = casas.filter((c) => c === 0).length;
  // Menor pontuação = melhor
  return (
    maxCasa * 2 +
    dedos * 1.5 +
    (pestana ? 3 : 0) -
    soltas * 0.8 +
    (6 - soando) * 1.2 +
    (presas.length ? Math.max(...presas) - Math.min(...presas) : 0)
  );
}
