"use client";

import { useCallback, useEffect, useState } from "react";
import { adicionarAcesso, LIMITE_ACESSOS, listarAcessos, removerAcesso, type Acesso } from "@/lib/data/acessos";
import { supabase } from "@/lib/supabase/client";
import { Lixo, Mais } from "../Icones";
import { Botao, BotaoIcone, Cartao, Rotulo, classeCampo, useAviso } from "../ui";

/** Painel do administrador: quem pode entrar no app (até 10 e-mails). */
export function PainelAcessos() {
  const avisar = useAviso();
  const [lista, setLista] = useState<Acesso[] | null>(null);
  const [novo, setNovo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const recarregar = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    try {
      setLista(await listarAcessos(sb));
    } catch (e) {
      avisar((e as Error).message, "erro");
    }
  }, [avisar]);

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    let vivo = true;
    listarAcessos(sb)
      .then((l) => vivo && setLista(l))
      .catch((e: Error) => avisar(e.message, "erro"));
    return () => {
      vivo = false;
    };
  }, [avisar]);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const sb = supabase();
    if (!sb) return;
    setSalvando(true);
    try {
      await adicionarAcesso(sb, novo);
      setNovo("");
      avisar("E-mail liberado. A pessoa já pode criar a conta dela.");
      await recarregar();
    } catch (err) {
      avisar((err as Error).message, "erro");
    } finally {
      setSalvando(false);
    }
  }

  async function remover(email: string) {
    const sb = supabase();
    if (!sb || !confirm(`Tirar o acesso de ${email}? Os projetos dessa pessoa ficam guardados, mas ela não consegue mais abrir.`)) return;
    try {
      await removerAcesso(sb, email);
      avisar("Acesso removido");
      await recarregar();
    } catch (err) {
      avisar((err as Error).message, "erro");
    }
  }

  const usados = lista?.length ?? 0;
  const cheio = usados >= LIMITE_ACESSOS;

  return (
    <Cartao className="border-amarelo">
      <div className="flex items-baseline justify-between">
        <h2 className="font-titulo text-2xl font-bold text-couro-escuro">Acessos</h2>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${cheio ? "bg-vermelho text-palha" : "bg-verde/15 text-verde-escuro"}`}>
          {usados}/{LIMITE_ACESSOS}
        </span>
      </div>
      <p className="mt-1 text-sm text-terra">Só os e-mails desta lista conseguem criar conta e usar o app. Tu és o administrador.</p>

      {lista === null ? (
        <p className="mt-3 text-terra">Carregando a lista…</p>
      ) : (
        <ul className="mt-3 divide-y divide-couro/10">
          {lista.map((a) => (
            <li key={a.email} className="flex min-h-12 items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-couro-escuro">{a.email}</span>
              {a.papel === "admin" ? (
                <span className="rounded-full bg-amarelo px-3 py-1 text-xs font-bold text-carvao">quem manda</span>
              ) : (
                <BotaoIcone rotulo={`Remover ${a.email}`} className="text-vermelho" onClick={() => remover(a.email)}>
                  <Lixo />
                </BotaoIcone>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={adicionar} className="mt-3 space-y-2">
        <Rotulo htmlFor="novo-acesso">Liberar novo e-mail</Rotulo>
        <input
          id="novo-acesso"
          type="email"
          inputMode="email"
          required
          disabled={cheio}
          className={classeCampo}
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          placeholder={cheio ? "Lista cheia — remova alguém" : "musico@email.com"}
        />
        <Botao type="submit" variante="verde" className="w-full" disabled={cheio || salvando || !novo.trim()}>
          <Mais tamanho={20} /> Liberar acesso
        </Botao>
      </form>
    </Cartao>
  );
}
