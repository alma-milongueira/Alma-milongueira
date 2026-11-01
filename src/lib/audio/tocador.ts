// Tocador de progressões: levada de cada ritmo em violão, teclado, baixo, gaita ou conjunto.
import { notasDoAcorde, parseAcorde } from "../music/acordes";
import { AFINACOES, buscarPosicoes } from "../music/afinacoes";
import { desbloquearAudio } from "./contexto";
import { criarAmbiencia, tocarCorda, tocarGaita, tocarPiano, type InstrumentoId } from "./instrumentos";
import type { RitmoId } from "../music/ritmos";

type Evento = { t: number; tipo: "baixo" | "quinta" | "acorde" };

// Levadas em tempos (semínimas) por compasso.
const LEVADAS: Record<RitmoId, { tempos: number; eventos: Evento[] }> = {
  milonga: {
    tempos: 2,
    eventos: [
      { t: 0, tipo: "baixo" },
      { t: 0.75, tipo: "acorde" },
      { t: 1, tipo: "acorde" },
      { t: 1.5, tipo: "quinta" },
    ],
  },
  vaneira: {
    tempos: 2,
    eventos: [
      { t: 0, tipo: "baixo" },
      { t: 0.5, tipo: "acorde" },
      { t: 1, tipo: "quinta" },
      { t: 1.5, tipo: "acorde" },
    ],
  },
  chote: {
    tempos: 2,
    eventos: [
      { t: 0, tipo: "baixo" },
      { t: 0.5, tipo: "acorde" },
      { t: 1, tipo: "quinta" },
      { t: 1.5, tipo: "acorde" },
    ],
  },
  xote: {
    tempos: 2,
    eventos: [
      { t: 0, tipo: "baixo" },
      { t: 0.75, tipo: "acorde" },
      { t: 1.5, tipo: "acorde" },
    ],
  },
  chamame: {
    tempos: 3,
    eventos: [
      { t: 0, tipo: "baixo" },
      { t: 1, tipo: "acorde" },
      { t: 1.5, tipo: "acorde" },
      { t: 2, tipo: "quinta" },
    ],
  },
  rancheira: {
    tempos: 3,
    eventos: [
      { t: 0, tipo: "baixo" },
      { t: 1, tipo: "acorde" },
      { t: 2, tipo: "acorde" },
    ],
  },
  valsa: {
    tempos: 3,
    eventos: [
      { t: 0, tipo: "baixo" },
      { t: 1, tipo: "acorde" },
      { t: 2, tipo: "acorde" },
    ],
  },
};

export type Controle = { parar: () => void };

type Vozes = { baixo: number; quinta: number; acorde: number[] };

/** Notas de um acorde para cada instrumento (região de cada um). */
function vozes(nome: string, inst: Exclude<InstrumentoId, "conjunto">): Vozes | null {
  const a = parseAcorde(nome);
  if (!a) return null;
  const baixoPc = a.baixo ?? a.raiz;
  const classes = notasDoAcorde(a);
  if (inst === "violao") {
    // posição real de violão: baixo alternado nas cordas graves e rasgueio nas agudas
    const pos = buscarPosicoes(nome, "padrao", 0, 1)[0];
    if (pos) {
      const notas = pos.casas.map((c, i) => (c < 0 ? null : AFINACOES.padrao.midi[i] + c)).filter((x): x is number => x !== null);
      return { baixo: notas[0], quinta: notas[1] ?? notas[0], acorde: notas.slice(1) };
    }
  }
  const regiao = (pc: number, de: number) => de + ((((pc - de) % 12) + 12) % 12);
  if (inst === "baixo") {
    const b = regiao(baixoPc, 33); // Lá1 a Sol#2
    return { baixo: b, quinta: b + 7 <= 45 ? b + 7 : b - 5, acorde: [] };
  }
  if (inst === "gaita") {
    const b = regiao(baixoPc, 40);
    return { baixo: b, quinta: b + 7 <= 52 ? b + 7 : b - 5, acorde: classes.map((pc) => regiao(pc, 60)).sort((x, y) => x - y) };
  }
  // teclado (e violão sem posição)
  const b = regiao(baixoPc, 36);
  return { baixo: b, quinta: b + 7, acorde: classes.map((pc) => regiao(pc, 55)).sort((x, y) => x - y) };
}

/**
 * Toca a progressão com a levada do ritmo no instrumento escolhido.
 * Chamar a partir do toque do usuário (desbloqueia o som no iPhone).
 */
export function tocarProgressao(
  acordes: string[],
  bpm: number,
  ritmo: RitmoId,
  instrumento: InstrumentoId,
  aoMudarAcorde?: (i: number | null) => void,
): Controle {
  const ctx = desbloquearAudio();
  // barramento desta execução: compressor + ambiência de galpão
  const bus = ctx.createGain();
  bus.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  const amb = criarAmbiencia(ctx);
  const envio = ctx.createGain();
  envio.gain.value = 0.18;
  bus.connect(comp).connect(ctx.destination);
  bus.connect(envio).connect(amb).connect(comp);

  const levada = LEVADAS[ritmo];
  const seg = 60 / bpm;
  const compasso = levada.tempos * seg;
  const t0 = ctx.currentTime + 0.15;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const conjunto = instrumento === "conjunto";

  acordes.forEach((nome, i) => {
    const inicio = t0 + i * compasso;
    const vViolao = vozes(nome, "violao");
    const vTeclado = vozes(nome, "teclado");
    const vBaixo = vozes(nome, "baixo");
    const vGaita = vozes(nome, "gaita");
    if (!vViolao || !vTeclado || !vBaixo || !vGaita) return;

    // Conjunto: gaita sustentando o acorde no compasso inteiro, por baixo de tudo
    if (conjunto) vGaita.acorde.forEach((m) => tocarGaita(ctx, bus, m, inicio, 0.1, compasso * 0.96));

    for (const ev of levada.eventos) {
      const t = inicio + ev.t * seg;
      const ehBaixo = ev.tipo !== "acorde";
      if (instrumento === "violao" || conjunto) {
        if (ehBaixo && !conjunto) tocarCorda(ctx, bus, ev.tipo === "baixo" ? vViolao.baixo : vViolao.quinta, t, 0.55, "nylon");
        if (!ehBaixo) vViolao.acorde.forEach((m, k) => tocarCorda(ctx, bus, m, t + k * 0.014, 0.28, "nylon", seg * 0.9));
      }
      if (instrumento === "baixo" || conjunto) {
        if (ehBaixo)
          tocarCorda(ctx, bus, ev.tipo === "baixo" ? vBaixo.baixo : vBaixo.quinta, t, conjunto ? 0.6 : 0.85, "baixo", seg * 0.95);
      }
      if (instrumento === "teclado") {
        if (ehBaixo) tocarPiano(ctx, bus, ev.tipo === "baixo" ? vTeclado.baixo : vTeclado.quinta, t, 0.5, seg * 1.1);
        else vTeclado.acorde.forEach((m, k) => tocarPiano(ctx, bus, m, t + k * 0.004, 0.24, seg * 0.6));
      }
      if (instrumento === "gaita") {
        // mão esquerda da gaita: botão de baixo (com oitava) e botão de acorde, curtinhos
        if (ehBaixo) {
          const b = ev.tipo === "baixo" ? vGaita.baixo : vGaita.quinta;
          tocarGaita(ctx, bus, b, t, 0.3, seg * 0.6);
          tocarGaita(ctx, bus, b + 12, t, 0.16, seg * 0.6);
        } else vGaita.acorde.forEach((m) => tocarGaita(ctx, bus, m, t, 0.15, seg * 0.38));
      }
    }
    timers.push(setTimeout(() => aoMudarAcorde?.(i), Math.max(0, (inicio - ctx.currentTime) * 1000)));
  });

  const desligar = () => {
    try {
      bus.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
      setTimeout(() => {
        bus.disconnect();
        envio.disconnect();
        amb.disconnect();
        comp.disconnect();
      }, 300);
    } catch {}
  };
  const total = (t0 - ctx.currentTime + acordes.length * compasso) * 1000;
  timers.push(
    setTimeout(() => {
      aoMudarAcorde?.(null);
      setTimeout(desligar, 2500); // deixa a última nota soar
    }, total + 200),
  );

  return {
    parar() {
      timers.forEach(clearTimeout);
      aoMudarAcorde?.(null);
      desligar();
    },
  };
}
