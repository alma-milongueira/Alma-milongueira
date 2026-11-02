// Baixa amostras reais de instrumentos (licença CC-BY 3.0) e converte para MP3 mono leve.
// Uso: node scripts/baixar-sons.mjs   (precisa de ffmpeg)
// Fontes:
//   - tonejs-instruments (Nicholaus Brosowsky) — violão nylon e piano — CC-BY 3.0
//   - FluidR3_GM (Frank Wen) via midi-js-soundfonts (Benjamin Gleitzman) — acordeom e contrabaixo — CC-BY 3.0
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const SUST = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"];
const BEM = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const nome = (midi, tab) => tab[midi % 12] + (Math.floor(midi / 12) - 1);

const TONEJS = "https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples";
const FLUID = "https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM";
const violaoDisp = "B1 D2 E2 Fs2 Gs2 A2 B2 Cs3 D3 E3 Fs3 G3 A3 B3 Cs4 Ds4 E4 Fs4 Gs4 A4 B4 Cs5 D5 E5 Fs5 G5 Gs5 A5".split(" ");
const midiDe = (n) => {
  const m = /^([A-G]s?)(\d)$/.exec(n);
  return SUST.indexOf(m[1]) + (Number(m[2]) + 1) * 12;
};

const passo = (de, ate, p) => Array.from({ length: Math.floor((ate - de) / p) + 1 }, (_, i) => de + i * p);

const PLANOS = {
  violao: { notas: violaoDisp.map(midiDe).filter((m) => m >= 40 && m <= 81), url: (m) => `${TONEJS}/guitar-nylon/${nome(m, SUST)}.mp3`, seg: 3.0 },
  teclado: { notas: passo(36, 84, 3), url: (m) => `${TONEJS}/piano/${nome(m, SUST)}.mp3`, seg: 3.5 },
  baixo: { notas: passo(28, 55, 3), url: (m) => `${FLUID}/acoustic_bass-mp3/${nome(m, BEM)}.mp3`, seg: 2.5 },
  gaita: { notas: passo(36, 84, 3), url: (m) => `${FLUID}/accordion-mp3/${nome(m, BEM)}.mp3`, seg: 3.0 },
};

const saida = join(process.cwd(), "public/sons");
const tmp = join(tmpdir(), "sons-galpao");
mkdirSync(tmp, { recursive: true });
const mapa = {};
for (const [inst, plano] of Object.entries(PLANOS)) {
  mkdirSync(join(saida, inst), { recursive: true });
  mapa[inst] = [];
  for (const m of plano.notas) {
    const r = await fetch(plano.url(m));
    if (!r.ok) {
      console.warn("faltou", inst, m, r.status);
      continue;
    }
    const orig = join(tmp, `${inst}-${m}.mp3`);
    writeFileSync(orig, Buffer.from(await r.arrayBuffer()));
    const destino = join(saida, inst, `${m}.mp3`);
    // mono, 44.1 kHz, 96 kbps, corta no tempo máximo com fade-out
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", orig, "-t", String(plano.seg), "-af", `afade=t=out:st=${plano.seg - 0.3}:d=0.3`, "-ac", "1", "-ar", "44100", "-b:a", "96k", destino]);
    mapa[inst].push(m);
    process.stdout.write(".");
  }
  console.log(` ${inst}: ${mapa[inst].length} notas`);
}
writeFileSync(join(process.cwd(), "src/lib/audio/amostras.json"), JSON.stringify(mapa) + "\n");
writeFileSync(join(saida, "lista.json"), JSON.stringify(mapa) + "\n"); // usado pelo service worker
writeFileSync(
  join(saida, "CREDITOS.txt"),
  `Sons de instrumentos usados no Alma Milongueira (licença Creative Commons Atribuição 3.0 — https://creativecommons.org/licenses/by/3.0/)

- Violão nylon e piano: "tonejs-instruments", por Nicholaus Brosowsky — https://github.com/nbrosowsky/tonejs-instruments
- Acordeom (gaita) e contrabaixo acústico: "FluidR3_GM" (Frank Wen), convertido por Benjamin Gleitzman em "midi-js-soundfonts" — https://github.com/gleitz/midi-js-soundfonts

Alterações: notas selecionadas, convertidas para mono 96 kbps, cortadas e com fade-out.
`,
);
rmSync(tmp, { recursive: true, force: true });
