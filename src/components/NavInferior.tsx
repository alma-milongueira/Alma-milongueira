"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cuia, Gaita, Pessoa, Violao } from "./Icones";

const ITENS = [
  { href: "/", rotulo: "Galpão", Icone: Cuia, ativo: (p: string) => p === "/" },
  { href: "/projetos", rotulo: "Projetos", Icone: Violao, ativo: (p: string) => p.startsWith("/projeto") },
  { href: "/ideias", rotulo: "Ideias", Icone: Gaita, ativo: (p: string) => p.startsWith("/ideias") },
  { href: "/conta", rotulo: "Conta", Icone: Pessoa, ativo: (p: string) => p.startsWith("/conta") || p.startsWith("/auth") },
];

export function NavInferior() {
  const pathname = usePathname() ?? "/";
  return (
    <nav
      aria-label="Navegação principal"
      className="couro fixed inset-x-0 bottom-0 z-40 border-t-4 border-amarelo/70 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {ITENS.map(({ href, rotulo, Icone, ativo }) => {
          const on = ativo(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-1 text-sm font-bold ${
                  on ? "text-amarelo" : "text-creme/80"
                }`}
              >
                <span className={`rounded-full px-4 py-1 ${on ? "bg-white/10" : ""}`}>
                  <Icone tamanho={28} />
                </span>
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
