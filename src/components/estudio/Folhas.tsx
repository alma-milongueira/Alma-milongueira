"use client";

import { useEffect, useRef, useState } from "react";
import { escolherBitrate, MB, codificarMp3 } from "@/lib/estudio/mp3";
import {
  BPM_TESTE,
  BATIDAS_TESTE,
  CONTAGEM_TESTE,
  PERFIS,
  estimativaSistema,
  lerLatencia,
  salvarLatencia,
  testeBatida,
  toqueNoRelogio,
  type ConfigLatencia,
  type PerfilSaida,
} from "@/lib/estudio/latencia";
import { mediana, parearAtrasos } from "@/lib/estudio/analise";
import { baixar, compartilharArquivo, linkWhatsApp, nomeArquivo } from "@/lib/estudio/compartilhar";
import type { MotorEstudio, Guia } from "@/lib/estudio/motor";
import { INSTRUMENTOS, type Faixa, type Instrumento } from "@/lib/estudio/tipos";
import type { RepositorioFaixas } from "@/lib/estudio/repositorio";
import { Baixar, Compartilhar, Lixo, Mais } from "../Icones";
import { Botao, Chip, Folha, Rotulo, classeCampo, useAviso } from "../ui";
import { IconeInstrumento } from "./Pista";

// ---------------- Nova faixa ----------------
export function FolhaNovaFaixa({
  aberta,
  lado,
  aoFechar,
  aoCriar,
}: {
  aberta: boolean;
  lado: "acima" | "abaixo" | null;
  aoFechar: () => void;
  aoCriar: (i: Instrumento) => void;
}) {
  return (
    <Folha
      aberta={aberta}
      aoFechar={aoFechar}
      titulo={lado === "acima" ? "Nova faixa acima" : lado === "abaixo" ? "Nova faixa abaixo" : "Nova faixa"}
    >
      <p className="mb-3 text-terra">Qual instrumento vai nessa faixa?</p>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(INSTRUMENTOS) as Instrumento[]).map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => aoCriar(i)}
            className="flex min-h-14 items-center gap-3 rounded-2xl px-4 text-lg font-bold text-palha active:opacity-80"
            style={{ background: INSTRUMENTOS[i].cor }}
          >
            <IconeInstrumento i={i} tamanho={26} /> {INSTRUMENTOS[i].nome}
          </button>
        ))}
      </div>
    </Folha>
  );
}

// ---------------- Mixer da faixa ----------------
function Deslizante({
  rotulo,
  valor,
  min,
  max,
  passo,
  formato,
  aoMudar,
}: {
  rotulo: string;
  valor: number;
  min: number;
  max: number;
  passo: number;
  formato: (v: number) => string;
  aoMudar: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex justify-between text-sm font-bold text-terra">
        <span>{rotulo}</span>
        <span className="text-couro-escuro">{formato(valor)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={passo}
        value={valor}
        onChange={(e) => aoMudar(Number(e.target.value))}
        onDoubleClick={() => aoMudar(rotulo === "Volume" ? 1 : 0)}
        className="h-10 w-full accent-[var(--color-verde)]"
      />
    </label>
  );
}

export function FolhaMixer({
  faixa,
  aoFechar,
  aoAlterar,
  aoInserir,
  aoExcluir,
  aoGravar,
}: {
  faixa: Faixa | null;
  aoFechar: () => void;
  aoAlterar: (alt: Partial<Faixa>) => void;
  aoInserir: (lado: "acima" | "abaixo") => void;
  aoExcluir: () => void;
  aoGravar: () => void;
}) {
  if (!faixa) return null;
  const db = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)} dB`;
  return (
    <Folha aberta aoFechar={aoFechar} titulo={`Mixer · ${faixa.nome}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            aria-label="Nome da faixa"
            className={classeCampo}
            value={faixa.nome}
            maxLength={80}
            onChange={(e) => aoAlterar({ nome: e.target.value || "Faixa" })}
          />
          <select
            aria-label="Instrumento"
            className={`${classeCampo} w-auto`}
            value={faixa.instrumento}
            onChange={(e) => aoAlterar({ instrumento: e.target.value as Instrumento })}
          >
            {(Object.keys(INSTRUMENTOS) as Instrumento[]).map((i) => (
              <option key={i} value={i}>
                {INSTRUMENTOS[i].nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Chip ativo={faixa.mudo} onClick={() => aoAlterar({ mudo: !faixa.mudo })}>
            Mudo
          </Chip>
          <Chip ativo={faixa.solo} onClick={() => aoAlterar({ solo: !faixa.solo })}>
            Solo
          </Chip>
        </div>
        <Deslizante
          rotulo="Volume"
          valor={faixa.volume}
          min={0}
          max={2}
          passo={0.01}
          formato={(v) => `${Math.round(v * 100)}%`}
          aoMudar={(volume) => aoAlterar({ volume })}
        />
        <div className="rounded-2xl bg-palha p-3">
          <Rotulo>Equalizador</Rotulo>
          <Deslizante
            rotulo="Grave (250 Hz)"
            valor={faixa.eqGrave}
            min={-12}
            max={12}
            passo={0.5}
            formato={db}
            aoMudar={(eqGrave) => aoAlterar({ eqGrave })}
          />
          <Deslizante
            rotulo="Médio (1 kHz)"
            valor={faixa.eqMedio}
            min={-12}
            max={12}
            passo={0.5}
            formato={db}
            aoMudar={(eqMedio) => aoAlterar({ eqMedio })}
          />
          <Deslizante
            rotulo="Agudo (4 kHz)"
            valor={faixa.eqAgudo}
            min={-12}
            max={12}
            passo={0.5}
            formato={db}
            aoMudar={(eqAgudo) => aoAlterar({ eqAgudo })}
          />
          <button
            type="button"
            className="mt-1 text-sm font-bold text-verde underline"
            onClick={() => aoAlterar({ eqGrave: 0, eqMedio: 0, eqAgudo: 0 })}
          >
            Zerar EQ
          </button>
        </div>
        <div className="rounded-2xl bg-palha p-3 text-sm text-terra">
          <p>
            Posição: <b className="text-couro-escuro">{(faixa.offsetMs / 1000).toFixed(3)} s</b> · latência compensada:{" "}
            <b className="text-couro-escuro">{faixa.latenciaMs} ms</b>
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Botao variante="contorno" onClick={() => aoAlterar({ offsetMs: faixa.offsetMs - 10 })}>
              −10 ms
            </Botao>
            <Botao variante="contorno" onClick={() => aoAlterar({ offsetMs: 0 })}>
              Zerar
            </Botao>
            <Botao variante="contorno" onClick={() => aoAlterar({ offsetMs: faixa.offsetMs + 10 })}>
              +10 ms
            </Botao>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Botao variante="couro" onClick={() => aoInserir("acima")}>
            <Mais tamanho={20} /> Faixa acima
          </Botao>
          <Botao variante="couro" onClick={() => aoInserir("abaixo")}>
            <Mais tamanho={20} /> Faixa abaixo
          </Botao>
        </div>
        <Botao variante="vermelho" grande className="w-full" onClick={aoGravar}>
          {faixa.audioPath ? "Regravar esta faixa" : "Gravar nesta faixa"}
        </Botao>
        <Botao variante="contorno" className="w-full border-vermelho/40 text-vermelho" onClick={aoExcluir}>
          <Lixo /> Apagar faixa
        </Botao>
      </div>
    </Folha>
  );
}

// ---------------- Gravar ----------------
export type OpcoesGravacao = { guia: Guia; contagem: number };

export function FolhaGravar({
  faixa,
  temOutras,
  latencia,
  aoFechar,
  aoIniciar,
  aoCalibrar,
}: {
  faixa: Faixa | null;
  temOutras: boolean;
  latencia: { ms: number; rotulo: string };
  aoFechar: () => void;
  aoIniciar: (o: OpcoesGravacao) => void;
  aoCalibrar: () => void;
}) {
  const [guia, setGuia] = useState<Guia>(temOutras ? "ambos" : "click");
  const [contagem, setContagem] = useState(4);
  if (!faixa) return null;
  const opcoes: { id: Guia; nome: string; desc: string }[] = [
    { id: "ambos", nome: "Faixas + click", desc: "Ouve o que já foi gravado e o metrônomo" },
    { id: "faixas", nome: "Só as faixas", desc: "Ouve a base gravada, sem click" },
    { id: "click", nome: "Só o click", desc: "Metrônomo no BPM do projeto" },
    { id: "nada", nome: "Sem guia", desc: "Andamento livre" },
  ];
  return (
    <Folha aberta aoFechar={aoFechar} titulo={`Gravar · ${faixa.nome}`}>
      <div className="space-y-4">
        <p className="rounded-2xl bg-amarelo-claro/40 p-3 text-sm text-couro-escuro">
          🎧 Usa <b>fone de ouvido</b>: assim a guia não vaza pro microfone. A gravação começa de onde está o cursor.
        </p>
        <div>
          <Rotulo>O que tocar no fone</Rotulo>
          <div className="grid grid-cols-2 gap-2">
            {opcoes.map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={!temOutras && (o.id === "faixas" || o.id === "ambos")}
                aria-pressed={guia === o.id}
                onClick={() => setGuia(o.id)}
                className={`rounded-2xl border-2 p-3 text-left disabled:opacity-40 ${guia === o.id ? "border-verde bg-verde/10" : "border-couro/20 bg-palha"}`}
              >
                <span className="block font-bold text-couro-escuro">{o.nome}</span>
                <span className="block text-xs text-terra">{o.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <Rotulo>Contagem de entrada</Rotulo>
          <div className="flex gap-2">
            {[0, 2, 4].map((n) => (
              <Chip key={n} ativo={contagem === n} onClick={() => setContagem(n)}>
                {n ? `${n} tempos` : "Nenhuma"}
              </Chip>
            ))}
          </div>
        </div>
        <button type="button" onClick={aoCalibrar} className="w-full rounded-2xl bg-palha p-3 text-left text-sm text-terra">
          Latência compensada: <b className="text-couro-escuro">{latencia.ms} ms</b> ({latencia.rotulo}) —{" "}
          <span className="font-bold text-verde underline">calibrar</span>
        </button>
        <Botao variante="vermelho" grande className="w-full" onClick={() => aoIniciar({ guia, contagem })}>
          ● Começar a gravar
        </Botao>
      </div>
    </Folha>
  );
}

// ---------------- Calibrar latência ----------------
export function FolhaCalibrar({
  aberta,
  motor,
  aoFechar,
  aoMudar,
}: {
  aberta: boolean;
  motor: MotorEstudio | null;
  aoFechar: () => void;
  aoMudar: () => void;
}) {
  const avisar = useAviso();
  const [cfg, setCfg] = useState<ConfigLatencia>(() => (typeof window === "undefined" ? { ativo: "fio", perfis: {} } : lerLatencia()));
  const [rodando, setRodando] = useState<null | "batida" | "toque">(null);
  const toques = useRef<number[]>([]);
  const [contagemToques, setContagemToques] = useState(0);
  const perfil = cfg.ativo;
  const atual = cfg.perfis[perfil];

  function guardar(n: ConfigLatencia) {
    setCfg(n);
    salvarLatencia(n);
    aoMudar();
  }

  async function batida() {
    if (!motor) return;
    setRodando("batida");
    try {
      const r = await testeBatida(motor);
      guardar({
        ...cfg,
        perfis: { ...cfg.perfis, [perfil]: { ms: r.ms, dispersaoMs: r.dispersaoMs, metodo: "batida", quando: new Date().toISOString() } },
      });
      avisar(
        r.dispersaoMs > 25 ? `Medi ${r.ms} ms, mas variou bastante (±${r.dispersaoMs} ms). Vale repetir.` : `Latência medida: ${r.ms} ms`,
      );
    } catch (e) {
      avisar((e as Error).message, "erro");
    } finally {
      setRodando(null);
    }
  }

  async function toque() {
    if (!motor) return;
    await motor.ctx.resume();
    setRodando("toque");
    toques.current = [];
    setContagemToques(0);
    const b = 60 / BPM_TESTE;
    const t0 = motor.ctx.currentTime + 0.4;
    const todos = Array.from({ length: CONTAGEM_TESTE + BATIDAS_TESTE }, (_, k) => t0 + k * b);
    todos.forEach((t, k) => motor.tocarClicks([t], k % 4 === 0));
    const medidos = todos.slice(CONTAGEM_TESTE);
    setTimeout(
      () => {
        const atrasos = parearAtrasos(medidos, toques.current, 0.25, 0.55);
        setRodando(null);
        if (atrasos.length < 4) {
          avisar("Poucos toques no tempo. Tenta de novo, tocando junto com o click.", "erro");
          return;
        }
        const saida = Math.round(mediana(atrasos) * 1000);
        // toque mede a saída; somamos uma estimativa da entrada do microfone
        const total = saida + 15;
        guardar({
          ...cfg,
          saidaToqueMs: { ...cfg.saidaToqueMs, [perfil]: saida },
          perfis:
            cfg.perfis[perfil]?.metodo === "batida"
              ? cfg.perfis
              : { ...cfg.perfis, [perfil]: { ms: total, dispersaoMs: 0, metodo: "toque", quando: new Date().toISOString() } },
        });
        avisar(
          `Saída do som: ${saida} ms${cfg.perfis[perfil]?.metodo === "batida" ? " (mantive a medição da batida, que é mais completa)" : ""}`,
        );
      },
      (todos[todos.length - 1] - motor.ctx.currentTime + 0.8) * 1000,
    );
  }

  function ajustar(d: number) {
    const base = atual?.ms ?? (motor ? estimativaSistema(motor.ctx) : 0);
    guardar({
      ...cfg,
      perfis: {
        ...cfg.perfis,
        [perfil]: {
          ms: base + d,
          dispersaoMs: atual?.dispersaoMs ?? 0,
          metodo: atual?.metodo ?? "estimativa",
          quando: new Date().toISOString(),
        },
      },
    });
  }

  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo="Calibrar latência">
      <div className="space-y-4">
        <p className="text-sm text-terra">
          Todo celular demora um pouquinho entre o som sair e o microfone gravar — no fone Bluetooth isso passa de 200 ms. Medindo uma vez,
          o app compensa sozinho em toda gravação.
        </p>
        <div>
          <Rotulo>Como tu vais escutar</Rotulo>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PERFIS) as PerfilSaida[]).map((p) => (
              <Chip key={p} ativo={perfil === p} onClick={() => guardar({ ...cfg, ativo: p })}>
                {PERFIS[p]}
              </Chip>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-couro-escuro p-4 text-center text-creme">
          <p className="text-xs uppercase tracking-wide text-creme/70">Compensação · {PERFIS[perfil]}</p>
          <p className="font-titulo text-5xl font-bold text-amarelo-claro">
            {atual?.ms ?? (motor ? estimativaSistema(motor.ctx) : "—")} ms
          </p>
          <p className="text-xs text-creme/70">
            {atual
              ? atual.metodo === "batida"
                ? "medido pela batida"
                : atual.metodo === "toque"
                  ? "medido pelo toque"
                  : "ajuste manual"
              : "estimativa do sistema (sem calibrar)"}
          </p>
          <div className="mt-3 flex justify-center gap-2">
            <button className="h-11 rounded-full bg-white/10 px-4 font-bold" onClick={() => ajustar(-5)}>
              −5 ms
            </button>
            <button className="h-11 rounded-full bg-white/10 px-4 font-bold" onClick={() => ajustar(5)}>
              +5 ms
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-palha p-3">
          <p className="font-bold text-couro-escuro">1. Teste da batida (recomendado)</p>
          <p className="text-sm text-terra">
            {perfil === "altofalante"
              ? "Deixa o celular quieto sobre a mesa, volume alto. Ele toca 12 clicks e escuta a si mesmo."
              : "Com o fone, escuta 4 clicks de preparo e bate palma junto com os 8 seguintes, perto do celular."}
          </p>
          <Botao variante="verde" className="mt-2 w-full" disabled={!!rodando} onClick={batida}>
            {rodando === "batida" ? "Escutando…" : "Fazer teste da batida"}
          </Botao>
        </div>

        <div className="rounded-2xl bg-palha p-3">
          <p className="font-bold text-couro-escuro">2. Teste do toque (só a saída)</p>
          <p className="text-sm text-terra">
            Toca no botão grande junto com cada click, depois dos 4 de preparo. Serve quando não dá pra usar o microfone.
          </p>
          {rodando === "toque" ? (
            <button
              type="button"
              onPointerDown={(e) => {
                if (!motor) return;
                toques.current.push(toqueNoRelogio(motor.ctx, e.timeStamp));
                setContagemToques((n) => n + 1);
              }}
              className="mt-2 h-32 w-full touch-none rounded-3xl bg-vermelho text-2xl font-bold text-palha active:scale-[0.98]"
            >
              Toca aqui ({contagemToques})
            </button>
          ) : (
            <Botao variante="couro" className="mt-2 w-full" disabled={!!rodando} onClick={toque}>
              Fazer teste do toque
            </Botao>
          )}
          {cfg.saidaToqueMs?.[perfil] !== undefined && (
            <p className="mt-1 text-xs text-terra">Última saída medida pelo toque: {cfg.saidaToqueMs[perfil]} ms</p>
          )}
        </div>
      </div>
    </Folha>
  );
}

// ---------------- Exportar ----------------
export function FolhaExportar({
  aberta,
  aoFechar,
  faixas,
  duracaoDe,
  titulo,
  projetoId,
  motor,
  repo,
}: {
  aberta: boolean;
  aoFechar: () => void;
  faixas: Faixa[];
  duracaoDe: (ids: string[]) => number;
  titulo: string;
  projetoId: string;
  motor: MotorEstudio | null;
  repo: RepositorioFaixas;
}) {
  const avisar = useAviso();
  const gravadas = faixas.filter((f) => f.audioPath);
  const [escolhidas, setEscolhidas] = useState<string[]>(() => {
    const temSolo = gravadas.some((f) => f.solo);
    return gravadas.filter((f) => !f.mudo && (!temSolo || f.solo)).map((f) => f.id);
  });
  const [progresso, setProgresso] = useState<number | null>(null);
  const [resultado, setResultado] = useState<{ blob: Blob; url: string; kbps: number; situacao: string; nome: string } | null>(null);
  useEffect(
    () => () => {
      if (resultado) URL.revokeObjectURL(resultado.url);
    },
    [resultado],
  );

  const dur = escolhidas.length ? duracaoDe(escolhidas) : 0;
  const plano = escolherBitrate(dur);
  const nome = nomeArquivo(titulo);
  const texto = `🎶 ${titulo} — prévia feita no Alma Milongueira`;

  async function gerar() {
    if (!motor) return;
    setProgresso(0);
    setResultado(null);
    try {
      const { pcm, taxa } = await motor.renderizar(escolhidas);
      const e = escolherBitrate(pcm.length / taxa);
      const blob = await codificarMp3(pcm, taxa, e.kbps, (f) => setProgresso(f));
      setResultado({ blob, url: URL.createObjectURL(blob), kbps: e.kbps, situacao: e.situacao, nome });
    } catch (e) {
      avisar((e as Error).message, "erro");
    } finally {
      setProgresso(null);
    }
  }

  async function whatsapp() {
    if (!resultado) return;
    const r = await compartilharArquivo(resultado.blob, resultado.nome, texto);
    if (r !== "sem-suporte") return;
    // Plano B: baixa o arquivo e abre o WhatsApp com a mensagem (e link, se estiver na nuvem)
    baixar(resultado.blob, resultado.nome);
    let link = "";
    if (repo.linkExportacao && navigator.onLine) {
      try {
        link = await repo.linkExportacao(projetoId, resultado.nome, resultado.blob);
      } catch {
        /* segue sem link */
      }
    }
    window.open(
      linkWhatsApp(link ? `${texto}\n${link}` : `${texto}\n(o arquivo ${resultado.nome} foi baixado — é só anexar)`),
      "_blank",
      "noopener",
    );
  }

  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo="Exportar MP3">
      <div className="space-y-4">
        {gravadas.length === 0 ? (
          <p className="text-terra">Nenhuma faixa gravada ainda.</p>
        ) : (
          <>
            <div>
              <Rotulo>Faixas que entram na mixagem</Rotulo>
              <div className="space-y-2">
                {gravadas.map((f) => (
                  <label key={f.id} className="flex min-h-12 items-center gap-3 rounded-2xl bg-palha px-3">
                    <input
                      type="checkbox"
                      className="h-6 w-6 accent-[var(--color-verde)]"
                      checked={escolhidas.includes(f.id)}
                      onChange={(e) => setEscolhidas((l) => (e.target.checked ? [...l, f.id] : l.filter((x) => x !== f.id)))}
                    />
                    <span className="h-4 w-4 rounded-full" style={{ background: INSTRUMENTOS[f.instrumento].cor }} />
                    <span className="font-bold text-couro-escuro">{f.nome}</span>
                  </label>
                ))}
              </div>
            </div>
            {escolhidas.length > 0 && (
              <p className="rounded-2xl bg-creme-escuro p-3 text-sm text-couro-escuro">
                Duração: <b>{formatarTempo(dur)}</b> · qualidade automática: <b>{plano.kbps} kbps</b> · ≈{" "}
                <b>{(plano.bytesEstimados / MB).toFixed(1)} MB</b>
                {plano.situacao === "curta" && (
                  <span className="block text-terra">Música curta: já na qualidade máxima, fica abaixo de 5 MB.</span>
                )}
                {plano.situacao === "longa" && (
                  <span className="block text-vermelho">Muito longa: mesmo na menor qualidade passa de 7 MB.</span>
                )}
              </p>
            )}
            <Botao variante="verde" grande className="w-full" disabled={!escolhidas.length || progresso !== null} onClick={gerar}>
              {progresso !== null ? `Mixando… ${Math.round(progresso * 100)}%` : "Gerar MP3"}
            </Botao>
            {resultado && (
              <div className="space-y-2 rounded-3xl border-2 border-verde bg-verde/10 p-4">
                <p className="font-bold text-verde-escuro">
                  {resultado.nome} · {(resultado.blob.size / MB).toFixed(2)} MB · {resultado.kbps} kbps
                </p>
                <audio controls src={resultado.url} className="w-full" />
                <Botao variante="verde" grande className="w-full bg-[#25d366]" onClick={whatsapp}>
                  <Compartilhar /> Enviar no WhatsApp
                </Botao>
                <Botao variante="contorno" className="w-full" onClick={() => baixar(resultado.blob, resultado.nome)}>
                  <Baixar /> Baixar MP3
                </Botao>
              </div>
            )}
          </>
        )}
      </div>
    </Folha>
  );
}

export function formatarTempo(s: number): string {
  const neg = s < 0;
  const a = Math.abs(s);
  const m = Math.floor(a / 60);
  const seg = a - m * 60;
  return `${neg ? "-" : ""}${m}:${seg.toFixed(1).padStart(4, "0")}`;
}
