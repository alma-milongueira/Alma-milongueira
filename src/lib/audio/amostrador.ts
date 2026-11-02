// Instrumentos com gravações reais (public/sons, licença CC-BY 3.0 — ver public/sons/CREDITOS.txt).
// Cada instrumento tem notas gravadas a cada 2–3 semitons; as do meio saem da vizinha mais próxima
// com um pequeno ajuste de velocidade (no máximo 1,5 semitom, imperceptível).
import mapa from "./amostras.json";

export type InstrumentoAmostrado = "violao" | "teclado" | "baixo" | "gaita";

type Banco = { notas: number[]; buffers: Map<number, AudioBuffer>; ganho: Map<number, number> };

const bancos = new Map<InstrumentoAmostrado, Promise<Banco>>();
const prontos = new Map<InstrumentoAmostrado, Banco>();

/** Baixa (uma vez; depois vem do cache/offline) e decodifica as notas do instrumento. */
export function carregarInstrumento(ctx: BaseAudioContext, inst: InstrumentoAmostrado): Promise<Banco> {
  let p = bancos.get(inst);
  if (!p) {
    p = (async () => {
      const notas = (mapa as Record<string, number[]>)[inst];
      const buffers = new Map<number, AudioBuffer>();
      const ganho = new Map<number, number>();
      await Promise.all(
        notas.map(async (m) => {
          const r = await fetch(`/sons/${inst}/${m}.mp3`);
          if (!r.ok) throw new Error(`som ${inst}/${m} indisponível`);
          const b = await ctx.decodeAudioData(await r.arrayBuffer());
          // nivela o volume entre as notas
          const d = b.getChannelData(0);
          let pico = 0;
          for (let i = 0; i < d.length; i += 4) pico = Math.max(pico, Math.abs(d[i]));
          buffers.set(m, b);
          ganho.set(m, pico > 0.01 ? 0.9 / pico : 1);
        }),
      );
      const banco = { notas, buffers, ganho };
      prontos.set(inst, banco);
      return banco;
    })();
    p.catch(() => bancos.delete(inst)); // deixa tentar de novo depois
    bancos.set(inst, p);
  }
  return p;
}

export function bancoPronto(inst: InstrumentoAmostrado): Banco | null {
  return prontos.get(inst) ?? null;
}

const SOLTURA: Record<InstrumentoAmostrado, number> = { violao: 0.12, teclado: 0.25, baixo: 0.1, gaita: 0.06 };

/** Toca uma nota com a gravação mais próxima. `dur` = quando soltar (abafar) a nota. */
export function tocarAmostra(
  ctx: BaseAudioContext,
  destino: AudioNode,
  banco: Banco,
  inst: InstrumentoAmostrado,
  midi: number,
  t: number,
  vol: number,
  dur?: number,
) {
  let base = banco.notas[0];
  for (const n of banco.notas) if (Math.abs(n - midi) < Math.abs(base - midi)) base = n;
  const buf = banco.buffers.get(base);
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = Math.pow(2, (midi - base) / 12);
  const g = ctx.createGain();
  const v = vol * (banco.ganho.get(base) ?? 1);
  g.gain.setValueAtTime(v, t);
  src.connect(g).connect(destino);
  src.start(t);
  if (dur !== undefined) {
    const solta = SOLTURA[inst];
    g.gain.setValueAtTime(v, t + dur);
    g.gain.setTargetAtTime(0, t + dur, solta / 3);
    src.stop(t + dur + solta * 2);
  }
}
