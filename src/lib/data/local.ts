// Repositório no próprio aparelho (localStorage). Funciona offline e sem conta.
import { novoId, secaoVazia, type AlteracaoProjeto, type NovoProjeto, type Projeto, type Repositorio } from "./tipos";

const CHAVE = "galpao:projetos:v1";

function ler(): Projeto[] {
  try {
    const raw = localStorage.getItem(CHAVE);
    return raw ? (JSON.parse(raw) as Projeto[]) : [];
  } catch {
    return [];
  }
}

function gravar(lista: Projeto[]) {
  localStorage.setItem(CHAVE, JSON.stringify(lista));
}

export function projetosLocais(): Projeto[] {
  return ler();
}

export function limparLocais(ids: string[]) {
  const set = new Set(ids);
  gravar(ler().filter((p) => !set.has(p.id)));
}

export const repositorioLocal: Repositorio = {
  modo: "local",
  async listar() {
    return ler().sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
  },
  async obter(id) {
    return ler().find((p) => p.id === id) ?? null;
  },
  async criar(dados: NovoProjeto) {
    const agora = new Date().toISOString();
    const p: Projeto = {
      ...dados,
      id: novoId(),
      letra: [secaoVazia("estrofe")],
      cifra: "",
      notas: "",
      criadoEm: agora,
      atualizadoEm: agora,
    };
    gravar([p, ...ler()]);
    return p;
  },
  async atualizar(id, alt: AlteracaoProjeto) {
    const lista = ler();
    const i = lista.findIndex((p) => p.id === id);
    if (i < 0) throw new Error("Projeto não encontrado neste aparelho.");
    lista[i] = { ...lista[i], ...alt, atualizadoEm: new Date().toISOString() };
    gravar(lista);
    return lista[i];
  },
  async excluir(id) {
    gravar(ler().filter((p) => p.id !== id));
  },
};
