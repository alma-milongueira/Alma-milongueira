// Calibração de latência por aparelho/saída (alto-falante, fone com fio, fone Bluetooth).
import { detectarAtaques, dispersao, mediana, parearAtrasos } from "./analise";
import type { MotorEstudio } from "./motor";

export type PerfilSaida = "altofalante" | "fio" | "bluetooth";
export const PERFIS: Record<PerfilSaida, string> = {
  altofalante: "Alto-falante",
  fio: "Fone com fio",
  bluetooth: "Fone Bluetooth",
};

export type Medicao = { ms: number; dispersaoMs: number; metodo: "batida" | "toque" | "estimativa"; quando: string };
export type ConfigLatencia = {
  ativo: PerfilSaida;
  perfis: Partial<Record<PerfilSaida, Medicao>>;
  saidaToqueMs?: Partial<Record<PerfilSaida, number>>;
};

const CHAVE = "galpao:latencia:v1";

export function lerLatencia(): ConfigLatencia {
  try {
    const c = JSON.parse(localStorage.getItem(CHAVE) ?? "null");
    if (c?.ativo) return c;
  } catch {}
  return { ativo: "fio", perfis: {} };
}

export function salvarLatencia(c: ConfigLatencia) {
  localStorage.setItem(CHAVE, JSON.stringify(c));
}

/** Estimativa do sistema quando não há calibração (sem levar em conta o Bluetooth). */
export function estimativaSistema(ctx: AudioContext): number {
  const saida = (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
  return Math.round(saida * 1000 + 12);
}

export function compensacaoAtual(ctx: AudioContext | null): { ms: number; metodo: Medicao["metodo"]; perfil: PerfilSaida } {
  const c = lerLatencia();
  const m = c.perfis[c.ativo];
  if (m) return { ms: m.ms, metodo: m.metodo, perfil: c.ativo };
  return { ms: ctx ? estimativaSistema(ctx) : 0, metodo: "estimativa", perfil: c.ativo };
}

export const BPM_TESTE = 80;
export const CONTAGEM_TESTE = 4;
export const BATIDAS_TESTE = 8;

/**
 * Teste de "batida": toca clicks; a pessoa bate palma junto (com fone) ou o próprio
 * celular escuta o click (alto-falante). Mede entrada + saída de uma vez.
 */
export async function testeBatida(motor: MotorEstudio): Promise<{ ms: number; dispersaoMs: number; acertos: number }> {
  const ctx = motor.ctx;
  const captura = await motor.abrirCaptura();
  const b = 60 / BPM_TESTE;
  const t0 = ctx.currentTime + 0.4;
  const todos = Array.from({ length: CONTAGEM_TESTE + BATIDAS_TESTE }, (_, k) => t0 + k * b);
  todos.forEach((t, k) => motor.tocarClicks([t], k % 4 === 0));
  const medidos = todos.slice(CONTAGEM_TESTE);
  await new Promise((r) => setTimeout(r, (todos[todos.length - 1] - ctx.currentTime + 0.9) * 1000));
  const { dados, frame } = await captura.parar();
  const taxa = ctx.sampleRate;
  const ataques = detectarAtaques(dados, taxa).map((t) => t + frame / taxa);
  const atrasos = parearAtrasos(medidos, ataques, 0.2, 0.55);
  if (atrasos.length < 4) throw new Error("Não escutei batidas suficientes. Bate mais forte, perto do microfone, junto com o click.");
  return { ms: Math.round(mediana(atrasos) * 1000), dispersaoMs: Math.round(dispersao(atrasos) * 1000), acertos: atrasos.length };
}

/** Converte o instante de um toque na tela para o relógio do áudio. */
export function toqueNoRelogio(ctx: AudioContext, timeStampEvento: number): number {
  return ctx.currentTime - (performance.now() - timeStampEvento) / 1000;
}
