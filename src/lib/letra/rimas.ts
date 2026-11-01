// Sugestão de rimas offline: vocabulário campeiro + palavras de uso comum.
import { chaveRima, chaveToante, analisarPalavra } from "./silabas";

const REGIONAIS = `
pago querência fronteira chimarrão cuia bomba erva galpão fogo-de-chão tição brasa
coxilha canhada sanga várzea banhado capão rincão campo campanha pampa estância
invernada potreiro mangueira porteira tronqueira aramado cerca tranqueira sesmaria
peão tropeiro carreteiro posteiro capataz patrão gaúcho guasca índio vaqueano
domador ginete payador gaiteiro violeiro chinoca prenda china morena moça guria
piá xiru tchê bagual redomão potro tordilho zaino baio gateado lobuno colorado
picaço rosilho mouro tobiano pingo flete matungo égua tropilha manada rebanho
tropa boiada rodeio marcação doma laço boleadeira tirador pala poncho bombacha
chilena espora tento rédea freio buçal cabresto basto pelego arreio lombilho
xergão cincha estribo bota chapéu barbicacho lenço faca adaga mate cambona chaleira
churrasco costela espeto carreteiro charque paçoca tropeada estrada caminho trilha
coxilhão horizonte minuano pampeiro geada orvalho sereno luar lua estrela cruzeiro
madrugada alvorada aurora entardecer tardezita anoitecer noite tarde manhã sol
chuva temporal trovoada relâmpago sanga arroio rio Uruguai Ibicuí Jacuí lagoa
açude umbu figueira cinamomo timbaúva corticeira espinilho guajuvira pitanga
butiá macega capim pasto querência saudade lembrança distância lonjura solidão
coração paixão canção razão emoção oração chão mão irmão sertão verão porão
sangue suor lida campeira peleia guerra farrapo revolução liberdade tradição
fandango baile milonga vaneira chamamé rancheira chote xote valsa bugio
gaita acordeona violão viola bombo pandeiro cordeona sanfona bordão prima
verso trova payada décima sextilha estrofe refrão cantiga cantor cantador
`;

const COMUNS = `
amor dor flor calor valor sabor senhor cantor pastor clamor rumor tambor
vida lida ida partida ferida querida saída guarida comprida despedida
saudade verdade vontade liberdade idade cidade amizade metade bondade
luar lugar olhar cantar sonhar voltar chorar penar pensar andar mar
pensamento sentimento vento momento tempo lamento firmamento juramento
estrada chegada morada jornada alvorada madrugada amada calada
caminho sozinho ninho carinho vizinho espinho moinho pinho vinho
coração canção paixão razão chão mão irmão solidão ilusão oração
olhos sonhos campos ventos tempos ranchos
destino menino sino hino pequenino fino
sol farol anzol arrebol girassol lençol
terra serra guerra berra encerra
céu véu chapéu fiel mel papel
noite açoite pernoite
amigo abrigo antigo comigo contigo perigo trigo castigo
fogo jogo logo rogo
alma calma palma
pranto canto encanto manto santo tanto quanto espanto
peito jeito feito direito estreito eleito leito respeito
rosto gosto posto agosto encosto
gente frente quente semente presente ausente valente contente sente
mundo fundo profundo segundo vagabundo
partir sentir seguir sorrir florir dormir ouvir subir
viver morrer saber querer dizer fazer correr nascer esquecer amanhecer entardecer
perdão sertão porão facão galpão tição verão cordão
tristeza beleza certeza grandeza natureza firmeza riqueza pobreza
longe monge
sina rotina campina menina colina neblina cortina
ponte fonte horizonte monte defronte
cavalo embalo regalo intervalo
estrela janela singela tramela panela cancela
lembrança esperança andança dança criança herança mudança
`;

type Entrada = { palavra: string; chave: string; toante: string; regional: boolean; silabas: number };

let indice: Entrada[] | null = null;

function construir(): Entrada[] {
  const vistos = new Set<string>();
  const out: Entrada[] = [];
  const add = (txt: string, regional: boolean) => {
    for (const p of txt.split(/\s+/)) {
      const w = p.trim().toLowerCase();
      if (!w || vistos.has(w)) continue;
      vistos.add(w);
      const chave = chaveRima(w);
      const toante = chaveToante(w);
      const info = analisarPalavra(w);
      if (chave && toante && info) out.push({ palavra: w, chave, toante, regional, silabas: info.silabas });
    }
  };
  add(REGIONAIS, true);
  add(COMUNS, false);
  return out;
}

export type SugestaoRima = { palavra: string; tipo: "perfeita" | "toante"; regional: boolean; silabas: number };

/** Sugere rimas para a palavra. `extras` = palavras da própria letra (entram também). */
export function sugerirRimas(palavra: string, extras: string[] = [], limite = 24): SugestaoRima[] {
  indice ??= construir();
  const alvo = palavra.toLowerCase();
  const chave = chaveRima(alvo);
  const toante = chaveToante(alvo);
  if (!chave || !toante) return [];

  const extrasEntradas: Entrada[] = extras
    .map((e) => e.toLowerCase())
    .filter((e) => e !== alvo)
    .map((e) => ({
      palavra: e,
      chave: chaveRima(e) ?? "",
      toante: chaveToante(e) ?? "",
      regional: false,
      silabas: analisarPalavra(e)?.silabas ?? 0,
    }));

  const todos = [...indice, ...extrasEntradas];
  const perfeitas: SugestaoRima[] = [];
  const toantes: SugestaoRima[] = [];
  const vistos = new Set<string>([alvo]);
  for (const e of todos) {
    if (vistos.has(e.palavra)) continue;
    if (e.chave === chave) {
      vistos.add(e.palavra);
      perfeitas.push({ palavra: e.palavra, tipo: "perfeita", regional: e.regional, silabas: e.silabas });
    } else if (e.toante === toante && e.toante.length > 0) {
      vistos.add(e.palavra);
      toantes.push({ palavra: e.palavra, tipo: "toante", regional: e.regional, silabas: e.silabas });
    }
  }
  const ordem = (a: SugestaoRima, b: SugestaoRima) => Number(b.regional) - Number(a.regional);
  return [...perfeitas.sort(ordem), ...toantes.sort(ordem)].slice(0, limite);
}
