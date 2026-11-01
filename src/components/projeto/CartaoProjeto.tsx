import Link from "next/link";
import type { Projeto } from "@/lib/data/tipos";
import { RITMOS } from "@/lib/music/ritmos";
import { IconeRitmo } from "./IconeRitmo";

export function CartaoProjeto({ p }: { p: Projeto }) {
  const r = RITMOS[p.ritmo];
  const versos = p.letra.reduce((s, sec) => s + sec.versos.filter((v) => v.trim()).length, 0);
  const data = new Date(p.atualizadoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return (
    <Link
      href={`/projeto?id=${p.id}`}
      className="flex items-center gap-4 rounded-3xl border border-couro/15 bg-palha p-4 shadow-sm active:bg-creme-escuro"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-couro text-amarelo-claro">
        <IconeRitmo ritmo={p.ritmo} tamanho={32} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-titulo text-xl font-bold text-couro-escuro">{p.titulo}</span>
        <span className="block text-sm text-terra">
          {r?.nome ?? p.ritmo} · {p.tom} · {p.bpm} BPM
        </span>
        <span className="block text-xs text-terra/70">
          {versos} {versos === 1 ? "verso" : "versos"} · mexido em {data}
        </span>
      </span>
    </Link>
  );
}
