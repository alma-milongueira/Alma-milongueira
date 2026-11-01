// Codificação MP3 no aparelho (lamejs) e escolha automática do bitrate.

export const BITRATES = [32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320] as const;
export const MB = 1024 * 1024;
export const ALVO_MIN = 5 * MB;
export const ALVO_MAX = 7 * MB;

export type EscolhaBitrate = {
  kbps: number;
  bytesEstimados: number;
  situacao: "na-faixa" | "curta" | "longa";
};

export function tamanhoEstimado(segundos: number, kbps: number): number {
  return Math.ceil((kbps * 1000 * segundos) / 8) + 1024; // + cabeçalho/frames finais
}

/**
 * Escolhe o bitrate para o MP3 ficar entre 5 e 7 MB.
 * - Pega a maior qualidade que cabe em 7 MB (com 3% de folga).
 * - Música curta: nem 320 kbps chega a 5 MB → usa 320 (máxima qualidade) e avisa.
 * - Música longa: nem 32 kbps cabe em 7 MB → usa 32 e avisa.
 */
export function escolherBitrate(segundos: number): EscolhaBitrate {
  const limite = ALVO_MAX * 0.97;
  let escolhido: number | null = null;
  for (const k of BITRATES) if (tamanhoEstimado(segundos, k) <= limite) escolhido = k;
  if (escolhido === null) return { kbps: 32, bytesEstimados: tamanhoEstimado(segundos, 32), situacao: "longa" };
  const bytes = tamanhoEstimado(segundos, escolhido);
  return { kbps: escolhido, bytesEstimados: bytes, situacao: bytes >= ALVO_MIN ? "na-faixa" : "curta" };
}

function paraInt16(f: Float32Array, ini: number, fim: number): Int16Array {
  const out = new Int16Array(fim - ini);
  for (let i = ini; i < fim; i++) {
    const s = Math.max(-1, Math.min(1, f[i]));
    out[i - ini] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** Codifica PCM mono em MP3, cedendo a vez pra interface de tempos em tempos. */
export async function codificarMp3(pcm: Float32Array, taxa: number, kbps: number, aoProgredir?: (fracao: number) => void): Promise<Blob> {
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const enc = new Mp3Encoder(1, taxa, kbps);
  const partes: BlobPart[] = [];
  const BLOCO = 1152 * 40;
  let desdeUltimaPausa = 0;
  for (let i = 0; i < pcm.length; i += BLOCO) {
    const buf = enc.encodeBuffer(paraInt16(pcm, i, Math.min(pcm.length, i + BLOCO)));
    if (buf.length) partes.push(new Uint8Array(buf.buffer, buf.byteOffset, buf.length).slice());
    desdeUltimaPausa += BLOCO;
    if (desdeUltimaPausa >= taxa * 4) {
      desdeUltimaPausa = 0;
      aoProgredir?.(i / pcm.length);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  const fim = enc.flush();
  if (fim.length) partes.push(new Uint8Array(fim.buffer, fim.byteOffset, fim.length).slice());
  aoProgredir?.(1);
  return new Blob(partes, { type: "audio/mpeg" });
}

// O MP3 acrescenta um pequeno silêncio no início (atraso do codificador + decodificador).
// Medimos uma vez por taxa de amostragem neste aparelho e descontamos na reprodução,
// senão as faixas ficariam ~25 ms atrasadas.
const atrasos = new Map<number, Promise<number>>();

export function atrasoDoCodec(ctx: BaseAudioContext, taxa: number): Promise<number> {
  let p = atrasos.get(taxa);
  if (!p) {
    p = (async () => {
      const n = taxa; // 1 s
      const pulso = new Float32Array(n);
      const pos = Math.round(taxa * 0.1);
      pulso[pos] = 0.9;
      pulso[pos + 1] = -0.9;
      const blob = await codificarMp3(pulso, taxa, 128);
      const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
      const d = buf.getChannelData(0);
      let max = 0;
      let idx = 0;
      for (let i = 0; i < d.length; i++) {
        const v = Math.abs(d[i]);
        if (v > max) {
          max = v;
          idx = i;
        }
      }
      const atraso = idx / buf.sampleRate - pos / taxa;
      return Math.max(0, Math.min(0.2, atraso));
    })().catch(() => 0);
    atrasos.set(taxa, p);
  }
  return p;
}
