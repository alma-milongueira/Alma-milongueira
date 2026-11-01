"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Cabecalho } from "@/components/Cabecalho";
import { Mais } from "@/components/Icones";
import { CartaoProjeto } from "@/components/projeto/CartaoProjeto";
import { FichaCampos } from "@/components/projeto/FichaCampos";
import { useSessao } from "@/components/Sessao";
import { Botao, BotaoIcone, Folha, classeCampo, useAviso } from "@/components/ui";
import type { NovoProjeto, Projeto } from "@/lib/data/tipos";
import { RITMOS } from "@/lib/music/ritmos";

const PADRAO: NovoProjeto = { titulo: "", ritmo: "milonga", tom: "Em", bpm: RITMOS.milonga.bpmPadrao, afinacao: "padrao", capo: 0 };

export function ListaProjetos() {
  const { repo, pronto } = useSessao();
  const router = useRouter();
  const params = useSearchParams();
  const avisar = useAviso();
  const [lista, setLista] = useState<Projeto[] | null>(null);
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(params.get("novo") === "1");
  const [novo, setNovo] = useState<NovoProjeto>(PADRAO);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!pronto) return;
    repo
      .listar()
      .then(setLista)
      .catch((e: Error) => {
        setLista([]);
        avisar(e.message, "erro");
      });
  }, [repo, pronto, avisar]);

  const filtrados = useMemo(() => {
    const b = busca.trim().toLowerCase();
    if (!lista) return [];
    if (!b) return lista;
    return lista.filter((p) => p.titulo.toLowerCase().includes(b) || RITMOS[p.ritmo]?.nome.toLowerCase().includes(b));
  }, [lista, busca]);

  async function criar() {
    setSalvando(true);
    try {
      const titulo = novo.titulo.trim() || `${RITMOS[novo.ritmo].nome} sem nome`;
      const p = await repo.criar({ ...novo, titulo });
      router.push(`/projeto?id=${p.id}`);
    } catch (e) {
      avisar((e as Error).message, "erro");
      setSalvando(false);
    }
  }

  return (
    <main>
      <Cabecalho
        titulo="Projetos"
        subtitulo={lista ? `${lista.length} composições no galpão` : "Carregando…"}
        acao={
          <BotaoIcone rotulo="Novo projeto" className="text-amarelo-claro active:bg-white/10" onClick={() => setAberto(true)}>
            <Mais tamanho={30} />
          </BotaoIcone>
        }
      />
      <div className="space-y-4 p-4">
        {lista && lista.length > 3 && (
          <input
            type="search"
            className={classeCampo}
            placeholder="Procurar por título ou ritmo"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label="Procurar projeto"
          />
        )}
        {lista === null ? (
          <p className="text-terra">Abrindo a porteira…</p>
        ) : filtrados.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-couro/30 p-6 text-center">
            <p className="text-lg text-terra">{busca ? "Nada encontrado com essa busca." : "Galpão vazio por enquanto."}</p>
            {!busca && (
              <Botao variante="vermelho" grande className="mt-4 w-full" onClick={() => setAberto(true)}>
                <Mais /> Criar a primeira
              </Botao>
            )}
          </div>
        ) : (
          filtrados.map((p) => <CartaoProjeto key={p.id} p={p} />)
        )}
        {lista && lista.length > 0 && (
          <Botao variante="vermelho" grande className="w-full" onClick={() => setAberto(true)}>
            <Mais /> Nova composição
          </Botao>
        )}
      </div>

      <Folha
        aberta={aberto}
        aoFechar={() => {
          setAberto(false);
          if (params.get("novo")) router.replace("/projetos");
        }}
        titulo="Nova composição"
      >
        <FichaCampos valor={novo} mudar={(v) => setNovo((x) => ({ ...x, ...v }))} />
        <Botao variante="verde" grande className="mt-6 w-full" disabled={salvando} onClick={criar}>
          {salvando ? "Encilhando…" : "Criar e abrir"}
        </Botao>
      </Folha>
    </main>
  );
}
