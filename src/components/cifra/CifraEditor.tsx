"use client";

import { useRef, useState } from "react";
import { acordesDaCifra, parseLinhaCifra, transporAcorde, transporCifra } from "@/lib/music/acordes";
import { AFINACOES, buscarPosicoes, semitonsDesenho, type AfinacaoId } from "@/lib/music/afinacoes";
import { campoHarmonico, nomeDoTomPorExtenso } from "@/lib/music/harmonia";
import { tomPrefereBemol, transporTom } from "@/lib/music/notas";
import type { Secao } from "@/lib/data/tipos";
import { NOMES_SECAO } from "@/lib/data/tipos";
import { DiagramaAcorde } from "./DiagramaAcorde";
import { Mais, Menos } from "../Icones";
import { Botao, Chip, Folha, Rotulo, useAviso } from "../ui";

type Props = {
  cifra: string;
  tom: string;
  capo: number;
  afinacao: AfinacaoId;
  letra: Secao[];
  mudar: (alt: { cifra?: string; tom?: string; capo?: number }) => void;
};

export function CifraEditor({ cifra, tom, capo, afinacao, letra, mudar }: Props) {
  const avisar = useAviso();
  const [modo, setModo] = useState<"ver" | "editar">(cifra.trim() ? "ver" : "editar");
  const [transpor, setTranspor] = useState(0);
  const [mostrar, setMostrar] = useState<"som" | "desenho">("som");
  const [fonte, setFonte] = useState(18);
  const [acordeAberto, setAcordeAberto] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  const tomSom = transporTom(tom, transpor);
  const bemolSom = tomPrefereBemol(tomSom);
  const desloc = semitonsDesenho(capo, afinacao);
  const tomDesenho = transporTom(tomSom, desloc);
  const bemolDesenho = tomPrefereBemol(tomDesenho);
  const cifraSom = transporCifra(cifra, transpor, bemolSom);
  const exibir = (acorde: string) => (mostrar === "desenho" && desloc !== 0 ? transporAcorde(acorde, desloc, bemolDesenho) : acorde);
  const acordes = acordesDaCifra(cifraSom);
  const campo = campoHarmonico(tom);

  function inserir(txt: string) {
    const el = area.current;
    if (!el) {
      mudar({ cifra: cifra + txt });
      return;
    }
    const ini = el.selectionStart;
    const fim = el.selectionEnd;
    const novo = cifra.slice(0, ini) + txt + cifra.slice(fim);
    mudar({ cifra: novo });
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = ini + txt.length;
    });
  }

  function puxarLetra() {
    const texto = letra
      .filter((s) => s.versos.some((v) => v.trim()))
      .map((s) => `{${NOMES_SECAO[s.tipo]}}\n${s.versos.filter((v) => v.trim()).join("\n")}`)
      .join("\n\n");
    if (!texto) {
      avisar("A letra ainda está em branco.", "erro");
      return;
    }
    if (cifra.trim() && !confirm("Já tem cifra escrita. Acrescentar a letra no fim?")) return;
    mudar({ cifra: cifra.trim() ? `${cifra}\n\n${texto}` : texto });
    setModo("editar");
  }

  function gravarTransposicao() {
    mudar({ cifra: cifraSom, tom: tomSom });
    setTranspor(0);
    avisar(`Cifra passada pra ${tomSom}`);
  }

  function sugerirCapo() {
    if (!acordes.length) return;
    let melhor = { capo: 0, nota: Infinity };
    for (let c = 0; c <= 7; c++) {
      let soma = 0;
      for (const a of acordes) {
        const p = buscarPosicoes(a, afinacao, c, 1)[0];
        soma += p ? p.pontuacao : 40;
      }
      const nota = soma / acordes.length + c * 0.4;
      if (nota < melhor.nota) melhor = { capo: c, nota };
    }
    mudar({ capo: melhor.capo });
    setMostrar("desenho");
    const tomD = transporTom(tomSom, semitonsDesenho(melhor.capo, afinacao));
    avisar(melhor.capo ? `Capo na ${melhor.capo}ª casa, desenhos de ${tomD}` : "Sem capo fica mais fácil");
  }

  return (
    <div className="space-y-4">
      {/* Painel de tom/capo */}
      <div className="rounded-3xl bg-couro-escuro p-4 text-creme">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-creme/70">Tom que soa</p>
            <p className="font-titulo text-3xl font-bold text-amarelo-claro">{tomSom}</p>
            <p className="text-xs text-creme/70">{nomeDoTomPorExtenso(tomSom)}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              aria-label="Meio tom abaixo"
              onClick={() => setTranspor((t) => t - 1)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
            >
              <Menos />
            </button>
            <span className="w-12 text-center font-bold">{transpor > 0 ? `+${transpor}` : transpor}</span>
            <button
              aria-label="Meio tom acima"
              onClick={() => setTranspor((t) => t + 1)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 active:bg-white/20"
            >
              <Mais />
            </button>
          </div>
        </div>
        {transpor !== 0 && (
          <div className="mt-3 flex gap-2">
            <Botao variante="amarelo" className="flex-1" onClick={gravarTransposicao}>
              Gravar em {tomSom}
            </Botao>
            <Botao variante="fantasma" className="text-creme" onClick={() => setTranspor(0)}>
              Voltar
            </Botao>
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-creme/70">Capotraste</span>
            <select
              value={capo}
              onChange={(e) => mudar({ capo: Number(e.target.value) })}
              className="min-h-11 rounded-xl bg-white/10 px-2 text-base text-creme"
            >
              {Array.from({ length: 13 }, (_, i) => (
                <option key={i} value={i} className="text-carvao">
                  {i ? `${i}ª casa` : "Sem capo"}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-creme/70">Afinação</span>
            <span className="flex min-h-11 items-center rounded-xl bg-white/5 px-2 text-base">{AFINACOES[afinacao].nome}</span>
          </div>
        </div>
        {desloc !== 0 && (
          <p className="mt-3 rounded-xl bg-white/10 p-2 text-sm">
            Soa em <b>{tomSom}</b>, mas na mão tu faz os desenhos de <b className="text-amarelo-claro">{tomDesenho}</b>.
          </p>
        )}
        <Botao variante="fantasma" className="mt-2 w-full text-amarelo-claro" onClick={sugerirCapo} disabled={!acordes.length}>
          Sugerir capotraste mais fácil
        </Botao>
      </div>

      <div className="flex gap-2">
        <Chip ativo={modo === "ver"} onClick={() => setModo("ver")}>
          Tocar
        </Chip>
        <Chip ativo={modo === "editar"} onClick={() => setModo("editar")}>
          Escrever
        </Chip>
        <span className="flex-1" />
        {desloc !== 0 && modo === "ver" && (
          <Chip ativo={mostrar === "desenho"} onClick={() => setMostrar((m) => (m === "som" ? "desenho" : "som"))}>
            {mostrar === "desenho" ? "Desenho" : "Som real"}
          </Chip>
        )}
      </div>

      {modo === "editar" ? (
        <div className="space-y-3">
          <p className="text-sm text-terra">
            Escreve o acorde entre colchetes antes da sílaba: <code className="rounded bg-creme-escuro px-1">[Em]Lá no meu [B7]pago</code>.
            Linha com <code className="rounded bg-creme-escuro px-1">{"{Refrão}"}</code> vira título de parte.
          </p>
          <div>
            <Rotulo>Acordes do tom ({tom}) — toca pra inserir</Rotulo>
            <div className="flex flex-wrap gap-2">
              {campo.map((c) => (
                <button
                  key={c.grau}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => inserir(`[${c.acorde}]`)}
                  className="flex min-h-12 min-w-14 flex-col items-center justify-center rounded-2xl border-2 border-couro/25 bg-palha px-3 active:bg-amarelo-claro"
                >
                  <span className="font-cifra text-base font-bold text-vermelho">{c.acorde}</span>
                  <span className="text-[10px] text-terra">{c.grau}</span>
                </button>
              ))}
            </div>
          </div>
          <textarea
            ref={area}
            value={cifra}
            onChange={(e) => mudar({ cifra: e.target.value })}
            rows={16}
            spellCheck={false}
            aria-label="Cifra"
            placeholder={"{Estrofe}\n[Em]Lá no meu pago, [Am]onde o vento\n[B7]canta milonga ao [Em]entardecer"}
            className="cifra-linha w-full rounded-2xl border-2 border-couro/25 bg-white/70 p-3 text-base leading-relaxed focus:border-verde focus:outline-none"
          />
          <Botao variante="contorno" className="w-full" onClick={puxarLetra}>
            Puxar a letra pra cá
          </Botao>
        </div>
      ) : (
        <div>
          <div className="mb-2 flex items-center justify-end gap-1 text-sm text-terra">
            Letra
            <button
              aria-label="Diminuir letra"
              className="h-10 w-10 rounded-full bg-creme-escuro font-bold"
              onClick={() => setFonte((f) => Math.max(13, f - 2))}
            >
              A−
            </button>
            <button
              aria-label="Aumentar letra"
              className="h-10 w-10 rounded-full bg-creme-escuro font-bold"
              onClick={() => setFonte((f) => Math.min(32, f + 2))}
            >
              A+
            </button>
          </div>
          {cifraSom.trim() ? (
            <div className="rounded-3xl bg-palha p-4 shadow-sm" style={{ fontSize: fonte }}>
              {cifraSom.split("\n").map((linha, i) => {
                const titulo = /^\s*\{(.+)\}\s*$/.exec(linha);
                if (titulo)
                  return (
                    <h3 key={i} className="mb-1 mt-4 font-titulo text-[1.1em] font-bold text-vermelho first:mt-0">
                      {titulo[1]}
                    </h3>
                  );
                if (!linha.trim()) return <div key={i} className="h-3" />;
                const trechos = parseLinhaCifra(linha);
                const temAcorde = trechos.some((t) => t.acorde);
                return (
                  <div key={i} className="flex flex-wrap items-end">
                    {trechos.map((t, k) => (
                      <span key={k} className="inline-flex flex-col whitespace-pre">
                        {temAcorde && (
                          <button
                            type="button"
                            disabled={!t.acorde}
                            onClick={() => t.acorde && setAcordeAberto(t.acorde)}
                            className="cifra-linha min-h-[1.4em] pr-1 text-left text-[0.9em] font-bold text-vermelho"
                          >
                            {t.acorde ? exibir(t.acorde) : ""}
                          </button>
                        )}
                        <span className="font-titulo">{t.texto || (t.acorde ? " " : "")}</span>
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-3xl border-2 border-dashed border-couro/30 p-6 text-center text-terra">
              Cifra em branco. Vai em <b>Escrever</b> ou puxa a letra.
            </p>
          )}

          {acordes.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 font-titulo text-xl font-bold text-couro-escuro">
                Desenhos na mão {capo > 0 && <span className="text-base font-normal text-terra">(capo na {capo}ª)</span>}
              </h3>
              <div className="flex flex-wrap gap-2">
                {acordes.map((a) => {
                  const pos = buscarPosicoes(a, afinacao, capo, 1)[0];
                  const desenho = transporAcorde(a, desloc, bemolDesenho);
                  return (
                    <button key={a} type="button" onClick={() => setAcordeAberto(a)} className="rounded-2xl bg-palha p-1 shadow-sm">
                      <DiagramaAcorde nome={desenho} posicao={pos} legenda={desloc !== 0 ? `soa ${a}` : undefined} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <Folha
        aberta={!!acordeAberto}
        aoFechar={() => setAcordeAberto(null)}
        titulo={`Posições de ${acordeAberto ? exibir(acordeAberto) : ""}`}
      >
        {acordeAberto && (
          <>
            <p className="mb-3 text-sm text-terra">
              Afinação {AFINACOES[afinacao].nome} ({AFINACOES[afinacao].cordas}){capo ? `, capo na ${capo}ª casa` : ""}.{" "}
              {AFINACOES[afinacao].dica}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {buscarPosicoes(acordeAberto, afinacao, capo, 4).map((p, i) => (
                <DiagramaAcorde
                  key={i}
                  nome={transporAcorde(acordeAberto, desloc, bemolDesenho)}
                  posicao={p}
                  legenda={i === 0 ? "mais fácil" : `opção ${i + 1}`}
                />
              ))}
              {buscarPosicoes(acordeAberto, afinacao, capo, 1).length === 0 && (
                <p className="text-terra">Não achei posição confortável nessa afinação.</p>
              )}
            </div>
          </>
        )}
      </Folha>
    </div>
  );
}
