"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Cabecalho } from "@/components/Cabecalho";
import { CifraEditor } from "@/components/cifra/CifraEditor";
import { IdeiasPainel } from "@/components/ideias/IdeiasPainel";
import { Estudio } from "@/components/estudio/Estudio";
import { LetraEditor } from "@/components/letra/LetraEditor";
import { FichaCampos } from "@/components/projeto/FichaCampos";
import { useSessao } from "@/components/Sessao";
import { Botao, Rotulo, classeCampo, useAviso } from "@/components/ui";
import { Lixo } from "@/components/Icones";
import { novoId, type AlteracaoProjeto, type Projeto } from "@/lib/data/tipos";
import { RITMOS } from "@/lib/music/ritmos";

type Aba = "letra" | "cifra" | "estudio" | "ideias" | "ficha";
const ABAS: { id: Aba; nome: string }[] = [
  { id: "letra", nome: "Letra" },
  { id: "cifra", nome: "Cifra" },
  { id: "estudio", nome: "Estúdio" },
  { id: "ideias", nome: "Ideias" },
  { id: "ficha", nome: "Ficha" },
];

type Estado = "salvo" | "pendente" | "salvando" | "erro";

export function EditorProjeto() {
  const id = useSearchParams().get("id");
  const { repo, pronto } = useSessao();
  const router = useRouter();
  const avisar = useAviso();
  const [p, setP] = useState<Projeto | null | undefined>(undefined);
  const [aba, setAba] = useState<Aba>("letra");
  const [estado, setEstado] = useState<Estado>("salvo");
  const pendente = useRef<AlteracaoProjeto>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pronto || !id) return;
    let vivo = true;
    repo
      .obter(id)
      .then((x) => vivo && setP(x))
      .catch((e: Error) => {
        if (!vivo) return;
        setP(null);
        avisar(e.message, "erro");
      });
    return () => {
      vivo = false;
    };
  }, [id, repo, pronto, avisar]);

  const salvarAgora = useCallback(async () => {
    if (!id) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const alt = pendente.current;
    if (!Object.keys(alt).length) return;
    pendente.current = {};
    setEstado("salvando");
    try {
      await repo.atualizar(id, alt);
      setEstado(Object.keys(pendente.current).length ? "pendente" : "salvo");
    } catch (e) {
      pendente.current = { ...alt, ...pendente.current };
      setEstado("erro");
      avisar((e as Error).message, "erro");
    }
  }, [id, repo, avisar]);

  const alterar = useCallback(
    (alt: AlteracaoProjeto) => {
      setP((x) => (x ? { ...x, ...alt } : x));
      pendente.current = { ...pendente.current, ...alt };
      setEstado("pendente");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(salvarAgora, 700);
    },
    [salvarAgora],
  );

  // Garante que nada se perde ao sair da tela ou minimizar o app
  useEffect(() => {
    const vis = () => document.visibilityState === "hidden" && salvarAgora();
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("pagehide", salvarAgora);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("pagehide", salvarAgora);
      salvarAgora();
    };
  }, [salvarAgora]);

  if (!id || p === null) {
    return (
      <main>
        <Cabecalho titulo="Projeto não encontrado" voltar="/projetos" />
        <div className="p-6 text-center">
          <p className="text-lg text-terra">Esse projeto não está aqui. Pode ter sido apagado ou estar em outra conta.</p>
          <Link href="/projetos" className="mt-4 inline-block font-bold text-verde underline">
            Voltar pros projetos
          </Link>
        </div>
      </main>
    );
  }
  if (p === undefined) return <p className="p-6 text-terra">Abrindo a porteira…</p>;

  const r = RITMOS[p.ritmo];
  const rotuloEstado = { salvo: "Salvo ✓", pendente: "Editando…", salvando: "Salvando…", erro: "Não salvou!" }[estado];

  async function excluir() {
    if (!p || !confirm(`Apagar «${p.titulo}»? Não tem volta.`)) return;
    try {
      await repo.excluir(p.id);
      avisar("Projeto apagado");
      router.replace("/projetos");
    } catch (e) {
      avisar((e as Error).message, "erro");
    }
  }

  return (
    <main>
      <Cabecalho
        titulo={p.titulo}
        subtitulo={`${r.nome} · ${p.tom} · ${p.bpm} BPM`}
        voltar="/projetos"
        acao={
          <button
            onClick={salvarAgora}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${estado === "erro" ? "bg-vermelho text-palha" : "bg-white/10 text-creme"}`}
            aria-live="polite"
          >
            {rotuloEstado}
          </button>
        }
      />
      <nav
        className="sticky top-[4.6rem] z-20 grid grid-cols-5 gap-1 border-b border-couro/15 bg-creme/95 p-1.5 backdrop-blur"
        aria-label="Partes do projeto"
      >
        {ABAS.map((a) => (
          <button
            key={a.id}
            aria-pressed={aba === a.id}
            onClick={() => setAba(a.id)}
            className={`min-h-12 rounded-xl text-[0.95rem] font-bold ${aba === a.id ? "bg-couro text-palha" : "text-couro-escuro active:bg-creme-escuro"}`}
          >
            {a.nome}
          </button>
        ))}
      </nav>

      <div className="p-4">
        {aba === "letra" && <LetraEditor letra={p.letra} mudar={(letra) => alterar({ letra })} />}
        {aba === "cifra" && (
          <CifraEditor cifra={p.cifra} tom={p.tom} capo={p.capo} afinacao={p.afinacao} letra={p.letra} mudar={(alt) => alterar(alt)} />
        )}
        {aba === "estudio" && <Estudio projeto={p} />}
        {aba === "ideias" && (
          <IdeiasPainel
            ritmoInicial={p.ritmo}
            tomInicial={p.tom}
            bpm={p.bpm}
            aoUsarProgressao={(prog) => {
              const linha = `{${prog.nome}}\n${prog.acordes.map((a) => `[${a}]`).join("  ")}`;
              alterar({ cifra: p.cifra.trim() ? `${p.cifra}\n\n${linha}` : linha });
              avisar("Progressão levada pra cifra");
            }}
            aoUsarTema={(i) => {
              const bloco = `★ ${i.titulo}\nMote: ${i.mote}\nImagens: ${i.imagens.join("; ")}\nPalavras: ${i.palavras.join(", ")}\n${i.estrutura}`;
              const letraVazia = !p.letra.some((s) => s.versos.some((v) => v.trim()));
              alterar({
                notas: p.notas.trim() ? `${p.notas}\n\n${bloco}` : bloco,
                ...(letraVazia ? { letra: [{ id: novoId(), tipo: "estrofe", versos: [i.mote, ""] }] } : {}),
              });
              avisar(letraVazia ? "Mote virou o primeiro verso; o resto foi pras notas" : "Ideia guardada nas notas da ficha");
            }}
          />
        )}
        {aba === "ficha" && (
          <div className="space-y-6">
            <FichaCampos valor={p} mudar={(v) => alterar(v)} />
            <div>
              <Rotulo htmlFor="notas">Notas e ideias soltas</Rotulo>
              <textarea
                id="notas"
                rows={6}
                className={`${classeCampo} py-3`}
                value={p.notas}
                maxLength={20000}
                placeholder="Causos, referências, quem vai gravar a gaita…"
                onChange={(e) => alterar({ notas: e.target.value })}
              />
            </div>
            <Botao variante="contorno" className="w-full border-vermelho/40 text-vermelho" onClick={excluir}>
              <Lixo /> Apagar projeto
            </Botao>
          </div>
        )}
      </div>
    </main>
  );
}
