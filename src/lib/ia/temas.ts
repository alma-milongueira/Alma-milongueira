// Banco de imagens nativistas para gerar ideias de tema sem depender de IA.

export type TemaId = "pago" | "querencia" | "fronteira" | "chimarrao" | "lida";

export type Tema = {
  id: TemaId;
  nome: string;
  imagens: string[];
  palavras: string[];
  titulos: string[];
  motes: string[];
};

export const TEMAS: Record<TemaId, Tema> = {
  pago: {
    id: "pago",
    nome: "Pago",
    imagens: [
      "a porteira velha rangendo no vento",
      "o umbu solito no alto da coxilha",
      "a fumaça do rancho subindo na tardinha",
      "o cusco latindo pra quem chega de longe",
      "a sanga onde se banhava de piá",
    ],
    palavras: ["rincão", "coxilha", "umbu", "rancho", "sanga", "estância", "campanha"],
    titulos: ["Retorno ao Pago", "Rincão de Origem", "Coxilha da Infância", "Pago Velho"],
    motes: [
      "Volto pro pago por dentro, mesmo quando o corpo fica",
      "Quem nasce em campo aberto carrega o horizonte no peito",
      "O pago não se esquece, só se carrega",
    ],
  },
  querencia: {
    id: "querencia",
    nome: "Querência",
    imagens: [
      "o pingo que volta sozinho pra querência",
      "o galpão aceso esperando a peonada",
      "a mãe na janela olhando a estrada",
      "o fogo-de-chão que nunca se apaga",
      "a cuia passando de mão em mão",
    ],
    palavras: ["querência", "galpão", "fogo-de-chão", "saudade", "lembrança", "retorno"],
    titulos: ["Querência Amada", "Rumo à Querência", "Onde o Fogo Mora", "Saudade de Galpão"],
    motes: ["Todo pingo sabe o rumo da querência", "A querência é onde o coração desencilha", "Longe de casa, a saudade vira estrada"],
  },
  fronteira: {
    id: "fronteira",
    nome: "Fronteira",
    imagens: [
      "o marco de pedra dividindo o mesmo campo",
      "o rio Uruguai correndo sem pedir licença",
      "o castelhano e o português na mesma roda",
      "o contrabandista cruzando na noite sem lua",
      "a cordeona chamameceira do outro lado",
    ],
    palavras: ["fronteira", "marco", "linha", "castelhano", "Uruguai", "Corrientes", "contrabando"],
    titulos: ["Linha Seca", "Do Outro Lado do Rio", "Marco de Pedra", "Fronteiriço"],
    motes: [
      "Na fronteira, o pampa não sabe de bandeira",
      "Um marco divide o mapa, mas não divide o mate",
      "Sou da linha, metade de cada lado",
    ],
  },
  chimarrao: {
    id: "chimarrao",
    nome: "Chimarrão",
    imagens: [
      "a chaleira chiando na beira do fogo",
      "a erva verdinha enchendo a cuia",
      "a bomba de prata brilhando ao clarear",
      "o primeiro mate, que é do anfitrião",
      "a roda de mate contando causos",
    ],
    palavras: ["cuia", "bomba", "erva", "chaleira", "cambona", "amargo", "mate"],
    titulos: ["Mate de Madrugada", "Cuia Companheira", "Amargo de Galpão", "Roda de Mate"],
    motes: [
      "Um mate amargo adoça qualquer madrugada",
      "A cuia é confidente de quem não tem com quem falar",
      "Na roda do mate, ninguém é estranho",
    ],
  },
  lida: {
    id: "lida",
    nome: "Lida campeira",
    imagens: [
      "o laço zunindo antes de cerrar a armada",
      "a tropa levantando poeira no corredor",
      "o peão encilhando no escuro da madrugada",
      "a marcação com fogo e algazarra",
      "o redomão corcoveando no meio da mangueira",
    ],
    palavras: ["laço", "tropa", "encilha", "rodeio", "mangueira", "redomão", "peonada"],
    titulos: ["Alma de Peão", "Lida de Sol a Sol", "Tropeada", "Rodeio de Inverno"],
    motes: [
      "O peão acorda antes do galo e deita depois da lua",
      "Na lida, o suor é a reza do campeiro",
      "Cada calo na mão é um verso que a vida escreveu",
    ],
  },
};

export const LISTA_TEMAS = Object.values(TEMAS);

function sortear<T>(arr: T[], n: number, semente: number): T[] {
  const a = [...arr];
  let s = semente || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

export type IdeiaTema = {
  titulo: string;
  mote: string;
  imagens: string[];
  palavras: string[];
  estrutura: string;
};

/** Gera ideias combinando os bancos (determinístico pela semente). */
export function ideiasDeTema(tema: TemaId, ritmoNome: string, semente: number): IdeiaTema[] {
  const t = TEMAS[tema];
  return [0, 1, 2].map((k) => ({
    titulo: sortear(t.titulos, 1, semente + k * 7)[0],
    mote: sortear(t.motes, 1, semente + k * 13)[0],
    imagens: sortear(t.imagens, 3, semente + k * 17),
    palavras: sortear(t.palavras, 4, semente + k * 23),
    estrutura:
      k === 0
        ? `${ritmoNome}: 2 estrofes de 6 versos (sextilha, 7 sílabas) + refrão de 4 versos.`
        : k === 1
          ? `${ritmoNome}: declamado de abertura, 3 estrofes em décima (redondilha maior) e volta da primeira.`
          : `${ritmoNome}: estrofe – refrão – estrofe – refrão – final instrumental pra gaita.`,
  }));
}
