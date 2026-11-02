"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calcularPicos, caminhoOnda, PICOS_POR_SEGUNDO } from "@/lib/estudio/analise";
import { compensacaoAtual, PERFIS } from "@/lib/estudio/latencia";
import { obterMotor, type MotorEstudio } from "@/lib/estudio/motor";
import { codificarMp3 } from "@/lib/estudio/mp3";
import { audiveis, faixaNova, inicioNaLinha, ordemParaInserir, type Faixa, type Instrumento } from "@/lib/estudio/tipos";
import { novoId, type Projeto } from "@/lib/data/tipos";
import { RITMOS } from "@/lib/music/ritmos";
import { useSessao } from "../Sessao";
import { Botao, useAviso } from "../ui";
import { Ajustes, Compartilhar, Gravar, Inicio, Lupa, Mais, Menos, Metronomo, Parar, Pausa, Play, Repetir } from "../Icones";
import { ALTURA_PISTA, LARGURA_CABECA, Pista, type Onda } from "./Pista";
import { Regua } from "./Regua";
import { ContagemRegressiva } from "./ContagemRegressiva";
import { FolhaCalibrar, FolhaExportar, FolhaGravar, FolhaMixer, FolhaNovaFaixa, formatarTempo, type OpcoesGravacao } from "./Folhas";

const ZOOMS = [10, 20, 40, 80, 160, 320];

type Gravando = {
  faixaId: string;
  parar: () => Promise<{ pcm: Float32Array; taxa: number } | null>;
  cancelar: () => void;
  latenciaMs: number;
  pos: number;
};

export function Estudio({ projeto }: { projeto: Projeto }) {
  const { faixas: repo, pronto } = useSessao();
  const avisar = useAviso();
  const motor = useRef<MotorEstudio | null>(null);
  const [faixas, setFaixas] = useState<Faixa[] | null>(null);
  const [ondas, setOndas] = useState<Record<string, Onda>>({});
  const [carregando, setCarregando] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<string | null>(null);
  const [pos, setPos] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [gravando, setGravando] = useState<Gravando | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);
  const [contagem, setContagem] = useState<{ batidas: number[]; inicio: number } | null>(null);
  const fimContagem = useCallback(() => setContagem(null), []);
  const [loop, setLoop] = useState<[number, number] | null>(null);
  const [loopAtivo, setLoopAtivo] = useState(false);
  const [click, setClick] = useState(false);
  const [zoom, setZoom] = useState(2);
  const [folha, setFolha] = useState<null | "mixer" | "gravar" | "calibrar" | "exportar" | "nova">(null);
  const [ladoNova, setLadoNova] = useState<"acima" | "abaixo" | null>(null);
  const [verLatencia, setVerLatencia] = useState(0);
  const base = useRef<Record<string, number>>({});
  const salvarTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const rolagem = useRef<HTMLDivElement>(null);
  const pps = ZOOMS[zoom];
  const ritmo = RITMOS[projeto.ritmo];
  const tempos = /^[36]/.test(ritmo.compasso) ? 3 : 2;

  // Um motor só pro app; ao sair da aba, para o som
  useEffect(() => {
    motor.current = obterMotor();
    return () => {
      motor.current?.descarregarTudo();
    };
  }, []);

  const carregarAudio = useCallback(
    async (f: Faixa, blobPronto?: Blob) => {
      const m = motor.current;
      if (!m || !f.audioPath) return;
      setCarregando((s) => new Set(s).add(f.id));
      try {
        const blob = blobPronto ?? (await repo.carregarAudio(f));
        if (!blob) throw new Error("Áudio não encontrado neste aparelho.");
        const buf = await m.carregar(f, blob);
        const dados = m.dadosDa(f.id)!;
        const picos = calcularPicos(buf.getChannelData(0), buf.sampleRate, Math.round(dados.atraso * buf.sampleRate));
        setOndas((o) => ({
          ...o,
          [f.id]: { caminho: caminhoOnda(picos), pontos: picos.max.length, duracao: picos.max.length / PICOS_POR_SEGUNDO },
        }));
      } catch (e) {
        avisar(`${f.nome}: ${(e as Error).message}`, "erro");
      } finally {
        setCarregando((s) => {
          const n = new Set(s);
          n.delete(f.id);
          return n;
        });
      }
    },
    [repo, avisar],
  );

  // Carrega as faixas do projeto
  useEffect(() => {
    if (!pronto) return;
    let vivo = true;
    repo
      .listar(projeto.id)
      .then((l) => {
        if (!vivo) return;
        setFaixas(l);
        motor.current?.definirFaixas(l);
        l.forEach((f) => carregarAudio(f));
      })
      .catch((e: Error) => {
        setFaixas([]);
        avisar(e.message, "erro");
      });
    return () => {
      vivo = false;
    };
  }, [projeto.id, repo, pronto, carregarAudio, avisar]);

  // Cursor andando durante a reprodução
  useEffect(() => {
    if (!tocando) return;
    let id = 0;
    const passo = () => {
      const m = motor.current;
      if (m) {
        if (!m.tocando) {
          setTocando(false);
          setPos(m.posicao());
          return;
        }
        const p = m.posicao();
        setPos(p);
        const el = rolagem.current;
        if (el) {
          const x = LARGURA_CABECA + p * pps;
          if (x > el.scrollLeft + el.clientWidth - 40 || x < el.scrollLeft + LARGURA_CABECA) el.scrollLeft = x - LARGURA_CABECA - 30;
        }
      }
      id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [tocando, pps]);

  const ordenadas = useMemo(() => [...(faixas ?? [])].sort((a, b) => a.ordem - b.ordem), [faixas]);
  const soando = useMemo(() => new Set(audiveis(ordenadas).map((f) => f.id)), [ordenadas]);
  const selecionada = ordenadas.find((f) => f.id === sel) ?? null;
  const fimMusica = Math.max(0, ...ordenadas.filter((f) => ondas[f.id]).map((f) => inicioNaLinha(f) + ondas[f.id].duracao));
  const duracaoTela = Math.max(30, fimMusica + 15, pos + 10);
  const latencia = useMemo(() => {
    void verLatencia;
    if (typeof window === "undefined") return { ms: 0, rotulo: "" };
    const c = compensacaoAtual(obterMotor().ctx);
    return { ms: c.ms, rotulo: `${PERFIS[c.perfil]}${c.metodo === "estimativa" ? ", estimada" : ""}` };
  }, [verLatencia, folha]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------- Ações ----------------

  function opcoesTocar() {
    return { bpm: projeto.bpm, tempos, click, loop: loopAtivo && loop && loop[1] - loop[0] > 0.2 ? loop : null };
  }

  async function play() {
    const m = motor.current;
    if (!m) return;
    if (tocando) {
      setPos(m.parar());
      setTocando(false);
      return;
    }
    await m.tocar(pos, opcoesTocar());
    setTocando(true);
  }

  async function reiniciarSeTocando(novas?: Partial<{ click: boolean; loopAtivo: boolean; loop: [number, number] | null }>) {
    const m = motor.current;
    if (!m || !tocando) return;
    const p = m.parar();
    const op = { ...opcoesTocar() };
    if (novas?.click !== undefined) op.click = novas.click;
    const la = novas?.loopAtivo ?? loopAtivo;
    const lp = novas?.loop !== undefined ? novas.loop : loop;
    op.loop = la && lp && lp[1] - lp[0] > 0.2 ? lp : null;
    await m.tocar(p, op);
  }

  function buscar(t: number) {
    setPos(t);
    const m = motor.current;
    if (m && tocando) {
      m.parar();
      m.tocar(t, opcoesTocar());
    }
  }

  const alterarFaixa = useCallback(
    (id: string, alt: Partial<Faixa>, salvar: "ja" | "depois" | "nao" = "depois") => {
      setFaixas((l) => {
        const n = (l ?? []).map((f) => (f.id === id ? { ...f, ...alt } : f));
        motor.current?.definirFaixas(n);
        return n;
      });
      if (salvar === "nao") return;
      clearTimeout(salvarTimers.current[id]);
      const enviar = () => repo.atualizar(id, alt).catch((e: Error) => avisar(e.message, "erro"));
      if (salvar === "ja") enviar();
      else salvarTimers.current[id] = setTimeout(enviar, 400);
    },
    [repo, avisar],
  );

  // Alterações acumuladas por faixa enquanto o slider/arraste mexe (salva tudo junto)
  const pendentes = useRef<Record<string, Partial<Faixa>>>({});
  function alterarAcumulando(id: string, alt: Partial<Faixa>) {
    pendentes.current[id] = { ...pendentes.current[id], ...alt };
    setFaixas((l) => {
      const n = (l ?? []).map((f) => (f.id === id ? { ...f, ...alt } : f));
      motor.current?.definirFaixas(n);
      return n;
    });
    clearTimeout(salvarTimers.current[id]);
    salvarTimers.current[id] = setTimeout(() => {
      const tudo = pendentes.current[id];
      delete pendentes.current[id];
      if (tudo) repo.atualizar(id, tudo).catch((e: Error) => avisar(e.message, "erro"));
    }, 400);
    if (alt.offsetMs !== undefined) reiniciarSeTocando();
  }

  function arrastar(f: Faixa, deltaMs: number, fim: boolean) {
    if (base.current[f.id] === undefined) base.current[f.id] = f.offsetMs;
    const novo = Math.round(base.current[f.id] + deltaMs);
    if (fim) {
      delete base.current[f.id];
      alterarAcumulando(f.id, { offsetMs: novo });
    } else alterarFaixa(f.id, { offsetMs: novo }, "nao");
  }

  async function criarFaixa(instrumento: Instrumento) {
    const lista = ordenadas;
    const ordem = ordemParaInserir(lista, ladoNova ? sel : null, ladoNova ?? "abaixo");
    const f = faixaNova(projeto.id, novoId(), ordem, instrumento);
    const iguais = lista.filter((x) => x.instrumento === instrumento).length;
    if (iguais) f.nome = `${f.nome} ${iguais + 1}`;
    try {
      await repo.criar(f);
      setFaixas((l) => {
        const n = [...(l ?? []), f];
        motor.current?.definirFaixas(n);
        return n;
      });
      setSel(f.id);
      setFolha(null);
    } catch (e) {
      avisar((e as Error).message, "erro");
    }
  }

  async function excluirFaixa(f: Faixa) {
    if (!confirm(`Apagar a faixa «${f.nome}»${f.audioPath ? " e a gravação dela" : ""}?`)) return;
    try {
      await repo.excluir(f);
      motor.current?.esquecer(f.id);
      setFaixas((l) => (l ?? []).filter((x) => x.id !== f.id));
      setSel(null);
      setFolha(null);
    } catch (e) {
      avisar((e as Error).message, "erro");
    }
  }

  async function iniciarGravacao(op: OpcoesGravacao) {
    const m = motor.current;
    const f = selecionada;
    if (!m || !f) return;
    setFolha(null);
    if (tocando) {
      m.parar();
      setTocando(false);
    }
    try {
      const comp = compensacaoAtual(m.ctx);
      const sessao = await m.gravar({ pos, guia: op.guia, contagem: op.contagem, bpm: projeto.bpm, tempos, excluir: f.id });
      setGravando({ faixaId: f.id, parar: sessao.parar, cancelar: sessao.cancelar, latenciaMs: comp.ms, pos });
      if (sessao.batidasContagem.length) setContagem({ batidas: sessao.batidasContagem, inicio: sessao.inicioCtx });
      setTocando(true);
    } catch (e) {
      const msg =
        (e as Error).name === "NotAllowedError"
          ? "Sem permissão pro microfone. Libera nas configurações do navegador."
          : (e as Error).message;
      avisar(msg, "erro");
    }
  }

  async function pararGravacao() {
    const g = gravando;
    if (!g) return;
    setGravando(null);
    setTocando(false);
    const f = ordenadas.find((x) => x.id === g.faixaId);
    const r = await g.parar();
    setPos(g.pos);
    if (!r || !f) {
      avisar("Gravação curta demais — parou na contagem.", "erro");
      return;
    }
    setProcessando("Guardando a gravação…");
    try {
      const mp3 = await codificarMp3(r.pcm, r.taxa, 128, (p) => setProcessando(`Guardando a gravação… ${Math.round(p * 100)}%`));
      const path = await repo.salvarAudio(f, mp3);
      const alt: Partial<Faixa> = {
        audioPath: path,
        duracaoMs: Math.round((r.pcm.length / r.taxa) * 1000),
        taxaAmostragem: r.taxa,
        offsetMs: Math.round(g.pos * 1000),
        latenciaMs: g.latenciaMs,
      };
      await repo.atualizar(f.id, alt);
      const nova = { ...f, ...alt };
      alterarFaixa(f.id, alt, "nao");
      await carregarAudio(nova, mp3);
      avisar("Faixa gravada ✓");
    } catch (e) {
      avisar((e as Error).message, "erro");
    } finally {
      setProcessando(null);
    }
  }

  function abrirGravacao() {
    if (!selecionada) {
      setLadoNova(null);
      setFolha("nova");
      avisar("Primeiro escolhe o instrumento da faixa nova");
      return;
    }
    if (selecionada.audioPath && !confirm(`A faixa «${selecionada.nome}» já tem gravação. Gravar por cima?`)) return;
    setFolha("gravar");
  }

  function duracaoDe(ids: string[]) {
    const fs = ordenadas.filter((f) => ids.includes(f.id) && ondas[f.id]);
    if (!fs.length) return 0;
    return Math.max(...fs.map((f) => inicioNaLinha(f) + ondas[f.id].duracao)) - Math.min(...fs.map(inicioNaLinha));
  }

  if (faixas === null) return <p className="text-terra">Abrindo o estúdio…</p>;

  return (
    <div className="-mx-4 -mt-4">
      {/* Barra de ferramentas */}
      <div className="flex items-center gap-2 px-4 py-2">
        <button
          type="button"
          onClick={() => setFolha("calibrar")}
          className="min-h-11 flex-1 truncate rounded-full bg-creme-escuro px-3 text-left text-sm text-couro-escuro"
        >
          🎧 {latencia.rotulo}: <b>{latencia.ms} ms</b>
        </button>
        <div className="flex items-center rounded-full bg-creme-escuro">
          <button
            aria-label="Afastar"
            className="flex h-11 w-10 items-center justify-center"
            onClick={() => setZoom((z) => Math.max(0, z - 1))}
          >
            <Menos tamanho={18} />
          </button>
          <Lupa tamanho={16} />
          <button
            aria-label="Aproximar"
            className="flex h-11 w-10 items-center justify-center"
            onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))}
          >
            <Mais tamanho={18} />
          </button>
        </div>
        <Botao variante="verde" className="min-h-11 px-3" onClick={() => setFolha("exportar")} aria-label="Exportar MP3">
          <Compartilhar tamanho={20} /> MP3
        </Botao>
      </div>

      {/* Linha do tempo com as faixas empilhadas */}
      <div
        ref={rolagem}
        className="relative max-h-[52dvh] overflow-auto border-y-2 border-couro/20 bg-creme-escuro/40"
        style={{ overscrollBehavior: "contain" }}
      >
        <div className="relative" style={{ width: LARGURA_CABECA + duracaoTela * pps, minWidth: "100%" }}>
          <Regua
            duracao={duracaoTela}
            pps={pps}
            bpm={projeto.bpm}
            tempos={tempos}
            loop={loop}
            loopAtivo={loopAtivo}
            aoBuscar={buscar}
            aoDefinirLoop={(r) => {
              setLoop(r);
              setLoopAtivo(true);
            }}
          />
          {ordenadas.map((f) => (
            <Pista
              key={f.id}
              faixa={f}
              inicio={inicioNaLinha(f)}
              onda={ondas[f.id]}
              carregando={carregando.has(f.id)}
              pps={pps}
              selecionada={sel === f.id}
              soando={soando.has(f.id)}
              aoSelecionar={() => setSel(f.id)}
              aoAlternar={(c) => alterarFaixa(f.id, { [c]: !f[c] } as Partial<Faixa>, "ja")}
              aoArrastar={(d, fim) => arrastar(f, d, fim)}
            />
          ))}
          {ordenadas.length === 0 && (
            <div className="flex items-center px-4 text-terra" style={{ height: ALTURA_PISTA, paddingLeft: LARGURA_CABECA + 12 }}>
              Nenhuma faixa ainda.
            </div>
          )}
          {/* Cursor */}
          <div
            className="pointer-events-none absolute bottom-0 top-0 z-[5] w-0.5 bg-vermelho"
            style={{ left: LARGURA_CABECA + Math.max(0, pos) * pps }}
          >
            <div className="absolute -left-1.5 top-0 h-3 w-3.5 rounded-b-full bg-vermelho" />
          </div>
        </div>
      </div>

      {/* Ações da faixa selecionada */}
      <div className="space-y-2 px-4 py-3">
        {selecionada ? (
          <>
            <div className="flex items-center gap-2">
              <Botao
                variante="contorno"
                className="px-3"
                onClick={() => alterarAcumulando(selecionada.id, { offsetMs: selecionada.offsetMs - 10 })}
              >
                −10 ms
              </Botao>
              <div className="flex-1 text-center text-sm leading-tight text-terra">
                <b className="block text-base text-couro-escuro">{selecionada.nome}</b>
                começa em {inicioNaLinha(selecionada).toFixed(3)} s
              </div>
              <Botao
                variante="contorno"
                className="px-3"
                onClick={() => alterarAcumulando(selecionada.id, { offsetMs: selecionada.offsetMs + 10 })}
              >
                +10 ms
              </Botao>
            </div>
            <p className="text-center text-xs text-terra">
              Arraste a faixa de borda amarela pra alinhar · marque um trecho na régua pra repetir e conferir
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Botao
                variante="couro"
                className="px-2 text-sm"
                onClick={() => {
                  setLadoNova("acima");
                  setFolha("nova");
                }}
              >
                <Mais tamanho={18} /> Acima
              </Botao>
              <Botao
                variante="couro"
                className="px-2 text-sm"
                onClick={() => {
                  setLadoNova("abaixo");
                  setFolha("nova");
                }}
              >
                <Mais tamanho={18} /> Abaixo
              </Botao>
              <Botao variante="contorno" className="px-2 text-sm" onClick={() => setFolha("mixer")}>
                <Ajustes tamanho={18} /> Mixer
              </Botao>
            </div>
          </>
        ) : (
          <Botao
            variante="couro"
            grande
            className="w-full"
            onClick={() => {
              setLadoNova(null);
              setFolha("nova");
            }}
          >
            <Mais /> Nova faixa
          </Botao>
        )}
      </div>

      {/* Transporte */}
      <div className="couro sticky bottom-[calc(4.6rem+env(safe-area-inset-bottom))] z-30 mx-2 flex items-center gap-1 rounded-3xl px-2 py-2 text-creme shadow-xl">
        <button
          aria-label="Voltar ao início"
          className="flex h-12 w-11 items-center justify-center rounded-full active:bg-white/10"
          onClick={() => buscar(loopAtivo && loop ? loop[0] : 0)}
        >
          <Inicio />
        </button>
        <button
          aria-label={tocando ? "Pausar" : "Tocar"}
          disabled={!!gravando}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-palha text-couro-escuro disabled:opacity-40"
          onClick={play}
        >
          {tocando && !gravando ? <Pausa tamanho={26} /> : <Play tamanho={26} />}
        </button>
        {gravando ? (
          <button
            aria-label="Parar gravação"
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-vermelho font-bold text-palha animate-pulse"
            onClick={pararGravacao}
          >
            <Parar tamanho={22} /> Parar
          </button>
        ) : (
          <button
            aria-label="Gravar"
            disabled={!!processando}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-vermelho text-palha disabled:opacity-40"
            onClick={abrirGravacao}
          >
            <Gravar tamanho={30} />
          </button>
        )}
        <button
          aria-label="Repetir trecho"
          aria-pressed={loopAtivo}
          disabled={!loop}
          className={`flex h-12 w-11 items-center justify-center rounded-full disabled:opacity-30 ${loopAtivo ? "bg-amarelo text-carvao" : ""}`}
          onClick={() => {
            setLoopAtivo((v) => !v);
            reiniciarSeTocando({ loopAtivo: !loopAtivo });
          }}
        >
          <Repetir />
        </button>
        <button
          aria-label="Click (metrônomo)"
          aria-pressed={click}
          className={`flex h-12 w-11 items-center justify-center rounded-full ${click ? "bg-amarelo text-carvao" : ""}`}
          onClick={() => {
            setClick((v) => !v);
            reiniciarSeTocando({ click: !click });
          }}
        >
          <Metronomo />
        </button>
        {!gravando && <span className="ml-auto pr-2 font-mono text-sm tabular-nums">{formatarTempo(pos)}</span>}
      </div>
      {processando && <p className="mt-2 text-center text-sm font-bold text-verde">{processando}</p>}

      {contagem && gravando && (
        <ContagemRegressiva
          ctx={obterMotor().ctx}
          batidas={contagem.batidas}
          inicio={contagem.inicio}
          aoTerminar={fimContagem}
          aoCancelar={() => {
            gravando.cancelar();
            setGravando(null);
            setTocando(false);
            setContagem(null);
            avisar("Gravação cancelada");
          }}
        />
      )}

      <FolhaNovaFaixa aberta={folha === "nova"} lado={ladoNova} aoFechar={() => setFolha(null)} aoCriar={criarFaixa} />
      {folha === "mixer" && (
        <FolhaMixer
          faixa={selecionada}
          aoFechar={() => setFolha(null)}
          aoAlterar={(alt) => alterarAcumulando(selecionada!.id, alt)}
          aoInserir={(lado) => {
            setLadoNova(lado);
            setFolha("nova");
          }}
          aoExcluir={() => selecionada && excluirFaixa(selecionada)}
          aoGravar={() => setFolha("gravar")}
        />
      )}
      {folha === "gravar" && (
        <FolhaGravar
          faixa={selecionada}
          temOutras={ordenadas.some((f) => f.id !== sel && ondas[f.id])}
          latencia={latencia}
          aoFechar={() => setFolha(null)}
          aoIniciar={iniciarGravacao}
          aoCalibrar={() => setFolha("calibrar")}
        />
      )}
      <FolhaCalibrar
        aberta={folha === "calibrar"}
        motor={obterMotor()}
        aoFechar={() => setFolha(null)}
        aoMudar={() => setVerLatencia((v) => v + 1)}
      />
      {folha === "exportar" && (
        <FolhaExportar
          aberta
          aoFechar={() => setFolha(null)}
          faixas={ordenadas}
          duracaoDe={duracaoDe}
          titulo={projeto.titulo}
          projetoId={projeto.id}
          motor={obterMotor()}
          repo={repo}
        />
      )}
    </div>
  );
}
