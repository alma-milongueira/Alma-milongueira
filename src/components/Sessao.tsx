"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { minhaSituacao, type SituacaoAcesso } from "@/lib/data/acessos";
import { repositorioLocal } from "@/lib/data/local";
import { criarRepositorioNuvem } from "@/lib/data/nuvem";
import type { Repositorio } from "@/lib/data/tipos";
import { criarFaixasNuvem, faixasLocais, type RepositorioFaixas } from "@/lib/estudio/repositorio";
import { supabase, supabaseConfigurado } from "@/lib/supabase/client";

type Ctx = {
  pronto: boolean;
  usuario: User | null;
  /** Se o e-mail da conta está na lista de acessos. */
  acesso: SituacaoAcesso | null;
  admin: boolean;
  /** A pessoa chegou pelo link de "esqueci a senha" e precisa definir uma nova. */
  recuperandoSenha: boolean;
  fimRecuperacao: () => void;
  repo: Repositorio;
  faixas: RepositorioFaixas;
  nuvemDisponivel: boolean;
  sair: () => Promise<void>;
};

const SessaoCtx = createContext<Ctx>({
  pronto: false,
  usuario: null,
  acesso: null,
  admin: false,
  recuperandoSenha: false,
  fimRecuperacao: () => {},
  repo: repositorioLocal,
  faixas: faixasLocais,
  nuvemDisponivel: false,
  sair: async () => {},
});

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [pronto, setPronto] = useState(!supabaseConfigurado);
  const [situacao, setSituacao] = useState<{ email: string; acesso: SituacaoAcesso; admin: boolean } | null>(null);
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    let vivo = true;
    sb.auth.getSession().then(({ data }) => {
      if (!vivo) return;
      setUsuario(data.session?.user ?? null);
      setPronto(true);
    });
    const { data } = sb.auth.onAuthStateChange((evento, s) => {
      if (evento === "PASSWORD_RECOVERY") setRecuperandoSenha(true);
      setUsuario(s?.user ?? null);
      setPronto(true);
    });
    return () => {
      vivo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // Confere a lista de acessos sempre que muda a conta
  const email = usuario?.email ?? null;
  useEffect(() => {
    const sb = supabase();
    if (!sb || !email) return;
    let vivo = true;
    minhaSituacao(sb, email).then((r) => vivo && setSituacao({ email, acesso: r.situacao, admin: r.admin }));
    return () => {
      vivo = false;
    };
  }, [email]);

  const valor = useMemo<Ctx>(() => {
    const sb = supabase();
    const atual = situacao && situacao.email === email ? situacao : null;
    const acesso: SituacaoAcesso | null = !usuario ? null : (atual?.acesso ?? "carregando");
    // Sem a nuvem liberada, os dados ficam no aparelho (a RLS barraria tudo de qualquer jeito)
    const naNuvem = !!(sb && usuario && acesso === "liberado");
    return {
      pronto: pronto && acesso !== "carregando",
      usuario,
      acesso,
      admin: !!atual?.admin,
      recuperandoSenha,
      fimRecuperacao: () => setRecuperandoSenha(false),
      nuvemDisponivel: supabaseConfigurado,
      repo: naNuvem ? criarRepositorioNuvem(sb!, usuario!.id) : repositorioLocal,
      faixas: naNuvem ? criarFaixasNuvem(sb!, usuario!.id) : faixasLocais,
      sair: async () => {
        await sb?.auth.signOut();
      },
    };
  }, [pronto, usuario, email, situacao, recuperandoSenha]);

  return <SessaoCtx.Provider value={valor}>{children}</SessaoCtx.Provider>;
}

export const useSessao = () => useContext(SessaoCtx);
