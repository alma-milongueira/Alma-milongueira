"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Cuia } from "./Icones";
import { NavInferior } from "./NavInferior";
import { useSessao } from "./Sessao";

// Telas que abrem sem estar logado
const LIVRES = ["/entrar", "/auth/callback", "/offline"];

/**
 * Porteira do app: com a nuvem configurada, quem não entrou vai pra tela de entrada.
 * (Sem Supabase configurado, o app funciona em modo local, sem login.)
 */
export function Portao({ children }: { children: ReactNode }) {
  const { pronto, usuario, nuvemDisponivel, recuperandoSenha } = useSessao();
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const livre = LIVRES.some((p) => pathname.startsWith(p));
  const precisaEntrar = nuvemDisponivel && pronto && !usuario && !livre;

  useEffect(() => {
    if (precisaEntrar) {
      const volta = pathname !== "/" ? `?voltar=${encodeURIComponent(pathname + window.location.search)}` : "";
      router.replace(`/entrar${volta}`);
    }
  }, [precisaEntrar, pathname, router]);

  // quem já entrou e caiu na tela de entrada vai pro início (menos no meio da troca de senha)
  useEffect(() => {
    if (pronto && usuario && pathname.startsWith("/entrar") && !recuperandoSenha) {
      const voltar = new URLSearchParams(window.location.search).get("voltar");
      router.replace(voltar && voltar.startsWith("/") && !voltar.startsWith("//") ? voltar : "/");
    }
  }, [pronto, usuario, pathname, router, recuperandoSenha]);

  if (livre) return <>{children}</>;

  if (nuvemDisponivel && (!pronto || !usuario)) {
    return (
      <div className="couro flex min-h-dvh flex-col items-center justify-center gap-3 text-amarelo-claro">
        <Cuia tamanho={64} />
        <p className="font-titulo text-xl">Abrindo a porteira…</p>
      </div>
    );
  }

  return (
    <>
      <div className="pb-nav mx-auto min-h-dvh max-w-lg">{children}</div>
      <NavInferior />
    </>
  );
}
