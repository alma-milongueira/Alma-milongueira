// Motor do estúdio: toca as faixas alinhadas, mixer (volume, mudo/solo, EQ 3 bandas),
// click, contagem de entrada e gravação com relógio exato (AudioWorklet).
import { desbloquearAudio, obterContexto } from "../audio/contexto";
import { atrasoDoCodec } from "./mp3";
import { audiveis, inicioNaLinha, type Faixa } from "./tipos";

type Canal = { entrada: GainNode; grave: BiquadFilterNode; medio: BiquadFilterNode; agudo: BiquadFilterNode; mudo: GainNode };
type Carregada = { buffer: AudioBuffer; atraso: number };
type Segmento = { quando: number; posIni: number; posFim: number | null };

export type OpcoesTocar = { loop?: [number, number] | null; click?: boolean; bpm: number; tempos: number; excluir?: string };
export type Guia = "faixas" | "click" | "ambos" | "nada";

export const FAIXAS_EQ = { grave: 250, medio: 1000, agudo: 4000 };

function aplicarEQ(g: BiquadFilterNode, m: BiquadFilterNode, a: BiquadFilterNode) {
  g.type = "lowshelf";
  g.frequency.value = FAIXAS_EQ.grave;
  m.type = "peaking";
  m.frequency.value = FAIXAS_EQ.medio;
  m.Q.value = 0.9;
  a.type = "highshelf";
  a.frequency.value = FAIXAS_EQ.agudo;
}

export class MotorEstudio {
  readonly ctx: AudioContext;
  private master: GainNode;
  private canais = new Map<string, Canal>();
  private carregadas = new Map<string, Carregada>();
  private faixas: Faixa[] = [];
  private fontes: AudioScheduledSourceNode[] = [];
  private segmentos: Segmento[] = [];
  private relogio: ReturnType<typeof setInterval> | null = null;
  private opcoes: OpcoesTocar | null = null;
  private proximoClick = 0;
  private clickForte: AudioBuffer;
  private clickFraco: AudioBuffer;
  private moduloCarregado: Promise<void> | null = null;
  tocando = false;

  constructor() {
    this.ctx = obterContexto();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.clickForte = this.criarClick(1760);
    this.clickFraco = this.criarClick(1175);
  }

  fechar() {
    this.parar();
  }

  private criarClick(freq: number): AudioBuffer {
    const taxa = this.ctx.sampleRate;
    const n = Math.round(taxa * 0.05);
    const b = this.ctx.createBuffer(1, n, taxa);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.sin((2 * Math.PI * freq * i) / taxa) * Math.exp(-i / (taxa * 0.008)) * 0.9;
    return b;
  }

  // ---------------- Faixas e mixer ----------------

  async carregar(f: Faixa, blob: Blob): Promise<AudioBuffer> {
    const buffer = await this.ctx.decodeAudioData(await blob.arrayBuffer());
    const atraso = await atrasoDoCodec(this.ctx, f.taxaAmostragem ?? buffer.sampleRate);
    this.carregadas.set(f.id, { buffer, atraso });
    return buffer;
  }

  /** Solta os áudios carregados (ao sair do estúdio). */
  descarregarTudo() {
    this.parar();
    this.carregadas.clear();
    this.faixas = [];
  }

  esquecer(id: string) {
    this.carregadas.delete(id);
  }

  dadosDa(id: string): { buffer: AudioBuffer; atraso: number } | null {
    return this.carregadas.get(id) ?? null;
  }

  duracaoUtil(id: string): number {
    const c = this.carregadas.get(id);
    return c ? Math.max(0, c.buffer.duration - c.atraso) : 0;
  }

  /** Atualiza parâmetros do mixer ao vivo (volume, mudo/solo, EQ). */
  definirFaixas(faixas: Faixa[]) {
    this.faixas = faixas;
    const soam = new Set(audiveis(faixas).map((f) => f.id));
    const t = this.ctx.currentTime;
    for (const f of faixas) {
      const c = this.canal(f.id);
      c.entrada.gain.setTargetAtTime(f.volume, t, 0.01);
      c.grave.gain.setTargetAtTime(f.eqGrave, t, 0.01);
      c.medio.gain.setTargetAtTime(f.eqMedio, t, 0.01);
      c.agudo.gain.setTargetAtTime(f.eqAgudo, t, 0.01);
      c.mudo.gain.setTargetAtTime(soam.has(f.id) ? 1 : 0, t, 0.01);
    }
  }

  private canal(id: string): Canal {
    let c = this.canais.get(id);
    if (!c) {
      const entrada = this.ctx.createGain();
      const grave = this.ctx.createBiquadFilter();
      const medio = this.ctx.createBiquadFilter();
      const agudo = this.ctx.createBiquadFilter();
      const mudo = this.ctx.createGain();
      aplicarEQ(grave, medio, agudo);
      entrada.connect(grave).connect(medio).connect(agudo).connect(mudo).connect(this.master);
      c = { entrada, grave, medio, agudo, mudo };
      this.canais.set(id, c);
    }
    return c;
  }

  /** Fim da última faixa na linha do tempo (s). */
  fimDaMusica(): number {
    let fim = 0;
    for (const f of this.faixas) {
      if (!this.carregadas.has(f.id)) continue;
      fim = Math.max(fim, inicioNaLinha(f) + this.duracaoUtil(f.id));
    }
    return fim;
  }

  // ---------------- Reprodução ----------------

  posicao(): number {
    if (!this.tocando) return this.posParada;
    const agora = this.ctx.currentTime - (this.ctx.outputLatency || 0);
    let seg = this.segmentos[0];
    for (const s of this.segmentos) if (s.quando <= agora) seg = s;
    if (!seg) return this.posParada;
    const p = seg.posIni + (agora - seg.quando);
    return seg.posFim !== null ? Math.min(p, seg.posFim) : p;
  }

  private posParada = 0;

  async tocar(pos: number, op: OpcoesTocar) {
    this.parar();
    desbloquearAudio();
    await this.ctx.resume();
    this.posParada = pos;
    this.opcoes = op;
    this.tocando = true;
    const quando = this.ctx.currentTime + 0.06;
    let ini = pos;
    if (op.loop && (pos < op.loop[0] || pos >= op.loop[1])) ini = op.loop[0];
    this.agendarSegmento(ini, op.loop ? op.loop[1] : null, quando, op.excluir);
    this.proximoClick = this.primeiraBatida(ini, op.bpm);
    this.relogio = setInterval(() => this.tique(), 100);
    this.tique();
  }

  private primeiraBatida(pos: number, bpm: number) {
    const b = 60 / bpm;
    return Math.ceil(pos / b - 1e-6) * b;
  }

  private tique() {
    const op = this.opcoes;
    if (!op || !this.tocando) return;
    const horizonte = this.ctx.currentTime + 0.6;
    const ultimo = this.segmentos[this.segmentos.length - 1];
    // Loop: agenda a próxima volta antes de acabar a atual (sem buraco)
    if (op.loop && ultimo) {
      const fimSeg = ultimo.quando + ((ultimo.posFim ?? 0) - ultimo.posIni);
      if (fimSeg < horizonte + 0.5) this.agendarSegmento(op.loop[0], op.loop[1], fimSeg, op.excluir);
    }
    if (op.click) {
      const b = 60 / op.bpm;
      // agenda clicks percorrendo os segmentos
      for (const s of this.segmentos) {
        const fimS = s.posFim ?? Infinity;
        let batida = this.primeiraBatida(s.posIni, op.bpm);
        for (; batida < fimS; batida += b) {
          const t = s.quando + (batida - s.posIni);
          if (t > horizonte) break;
          if (t < this.proximoClick - 1e-4 || t < this.ctx.currentTime) continue;
          this.disparaClick(t, Math.round(batida / b) % op.tempos === 0);
          this.proximoClick = t + 1e-3;
        }
      }
    }
    if (!op.loop && this.faixas.length && !op.click) {
      const fim = this.fimDaMusica();
      if (this.posicao() > fim + 0.3 && fim > 0) this.parar();
    }
  }

  private disparaClick(t: number, forte: boolean) {
    const s = this.ctx.createBufferSource();
    s.buffer = forte ? this.clickForte : this.clickFraco;
    s.connect(this.ctx.destination);
    s.start(t);
    this.fontes.push(s);
  }

  private agendarSegmento(posIni: number, posFim: number | null, quando: number, excluir?: string) {
    this.segmentos.push({ quando, posIni, posFim });
    for (const f of this.faixas) {
      if (f.id === excluir) continue;
      const c = this.carregadas.get(f.id);
      if (!c) continue;
      const inicio = inicioNaLinha(f);
      const dur = c.buffer.duration - c.atraso;
      const fimFaixa = inicio + dur;
      if (fimFaixa <= posIni || (posFim !== null && inicio >= posFim)) continue;
      const rel = posIni - inicio;
      const t = quando + Math.max(0, -rel);
      const off = c.atraso + Math.max(0, rel);
      const src = this.ctx.createBufferSource();
      src.buffer = c.buffer;
      src.connect(this.canal(f.id).entrada);
      if (posFim !== null) src.start(t, off, Math.max(0, posFim - Math.max(posIni, inicio)));
      else src.start(t, off);
      this.fontes.push(src);
    }
  }

  parar(): number {
    const p = this.tocando ? this.posicao() : this.posParada;
    if (this.relogio) clearInterval(this.relogio);
    this.relogio = null;
    for (const f of this.fontes) {
      try {
        f.stop();
      } catch {}
      f.disconnect();
    }
    this.fontes = [];
    this.segmentos = [];
    this.tocando = false;
    this.opcoes = null;
    this.posParada = Math.max(0, p);
    return this.posParada;
  }

  /** Toca uma sequência de clicks nos instantes dados (tempo do contexto). */
  tocarClicks(instantes: number[], forteNoPrimeiro = true) {
    instantes.forEach((t, i) => this.disparaClick(t, forteNoPrimeiro && i === 0));
  }

  // ---------------- Captura do microfone ----------------

  async abrirCaptura(): Promise<{ parar: () => Promise<{ dados: Float32Array; frame: number }>; cancelar: () => void }> {
    desbloquearAudio("play-and-record");
    await this.ctx.resume();
    this.moduloCarregado ??= this.ctx.audioWorklet.addModule("/worklets/gravador.js");
    await this.moduloCarregado;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
    });
    const fonte = this.ctx.createMediaStreamSource(stream);
    const no = new AudioWorkletNode(this.ctx, "gravador-galpao", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 1,
      channelCountMode: "explicit",
    });
    const silencio = this.ctx.createGain();
    silencio.gain.value = 0;
    fonte.connect(no).connect(silencio).connect(this.ctx.destination);
    const partes: { frame: number; dados: Float32Array }[] = [];
    let aoFim: (() => void) | null = null;
    no.port.onmessage = (e) => {
      if (e.data.fim) aoFim?.();
      else partes.push(e.data);
    };
    no.port.postMessage("iniciar");
    const encerrar = () => {
      fonte.disconnect();
      no.disconnect();
      silencio.disconnect();
      stream.getTracks().forEach((t) => t.stop());
    };
    return {
      cancelar: () => {
        no.port.postMessage("parar");
        encerrar();
      },
      parar: () =>
        new Promise((res) => {
          aoFim = () => {
            encerrar();
            if (!partes.length) return res({ dados: new Float32Array(0), frame: 0 });
            const frame = partes[0].frame;
            const ultimo = partes[partes.length - 1];
            const total = ultimo.frame + ultimo.dados.length - frame;
            const dados = new Float32Array(total);
            for (const p of partes) dados.set(p.dados, p.frame - frame);
            res({ dados, frame });
          };
          no.port.postMessage("parar");
        }),
    };
  }

  /**
   * Grava uma nova faixa com guia no fone (faixas e/ou click) e contagem de entrada.
   * Devolve o PCM a partir do instante em que a música passa pela posição `pos`.
   */
  async gravar(op: { pos: number; guia: Guia; contagem: number; bpm: number; tempos: number; excluir?: string }) {
    this.parar();
    const captura = await this.abrirCaptura();
    const b = 60 / op.bpm;
    const t0 = this.ctx.currentTime + 0.3;
    const contagem = Array.from({ length: op.contagem }, (_, k) => t0 + k * b);
    contagem.forEach((t, k) => this.disparaClick(t, k === 0));
    const tInicio = t0 + op.contagem * b;
    const comFaixas = op.guia === "faixas" || op.guia === "ambos";
    const comClick = op.guia === "click" || op.guia === "ambos";
    this.opcoes = { bpm: op.bpm, tempos: op.tempos, click: comClick, loop: null, excluir: op.excluir };
    this.tocando = true;
    this.posParada = op.pos;
    if (comFaixas) this.agendarSegmento(op.pos, null, tInicio, op.excluir);
    else this.segmentos.push({ quando: tInicio, posIni: op.pos, posFim: null });
    this.proximoClick = tInicio - 1e-3;
    this.relogio = setInterval(() => this.tique(), 100);
    const taxa = this.ctx.sampleRate;

    return {
      inicioCtx: tInicio,
      /** Instantes (relógio do áudio) de cada batida da contagem de entrada. */
      batidasContagem: contagem,
      cancelar: () => {
        this.parar();
        captura.cancelar();
      },
      parar: async (): Promise<{ pcm: Float32Array; taxa: number } | null> => {
        this.parar();
        const { dados, frame } = await captura.parar();
        const alvo = Math.round(tInicio * taxa);
        const corte = alvo - frame;
        if (corte < 0 || dados.length - corte < taxa * 0.3) return null; // parou na contagem
        return { pcm: dados.slice(corte), taxa };
      },
    };
  }

  // ---------------- Mixagem final ----------------

  /** Renderiza a mixagem das faixas escolhidas (mono, 44,1 kHz) do primeiro ao último som. */
  async renderizar(ids: string[], taxa = 44100): Promise<{ pcm: Float32Array; taxa: number; inicio: number }> {
    const escolhidas = this.faixas.filter((f) => ids.includes(f.id) && this.carregadas.has(f.id));
    if (!escolhidas.length) throw new Error("Escolhe ao menos uma faixa gravada.");
    const inicio = Math.min(...escolhidas.map(inicioNaLinha));
    const fim = Math.max(...escolhidas.map((f) => inicioNaLinha(f) + this.duracaoUtil(f.id)));
    const dur = Math.max(0.5, fim - inicio);
    const off = new OfflineAudioContext(1, Math.ceil(dur * taxa), taxa);
    for (const f of escolhidas) {
      const c = this.carregadas.get(f.id)!;
      const vol = off.createGain();
      vol.gain.value = f.volume;
      const g = off.createBiquadFilter();
      const m = off.createBiquadFilter();
      const a = off.createBiquadFilter();
      aplicarEQ(g, m, a);
      g.gain.value = f.eqGrave;
      m.gain.value = f.eqMedio;
      a.gain.value = f.eqAgudo;
      const src = off.createBufferSource();
      src.buffer = c.buffer;
      src.connect(vol).connect(g).connect(m).connect(a).connect(off.destination);
      src.start(inicioNaLinha(f) - inicio, c.atraso);
    }
    const r = await off.startRendering();
    const pcm = r.getChannelData(0);
    let pico = 0;
    for (let i = 0; i < pcm.length; i++) pico = Math.max(pico, Math.abs(pcm[i]));
    if (pico > 0.98) {
      const k = 0.98 / pico;
      for (let i = 0; i < pcm.length; i++) pcm[i] *= k;
    }
    return { pcm, taxa, inicio };
  }
}

let unico: MotorEstudio | null = null;

/** Um só motor (um AudioContext) para o app inteiro. */
export function obterMotor(): MotorEstudio {
  unico ??= new MotorEstudio();
  return unico;
}
