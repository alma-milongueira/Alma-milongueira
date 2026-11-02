"use client";

import Link from "next/link";
import { useState } from "react";
import { Bombo, Cuia, Gaita, Violao } from "@/components/Icones";
import { useSessao } from "@/components/Sessao";
import { Botao, classeCampo, useAviso } from "@/components/ui";
import { emailValido, normalizarEmail, problemaSenha, SENHA_MINIMA, traduzirErroAuth } from "@/lib/data/auth";
import { supabase } from "@/lib/supabase/client";

type Modo = "entrar" | "criar" | "esqueci";

const TITULOS: Record<Modo, string> = { entrar: "Entrar", criar: "Criar conta", esqueci: "Recuperar senha" };

export function TelaEntrada() {
  const { nuvemDisponivel } = useSessao();
  const avisar = useAviso();
  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  function trocar(m: Modo) {
    setModo(m);
    setMensagem(null);
    setSenha("");
    setSenha2("");
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const sb = supabase();
    if (!sb) return;
    const em = normalizarEmail(email);
    if (!emailValido(em)) return avisar("Esse e-mail não parece válido.", "erro");
    if (modo === "criar") {
      const p = problemaSenha(senha, senha2);
      if (p) return avisar(p, "erro");
    }
    setEnviando(true);
    try {
      const redirect = `${window.location.origin}/auth/callback`;
      if (modo === "entrar") {
        const { error } = await sb.auth.signInWithPassword({ email: em, password: senha });
        if (error) throw error;
        // a porteira leva pro app assim que a sessão chega
      } else if (modo === "criar") {
        const { data, error } = await sb.auth.signUp({ email: em, password: senha, options: { emailRedirectTo: redirect } });
        if (error) throw error;
        if (!data.session) {
          trocar("entrar");
          setMensagem(`Conta criada! Mandamos um e-mail pra ${em}. Toca no link de confirmação e depois entra com tua senha.`);
        }
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(em, { redirectTo: redirect });
        if (error) throw error;
        setMensagem(`Se ${em} tiver conta, chega um e-mail com o link pra criar uma senha nova.`);
      }
    } catch (err) {
      avisar(traduzirErroAuth((err as Error).message), "erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="couro min-h-dvh text-creme">
      <div className="faixa-gaucha h-1.5" />
      <div className="mx-auto flex min-h-[calc(100dvh-6px)] max-w-md flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(2.5rem+env(safe-area-inset-top))]">
        {/* Marca */}
        <div className="flex flex-col items-center text-center">
          <div className="pesponto flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-couro text-amarelo-claro shadow-lg">
            <Cuia tamanho={56} />
          </div>
          <h1 className="mt-5 font-titulo text-4xl font-extrabold leading-tight text-palha">Alma Milongueira</h1>
          <p className="mt-2 max-w-xs text-lg text-creme/80">Estúdio de bolso pra compor a música da querência.</p>
          <div className="mt-4 flex gap-5 text-amarelo/70" aria-hidden>
            <Gaita tamanho={28} />
            <Violao tamanho={28} />
            <Bombo tamanho={28} />
          </div>
        </div>

        {/* Formulário */}
        <div className="mt-8 rounded-[2rem] bg-creme p-5 text-carvao shadow-2xl">
          {!nuvemDisponivel ? (
            <div className="space-y-3 text-center">
              <p className="text-couro-escuro">
                O login ainda não está ligado neste endereço (faltam as chaves do Supabase). Dá pra usar o app guardando tudo só neste
                aparelho.
              </p>
              <Link href="/" className="block rounded-2xl bg-vermelho py-4 text-lg font-bold text-palha">
                Usar neste aparelho
              </Link>
            </div>
          ) : (
            <>
              {modo !== "esqueci" && (
                <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-creme-escuro p-1" role="tablist">
                  {(["entrar", "criar"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="tab"
                      aria-selected={modo === m}
                      onClick={() => trocar(m)}
                      className={`min-h-12 rounded-xl text-lg font-bold ${modo === m ? "bg-palha text-couro-escuro shadow" : "text-terra"}`}
                    >
                      {TITULOS[m]}
                    </button>
                  ))}
                </div>
              )}
              {modo === "esqueci" && <h2 className="mb-4 font-titulo text-2xl font-bold text-couro-escuro">Recuperar senha</h2>}

              {mensagem && <p className="mb-4 rounded-2xl bg-verde/10 p-3 text-verde-escuro">{mensagem}</p>}

              <form onSubmit={enviar} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold uppercase tracking-wide text-terra">E-mail</span>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    required
                    className={classeCampo}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teu@email.com"
                  />
                </label>
                {modo !== "esqueci" && (
                  <label className="block">
                    <span className="mb-1.5 flex justify-between text-sm font-bold uppercase tracking-wide text-terra">
                      <span>{modo === "criar" ? `Senha (mín. ${SENHA_MINIMA})` : "Senha"}</span>
                      <button type="button" className="normal-case text-verde underline" onClick={() => setVerSenha((v) => !v)}>
                        {verSenha ? "esconder" : "mostrar"}
                      </button>
                    </span>
                    <input
                      type={verSenha ? "text" : "password"}
                      autoComplete={modo === "criar" ? "new-password" : "current-password"}
                      required
                      minLength={modo === "criar" ? SENHA_MINIMA : 1}
                      className={classeCampo}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                    />
                  </label>
                )}
                {modo === "criar" && (
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-bold uppercase tracking-wide text-terra">Repete a senha</span>
                    <input
                      type={verSenha ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      className={classeCampo}
                      value={senha2}
                      onChange={(e) => setSenha2(e.target.value)}
                    />
                  </label>
                )}
                <Botao type="submit" variante="vermelho" grande className="w-full" disabled={enviando}>
                  {enviando
                    ? "Aguarda…"
                    : modo === "entrar"
                      ? "Entrar"
                      : modo === "criar"
                        ? "Criar minha conta"
                        : "Mandar link de senha nova"}
                </Botao>
              </form>

              <div className="mt-4 text-center">
                {modo === "entrar" ? (
                  <button type="button" className="min-h-11 font-bold text-verde underline" onClick={() => trocar("esqueci")}>
                    Esqueci a senha
                  </button>
                ) : modo === "esqueci" ? (
                  <button type="button" className="min-h-11 font-bold text-verde underline" onClick={() => trocar("entrar")}>
                    Voltar pra entrada
                  </button>
                ) : (
                  <p className="text-sm text-terra">Depois de criar, confirma o e-mail pelo link que vamos mandar.</p>
                )}
              </div>
            </>
          )}
        </div>

        <p className="mt-auto pt-8 text-center text-sm text-creme/50">Feito com mate e saudade no Rio Grande do Sul</p>
      </div>
    </main>
  );
}
