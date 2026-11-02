"use client";

import { useState, useSyncExternalStore } from "react";
import { Cabecalho } from "@/components/Cabecalho";
import { Celular, Nuvem } from "@/components/Icones";
import { useSessao } from "@/components/Sessao";
import { Botao, Cartao, Rotulo, classeCampo, useAviso } from "@/components/ui";
import { problemaSenha, SENHA_MINIMA, traduzirErroAuth } from "@/lib/data/auth";
import { limparLocais, projetosLocais } from "@/lib/data/local";
import { importarParaNuvem } from "@/lib/data/nuvem";
import { supabase } from "@/lib/supabase/client";

const semInscricao = () => () => {};

export default function Conta() {
  const { usuario, nuvemDisponivel, sair, recuperandoSenha, fimRecuperacao } = useSessao();
  const avisar = useAviso();
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [, setVersao] = useState(0);
  const locais = useSyncExternalStore(
    semInscricao,
    () => projetosLocais().length,
    () => 0,
  );
  const mostrarSenha = recuperandoSenha || trocandoSenha;

  async function guardarSenha(e: React.FormEvent) {
    e.preventDefault();
    const sb = supabase();
    if (!sb) return;
    const p = problemaSenha(senha, senha2);
    if (p) return avisar(p, "erro");
    setSalvando(true);
    const { error } = await sb.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) return avisar(traduzirErroAuth(error.message), "erro");
    setSenha("");
    setSenha2("");
    setTrocandoSenha(false);
    fimRecuperacao();
    avisar("Senha nova guardada ✓");
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
      <Cabecalho titulo="Conta" subtitulo={usuario?.email ?? "Modo local"} />
      <div className="space-y-4 p-4">
        {!nuvemDisponivel || !usuario ? (
          <Cartao>
            <div className="flex items-center gap-3 text-couro-escuro">
              <Celular tamanho={32} />
              <p className="font-bold">Modo local</p>
            </div>
            <p className="mt-2 text-terra">
              O login não está ligado neste endereço (faltam as chaves do Supabase), então tudo fica guardado só neste aparelho e funciona
              sem internet. Veja o README pra ligar a nuvem.
            </p>
          </Cartao>
        ) : (
          <>
            <Cartao>
              <div className="flex items-center gap-3 text-verde-escuro">
                <Nuvem tamanho={32} />
                <p className="font-bold">Guardando na nuvem</p>
              </div>
              <p className="mt-2 text-terra">
                Entraste como <b className="text-couro-escuro">{usuario.email}</b>. Teus projetos ficam salvos e só tu enxergas.
              </p>
            </Cartao>

            {recuperandoSenha && (
              <Cartao className="border-amarelo bg-amarelo-claro/30">
                <p className="font-bold text-couro-escuro">Cria tua senha nova pra terminar a recuperação.</p>
              </Cartao>
            )}

            {mostrarSenha ? (
              <form onSubmit={guardarSenha} className="space-y-3 rounded-3xl border border-couro/15 bg-palha p-4">
                <div>
                  <Rotulo htmlFor="nova-senha">Senha nova (mín. {SENHA_MINIMA})</Rotulo>
                  <input
                    id="nova-senha"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={SENHA_MINIMA}
                    className={classeCampo}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                </div>
                <div>
                  <Rotulo htmlFor="nova-senha2">Repete a senha</Rotulo>
                  <input
                    id="nova-senha2"
                    type="password"
                    autoComplete="new-password"
                    required
                    className={classeCampo}
                    value={senha2}
                    onChange={(e) => setSenha2(e.target.value)}
                  />
                </div>
                <Botao type="submit" variante="verde" className="w-full" disabled={salvando}>
                  {salvando ? "Guardando…" : "Guardar senha"}
                </Botao>
                {!recuperandoSenha && (
                  <Botao type="button" variante="fantasma" className="w-full" onClick={() => setTrocandoSenha(false)}>
                    Cancelar
                  </Botao>
                )}
              </form>
            ) : (
              <Botao variante="contorno" className="w-full" onClick={() => setTrocandoSenha(true)}>
                Trocar senha
              </Botao>
            )}

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

            <Botao variante="contorno" grande className="w-full border-vermelho/40 text-vermelho" onClick={sair}>
              Sair da conta
            </Botao>
          </>
        )}

        <details className="rounded-2xl bg-creme-escuro/60 p-4 text-sm text-terra">
          <summary className="cursor-pointer font-bold text-couro-escuro">Créditos dos sons</summary>
          <p className="mt-2">
            Sons de instrumentos sob licença{" "}
            <a className="underline" href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">
              CC-BY 3.0
            </a>
            : violão nylon e piano de <i>tonejs-instruments</i> (Nicholaus Brosowsky); gaita (acordeom) e contrabaixo de <i>FluidR3_GM</i>{" "}
            (Frank Wen), via <i>midi-js-soundfonts</i> (Benjamin Gleitzman). Notas selecionadas e convertidas para mono.
          </p>
        </details>
      </div>
    </main>
  );
}
