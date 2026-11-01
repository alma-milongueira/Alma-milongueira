"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { repositorioLocal } from "@/lib/data/local";
import { criarRepositorioNuvem } from "@/lib/data/nuvem";
import type { Repositorio } from "@/lib/data/tipos";
import { criarFaixasNuvem, faixasLocais, type RepositorioFaixas } from "@/lib/estudio/repositorio";
import { supabase, supabaseConfigurado } from "@/lib/supabase/client";

type Ctx = {
  pronto: boolean;
  usuario: User | null;
  repo: Repositorio;
  faixas: RepositorioFaixas;
  nuvemDisponivel: boolean;
  sair: () => Promise<void>;
};

const SessaoCtx = createContext<Ctx>({
  pronto: false,
  usuario: null,
  repo: repositorioLocal,
  faixas: faixasLocais,
  nuvemDisponivel: false,
  sair: async () => {},
});

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [pronto, setPronto] = useState(!supabaseConfigurado);

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    let vivo = true;
    sb.auth.getSession().then(({ data }) => {
      if (!vivo) return;
      setUsuario(data.session?.user ?? null);
      setPronto(true);
    });
    const { data } = sb.auth.onAuthStateChange((_e, s) => {
      setUsuario(s?.user ?? null);
      setPronto(true);
    });
    return () => {
      vivo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const valor = useMemo<Ctx>(() => {
    const sb = supabase();
    return {
      pronto,
      usuario,
      nuvemDisponivel: supabaseConfigurado,
      repo: sb && usuario ? criarRepositorioNuvem(sb, usuario.id) : repositorioLocal,
      faixas: sb && usuario ? criarFaixasNuvem(sb, usuario.id) : faixasLocais,
      sair: async () => {
        await sb?.auth.signOut();
      },
    };
  }, [pronto, usuario]);

  return <SessaoCtx.Provider value={valor}>{children}</SessaoCtx.Provider>;
}

export const useSessao = () => useContext(SessaoCtx);
