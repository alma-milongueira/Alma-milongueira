// Ritmos do sul e suas progressões típicas (em graus).
// Convenção dos graus: sempre medidos na escala MAIOR da tônica.
// Maiúsculo = acorde maior, minúsculo = menor. Ex.: em Em, "i bIII iv V7".

export type RitmoId = "milonga" | "vaneira" | "chamame" | "rancheira" | "chote" | "xote" | "valsa";

export type ProgressaoModelo = {
  nome: string;
  graus: string[];
  modo: "maior" | "menor";
  comentario: string;
};

export type Ritmo = {
  id: RitmoId;
  nome: string;
  compasso: string;
  bpm: [number, number];
  bpmPadrao: number;
  modo: "maior" | "menor" | "ambos";
  tomSugerido: string;
  descricao: string;
  batida: string;
  progressoes: ProgressaoModelo[];
};

export const RITMOS: Record<RitmoId, Ritmo> = {
  milonga: {
    id: "milonga",
    nome: "Milonga",
    compasso: "2/4",
    bpm: [60, 96],
    bpmPadrao: 72,
    modo: "menor",
    tomSugerido: "Em",
    descricao: "Cadência pampeana, de pensamento largo. Casa com versos de saudade, pago e campo aberto.",
    batida: "Bordão no polegar marcando 3+3+2 (como habanera), dedos respondendo nas primas.",
    progressoes: [
      { nome: "Milonga de bordão", graus: ["i", "V7", "V7", "i"], modo: "menor", comentario: "O básico que segura qualquer payada." },
      { nome: "Milonga pampeana", graus: ["i", "iv", "V7", "i"], modo: "menor", comentario: "A subida pra quarta dá o peso da lonjura." },
      {
        nome: "Milonga com relativo",
        graus: ["i", "bIII", "iv", "V7"],
        modo: "menor",
        comentario: "Passa pelo relativo maior e volta pro pago.",
      },
      { nome: "Descida campeira", graus: ["i", "bVII", "bVI", "V7"], modo: "menor", comentario: "Baixo descendo, bem de fim de tarde." },
    ],
  },
  vaneira: {
    id: "vaneira",
    nome: "Vaneira",
    compasso: "2/4",
    bpm: [110, 160],
    bpmPadrao: 132,
    modo: "maior",
    tomSugerido: "G",
    descricao: "Ritmo de baile, ligeiro, gaita na frente. Letra alegre, de fandango e de china bonita.",
    batida: "Baixo no tempo e acorde no contratempo, bem picado (vanerão é a versão mais acelerada).",
    progressoes: [
      { nome: "Vaneira de baile", graus: ["I", "I", "V7", "I"], modo: "maior", comentario: "Tônica e dominante, o motor do fandango." },
      { nome: "Vaneira com quarta", graus: ["I", "IV", "V7", "I"], modo: "maior", comentario: "Cadência completa, bom pro refrão." },
      { nome: "Volta da gaita", graus: ["I", "vi", "ii", "V7"], modo: "maior", comentario: "Ciclo pra emendar as partes." },
      {
        nome: "Vaneira com dominante secundária",
        graus: ["I", "I7", "IV", "V7"],
        modo: "maior",
        comentario: "O I7 empurra pra quarta com mais força.",
      },
    ],
  },
  chamame: {
    id: "chamame",
    nome: "Chamamé",
    compasso: "6/8 (com hemíola em 3/4)",
    bpm: [80, 120],
    bpmPadrao: 96,
    modo: "ambos",
    tomSugerido: "D",
    descricao: "Herança da fronteira com Corrientes. Balanço de 6/8 e 3/4, sapucay no meio da música.",
    batida: "Rasgueio em 6/8 alternando acentos de 3+3 e 2+2+2 (hemíola).",
    progressoes: [
      { nome: "Chamamé maior", graus: ["I", "V7", "V7", "I"], modo: "maior", comentario: "Simples e dançante." },
      { nome: "Chamamé com relativo", graus: ["I", "V7/vi", "vi", "V7"], modo: "maior", comentario: "Passeio típico ao relativo menor." },
      { nome: "Chamamé menor", graus: ["i", "iv", "V7", "i"], modo: "menor", comentario: "Mais sentido, pra letra de saudade." },
      { nome: "Chamamé da fronteira", graus: ["I", "IV", "V7", "I"], modo: "maior", comentario: "A volta completa." },
    ],
  },
  rancheira: {
    id: "rancheira",
    nome: "Rancheira",
    compasso: "3/4",
    bpm: [120, 170],
    bpmPadrao: 140,
    modo: "maior",
    tomSugerido: "A",
    descricao: "Prima da mazurca, em três tempos. Faceira, de salão e de rodeio.",
    batida: "Baixo no 1, acorde no 2 e no 3 (pum-tchá-tchá), com acento no primeiro tempo.",
    progressoes: [
      { nome: "Rancheira simples", graus: ["I", "V7", "V7", "I"], modo: "maior", comentario: "Dois acordes e o salão gira." },
      { nome: "Rancheira com quarta", graus: ["I", "IV", "I", "V7"], modo: "maior", comentario: "Bom para a segunda parte." },
      { nome: "Rancheira com relativo", graus: ["I", "vi", "IV", "V7"], modo: "maior", comentario: "Dá um respiro mais sentimental." },
    ],
  },
  chote: {
    id: "chote",
    nome: "Chote",
    compasso: "2/4",
    bpm: [90, 125],
    bpmPadrao: 104,
    modo: "maior",
    tomSugerido: "C",
    descricao: "Schottisch abrasileirado, de passo marcado e gaita ponteando. Faceiro e de vanerão lento.",
    batida: "Baixo no 1 e no 2, acorde abafado nos contratempos, bem marcado.",
    progressoes: [
      { nome: "Chote de galpão", graus: ["I", "IV", "V7", "I"], modo: "maior", comentario: "Cadência que todo gaiteiro conhece." },
      { nome: "Chote com sétima", graus: ["I", "I7", "IV", "V7"], modo: "maior", comentario: "Sétima na tônica abre caminho pra quarta." },
      { nome: "Chote carreteiro", graus: ["I", "V7", "I", "V7"], modo: "maior", comentario: "Bate e volta, pra versos em sequência." },
    ],
  },
  xote: {
    id: "xote",
    nome: "Xote",
    compasso: "2/4",
    bpm: [80, 110],
    bpmPadrao: 92,
    modo: "maior",
    tomSugerido: "D",
    descricao: "Balanço arrastado, de dança agarradinha. Aceita bem o sabor mixolídio (sétima abaixada).",
    batida: "Baixo no 1, acorde arrastado no 'e' do 2 (tum... ta-tchá).",
    progressoes: [
      { nome: "Xote de salão", graus: ["I", "IV", "I", "V7"], modo: "maior", comentario: "A base mais usada." },
      { nome: "Xote mixolídio", graus: ["I", "bVII", "IV", "I"], modo: "maior", comentario: "Sétimo grau abaixado, sabor de sanfona." },
      { nome: "Xote com ii-V", graus: ["I", "vi", "ii", "V7"], modo: "maior", comentario: "Volta com cara de baile antigo." },
    ],
  },
  valsa: {
    id: "valsa",
    nome: "Valsa",
    compasso: "3/4",
    bpm: [90, 180],
    bpmPadrao: 120,
    modo: "ambos",
    tomSugerido: "G",
    descricao: "Valsa campeira, romântica, pra letra de amor e de lembrança da prenda.",
    batida: "Baixo no 1, acorde no 2 e 3, com bordões caminhando entre os acordes.",
    progressoes: [
      { nome: "Valsa simples", graus: ["I", "V7", "V7", "I"], modo: "maior", comentario: "Três tempos e dois acordes." },
      { nome: "Valsa com ciclo", graus: ["I", "VI7", "ii", "V7"], modo: "maior", comentario: "Dominante secundária, bem de seresta." },
      { nome: "Valsa completa", graus: ["I", "IV", "V7", "I"], modo: "maior", comentario: "Cadência perfeita." },
      { nome: "Valsa menor", graus: ["i", "iv", "V7", "i"], modo: "menor", comentario: "Pra lembrança que dói." },
    ],
  },
};

export const LISTA_RITMOS = Object.values(RITMOS);

export function ehRitmo(x: unknown): x is RitmoId {
  return typeof x === "string" && x in RITMOS;
}
