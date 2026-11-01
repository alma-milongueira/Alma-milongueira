"use client";

import { useRef } from "react";
import { LARGURA_CABECA } from "./Pista";

type Props = {
  duracao: number;
  pps: number;
  bpm: number;
  tempos: number;
  loop: [number, number] | null;
  loopAtivo: boolean;
  aoBuscar: (t: number) => void;
  aoDefinirLoop: (r: [number, number]) => void;
};

/** Régua com compassos; toque = mover o cursor, arrastar = marcar trecho pra repetir. */
export function Regua({ duracao, pps, bpm, tempos, loop, loopAtivo, aoBuscar, aoDefinirLoop }: Props) {
  const ini = useRef<{ x: number; t: number; moveu: boolean } | null>(null);
  const compasso = (60 / bpm) * tempos;
  const nCompassos = Math.ceil(duracao / compasso);
  const pulo = Math.max(1, Math.ceil(36 / (compasso * pps))); // evita números grudados

  const tempoDoEvento = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.max(0, (e.clientX - r.left) / pps);
  };

  return (
    <div className="sticky top-0 z-20 flex h-9 bg-couro-escuro text-creme">
      <div
        className="sticky left-0 z-10 flex shrink-0 items-center justify-center bg-couro-escuro text-[10px] uppercase tracking-wide text-creme/60"
        style={{ width: LARGURA_CABECA }}
      >
        compasso
      </div>
      <div
        className="relative flex-1 touch-none select-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const t = tempoDoEvento(e);
          ini.current = { x: e.clientX, t, moveu: false };
        }}
        onPointerMove={(e) => {
          const a = ini.current;
          if (!a) return;
          if (Math.abs(e.clientX - a.x) > 8) a.moveu = true;
          if (a.moveu) {
            const t = tempoDoEvento(e);
            aoDefinirLoop([Math.min(a.t, t), Math.max(a.t, t)]);
          }
        }}
        onPointerUp={(e) => {
          const a = ini.current;
          ini.current = null;
          if (a && !a.moveu) aoBuscar(tempoDoEvento(e));
        }}
      >
        {loop && (
          <div
            className={`absolute inset-y-0 ${loopAtivo ? "bg-amarelo/60" : "bg-amarelo/25"}`}
            style={{ left: loop[0] * pps, width: (loop[1] - loop[0]) * pps }}
          />
        )}
        {Array.from({ length: nCompassos + 1 }, (_, k) => (
          <div key={k} className="absolute bottom-0 top-0 border-l border-creme/30" style={{ left: k * compasso * pps }}>
            {k % pulo === 0 && <span className="absolute left-1 top-0.5 text-xs font-bold">{k + 1}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
