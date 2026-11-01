import type { AfinacaoId } from "../music/afinacoes";
import type { RitmoId } from "../music/ritmos";

export type TipoSecao = "estrofe" | "refrao" | "ponte" | "declamado" | "introducao";

export const NOMES_SECAO: Record<TipoSecao, string> = {
  estrofe: "Estrofe",
  refrao: "Refrão",
  ponte: "Ponte",
  declamado: "Declamado",
  introducao: "Introdução",
};

export type Secao = { id: string; tipo: TipoSecao; versos: string[]; /** métrica-alvo em sílabas poéticas */ metrica?: number };

export type Projeto = {
  id: string;
  titulo: string;
  ritmo: RitmoId;
  tom: string;
  bpm: number;
  afinacao: AfinacaoId;
  capo: number;
  letra: Secao[];
  cifra: string;
  notas: string;
  criadoEm: string;
  atualizadoEm: string;
};

export type NovoProjeto = Pick<Projeto, "titulo" | "ritmo" | "tom" | "bpm" | "afinacao" | "capo">;

export type AlteracaoProjeto = Partial<Omit<Projeto, "id" | "criadoEm" | "atualizadoEm">>;

export interface Repositorio {
  readonly modo: "local" | "nuvem";
  listar(): Promise<Projeto[]>;
  obter(id: string): Promise<Projeto | null>;
  criar(dados: NovoProjeto): Promise<Projeto>;
  atualizar(id: string, alt: AlteracaoProjeto): Promise<Projeto>;
  excluir(id: string): Promise<void>;
}

export function novoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function secaoVazia(tipo: TipoSecao = "estrofe"): Secao {
  return { id: novoId(), tipo, versos: [""] };
}
