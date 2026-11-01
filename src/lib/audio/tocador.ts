// Tocador simples de progressões com Web Audio (violão sintetizado), com levada por ritmo.
import { notasDoAcorde, parseAcorde } from "../music/acordes";
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

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

function nota(ctx: AudioContext, destino: AudioNode, midi: number, inicio: number, dur: number, vol: number) {
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const filtro = ctx.createBiquadFilter();
  const ganho = ctx.createGain();
  osc.type = "triangle";
  osc2.type = "sawtooth";
  osc.frequency.value = hz(midi);
  osc2.frequency.value = hz(midi) * 1.002;
  filtro.type = "lowpass";
  filtro.frequency.setValueAtTime(3200, inicio);
  filtro.frequency.exponentialRampToValueAtTime(700, inicio + dur);
  const g2 = ctx.createGain();
  g2.gain.value = 0.18;
  ganho.gain.setValueAtTime(0.0001, inicio);
  ganho.gain.exponentialRampToValueAtTime(vol, inicio + 0.008);
  ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);
  osc.connect(filtro);
  osc2.connect(g2).connect(filtro);
  filtro.connect(ganho).connect(destino);
  osc.start(inicio);
  osc2.start(inicio);
  osc.stop(inicio + dur + 0.05);
  osc2.stop(inicio + dur + 0.05);
}

export type Controle = { parar: () => void };

export function tocarProgressao(acordes: string[], bpm: number, ritmo: RitmoId, aoMudarAcorde?: (i: number | null) => void): Controle {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const mestre = ctx.createGain();
  mestre.gain.value = 0.5;
  mestre.connect(ctx.destination);
  const levada = LEVADAS[ritmo];
  const seg = 60 / bpm;
  const compasso = levada.tempos * seg;
  const t0 = ctx.currentTime + 0.12;
  const timers: ReturnType<typeof setTimeout>[] = [];

  acordes.forEach((nome, i) => {
    const a = parseAcorde(nome);
    if (!a) return;
    const raizBaixo = 40 + ((a.raiz - 4 + 12) % 12); // entre E2 e D#3
    const baixo = a.baixo !== undefined ? 40 + ((a.baixo - 4 + 12) % 12) : raizBaixo;
    const quinta = raizBaixo + 7 > 52 ? raizBaixo - 5 : raizBaixo + 7;
    const classes = notasDoAcorde(a);
    const voz = classes.map((pc) => 55 + ((pc - 7 + 12) % 12)).sort((x, y) => x - y); // G3..F#4
    const inicio = t0 + i * compasso;
    for (const ev of levada.eventos) {
      const t = inicio + ev.t * seg;
      if (ev.tipo === "baixo") nota(ctx, mestre, baixo, t, seg * 1.2, 0.5);
      else if (ev.tipo === "quinta") nota(ctx, mestre, quinta, t, seg * 0.9, 0.38);
      else voz.forEach((m, k) => nota(ctx, mestre, m, t + k * 0.012, seg * 0.7, 0.16));
    }
    timers.push(setTimeout(() => aoMudarAcorde?.(i), (inicio - ctx.currentTime) * 1000));
  });
  const total = (t0 - ctx.currentTime + acordes.length * compasso) * 1000;
  timers.push(
    setTimeout(() => {
      aoMudarAcorde?.(null);
      ctx.close().catch(() => {});
    }, total + 300),
  );

  return {
    parar() {
      timers.forEach(clearTimeout);
      aoMudarAcorde?.(null);
      ctx.close().catch(() => {});
    },
  };
}
