// Análise de sinal: picos para desenhar a onda e detecção de ataques (palmas/batidas).

export const PICOS_POR_SEGUNDO = 100;

/** Picos (mín/máx) por janela, para desenhar a forma de onda. */
export function calcularPicos(
  dados: Float32Array,
  taxa: number,
  inicio = 0,
  porSegundo = PICOS_POR_SEGUNDO,
): { min: Float32Array; max: Float32Array } {
  const janela = Math.max(1, Math.round(taxa / porSegundo));
  const n = Math.max(0, Math.ceil((dados.length - inicio) / janela));
  const min = new Float32Array(n);
  const max = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    let lo = 0;
    let hi = 0;
    const fim = Math.min(dados.length, inicio + (k + 1) * janela);
    for (let i = inicio + k * janela; i < fim; i++) {
      const v = dados[i];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    min[k] = lo;
    max[k] = hi;
  }
  return { min, max };
}

/** Caminho SVG (preenchido) da onda, em coordenadas: x = índice do pico, y de -1 a 1. */
export function caminhoOnda(picos: { min: Float32Array; max: Float32Array }): string {
  const n = picos.max.length;
  if (!n) return "";
  // normaliza pra onda ficar visível mesmo gravada baixa
  let pico = 0.05;
  for (let i = 0; i < n; i++) pico = Math.max(pico, picos.max[i], -picos.min[i]);
  const g = 0.95 / pico;
  const partes: string[] = [`M0 ${(-picos.max[0] * g).toFixed(3)}`];
  for (let i = 1; i < n; i++) partes.push(`L${i} ${(-picos.max[i] * g).toFixed(3)}`);
  for (let i = n - 1; i >= 0; i--) partes.push(`L${i} ${(-picos.min[i] * g).toFixed(3)}`);
  partes.push("Z");
  return partes.join("");
}

/**
 * Detecta ataques (início de palma, batida, click) e devolve os instantes em segundos.
 * Envelope de energia em janelas de 2 ms; ataque = cruzar o limiar depois de um trecho calmo.
 */
export function detectarAtaques(dados: Float32Array, taxa: number, opcoes: { calmaMs?: number; sensibilidade?: number } = {}): number[] {
  const { calmaMs = 90, sensibilidade = 0.3 } = opcoes;
  const jan = Math.max(1, Math.round(taxa * 0.002));
  const n = Math.floor(dados.length / jan);
  if (!n) return [];
  const env = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    let m = 0;
    for (let i = k * jan; i < (k + 1) * jan; i++) m = Math.max(m, Math.abs(dados[i]));
    env[k] = m;
  }
  const ordenado = Float32Array.from(env).sort();
  const ruido = ordenado[Math.floor(n * 0.3)];
  const pico = ordenado[n - 1];
  const limiar = Math.max(ruido * 5, pico * sensibilidade, 0.01);
  const calma = Math.round(calmaMs / 2);
  const ataques: number[] = [];
  let ultimoAcima = -Infinity;
  for (let k = 0; k < n; k++) {
    if (env[k] >= limiar) {
      if (k - ultimoAcima > calma) {
        // refina para a amostra exata dentro da janela: primeira acima de metade do limiar
        let idx = k * jan;
        const ini = Math.max(0, (k - 1) * jan);
        for (let i = ini; i < (k + 1) * jan; i++) {
          if (Math.abs(dados[i]) >= limiar * 0.5) {
            idx = i;
            break;
          }
        }
        ataques.push(idx / taxa);
      }
      ultimoAcima = k;
    }
  }
  return ataques;
}

/** Para cada referência, o atraso do ataque mais próximo dentro da janela [-antes, +depois]. */
export function parearAtrasos(referencias: number[], ataques: number[], antes = 0.2, depois = 0.55): number[] {
  const out: number[] = [];
  for (const r of referencias) {
    const cand = ataques.filter((a) => a >= r - antes && a <= r + depois);
    if (cand.length) out.push(cand[0] - r);
  }
  return out;
}

export function mediana(v: number[]): number {
  if (!v.length) return NaN;
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Dispersão (desvio absoluto mediano) para dizer se a medição foi confiável. */
export function dispersao(v: number[]): number {
  const m = mediana(v);
  return mediana(v.map((x) => Math.abs(x - m)));
}
