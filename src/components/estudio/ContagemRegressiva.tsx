"use client";

import { useEffect, useState } from "react";

type Props = {
  ctx: AudioContext;
  /** Instantes (relógio do áudio) de cada batida da contagem. */
  batidas: number[];
  /** Instante em que a gravação de fato começa. */
  inicio: number;
  aoCancelar: () => void;
  aoTerminar: () => void;
};

/**
 * Contagem regressiva em tela cheia (3… 2… 1… Grava!), no mesmo tempo do click que toca no fone.
 * Usa o relógio do áudio (descontando a latência de saída) pra o número trocar junto com o som.
 */
export function ContagemRegressiva({ ctx, batidas, inicio, aoCancelar, aoTerminar }: Props) {
  const total = batidas.length;
  const [numero, setNumero] = useState<number | "grava" | null>(total || null);

  useEffect(() => {
    let id = 0;
    let ultimo: number | "grava" | null = null;
    const passo = () => {
      const agora = ctx.currentTime - (ctx.outputLatency || 0);
      let n: number | "grava" | null;
      if (agora >= inicio + 0.7) n = null;
      else if (agora >= inicio) n = "grava";
      else {
        const passadas = batidas.filter((t) => agora >= t).length;
        n = Math.max(1, total - Math.max(0, passadas - 1));
      }
      if (n !== ultimo) {
        ultimo = n;
        setNumero(n);
        if (typeof n === "number" || n === "grava") navigator.vibrate?.(n === "grava" ? 60 : 25);
        if (n === null) {
          aoTerminar();
          return;
        }
      }
      id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [ctx, batidas, inicio, total, aoTerminar]);

  if (numero === null) return null;
  const grava = numero === "grava";

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-carvao/80 backdrop-blur-sm"
      role="status"
      aria-live="assertive"
    >
      <div className="faixa-gaucha absolute inset-x-0 top-0 h-1.5" />
      <p className="mb-8 text-lg font-bold uppercase tracking-[0.3em] text-creme/70">{grava ? "" : "Prepara…"}</p>
      <div
        key={String(numero)}
        className={`flex h-56 w-56 items-center justify-center rounded-full font-titulo font-extrabold shadow-2xl animate-[contagem_0.45s_ease-out] ${
          grava ? "bg-vermelho text-6xl text-palha" : "bg-palha text-[9rem] leading-none text-couro-escuro"
        }`}
      >
        {grava ? "Grava!" : numero}
      </div>
      {!grava && (
        <div className="mt-6 flex gap-3" aria-hidden>
          {Array.from({ length: total }, (_, k) => (
            <span key={k} className={`h-3 w-3 rounded-full ${total - k > (numero as number) ? "bg-amarelo" : "bg-creme/30"}`} />
          ))}
        </div>
      )}
      {!grava && (
        <button
          type="button"
          onClick={aoCancelar}
          className="mt-10 min-h-12 rounded-full border-2 border-creme/40 px-8 text-lg font-bold text-creme"
        >
          Cancelar
        </button>
      )}
    </div>
  );
}
