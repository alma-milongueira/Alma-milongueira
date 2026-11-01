// Faixas: metadados + áudio. Modo local (localStorage + IndexedDB) e nuvem (Supabase + Storage, com cache no aparelho).
import type { SupabaseClient } from "@supabase/supabase-js";
import { apagarAudio, guardarAudio, lerAudio } from "./idb";
import type { AlteracaoFaixa, Faixa } from "./tipos";

export interface RepositorioFaixas {
  listar(projetoId: string): Promise<Faixa[]>;
  criar(f: Faixa): Promise<Faixa>;
  atualizar(id: string, alt: AlteracaoFaixa): Promise<void>;
  excluir(f: Faixa): Promise<void>;
  salvarAudio(f: Faixa, mp3: Blob): Promise<string>;
  carregarAudio(f: Faixa): Promise<Blob | null>;
  /** Sobe um arquivo exportado e devolve um link temporário (só nuvem). */
  linkExportacao?(projetoId: string, nome: string, mp3: Blob): Promise<string>;
}

const chaveAudio = (f: Faixa) => `faixa:${f.id}:${f.audioPath ?? ""}`;

// ---------------- Local ----------------
const CHAVE = "galpao:faixas:v1";
function lerLocais(): Faixa[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? "[]");
  } catch {
    return [];
  }
}
function gravarLocais(l: Faixa[]) {
  localStorage.setItem(CHAVE, JSON.stringify(l));
}

export const faixasLocais: RepositorioFaixas = {
  async listar(projetoId) {
    return lerLocais()
      .filter((f) => f.projetoId === projetoId)
      .sort((a, b) => a.ordem - b.ordem);
  },
  async criar(f) {
    gravarLocais([...lerLocais(), f]);
    return f;
  },
  async atualizar(id, alt) {
    gravarLocais(lerLocais().map((f) => (f.id === id ? { ...f, ...alt } : f)));
  },
  async excluir(f) {
    gravarLocais(lerLocais().filter((x) => x.id !== f.id));
    if (f.audioPath) await apagarAudio(chaveAudio(f)).catch(() => {});
  },
  async salvarAudio(f, mp3) {
    const path = `local/${f.projetoId}/${f.id}-${Date.now()}.mp3`;
    if (f.audioPath) await apagarAudio(chaveAudio(f)).catch(() => {});
    await guardarAudio(chaveAudio({ ...f, audioPath: path }), mp3);
    return path;
  },
  async carregarAudio(f) {
    return f.audioPath ? lerAudio(chaveAudio(f)) : null;
  },
};

// ---------------- Nuvem ----------------
type Linha = {
  id: string;
  projeto_id: string;
  nome: string;
  instrumento: Faixa["instrumento"];
  ordem: number;
  offset_ms: number;
  latencia_ms: number;
  volume: number;
  mudo: boolean;
  solo: boolean;
  eq_grave: number;
  eq_medio: number;
  eq_agudo: number;
  duracao_ms: number | null;
  taxa_amostragem: number | null;
  audio_path: string | null;
};

const MAPA: Record<keyof Omit<Faixa, "id" | "projetoId">, keyof Linha> = {
  nome: "nome",
  instrumento: "instrumento",
  ordem: "ordem",
  offsetMs: "offset_ms",
  latenciaMs: "latencia_ms",
  volume: "volume",
  mudo: "mudo",
  solo: "solo",
  eqGrave: "eq_grave",
  eqMedio: "eq_medio",
  eqAgudo: "eq_agudo",
  duracaoMs: "duracao_ms",
  taxaAmostragem: "taxa_amostragem",
  audioPath: "audio_path",
};

function deLinha(l: Linha): Faixa {
  const f = { id: l.id, projetoId: l.projeto_id } as Faixa;
  for (const [k, c] of Object.entries(MAPA)) (f as Record<string, unknown>)[k] = l[c];
  return f;
}
function paraLinha(alt: AlteracaoFaixa): Partial<Linha> {
  const l: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(alt)) {
    const c = MAPA[k as keyof typeof MAPA];
    if (c && v !== undefined) l[c] = typeof v === "number" && (c.endsWith("_ms") || c === "taxa_amostragem") ? Math.round(v) : v;
  }
  return l as Partial<Linha>;
}

const chaveCache = (p: string) => `galpao:cache-faixas:${p}`;

export function criarFaixasNuvem(sb: SupabaseClient, uid: string): RepositorioFaixas {
  const balde = () => sb.storage.from("audios");
  return {
    async listar(projetoId) {
      const { data, error } = await sb.from("faixas").select("*").eq("projeto_id", projetoId).order("ordem");
      if (error) {
        const c = localStorage.getItem(chaveCache(projetoId));
        if (c) return JSON.parse(c) as Faixa[];
        throw new Error(error.message);
      }
      const l = (data as Linha[]).map(deLinha);
      try {
        localStorage.setItem(chaveCache(projetoId), JSON.stringify(l));
      } catch {}
      return l;
    },
    async criar(f) {
      const { id, projetoId, ...resto } = f;
      const { error } = await sb.from("faixas").insert({ id, projeto_id: projetoId, owner_id: uid, ...paraLinha(resto) });
      if (error) throw new Error(error.message);
      return f;
    },
    async atualizar(id, alt) {
      const { error } = await sb.from("faixas").update(paraLinha(alt)).eq("id", id);
      if (error) throw new Error(error.message);
    },
    async excluir(f) {
      const { error } = await sb.from("faixas").delete().eq("id", f.id);
      if (error) throw new Error(error.message);
      if (f.audioPath) {
        await balde().remove([f.audioPath]);
        await apagarAudio(chaveAudio(f)).catch(() => {});
      }
    },
    async salvarAudio(f, mp3) {
      const path = `${uid}/${f.projetoId}/${f.id}-${Date.now()}.mp3`;
      const { error } = await balde().upload(path, mp3, { contentType: "audio/mpeg", upsert: false });
      if (error) throw new Error(error.message);
      if (f.audioPath) {
        await balde()
          .remove([f.audioPath])
          .catch(() => {});
        await apagarAudio(chaveAudio(f)).catch(() => {});
      }
      await guardarAudio(chaveAudio({ ...f, audioPath: path }), mp3).catch(() => {});
      return path;
    },
    async carregarAudio(f) {
      if (!f.audioPath) return null;
      const cache = await lerAudio(chaveAudio(f)).catch(() => null);
      if (cache) return cache;
      const { data, error } = await balde().download(f.audioPath);
      if (error || !data) throw new Error(error?.message ?? "Áudio não encontrado");
      await guardarAudio(chaveAudio(f), data).catch(() => {});
      return data;
    },
    async linkExportacao(projetoId, nome, mp3) {
      const path = `${uid}/${projetoId}/exportacoes/${Date.now()}-${nome}`;
      const { error } = await balde().upload(path, mp3, { contentType: "audio/mpeg" });
      if (error) throw new Error(error.message);
      const { data, error: e2 } = await balde().createSignedUrl(path, 60 * 60 * 24 * 7);
      if (e2 || !data) throw new Error(e2?.message ?? "Não deu pra gerar o link");
      return data.signedUrl;
    },
  };
}
