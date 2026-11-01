"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { contarVerso, esquemaRimas, palavrasDoVerso } from "@/lib/letra/silabas";
import { sugerirRimas } from "@/lib/letra/rimas";
import { NOMES_SECAO, novoId, secaoVazia, type Secao, type TipoSecao } from "@/lib/data/tipos";
import { Baixo, Cima, Copiar, Faisca, Lixo, Mais } from "../Icones";
import { Botao, BotaoIcone, Chip, Folha, useAviso } from "../ui";

const METRICAS = [0, 5, 6, 7, 8, 10, 12];
const CORES_RIMA = [
  "bg-vermelho text-palha",
  "bg-verde text-palha",
  "bg-amarelo text-carvao",
  "bg-couro text-palha",
  "bg-terra text-palha",
  "bg-carvao text-palha",
];

export function LetraEditor({ letra, mudar }: { letra: Secao[]; mudar: (l: Secao[]) => void }) {
  const refs = useRef(new Map<string, HTMLInputElement>());
  const [foco, setFoco] = useState<{ secao: string; verso: number } | null>(null);
  const [rimaDe, setRimaDe] = useState<{ palavra: string; verso: string } | null>(null);

  const todasPalavras = useMemo(() => [...new Set(letra.flatMap((s) => s.versos.flatMap(palavrasDoVerso)))], [letra]);

  function focar(secaoId: string, i: number) {
    requestAnimationFrame(() => {
      const el = refs.current.get(`${secaoId}:${i}`);
      el?.focus();
      if (el) el.selectionStart = el.selectionEnd = el.value.length;
    });
  }

  function atualizarSecao(id: string, f: (s: Secao) => Secao) {
    mudar(letra.map((s) => (s.id === id ? f(s) : s)));
  }

  function aoTeclar(e: KeyboardEvent<HTMLInputElement>, s: Secao, i: number) {
    const el = e.currentTarget;
    if (e.key === "Enter") {
      e.preventDefault();
      const antes = el.value.slice(0, el.selectionStart ?? el.value.length);
      const depois = el.value.slice(el.selectionEnd ?? el.value.length);
      atualizarSecao(s.id, (x) => {
        const v = [...x.versos];
        v.splice(i, 1, antes, depois);
        return { ...x, versos: v };
      });
      focar(s.id, i + 1);
    } else if (e.key === "Backspace" && el.value === "" && s.versos.length > 1) {
      e.preventDefault();
      atualizarSecao(s.id, (x) => ({ ...x, versos: x.versos.filter((_, k) => k !== i) }));
      focar(s.id, Math.max(0, i - 1));
    } else if (e.key === "ArrowDown" && i < s.versos.length - 1) {
      focar(s.id, i + 1);
    } else if (e.key === "ArrowUp" && i > 0) {
      focar(s.id, i - 1);
    }
  }

  function adicionar(tipo: TipoSecao) {
    const nova = secaoVazia(tipo);
    const anterior = [...letra].reverse().find((s) => s.tipo === tipo);
    if (anterior?.metrica) nova.metrica = anterior.metrica;
    mudar([...letra, nova]);
    focar(nova.id, 0);
  }

  function mover(idx: number, d: -1 | 1) {
    const l = [...letra];
    const alvo = idx + d;
    if (alvo < 0 || alvo >= l.length) return;
    [l[idx], l[alvo]] = [l[alvo], l[idx]];
    mudar(l);
  }

  const refraoExistente = letra.find((s) => s.tipo === "refrao" && s.versos.some((v) => v.trim()));
  const versoFocado = foco ? (letra.find((s) => s.id === foco.secao)?.versos[foco.verso] ?? "") : "";
  const ultimaFocada = contarVerso(versoFocado).ultimaPalavra;

  return (
    <div className="space-y-4">
      <p className="text-sm text-terra">
        Cada linha é um verso. <b>Enter</b> abre verso novo. O número ao lado é a contagem <b>poética</b> (até a última tônica, com
        sinalefa); o menor é a gramatical. A letra colorida marca as rimas.
      </p>

      {letra.map((s, idx) => {
        const esquema = esquemaRimas(s.versos);
        const letrasUsadas = [...new Set(esquema.filter(Boolean))] as string[];
        const repetidas = new Set(letrasUsadas.filter((l) => esquema.filter((x) => x === l).length > 1));
        return (
          <section key={s.id} className="rounded-3xl border border-couro/15 bg-palha shadow-sm">
            <div className="flex items-center gap-1 border-b border-couro/10 px-2 py-1.5">
              <select
                aria-label="Tipo de seção"
                value={s.tipo}
                onChange={(e) => atualizarSecao(s.id, (x) => ({ ...x, tipo: e.target.value as TipoSecao }))}
                className={`min-h-11 rounded-xl px-2 font-titulo text-lg font-bold ${
                  s.tipo === "refrao" ? "bg-vermelho/10 text-vermelho" : "bg-transparent text-couro-escuro"
                }`}
              >
                {Object.entries(NOMES_SECAO).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                aria-label="Métrica-alvo"
                value={s.metrica ?? 0}
                onChange={(e) => atualizarSecao(s.id, (x) => ({ ...x, metrica: Number(e.target.value) || undefined }))}
                className="min-h-11 rounded-xl bg-transparent px-1 text-sm text-terra"
              >
                {METRICAS.map((m) => (
                  <option key={m} value={m}>
                    {m ? `${m} sílabas` : "métrica livre"}
                  </option>
                ))}
              </select>
              <span className="flex-1" />
              <BotaoIcone rotulo="Subir seção" onClick={() => mover(idx, -1)} disabled={idx === 0}>
                <Cima />
              </BotaoIcone>
              <BotaoIcone rotulo="Descer seção" onClick={() => mover(idx, 1)} disabled={idx === letra.length - 1}>
                <Baixo />
              </BotaoIcone>
              <BotaoIcone
                rotulo="Apagar seção"
                className="text-vermelho"
                onClick={() => {
                  const temTexto = s.versos.some((v) => v.trim());
                  if (!temTexto || confirm("Apagar esta seção e seus versos?")) mudar(letra.filter((x) => x.id !== s.id));
                }}
              >
                <Lixo />
              </BotaoIcone>
            </div>
            <ol className="divide-y divide-couro/10">
              {s.versos.map((v, i) => {
                const c = contarVerso(v);
                const alvo = s.metrica;
                const desvio = alvo && c.poeticas ? c.poeticas - alvo : 0;
                const cor =
                  !alvo || !c.poeticas
                    ? "bg-creme-escuro text-couro-escuro"
                    : desvio === 0
                      ? "bg-verde text-palha"
                      : Math.abs(desvio) === 1
                        ? "bg-amarelo text-carvao"
                        : "bg-vermelho text-palha";
                const letraRima = esquema[i];
                const corRima =
                  letraRima && repetidas.has(letraRima) ? CORES_RIMA[letrasUsadas.indexOf(letraRima) % CORES_RIMA.length] : "";
                return (
                  <li key={i} className="flex items-center gap-2 px-3">
                    <input
                      ref={(el) => {
                        const k = `${s.id}:${i}`;
                        if (el) refs.current.set(k, el);
                        else refs.current.delete(k);
                      }}
                      value={v}
                      enterKeyHint="next"
                      autoCapitalize="sentences"
                      spellCheck
                      aria-label={`Verso ${i + 1}`}
                      placeholder={i === 0 ? "Escreve o primeiro verso…" : ""}
                      onFocus={() => setFoco({ secao: s.id, verso: i })}
                      onChange={(e) =>
                        atualizarSecao(s.id, (x) => ({ ...x, versos: x.versos.map((y, k) => (k === i ? e.target.value : y)) }))
                      }
                      onKeyDown={(e) => aoTeclar(e, s, i)}
                      className="min-h-13 min-w-0 flex-1 bg-transparent py-3 font-titulo text-xl text-carvao placeholder:text-terra/40 focus:outline-none"
                    />
                    {letraRima && corRima && (
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${corRima}`}
                        title="Rima"
                      >
                        {letraRima}
                      </span>
                    )}
                    {c.poeticas > 0 && (
                      <span
                        className={`flex min-w-11 shrink-0 flex-col items-center rounded-xl px-1.5 py-0.5 leading-none ${cor}`}
                        title={`${c.poeticas} poéticas · ${c.gramaticais} gramaticais${c.elisoes ? ` · ${c.elisoes} sinalefa(s)` : ""}`}
                      >
                        <span className="text-lg font-bold">{c.poeticas}</span>
                        <span className="text-[10px] opacity-80">{c.gramaticais}</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
            <div className="flex flex-wrap gap-2 p-2">
              <Botao
                variante="fantasma"
                onClick={() => {
                  atualizarSecao(s.id, (x) => ({ ...x, versos: [...x.versos, ""] }));
                  focar(s.id, s.versos.length);
                }}
              >
                <Mais tamanho={20} /> Verso
              </Botao>
              {foco?.secao === s.id && ultimaFocada && (
                <Botao variante="contorno" onClick={() => setRimaDe({ palavra: ultimaFocada, verso: versoFocado })}>
                  Rimas p/ «{ultimaFocada}»
                </Botao>
              )}
            </div>
          </section>
        );
      })}

      <div className="grid grid-cols-2 gap-2">
        <Botao variante="couro" onClick={() => adicionar("estrofe")}>
          <Mais tamanho={20} /> Estrofe
        </Botao>
        <Botao variante="vermelho" onClick={() => adicionar("refrao")}>
          <Mais tamanho={20} /> Refrão
        </Botao>
        <Botao variante="contorno" onClick={() => adicionar("declamado")}>
          <Mais tamanho={20} /> Declamado
        </Botao>
        <Botao
          variante="contorno"
          disabled={!refraoExistente}
          onClick={() => refraoExistente && mudar([...letra, { ...refraoExistente, id: novoId(), versos: [...refraoExistente.versos] }])}
        >
          Repetir refrão
        </Botao>
      </div>

      <FolhaRimas alvo={rimaDe} extras={todasPalavras} aoFechar={() => setRimaDe(null)} />
    </div>
  );
}

function FolhaRimas({
  alvo,
  extras,
  aoFechar,
}: {
  alvo: { palavra: string; verso: string } | null;
  extras: string[];
  aoFechar: () => void;
}) {
  const avisar = useAviso();
  const [ia, setIa] = useState<{ palavra: string; rimas: string[] } | null>(null);
  const [carregando, setCarregando] = useState(false);
  const locais = useMemo(() => (alvo ? sugerirRimas(alvo.palavra, extras) : []), [alvo, extras]);

  async function pedirIA() {
    if (!alvo) return;
    setCarregando(true);
    try {
      const r = await fetch("/api/ia", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tipo: "rimas", palavra: alvo.palavra, contexto: alvo.verso }),
      });
      const j = await r.json();
      if (j.erro) throw new Error(j.erro);
      if (j.aviso) avisar(j.aviso);
      setIa({ palavra: alvo.palavra, rimas: j.ia?.rimas ?? [] });
    } catch (e) {
      avisar(navigator.onLine ? (e as Error).message : "Sem sinal pra chamar a IA agora.", "erro");
    } finally {
      setCarregando(false);
    }
  }

  async function copiar(p: string) {
    try {
      await navigator.clipboard.writeText(p);
      avisar(`«${p}» copiada`);
    } catch {
      avisar(p);
    }
  }

  const iaAtual = ia && alvo && ia.palavra === alvo.palavra ? ia.rimas : null;

  return (
    <Folha aberta={!!alvo} aoFechar={aoFechar} titulo={`Rimas com «${alvo?.palavra ?? ""}»`}>
      <p className="mb-3 text-sm text-terra">Toca numa palavra pra copiar. Verde = palavra campeira.</p>
      {locais.length === 0 ? (
        <p className="text-terra">O dicionário do galpão não achou rima pra essa. Tenta a IA.</p>
      ) : (
        <>
          <ListaPalavras titulo="Rima perfeita" palavras={locais.filter((x) => x.tipo === "perfeita")} copiar={copiar} />
          <ListaPalavras titulo="Rima toante (só vogais)" palavras={locais.filter((x) => x.tipo === "toante")} copiar={copiar} />
        </>
      )}
      {iaAtual && (
        <div className="mt-4">
          <h3 className="mb-2 flex items-center gap-1 text-sm font-bold uppercase text-terra">
            <Faisca tamanho={16} /> Da IA
          </h3>
          <div className="flex flex-wrap gap-2">
            {iaAtual.map((p) => (
              <Chip key={p} onClick={() => copiar(p)}>
                {p}
              </Chip>
            ))}
          </div>
        </div>
      )}
      <Botao variante="verde" className="mt-5 w-full" disabled={carregando} onClick={pedirIA}>
        <Faisca /> {carregando ? "Matutando…" : "Pedir mais rimas à IA"}
      </Botao>
    </Folha>
  );
}

function ListaPalavras({
  titulo,
  palavras,
  copiar,
}: {
  titulo: string;
  palavras: { palavra: string; regional: boolean; silabas: number }[];
  copiar: (p: string) => void;
}) {
  if (!palavras.length) return null;
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-sm font-bold uppercase text-terra">{titulo}</h3>
      <div className="flex flex-wrap gap-2">
        {palavras.map((p) => (
          <button
            key={p.palavra}
            type="button"
            onClick={() => copiar(p.palavra)}
            className={`flex min-h-11 items-center gap-1.5 rounded-full border-2 px-4 font-semibold ${
              p.regional ? "border-verde bg-verde/10 text-verde-escuro" : "border-couro/25 bg-palha text-couro-escuro"
            }`}
          >
            {p.palavra}
            <span className="text-xs opacity-60">{p.silabas}</span>
            <Copiar tamanho={14} />
          </button>
        ))}
      </div>
    </div>
  );
}
