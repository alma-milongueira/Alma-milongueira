"use client";

import { useState, useSyncExternalStore } from "react";
import { Cabecalho } from "@/components/Cabecalho";
import { PainelAcessos } from "@/components/conta/PainelAcessos";
import { Celular, Nuvem } from "@/components/Icones";
import { useSessao } from "@/components/Sessao";
import { Botao, Cartao, Chip, Rotulo, classeCampo, useAviso } from "@/components/ui";
import { traduzirErroAuth } from "@/lib/data/acessos";
import { limparLocais, projetosLocais } from "@/lib/data/local";
import { importarParaNuvem } from "@/lib/data/nuvem";
import { supabase } from "@/lib/supabase/client";

const semInscricao = () => () => {};

type Modo = "entrar" | "criar" | "link" | "esqueci";

export default function Conta() {
  const { usuario, acesso, admin, nuvemDisponivel, pronto, sair, recuperandoSenha, fimRecuperacao } = useSessao();
  const avisar = useAviso();
  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [, setVersao] = useState(0);
  const locais = useSyncExternalStore(
    semInscricao,
    () => projetosLocais().length,
    () => 0,
  );

  const redirect = () => `${window.location.origin}/auth/callback`;

  async function executar(f: () => Promise<{ error: { message: string } | null }>, sucesso?: string) {
    setEnviando(true);
    setAviso(null);
    const { error } = await f();
    setEnviando(false);
    if (error) avisar(traduzirErroAuth(error.message), "erro");
    else if (sucesso) setAviso(sucesso);
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const sb = supabase();
    if (!sb) return;
    const em = email.trim().toLowerCase();
    if (modo === "entrar") return executar(() => sb.auth.signInWithPassword({ email: em, password: senha }));
    if (modo === "criar") {
      if (senha.length < 8) return avisar("Usa uma senha de pelo menos 8 caracteres.", "erro");
      if (senha !== senha2) return avisar("As duas senhas não conferem.", "erro");
      return executar(
        () => sb.auth.signUp({ email: em, password: senha, options: { emailRedirectTo: redirect() } }),
        `Conta criada! Se pedir confirmação, abre o e-mail que chegou em ${em} e toca no link. Depois é só entrar com a senha.`,
      );
    }
    if (modo === "link")
      return executar(
        () => sb.auth.signInWithOtp({ email: em, options: { emailRedirectTo: redirect(), shouldCreateUser: false } }),
        `Mandamos um link pra ${em}. Abre o e-mail neste aparelho e toca no link pra entrar.`,
      );
    return executar(
      () => sb.auth.resetPasswordForEmail(em, { redirectTo: redirect() }),
      `Se ${em} tiver conta, chega um e-mail com o link pra criar senha nova.`,
    );
  }

  async function novaSenha(e: React.FormEvent) {
    e.preventDefault();
    const sb = supabase();
    if (!sb) return;
    if (senha.length < 8) return avisar("Usa uma senha de pelo menos 8 caracteres.", "erro");
    if (senha !== senha2) return avisar("As duas senhas não conferem.", "erro");
    setEnviando(true);
    const { error } = await sb.auth.updateUser({ password: senha });
    setEnviando(false);
    if (error) return avisar(traduzirErroAuth(error.message), "erro");
    setSenha("");
    setSenha2("");
    fimRecuperacao();
    avisar("Senha nova guardada ✓");
  }

  async function entrarGoogle() {
    const sb = supabase();
    if (!sb) return;
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirect() } });
    if (error) avisar(traduzirErroAuth(error.message), "erro");
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

  const campoSenha = (id: string, valor: string, mudar: (v: string) => void, rotulo: string, novo: boolean) => (
    <div>
      <Rotulo htmlFor={id}>{rotulo}</Rotulo>
      <input
        id={id}
        type="password"
        required
        minLength={novo ? 8 : 6}
        autoComplete={novo ? "new-password" : "current-password"}
        className={classeCampo}
        value={valor}
        onChange={(e) => mudar(e.target.value)}
      />
    </div>
  );

  return (
    <main>
      <Cabecalho titulo="Conta" subtitulo={usuario ? (usuario.email ?? "") : "Entrada só pra quem está na lista"} />
      <div className="space-y-4 p-4">
        {!nuvemDisponivel ? (
          <Cartao>
            <div className="flex items-center gap-3 text-couro-escuro">
              <Celular tamanho={32} />
              <p className="font-bold">Modo local</p>
            </div>
            <p className="mt-2 text-terra">
              O app está sem Supabase configurado, então não há contas nem lista de acessos: tudo fica só neste aparelho. Veja o README pra
              ligar a nuvem.
            </p>
          </Cartao>
        ) : !pronto ? (
          <p className="text-terra">Conferindo a sessão…</p>
        ) : usuario && recuperandoSenha ? (
          <form onSubmit={novaSenha} className="space-y-3">
            <Cartao>
              <p className="font-bold text-couro-escuro">Cria tua senha nova</p>
            </Cartao>
            {campoSenha("nova-senha", senha, setSenha, "Senha nova", true)}
            {campoSenha("nova-senha2", senha2, setSenha2, "Repete a senha", true)}
            <Botao type="submit" variante="verde" grande className="w-full" disabled={enviando}>
              Guardar senha
            </Botao>
          </form>
        ) : usuario ? (
          <>
            {acesso === "liberado" ? (
              <Cartao>
                <div className="flex items-center gap-3 text-verde-escuro">
                  <Nuvem tamanho={32} />
                  <p className="font-bold">Guardando na nuvem</p>
                </div>
                <p className="mt-2 text-terra">Entraste como {usuario.email}. Teus projetos ficam salvos e protegidos (só tu enxergas).</p>
              </Cartao>
            ) : (
              <Cartao className="border-vermelho bg-vermelho/10">
                <p className="font-bold text-vermelho">E-mail sem acesso</p>
                <p className="mt-1 text-couro-escuro">
                  {acesso === "erro"
                    ? "Não consegui conferir a lista de acessos agora. Tenta de novo com sinal."
                    : `${usuario.email} não está na lista de acessos. Pede ao administrador pra liberar. Enquanto isso, o que fizeres fica só neste aparelho.`}
                </p>
              </Cartao>
            )}
            {admin && <PainelAcessos />}
            {acesso === "liberado" && locais > 0 && (
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
                O Alma Milongueira é fechado: entram só os e-mails liberados pelo administrador (até 10). Primeira vez? Usa{" "}
                <b>Criar conta</b> com o e-mail que foi liberado.
              </p>
            </Cartao>
            <div className="flex flex-wrap gap-2">
              <Chip ativo={modo === "entrar"} onClick={() => setModo("entrar")}>
                Entrar
              </Chip>
              <Chip ativo={modo === "criar"} onClick={() => setModo("criar")}>
                Criar conta
              </Chip>
              <Chip ativo={modo === "link"} onClick={() => setModo("link")}>
                Link por e-mail
              </Chip>
            </div>
            {aviso ? (
              <Cartao className="bg-verde/10">
                <p className="text-verde-escuro">{aviso}</p>
                <button
                  type="button"
                  className="mt-2 font-bold text-verde underline"
                  onClick={() => {
                    setAviso(null);
                    setModo("entrar");
                  }}
                >
                  Voltar pra entrada
                </button>
              </Cartao>
            ) : (
              <form onSubmit={enviar} className="space-y-3">
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
                {(modo === "entrar" || modo === "criar") &&
                  campoSenha("senha", senha, setSenha, modo === "criar" ? "Cria uma senha (mín. 8)" : "Senha", modo === "criar")}
                {modo === "criar" && campoSenha("senha2", senha2, setSenha2, "Repete a senha", true)}
                <Botao type="submit" variante="vermelho" grande className="w-full" disabled={enviando}>
                  {enviando
                    ? "Aguarda…"
                    : { entrar: "Entrar", criar: "Criar conta", link: "Receber link de entrada", esqueci: "Mandar link de senha nova" }[
                        modo
                      ]}
                </Botao>
                {modo === "entrar" && (
                  <button
                    type="button"
                    className="w-full py-2 text-center font-bold text-verde underline"
                    onClick={() => setModo("esqueci")}
                  >
                    Esqueci a senha
                  </button>
                )}
              </form>
            )}
            <div className="flex items-center gap-3 text-sm text-terra">
              <span className="h-px flex-1 bg-couro/20" /> ou <span className="h-px flex-1 bg-couro/20" />
            </div>
            <Botao variante="contorno" className="w-full" onClick={entrarGoogle}>
              Entrar com Google (só e-mail liberado)
            </Botao>
          </>
        )}
      </div>
    </main>
  );
}
