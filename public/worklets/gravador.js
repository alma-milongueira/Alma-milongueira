// AudioWorklet que captura o microfone com o número exato do quadro (frame) do relógio de áudio.
// Assim sabemos, amostra por amostra, onde a gravação cai na linha do tempo.
class Gravador extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ativo = false;
    this.partes = [];
    this.tamanho = 0;
    this.frameInicial = 0;
    this.port.onmessage = (e) => {
      if (e.data === "iniciar") {
        this.ativo = true;
        this.partes = [];
        this.tamanho = 0;
      } else if (e.data === "parar") {
        this.enviar();
        this.ativo = false;
        this.port.postMessage({ fim: true });
      }
    };
  }

  enviar() {
    if (!this.tamanho) return;
    const dados = new Float32Array(this.tamanho);
    let o = 0;
    for (const p of this.partes) {
      dados.set(p, o);
      o += p.length;
    }
    this.port.postMessage({ frame: this.frameInicial, dados }, [dados.buffer]);
    this.partes = [];
    this.tamanho = 0;
  }

  process(inputs) {
    if (!this.ativo) return true;
    const canal = inputs[0] && inputs[0][0];
    const bloco = canal ? canal.slice(0) : new Float32Array(128); // sem entrada: silêncio, mantém o tempo
    if (!this.tamanho) this.frameInicial = currentFrame;
    this.partes.push(bloco);
    this.tamanho += bloco.length;
    if (this.tamanho >= 16384) this.enviar();
    return true;
  }
}

registerProcessor("gravador-galpao", Gravador);
