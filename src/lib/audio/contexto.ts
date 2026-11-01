// Um único AudioContext para o app inteiro + desbloqueio no iPhone.
//
// No iPhone, com a chave de silencioso ligada, o Safari cala o Web Audio.
// Marcando a sessão como "playback" (iOS 17+) o som sai como num player de música.
// Em iOS mais antigos, tocar um <audio> silencioso no mesmo toque faz o mesmo efeito.

let ctx: AudioContext | null = null;
let audioSilencioso: HTMLAudioElement | null = null;

type NavigatorComSessao = Navigator & { audioSession?: { type: string } };

export function obterContexto(): AudioContext {
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new C({ latencyHint: "interactive" });
  }
  return ctx;
}

function wavSilencioso(): string {
  const taxa = 8000;
  const n = taxa / 2;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const txt = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  txt(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  txt(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, taxa, true);
  v.setUint32(28, taxa * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  txt(36, "data");
  v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

/**
 * Chamar SEMPRE dentro do toque do usuário (antes de qualquer await).
 * Liga o som mesmo com o iPhone no silencioso e acorda o AudioContext.
 */
export function desbloquearAudio(modo: "playback" | "play-and-record" = "playback"): AudioContext {
  const nav = navigator as NavigatorComSessao;
  try {
    // "play-and-record" quando vai gravar: no iPhone o microfone exige essa categoria
    if (nav.audioSession && nav.audioSession.type !== modo) nav.audioSession.type = modo;
  } catch {}
  const c = obterContexto();
  if (c.state !== "running") c.resume().catch(() => {});
  // Truque para iOS sem audioSession: um <audio> silencioso tocando muda a categoria do áudio
  if (!nav.audioSession) {
    try {
      audioSilencioso ??= Object.assign(new Audio(wavSilencioso()), { loop: true, volume: 0.01 });
      audioSilencioso.setAttribute("playsinline", "");
      audioSilencioso.play().catch(() => {});
    } catch {}
  }
  // Um buffer vazio tocado no gesto "destrava" o áudio em navegadores antigos
  const b = c.createBuffer(1, 1, 22050);
  const s = c.createBufferSource();
  s.buffer = b;
  s.connect(c.destination);
  s.start(0);
  return c;
}
