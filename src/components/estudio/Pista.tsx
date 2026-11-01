"use client";

import { useRef } from "react";
import { INSTRUMENTOS, type Faixa, type Instrumento } from "@/lib/estudio/tipos";
import { Bombo, Gaita, Microfone, Violao, Faisca } from "../Icones";

export const LARGURA_CABECA = 100;
export const ALTURA_PISTA = 76;

export function IconeInstrumento({ i, tamanho = 22 }: { i: Instrumento; tamanho?: number }) {
  if (i === "voz") return <Microfone tamanho={tamanho} />;
  if (i === "violao" || i === "baixo") return <Violao tamanho={tamanho} />;
  if (i === "gaita") return <Gaita tamanho={tamanho} />;
  if (i === "bombo" || i === "percussao") return <Bombo tamanho={tamanho} />;
  return <Faisca tamanho={tamanho} />;
}

export type Onda = { caminho: string; pontos: number; duracao: number };

type Props = {
  faixa: Faixa;
  inicio: number; // s na linha do tempo
  onda?: Onda;
  carregando?: boolean;
  pps: number;
  selecionada: boolean;
  soando: boolean;
  aoSelecionar: () => void;
  aoAlternar: (campo: "mudo" | "solo") => void;
  aoArrastar: (deltaMs: number, fim: boolean) => void;
};

export function Pista({ faixa, inicio, onda, carregando, pps, selecionada, soando, aoSelecionar, aoAlternar, aoArrastar }: Props) {
  const cor = INSTRUMENTOS[faixa.instrumento];
  const arraste = useRef<{ x: number; moveu: boolean } | null>(null);

  return (
    <div className="relative flex" style={{ height: ALTURA_PISTA }}>
      {/* Cabeça da faixa (fica parada ao rolar) */}
      <div
        className={`sticky left-0 z-10 flex shrink-0 flex-col justify-between border-r-4 p-1.5 text-palha ${selecionada ? "ring-4 ring-inset ring-amarelo" : ""}`}
        style={{ width: LARGURA_CABECA, background: cor.cor, borderColor: "rgb(0 0 0 / .15)" }}
      >
        <button
          type="button"
          onClick={aoSelecionar}
          className="flex min-w-0 items-center gap-1 text-left"
          aria-label={`Selecionar ${faixa.nome}`}
        >
          <IconeInstrumento i={faixa.instrumento} tamanho={18} />
          <span className="truncate text-sm font-bold">{faixa.nome}</span>
        </button>
        <div className="flex gap-1">
          <button
            type="button"
            aria-pressed={faixa.mudo}
            aria-label={`Mudo ${faixa.nome}`}
            onClick={() => aoAlternar("mudo")}
            className={`h-9 flex-1 rounded-lg text-sm font-extrabold ${faixa.mudo ? "bg-carvao text-amarelo" : "bg-black/20"}`}
          >
            M
          </button>
          <button
            type="button"
            aria-pressed={faixa.solo}
            aria-label={`Solo ${faixa.nome}`}
            onClick={() => aoAlternar("solo")}
            className={`h-9 flex-1 rounded-lg text-sm font-extrabold ${faixa.solo ? "bg-amarelo text-carvao" : "bg-black/20"}`}
          >
            S
          </button>
        </div>
      </div>

      {/* Área da onda */}
      <div className="relative flex-1 border-b border-couro/15" onClick={aoSelecionar}>
        {onda ? (
          <div
            role="slider"
            aria-label={`Posição de ${faixa.nome}`}
            aria-valuenow={Math.round(faixa.offsetMs)}
            aria-valuetext={`${(faixa.offsetMs / 1000).toFixed(2)} s`}
            tabIndex={selecionada ? 0 : -1}
            className={`absolute top-1.5 bottom-1.5 overflow-hidden rounded-xl ${selecionada ? "cursor-grab shadow-lg" : ""}`}
            style={{
              left: inicio * pps,
              width: Math.max(4, onda.duracao * pps),
              background: cor.cor,
              opacity: soando ? 1 : 0.35,
              touchAction: selecionada ? "none" : "pan-x pan-y",
              outline: selecionada ? "3px solid var(--color-amarelo)" : "none",
            }}
            onPointerDown={(e) => {
              if (!selecionada) return;
              e.stopPropagation();
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              arraste.current = { x: e.clientX, moveu: false };
            }}
            onPointerMove={(e) => {
              const a = arraste.current;
              if (!a) return;
              const dx = e.clientX - a.x;
              if (Math.abs(dx) > 2) a.moveu = true;
              if (a.moveu) aoArrastar((dx / pps) * 1000, false);
            }}
            onPointerUp={(e) => {
              const a = arraste.current;
              arraste.current = null;
              if (a?.moveu) aoArrastar(((e.clientX - a.x) / pps) * 1000, true);
            }}
            onPointerCancel={() => {
              arraste.current = null;
              aoArrastar(0, true);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") aoArrastar(-10, true);
              if (e.key === "ArrowRight") aoArrastar(10, true);
            }}
          >
            <svg className="h-full w-full" viewBox={`0 -1 ${Math.max(1, onda.pontos)} 2`} preserveAspectRatio="none" aria-hidden>
              <path d={onda.caminho} fill={cor.corOnda} />
            </svg>
          </div>
        ) : (
          <div className="flex h-full items-center px-3 text-sm text-terra">
            {carregando ? "Carregando o áudio…" : selecionada ? "Faixa vazia — toca no ● pra gravar" : "Faixa vazia"}
          </div>
        )}
      </div>
    </div>
  );
}
