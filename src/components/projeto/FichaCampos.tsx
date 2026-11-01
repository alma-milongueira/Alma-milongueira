"use client";

import { useRef } from "react";
import { LISTA_AFINACOES, type AfinacaoId } from "@/lib/music/afinacoes";
import { TONS_MAIORES, TONS_MENORES } from "@/lib/music/notas";
import { LISTA_RITMOS, RITMOS, type RitmoId } from "@/lib/music/ritmos";
import type { NovoProjeto } from "@/lib/data/tipos";
import { Chip, Rotulo, classeCampo } from "../ui";
import { Menos, Mais } from "../Icones";

export function FichaCampos({ valor, mudar }: { valor: NovoProjeto; mudar: (v: Partial<NovoProjeto>) => void }) {
  const toques = useRef<number[]>([]);
  const r = RITMOS[valor.ritmo];

  function batucar() {
    const agora = performance.now();
    const t = toques.current.filter((x) => agora - x < 3000);
    t.push(agora);
    toques.current = t;
    if (t.length >= 3) {
      const intervalos = t.slice(1).map((x, i) => x - t[i]);
      const media = intervalos.reduce((a, b) => a + b, 0) / intervalos.length;
      mudar({ bpm: Math.max(30, Math.min(260, Math.round(60000 / media))) });
    }
  }

  function trocarRitmo(id: RitmoId) {
    const novo = RITMOS[id];
    mudar({ ritmo: id, bpm: novo.bpmPadrao });
  }

  return (
    <div className="space-y-6">
      <div>
        <Rotulo htmlFor="titulo">Título</Rotulo>
        <input
          id="titulo"
          className={classeCampo}
          value={valor.titulo}
          maxLength={200}
          placeholder="Ex.: Milonga do Pago Velho"
          onChange={(e) => mudar({ titulo: e.target.value })}
        />
      </div>

      <div>
        <Rotulo>Ritmo</Rotulo>
        <div className="flex flex-wrap gap-2">
          {LISTA_RITMOS.map((x) => (
            <Chip key={x.id} ativo={valor.ritmo === x.id} onClick={() => trocarRitmo(x.id)}>
              {x.nome}
            </Chip>
          ))}
        </div>
        <p className="mt-2 text-sm text-terra">
          {r.compasso} · {r.bpm[0]}–{r.bpm[1]} BPM · {r.descricao}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Rotulo htmlFor="tom">Tom</Rotulo>
          <select id="tom" className={classeCampo} value={valor.tom} onChange={(e) => mudar({ tom: e.target.value })}>
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
          <p className="mt-1 text-xs text-terra">
            Sugerido p/ {r.nome.toLowerCase()}: {r.tomSugerido}
          </p>
        </div>
        <div>
          <Rotulo htmlFor="capo">Capotraste</Rotulo>
          <select id="capo" className={classeCampo} value={valor.capo} onChange={(e) => mudar({ capo: Number(e.target.value) })}>
            {Array.from({ length: 13 }, (_, i) => (
              <option key={i} value={i}>
                {i === 0 ? "Sem capo" : `${i}ª casa`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Rotulo htmlFor="bpm">Andamento (BPM)</Rotulo>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Diminuir BPM"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-creme-escuro text-couro-escuro"
            onClick={() => mudar({ bpm: Math.max(30, valor.bpm - 1) })}
          >
            <Menos />
          </button>
          <input
            id="bpm"
            type="number"
            inputMode="numeric"
            min={30}
            max={260}
            className={`${classeCampo} text-center text-2xl font-bold`}
            value={valor.bpm}
            onChange={(e) => mudar({ bpm: Math.max(30, Math.min(260, Number(e.target.value) || 30)) })}
          />
          <button
            type="button"
            aria-label="Aumentar BPM"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-creme-escuro text-couro-escuro"
            onClick={() => mudar({ bpm: Math.min(260, valor.bpm + 1) })}
          >
            <Mais />
          </button>
        </div>
        <input
          type="range"
          min={30}
          max={260}
          value={valor.bpm}
          aria-label="BPM"
          className="mt-3 w-full accent-[var(--color-vermelho)]"
          onChange={(e) => mudar({ bpm: Number(e.target.value) })}
        />
        <button
          type="button"
          onClick={batucar}
          className="mt-2 w-full rounded-2xl border-2 border-dashed border-couro/40 bg-palha py-4 text-lg font-bold text-couro-escuro active:bg-amarelo-claro"
        >
          Bate aqui no compasso (toque 4 vezes)
        </button>
      </div>

      <div>
        <Rotulo>Afinação do violão</Rotulo>
        <div className="grid grid-cols-2 gap-2">
          {LISTA_AFINACOES.map((a) => (
            <button
              type="button"
              key={a.id}
              aria-pressed={valor.afinacao === a.id}
              onClick={() => mudar({ afinacao: a.id as AfinacaoId })}
              className={`rounded-2xl border-2 p-3 text-left ${
                valor.afinacao === a.id ? "border-verde bg-verde/10" : "border-couro/20 bg-palha"
              }`}
            >
              <span className="block font-bold text-couro-escuro">{a.nome}</span>
              <span className="block font-mono text-xs text-terra">{a.cordas}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
