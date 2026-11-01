// Contagem de sílabas (gramaticais e poéticas) para versos em português.
// Heurísticas pensadas para verso cantado: ditongos, hiatos, sinalefa e
// contagem poética até a última sílaba tônica.

const VOGAIS = "aeiouáéíóúâêôãõàüy";
const ACENTO_TONICO = "áéíóúâêô";
const NASAL = "ãõ";

function ehVogal(c: string | undefined): boolean {
  return !!c && VOGAIS.includes(c);
}

/** Limpa a palavra: minúsculas, só letras, trata "qu"/"gu" e "y". */
export function normalizarPalavra(p: string): string {
  let w = p
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^a-záéíóúâêôãõàüçy-]/g, "")
    .replace(/-/g, "");
  w = w.replace(/y/g, "i");
  // u depois de q é semivogal (qua, que, qui) e não forma sílaba
  w = w.replace(/q[uü](?=[aeioáéíóâêô])/g, "q");
  // gue/gui: u mudo; gua/guo: semivogal (também não é núcleo)
  w = w.replace(/g[uü](?=[aeioáéíóâêôã])/g, "g");
  return w;
}

export type InfoPalavra = {
  original: string;
  limpa: string;
  silabas: number; // gramaticais
  tonicaDoFim: number; // 1 = oxítona, 2 = paroxítona, 3 = proparoxítona
  nucleos: number[]; // posições das vogais núcleo
};

export function analisarPalavra(original: string): InfoPalavra | null {
  const w = normalizarPalavra(original);
  if (!w || ![...w].some(ehVogal)) return null;
  const nucleos: number[] = [];
  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    if (!ehVogal(c)) continue;
    const anterior = w[i - 1];
    const ehNucleoAnterior = nucleos.length > 0 && nucleos[nucleos.length - 1] === i - 1;
    const vogalAntes = ehVogal(anterior);
    if (vogalAntes) {
      // Nasal + vogal (ão, õe, ãe): segunda é semivogal
      if (NASAL.includes(anterior) && (c === "o" || c === "e")) continue;
      // i/u átonos depois de vogal: semivogal (ditongo decrescente), salvo hiato
      if ((c === "i" || c === "u") && ehNucleoAnterior) {
        const prox = w[i + 1];
        const prox2 = w[i + 2];
        const hiato =
          (prox &&
            "rlzmn".includes(prox) &&
            !ehVogal(prox2) &&
            !(prox === "m" && !prox2) &&
            !(prox === "n" && prox2 === "s" && !w[i + 3])) ||
          (prox === "n" && prox2 === "h");
        // exceções: "-uiz", "-uim" etc. caem no hiato acima; "mui-to" não.
        if (!hiato) continue;
      }
      // ü é sempre semivogal
      if (c === "ü") continue;
      // "am" final = ão: a já é núcleo
    }
    nucleos.push(i);
  }
  const n = nucleos.length;
  if (n === 0) return null;

  // Sílaba tônica (contada do fim)
  let tonicaDoFim = 0;
  for (let k = n - 1; k >= 0; k--) {
    if (ACENTO_TONICO.includes(w[nucleos[k]])) {
      tonicaDoFim = n - k;
      break;
    }
  }
  if (!tonicaDoFim) {
    for (let k = n - 1; k >= 0; k--) {
      if (NASAL.includes(w[nucleos[k]])) {
        tonicaDoFim = n - k;
        break;
      }
    }
  }
  if (!tonicaDoFim) {
    const paroxitona = /([aeo]s?|[ae]m|ens)$/.test(w) && !/[aeo]i[s]?$/.test(w) && !/[aeo]u[s]?$/.test(w);
    tonicaDoFim = n === 1 ? 1 : paroxitona ? 2 : 1;
  }
  return { original, limpa: w, silabas: n, tonicaDoFim, nucleos };
}

/** Palavras do verso (ignora pontuação e marcações de acorde [G]). */
export function palavrasDoVerso(verso: string): string[] {
  return verso
    .replace(/\[[^\]]*\]/g, " ")
    .split(/[\s—–,.;:!?¡¿"“”()…]+/)
    .flatMap((p) => p.split(/(?<=[a-záéíóúâêôãõç])'(?=[a-z])/i))
    .filter((p) => /[a-záéíóúâêôãõàüç]/i.test(p));
}

export type ContagemVerso = {
  gramaticais: number;
  poeticas: number;
  elisoes: number;
  ultimaPalavra: string | null;
};

export function contarVerso(verso: string): ContagemVerso {
  const infos = palavrasDoVerso(verso)
    .map(analisarPalavra)
    .filter((x): x is InfoPalavra => x !== null);
  if (!infos.length) return { gramaticais: 0, poeticas: 0, elisoes: 0, ultimaPalavra: null };

  const gramaticais = infos.reduce((s, p) => s + p.silabas, 0);
  let elisoes = 0;
  let ultimaJaElidida = false;
  for (let i = 0; i < infos.length - 1; i++) {
    const a = infos[i].limpa;
    const b = infos[i + 1].limpa;
    const fimA = a[a.length - 1];
    const iniB = b[0] === "h" ? b[1] : b[0];
    const fimAtono = "aeo".includes(fimA) && infos[i].tonicaDoFim !== 1;
    const fimMonossilaboAtono = infos[i].silabas === 1 && "aeo".includes(fimA) && !ACENTO_TONICO.includes(fimA);
    const podeElidir = (fimAtono || fimMonossilaboAtono) && ehVogal(iniB) && !ACENTO_TONICO.includes(iniB);
    if (podeElidir && !(infos[i].silabas === 1 && ultimaJaElidida)) {
      elisoes++;
      ultimaJaElidida = true;
    } else {
      ultimaJaElidida = false;
    }
  }
  const ultima = infos[infos.length - 1];
  const poeticas = gramaticais - elisoes - (ultima.tonicaDoFim - 1);
  return { gramaticais, poeticas: Math.max(poeticas, 1), elisoes, ultimaPalavra: ultima.original };
}

// ---------------- Rima ----------------

function simplificarSom(s: string): string {
  return s
    .replace(/[áàâ]/g, "a")
    .replace(/[éê]/g, "e")
    .replace(/í/g, "i")
    .replace(/[óô]/g, "o")
    .replace(/ú/g, "u")
    .replace(/ç/g, "s")
    .replace(/ss/g, "s")
    .replace(/c(?=[ei])/g, "s")
    .replace(/sc(?=[ei])/g, "s")
    .replace(/x/g, "s")
    .replace(/z$/g, "s")
    .replace(/g(?=[ei])/g, "j")
    .replace(/c|q/g, "k")
    .replace(/rr/g, "r")
    .replace(/ão$/, "ão")
    .replace(/am$/, "ão")
    .replace(/h/g, "");
}

/** Chave de rima consoante: da vogal tônica até o fim. */
export function chaveRima(palavra: string): string | null {
  const info = analisarPalavra(palavra);
  if (!info) return null;
  const idx = info.nucleos[info.nucleos.length - info.tonicaDoFim];
  return simplificarSom(info.limpa.slice(idx));
}

/** Chave de rima toante (assonante): só as vogais a partir da tônica. */
export function chaveToante(palavra: string): string | null {
  const c = chaveRima(palavra);
  if (!c) return null;
  return c.replace(/[^aeiouãõ]/g, "");
}

/** Letras do esquema de rima (A, B, C...) para uma lista de versos. */
export function esquemaRimas(versos: string[]): (string | null)[] {
  const chaves = versos.map((v) => {
    const ult = contarVerso(v).ultimaPalavra;
    return ult ? chaveRima(ult) : null;
  });
  const letras = new Map<string, string>();
  let prox = 0;
  return chaves.map((c) => {
    if (!c) return null;
    if (!letras.has(c)) letras.set(c, String.fromCharCode(65 + (prox++ % 26)));
    return letras.get(c)!;
  });
}
