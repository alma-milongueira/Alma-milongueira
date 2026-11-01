// Repositório no Supabase (Postgres + RLS). Guarda uma cópia para leitura offline.
import type { SupabaseClient } from "@supabase/supabase-js";
import { secaoVazia, type AlteracaoProjeto, type NovoProjeto, type Projeto, type Repositorio } from "./tipos";

type Linha = {
  id: string;
  titulo: string;
  ritmo: Projeto["ritmo"];
  tom: string;
  bpm: number;
  afinacao: Projeto["afinacao"];
  capo: number;
  letra: Projeto["letra"];
  cifra: string;
  notas: string;
  created_at: string;
  updated_at: string;
};

const COLUNAS = "id,titulo,ritmo,tom,bpm,afinacao,capo,letra,cifra,notas,created_at,updated_at";

function deLinha(l: Linha): Projeto {
  return {
    id: l.id,
    titulo: l.titulo,
    ritmo: l.ritmo,
    tom: l.tom,
    bpm: l.bpm,
    afinacao: l.afinacao,
    capo: l.capo,
    letra: l.letra ?? [],
    cifra: l.cifra ?? "",
    notas: l.notas ?? "",
    criadoEm: l.created_at,
    atualizadoEm: l.updated_at,
  };
}

function paraLinha(alt: AlteracaoProjeto): Partial<Linha> {
  const { titulo, ritmo, tom, bpm, afinacao, capo, letra, cifra, notas } = alt;
  const l: Partial<Linha> = { titulo, ritmo, tom, bpm, afinacao, capo, letra, cifra, notas };
  for (const k of Object.keys(l) as (keyof Linha)[]) if (l[k] === undefined) delete l[k];
  return l;
}

const chaveCache = (uid: string) => `galpao:cache:${uid}`;

function lerCache(uid: string): Projeto[] {
  try {
    return JSON.parse(localStorage.getItem(chaveCache(uid)) ?? "[]");
  } catch {
    return [];
  }
}

function gravarCache(uid: string, lista: Projeto[]) {
  try {
    localStorage.setItem(chaveCache(uid), JSON.stringify(lista));
  } catch {
    /* sem espaço: segue sem cache */
  }
}

function atualizarNoCache(uid: string, p: Projeto) {
  const lista = lerCache(uid).filter((x) => x.id !== p.id);
  gravarCache(uid, [p, ...lista]);
}

export class OfflineError extends Error {
  constructor() {
    super("Sem sinal agora. Mostrando a última cópia salva no aparelho.");
  }
}

export function criarRepositorioNuvem(sb: SupabaseClient, uid: string): Repositorio {
  return {
    modo: "nuvem",
    async listar() {
      const { data, error } = await sb.from("projetos").select(COLUNAS).order("updated_at", { ascending: false });
      if (error) {
        const cache = lerCache(uid);
        if (cache.length || !navigator.onLine) return cache;
        throw new Error(error.message);
      }
      const lista = (data as Linha[]).map(deLinha);
      gravarCache(uid, lista);
      return lista;
    },
    async obter(id) {
      const { data, error } = await sb.from("projetos").select(COLUNAS).eq("id", id).maybeSingle();
      if (error) {
        const c = lerCache(uid).find((p) => p.id === id);
        if (c) return c;
        throw new Error(error.message);
      }
      if (!data) return null;
      const p = deLinha(data as Linha);
      atualizarNoCache(uid, p);
      return p;
    },
    async criar(dados: NovoProjeto) {
      const { data, error } = await sb
        .from("projetos")
        .insert({ ...paraLinha(dados), owner_id: uid, letra: [secaoVazia("estrofe")], cifra: "", notas: "" })
        .select(COLUNAS)
        .single();
      if (error) throw new Error(error.message);
      const p = deLinha(data as Linha);
      atualizarNoCache(uid, p);
      return p;
    },
    async atualizar(id, alt) {
      const { data, error } = await sb.from("projetos").update(paraLinha(alt)).eq("id", id).select(COLUNAS).single();
      if (error) throw new Error(navigator.onLine ? error.message : new OfflineError().message);
      const p = deLinha(data as Linha);
      atualizarNoCache(uid, p);
      return p;
    },
    async excluir(id) {
      const { error } = await sb.from("projetos").delete().eq("id", id);
      if (error) throw new Error(error.message);
      gravarCache(
        uid,
        lerCache(uid).filter((p) => p.id !== id),
      );
    },
  };
}

/** Sobe projetos do aparelho para a nuvem (quando a pessoa entra na conta). */
export async function importarParaNuvem(sb: SupabaseClient, uid: string, projetos: Projeto[]): Promise<number> {
  if (!projetos.length) return 0;
  const linhas = projetos.map((p) => ({
    id: p.id,
    owner_id: uid,
    ...paraLinha(p),
    created_at: p.criadoEm,
  }));
  const { error } = await sb.from("projetos").upsert(linhas, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  return projetos.length;
}
