import Link from "next/link";
import type { ReactNode } from "react";
import { Voltar } from "./Icones";

export function Cabecalho({ titulo, subtitulo, voltar, acao }: { titulo: string; subtitulo?: string; voltar?: string; acao?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30">
      <div className="faixa-gaucha h-1.5" />
      <div className="couro text-creme">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-3">
          {voltar && (
            <Link
              href={voltar}
              aria-label="Voltar"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:bg-white/10"
            >
              <Voltar tamanho={26} />
            </Link>
          )}
          <div className={`min-w-0 flex-1 ${voltar ? "" : "pl-2"}`}>
            <h1 className="truncate font-titulo text-2xl font-bold leading-tight text-amarelo-claro">{titulo}</h1>
            {subtitulo && <p className="truncate text-sm text-creme/80">{subtitulo}</p>}
          </div>
          {acao}
        </div>
      </div>
    </header>
  );
}
