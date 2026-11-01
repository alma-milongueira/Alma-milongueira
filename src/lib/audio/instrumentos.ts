// Instrumentos sintetizados dentro do app (sem baixar amostras, funciona offline):
// - Violão e baixo: modelagem física de corda dedilhada (Karplus-Strong)
// - Teclado: piano por síntese aditiva (parciais com inarmonicidade e decaimento)
// - Gaita: palhetas de acordeom (duas palhetas levemente desafinadas = "musette")

export type InstrumentoId = "violao" | "teclado" | "baixo" | "gaita" | "conjunto";

export const NOMES_INSTRUMENTO: Record<InstrumentoId, string> = {
  violao: "Violão",
  teclado: "Teclado",
  baixo: "Baixo",
  gaita: "Gaita",
  conjunto: "Conjunto",
};

export const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

// ---------------- Corda dedilhada (Karplus-Strong) ----------------

const cacheCordas = new Map<string, AudioBuffer>();

/**
 * Gera (e guarda) o som de uma corda: ruído filtrado circulando numa linha de atraso
 * com média de duas amostras — soa como corda de verdade, com o brilho caindo no tempo.
 */
export function bufferCorda(ctx: BaseAudioContext, midi: number, tipo: "nylon" | "baixo"): AudioBuffer {
  const chave = `${tipo}:${midi}:${ctx.sampleRate}`;
  const pronto = cacheCordas.get(chave);
  if (pronto) return pronto;
  const taxa = ctx.sampleRate;
  const dur = tipo === "baixo" ? 2.2 : 2.6;
  const n = Math.floor(taxa * dur);
  const buf = ctx.createBuffer(1, n, taxa);
  const y = buf.getChannelData(0);
  const periodo = taxa / hz(midi);
  const P = Math.floor(periodo);
  const frac = periodo - P;
  // excitação: ruído com passa-baixa (dedo/unha). Baixo = mais escuro.
  const brilho = tipo === "baixo" ? 0.25 : midi > 60 ? 0.65 : 0.5;
  let s = 12345 + midi * 977;
  let ant = 0;
  const exc = new Float32Array(P + 2);
  for (let i = 0; i < exc.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const r = (s / 0x7fffffff) * 2 - 1;
    ant = ant + brilho * (r - ant);
    exc[i] = ant;
  }
  // tira o DC da excitação
  const media = exc.reduce((a, b) => a + b, 0) / exc.length;
  for (let i = 0; i < exc.length; i++) exc[i] -= media;
  const perda = tipo === "baixo" ? 0.9965 : midi < 52 ? 0.9975 : 0.9962;
  for (let i = 0; i < n; i++) {
    if (i < P + 2) {
      y[i] = exc[i];
      continue;
    }
    // atraso fracionário por interpolação linear para afinar certinho
    const a = y[i - P] * (1 - frac) + y[i - P - 1] * frac;
    const b = y[i - P - 1] * (1 - frac) + y[i - P - 2] * frac;
    y[i] = perda * 0.5 * (a + b);
  }
  // normaliza e faz um fade no fim
  let pico = 0;
  for (let i = 0; i < n; i++) pico = Math.max(pico, Math.abs(y[i]));
  const g = pico > 0 ? 0.9 / pico : 1;
  const fade = Math.floor(taxa * 0.08);
  for (let i = 0; i < n; i++) y[i] *= g * (i > n - fade ? (n - i) / fade : 1);
  cacheCordas.set(chave, buf);
  return buf;
}

export function tocarCorda(
  ctx: BaseAudioContext,
  destino: AudioNode,
  midi: number,
  t: number,
  vol: number,
  tipo: "nylon" | "baixo",
  dur?: number,
) {
  const src = ctx.createBufferSource();
  src.buffer = bufferCorda(ctx, midi, tipo);
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(g).connect(destino);
  src.start(t);
  if (dur) {
    // abafa a corda (palm mute / mão esquerda soltando)
    g.gain.setValueAtTime(vol, t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
    src.stop(t + dur + 0.15);
  }
}

// ---------------- Piano ----------------

export function tocarPiano(ctx: BaseAudioContext, destino: AudioNode, midi: number, t: number, vol: number, dur: number) {
  const f = hz(midi);
  const B = 0.00035; // inarmonicidade da corda de piano
  const saida = ctx.createGain();
  saida.gain.value = vol;
  const filtro = ctx.createBiquadFilter();
  filtro.type = "lowpass";
  filtro.frequency.setValueAtTime(Math.min(9000, f * 14), t);
  filtro.frequency.exponentialRampToValueAtTime(Math.min(4000, f * 5), t + 1.2);
  filtro.connect(saida).connect(destino);
  const fim = t + Math.min(dur, 3.5);
  const parciais = midi > 72 ? 6 : 9;
  for (let k = 1; k <= parciais; k++) {
    const fk = f * k * Math.sqrt(1 + B * k * k);
    if (fk > 12000) break;
    for (const desafina of [-0.6, 0.6]) {
      const o = ctx.createOscillator();
      o.frequency.value = fk * Math.pow(2, desafina / 1200);
      const g = ctx.createGain();
      const amp = (0.5 / Math.pow(k, 1.15)) * (k === 1 ? 1 : 0.8);
      const queda = 0.9 + k * 0.35 + (midi - 48) * 0.02; // agudos e parciais altas somem antes
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(amp, t + 0.004);
      g.gain.setTargetAtTime(amp * 0.25, t + 0.004, 0.25 / Math.max(0.3, queda * 0.4));
      g.gain.setTargetAtTime(0.0001, t + 0.3, 1.6 / queda);
      g.gain.setTargetAtTime(0.0001, fim, 0.08); // soltar a tecla
      o.connect(g).connect(filtro);
      o.start(t);
      o.stop(fim + 0.5);
    }
  }
  // martelo: um "toc" curto de ruído
  const n = Math.floor(ctx.sampleRate * 0.02);
  const nb = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = nb.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n / 5));
  const ns = ctx.createBufferSource();
  ns.buffer = nb;
  const ng = ctx.createGain();
  ng.gain.value = 0.05;
  ns.connect(ng).connect(filtro);
  ns.start(t);
}

// ---------------- Gaita (acordeom) ----------------

const ondasGaita = new WeakMap<BaseAudioContext, PeriodicWave>();

function ondaPalheta(ctx: BaseAudioContext): PeriodicWave {
  let w = ondasGaita.get(ctx);
  if (!w) {
    // espectro de palheta livre: rico em harmônicos, com formante por volta do 4º–6º
    const N = 24;
    const real = new Float32Array(N);
    const imag = new Float32Array(N);
    for (let k = 1; k < N; k++) {
      const formante = 1 + 1.2 * Math.exp(-Math.pow((k - 5) / 2.5, 2));
      imag[k] = (formante / k) * (k % 2 === 0 ? 0.8 : 1);
    }
    w = ctx.createPeriodicWave(real, imag);
    ondasGaita.set(ctx, w);
  }
  return w;
}

export function tocarGaita(ctx: BaseAudioContext, destino: AudioNode, midi: number, t: number, vol: number, dur: number) {
  const onda = ondaPalheta(ctx);
  const f = hz(midi);
  const corpo = ctx.createBiquadFilter();
  corpo.type = "lowpass";
  corpo.frequency.value = 3500;
  corpo.Q.value = 0.6;
  const fole = ctx.createGain();
  // ataque do fole + sustentação + soltura
  const ataque = 0.035;
  fole.gain.setValueAtTime(0.0001, t);
  fole.gain.exponentialRampToValueAtTime(vol, t + ataque);
  fole.gain.setValueAtTime(vol * 0.9, t + Math.max(ataque, dur - 0.05));
  fole.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.07);
  corpo.connect(fole).connect(destino);
  // duas palhetas: uma afinada e outra levemente acima (tremolo de musette)
  for (const cents of [0, 11]) {
    const o = ctx.createOscillator();
    o.setPeriodicWave(onda);
    o.frequency.value = f * Math.pow(2, cents / 1200);
    const g = ctx.createGain();
    g.gain.value = 0.32;
    o.connect(g).connect(corpo);
    o.start(t);
    o.stop(t + dur + 0.1);
  }
}

// ---------------- Ambiência de galpão (reverb leve) ----------------

export function criarAmbiencia(ctx: BaseAudioContext): ConvolverNode {
  const taxa = ctx.sampleRate;
  const n = Math.floor(taxa * 1.3);
  const ir = ctx.createBuffer(2, n, taxa);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2);
  }
  const conv = ctx.createConvolver();
  conv.buffer = ir;
  return conv;
}
