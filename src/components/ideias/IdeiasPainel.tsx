"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { regrasAcordes } from "@/lib/ia/compositor";
import { ideiasDeTema, LISTA_TEMAS, type IdeiaTema, type TemaId } from "@/lib/ia/temas";
import { tocarProgressao, type Controle } from "@/lib/audio/tocador";
import { acordeNoTom } from "@/lib/music/harmonia";
import { TONS_MAIORES, TONS_MENORES } from "@/lib/music/notas";
import { LISTA_RITMOS, RITMOS, type RitmoId } from "@/lib/music/ritmos";
import { Faisca, Parar, Play } from "../Icones";
import { Botao, Cartao, Chip, Rotulo, classeCampo, useAviso } from "../ui";

type ProgExib = { nome: string; acordes: string[]; comentario: string; origem: "regra" | "variacao" | "ia"; graus?: string[] };

type Props = {
  ritmoInicial: RitmoId;
  tomInicial: string;
  bpm?: number;
  aoUsarProgressao?: (p: { nome: string; acordes: string[] }) => void;
  aoUsarTema?: (i: IdeiaTema) => void;
};

export function IdeiasPainel({ ritmoInicial, tomInicial, bpm, aoUsarProgressao, aoUsarTema }: Props) {
  const [aba, setAba] = useState<"acordes" | "temas">("acordes");
  const [ritmo, setRitmo] = useState<RitmoId>(ritmoInicial);
  const [tom, setTom] = useState(tomInicial);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-creme-escuro p-1">
        {(["acordes", "temas"] as const).map((a) => (
          <button
            key={a}
            type="button"
            aria-pressed={aba === a}
            onClick={() => setAba(a)}
            className={`min-h-12 rounded-xl text-lg font-bold ${aba === a ? "bg-palha text-couro-escuro shadow" : "text-terra"}`}
          >
            {a === "acordes" ? "Acordes" : "Temas"}
          </button>
        ))}
      </div>

      <div>
        <Rotulo>Ritmo</Rotulo>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {LISTA_RITMOS.map((r) => (
            <Chip key={r.id} ativo={ritmo === r.id} onClick={() => setRitmo(r.id)}>
              {r.nome}
            </Chip>
          ))}
        </div>
      </div>

      {aba === "acordes" ? (
        <PainelAcordes ritmo={ritmo} tom={tom} setTom={setTom} bpm={bpm} aoUsar={aoUsarProgressao} />
      ) : (
        <PainelTemas ritmo={ritmo} aoUsar={aoUsarTema} />
      )}
    </div>
  );
}

function PainelAcordes({
  ritmo,
  tom,
  setTom,
  bpm,
  aoUsar,
}: {
  ritmo: RitmoId;
  tom: string;
  setTom: (t: string) => void;
  bpm?: number;
  aoUsar?: Props["aoUsarProgressao"];
}) {
  const avisar = useAviso();
  const r = RITMOS[ritmo];
  const regras: ProgExib[] = useMemo(() => regrasAcordes(ritmo, tom), [ritmo, tom]);
  const [ia, setIa] = useState<{ chave: string; progressoes: ProgExib[]; dica?: string } | null>(null);
  const [pedido, setPedido] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [tocando, setTocando] = useState<{ id: string; i: number | null } | null>(null);
  const controle = useRef<Controle | null>(null);
  const chave = `${ritmo}|${tom}`;

  useEffect(() => () => controle.current?.parar(), []);

  function tocar(id: string, acordes: string[]) {
    controle.current?.parar();
    if (tocando?.id === id) {
      setTocando(null);
      return;
    }
    setTocando({ id, i: 0 });
    controle.current = tocarProgressao(acordes, bpm ?? r.bpmPadrao, ritmo, (i) => {
      if (i === null) setTocando((t) => (t?.id === id ? null : t));
      else setTocando({ id, i });
    });
  }

  async function pedirIA() {
    setCarregando(true);
    try {
      const resp = await fetch("/api/ia", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tipo: "acordes", ritmo, tom, pedido }),
      });
      const j = await resp.json();
      if (j.erro) throw new Error(j.erro);
      if (j.aviso) avisar(j.aviso);
      if (j.ia) {
        setIa({
          chave,
          dica: j.ia.dica,
          progressoes: j.ia.progressoes.map((p: { nome: string; comentario: string; acordes: { acorde: string }[] }) => ({
            nome: p.nome,
            comentario: p.comentario,
            acordes: p.acordes.map((a) => a.acorde),
            origem: "ia" as const,
          })),
        });
      }
    } catch (e) {
      avisar(navigator.onLine ? (e as Error).message : "Sem sinal pra chamar a IA. As sugestões do motor seguem funcionando.", "erro");
    } finally {
      setCarregando(false);
    }
  }

  const iaAtual = ia?.chave === chave ? ia : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_auto] items-end gap-3">
        <div>
          <Rotulo htmlFor="tom-ideias">Tom</Rotulo>
          <select id="tom-ideias" className={classeCampo} value={tom} onChange={(e) => setTom(e.target.value)}>
            <optgroup label="Maiores">
              {TONS_MAIORES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </optgroup>
            <optgroup label="Menores">
              {TONS_MENORES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <div className="pb-2 text-right text-sm text-terra">
          {r.compasso}
          <br />
          {bpm ?? r.bpmPadrao} BPM
        </div>
      </div>
      <Cartao className="bg-amarelo-claro/30">
        <p className="text-sm text-couro-escuro">
          <b>Levada de {r.nome.toLowerCase()}:</b> {r.batida}
        </p>
      </Cartao>

      <h3 className="font-titulo text-xl font-bold text-couro-escuro">Do motor de teoria</h3>
      {regras.map((p, k) => (
        <CartaoProgressao key={`r${k}`} id={`r${k}`} p={p} tom={tom} tocando={tocando} tocar={tocar} aoUsar={aoUsar} />
      ))}

      <Cartao>
        <Rotulo htmlFor="pedido-acordes">Pedido pra IA (opcional)</Rotulo>
        <input
          id="pedido-acordes"
          className={classeCampo}
          value={pedido}
          maxLength={300}
          placeholder="Ex.: refrão mais aberto, final em suspense"
          onChange={(e) => setPedido(e.target.value)}
        />
        <Botao variante="verde" grande className="mt-3 w-full" onClick={pedirIA} disabled={carregando}>
          <Faisca /> {carregando ? "Matutando…" : "Pedir progressões à IA"}
        </Botao>
        <p className="mt-2 text-xs text-terra">
          A IA parte das regras acima; acorde que não existe é descartado e o que sai do tom fica marcado em amarelo.
        </p>
      </Cartao>

      {iaAtual && (
        <>
          <h3 className="flex items-center gap-2 font-titulo text-xl font-bold text-couro-escuro">
            <Faisca /> Da IA
          </h3>
          {iaAtual.dica && <p className="rounded-2xl bg-verde/10 p-3 text-sm text-verde-escuro">{iaAtual.dica}</p>}
          {iaAtual.progressoes.length === 0 && <p className="text-terra">A IA não trouxe nada aproveitável dessa vez. Tenta de novo.</p>}
          {iaAtual.progressoes.map((p, k) => (
            <CartaoProgressao key={`ia${k}`} id={`ia${k}`} p={p} tom={tom} tocando={tocando} tocar={tocar} aoUsar={aoUsar} />
          ))}
        </>
      )}
    </div>
  );
}

function CartaoProgressao({
  id,
  p,
  tom,
  tocando,
  tocar,
  aoUsar,
}: {
  id: string;
  p: ProgExib;
  tom: string;
  tocando: { id: string; i: number | null } | null;
  tocar: (id: string, acordes: string[]) => void;
  aoUsar?: Props["aoUsarProgressao"];
}) {
  const ativo = tocando?.id === id;
  return (
    <Cartao>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-couro-escuro">{p.nome}</p>
          {p.origem === "variacao" && <span className="text-xs font-bold uppercase text-verde">variação</span>}
        </div>
        <button
          type="button"
          aria-label={ativo ? "Parar" : "Ouvir"}
          onClick={() => tocar(id, p.acordes)}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${ativo ? "bg-vermelho text-palha" : "bg-couro text-palha"}`}
        >
          {ativo ? <Parar tamanho={20} /> : <Play tamanho={20} />}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {p.acordes.map((a, i) => (
          <span
            key={i}
            className={`flex min-w-14 flex-col items-center rounded-xl px-2 py-1 transition ${
              ativo && tocando?.i === i ? "scale-110 bg-vermelho text-palha" : acordeNoTom(a, tom) ? "bg-creme-escuro" : "bg-amarelo/60"
            }`}
          >
            <span className="font-cifra text-lg font-bold">{a}</span>
            {p.graus?.[i] && <span className="text-[10px] opacity-70">{p.graus[i]}</span>}
          </span>
        ))}
      </div>
      {p.comentario && <p className="mt-2 text-sm text-terra">{p.comentario}</p>}
      {aoUsar && (
        <Botao variante="contorno" className="mt-3 w-full" onClick={() => aoUsar({ nome: p.nome, acordes: p.acordes })}>
          Levar pra cifra
        </Botao>
      )}
    </Cartao>
  );
}

function PainelTemas({ ritmo, aoUsar }: { ritmo: RitmoId; aoUsar?: Props["aoUsarTema"] }) {
  const avisar = useAviso();
  const [tema, setTema] = useState<TemaId>("pago");
  const [semente, setSemente] = useState(1);
  const [pedido, setPedido] = useState("");
  const [ia, setIa] = useState<{ chave: string; ideias: IdeiaTema[] } | null>(null);
  const [carregando, setCarregando] = useState(false);
  const locais = useMemo(() => ideiasDeTema(tema, RITMOS[ritmo].nome, semente), [tema, ritmo, semente]);
  const chave = `${tema}|${ritmo}`;

  async function pedirIA() {
    setCarregando(true);
    try {
      const resp = await fetch("/api/ia", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tipo: "temas", tema, ritmo, pedido, semente }),
      });
      const j = await resp.json();
      if (j.erro) throw new Error(j.erro);
      if (j.aviso) avisar(j.aviso);
      if (j.ia) setIa({ chave, ideias: j.ia.ideias });
    } catch (e) {
      avisar(navigator.onLine ? (e as Error).message : "Sem sinal pra chamar a IA agora.", "erro");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Rotulo>Tema</Rotulo>
        <div className="flex flex-wrap gap-2">
          {LISTA_TEMAS.map((t) => (
            <Chip key={t.id} ativo={tema === t.id} onClick={() => setTema(t.id)}>
              {t.nome}
            </Chip>
          ))}
        </div>
      </div>
      <Botao variante="couro" className="w-full" onClick={() => setSemente((s) => s + 1)}>
        Outras ideias do galpão
      </Botao>
      {locais.map((i, k) => (
        <CartaoTema key={`l${k}`} ideia={i} aoUsar={aoUsar} />
      ))}

      <Cartao>
        <Rotulo htmlFor="pedido-tema">Pedido pra IA (opcional)</Rotulo>
        <input
          id="pedido-tema"
          className={classeCampo}
          value={pedido}
          maxLength={300}
          placeholder="Ex.: homenagem ao meu avô tropeiro"
          onChange={(e) => setPedido(e.target.value)}
        />
        <Botao variante="verde" grande className="mt-3 w-full" onClick={pedirIA} disabled={carregando}>
          <Faisca /> {carregando ? "Matutando…" : "Pedir ideias à IA"}
        </Botao>
      </Cartao>
      {ia?.chave === chave && ia.ideias.map((i, k) => <CartaoTema key={`ia${k}`} ideia={i} daIA aoUsar={aoUsar} />)}
    </div>
  );
}

function CartaoTema({ ideia, daIA, aoUsar }: { ideia: IdeiaTema; daIA?: boolean; aoUsar?: Props["aoUsarTema"] }) {
  return (
    <Cartao>
      <p className="flex items-center gap-2 font-titulo text-2xl font-bold text-couro-escuro">
        {daIA && <Faisca tamanho={18} />} {ideia.titulo}
      </p>
      <p className="mt-1 font-titulo text-lg italic text-vermelho">“{ideia.mote}”</p>
      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-carvao">
        {ideia.imagens.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ideia.palavras.map((p) => (
          <span key={p} className="rounded-full bg-verde/10 px-3 py-1 text-sm font-semibold text-verde-escuro">
            {p}
          </span>
        ))}
      </div>
      {ideia.estrutura && <p className="mt-2 text-sm text-terra">{ideia.estrutura}</p>}
      {aoUsar && (
        <Botao variante="contorno" className="mt-3 w-full" onClick={() => aoUsar(ideia)}>
          Levar pro projeto
        </Botao>
      )}
    </Cartao>
  );
}
