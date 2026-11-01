"use client";

import { useState, useSyncExternalStore } from "react";
import { Cabecalho } from "@/components/Cabecalho";
import { Celular, Nuvem } from "@/components/Icones";
import { useSessao } from "@/components/Sessao";
import { Botao, Cartao, Rotulo, classeCampo, useAviso } from "@/components/ui";
import { limparLocais, projetosLocais } from "@/lib/data/local";
import { importarParaNuvem } from "@/lib/data/nuvem";
import { supabase } from "@/lib/supabase/client";

const semInscricao = () => () => {};

export default function Conta() {
  const { usuario, nuvemDisponivel, pronto, sair } = useSessao();
  const avisar = useAviso();
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [, setVersao] = useState(0);
  const locais = useSyncExternalStore(
    semInscricao,
    () => projetosLocais().length,
    () => 0,
  );

  const redirect = () => `${window.location.origin}/auth/callback`;

  async function entrarGoogle() {
    const sb = supabase();
    if (!sb) return;
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirect() } });
    if (error) avisar(error.message, "erro");
  }

  async function entrarEmail(e: React.FormEvent) {
    e.preventDefault();
    const sb = supabase();
    if (!sb || !email.trim()) return;
    setEnviando(true);
    const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirect() } });
    setEnviando(false);
    if (error) avisar(error.message, "erro");
    else setEnviado(true);
  }

  async function levarPraNuvem() {
    const sb = supabase();
    if (!sb || !usuario) return;
    try {
      const lista = projetosLocais();
      const n = await importarParaNuvem(sb, usuario.id, lista);
      limparLocais(lista.map((p) => p.id));
      setVersao((v) => v + 1);
      avisar(`${n} projeto(s) levados pra nuvem`);
    } catch (e) {
      avisar((e as Error).message, "erro");
    }
  }

  return (
    <main>
      <Cabecalho titulo="Conta" subtitulo={usuario ? (usuario.email ?? "") : "Onde guardar tuas composições"} />
      <div className="space-y-4 p-4">
        {!nuvemDisponivel ? (
          <Cartao>
            <div className="flex items-center gap-3 text-couro-escuro">
              <Celular tamanho={32} />
              <p className="font-bold">Modo local</p>
            </div>
            <p className="mt-2 text-terra">
              Este galpão está sem Supabase configurado, então tudo fica guardado só neste aparelho (funciona sem internet). Pra guardar na
              nuvem, preencha <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> — veja o README.
            </p>
          </Cartao>
        ) : !pronto ? (
          <p className="text-terra">Conferindo a sessão…</p>
        ) : usuario ? (
          <>
            <Cartao>
              <div className="flex items-center gap-3 text-verde-escuro">
                <Nuvem tamanho={32} />
                <p className="font-bold">Guardando na nuvem</p>
              </div>
              <p className="mt-2 text-terra">Entraste como {usuario.email}. Teus projetos ficam salvos e protegidos (só tu enxergas).</p>
            </Cartao>
            {locais > 0 && (
              <Cartao className="border-amarelo bg-amarelo-claro/30">
                <p className="text-couro-escuro">
                  Tem <b>{locais}</b> projeto(s) guardados só neste aparelho, de antes de entrar.
                </p>
                <Botao variante="verde" className="mt-3 w-full" onClick={levarPraNuvem}>
                  Levar pra nuvem
                </Botao>
              </Cartao>
            )}
            <Botao variante="contorno" grande className="w-full" onClick={sair}>
              Sair da conta
            </Botao>
          </>
        ) : (
          <>
            <Cartao>
              <p className="text-couro-escuro">
                Entrando, tuas composições ficam na nuvem e aparecem em qualquer aparelho. Sem conta, ficam só neste celular.
              </p>
            </Cartao>
            <Botao variante="contorno" grande className="w-full" onClick={entrarGoogle}>
              <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden>
                <path
                  fill="#FFC107"
                  d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
                />
              </svg>
              Entrar com Google
            </Botao>
            <div className="flex items-center gap-3 text-sm text-terra">
              <span className="h-px flex-1 bg-couro/20" /> ou por e-mail <span className="h-px flex-1 bg-couro/20" />
            </div>
            {enviado ? (
              <Cartao className="bg-verde/10">
                <p className="text-verde-escuro">
                  Mandamos um link pra <b>{email}</b>. Abre o e-mail neste aparelho e toca no link pra entrar.
                </p>
              </Cartao>
            ) : (
              <form onSubmit={entrarEmail} className="space-y-3">
                <div>
                  <Rotulo htmlFor="email">E-mail</Rotulo>
                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    className={classeCampo}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teu@email.com"
                  />
                </div>
                <Botao type="submit" variante="vermelho" grande className="w-full" disabled={enviando}>
                  {enviando ? "Enviando…" : "Receber link de entrada"}
                </Botao>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}
