// Gera os PNGs do PWA a partir de public/icones/icone.svg (usa o Chromium do Playwright).
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.cwd(), "public/icones");
const svg = readFileSync(resolve(dir, "icone.svg"), "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();
const alvos = [
  ["icone-192.png", 192, false],
  ["icone-512.png", 512, false],
  ["apple-touch-icon.png", 180, true],
  ["icone-maskable-512.png", 512, true],
];
for (const [nome, t, cheio] of alvos) {
  // maskable: sem cantos arredondados e com margem segura
  const conteudo = cheio
    ? svg.replace('rx="112"', 'rx="0"').replace("<svg ", '<svg style="transform:scale(.86)" ')
    : svg;
  await page.setViewportSize({ width: t, height: t });
  await page.setContent(
    `<html><body style="margin:0;background:${cheio ? "#5a3a1f" : "transparent"};display:grid;place-items:center;width:${t}px;height:${t}px">${conteudo.replace("<svg ", `<svg width="${t}" height="${t}" `)}</body></html>`,
  );
  await page.screenshot({ path: resolve(dir, nome), omitBackground: !cheio });
  console.log("ok", nome);
}
await browser.close();
