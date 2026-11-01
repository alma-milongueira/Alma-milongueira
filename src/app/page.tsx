"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Bombo, Cuia, Gaita, Mais, Nuvem, Celular, Violao } from "@/components/Icones";
import { CartaoProjeto } from "@/components/projeto/CartaoProjeto";
import { useSessao } from "@/components/Sessao";
import type { Projeto } from "@/lib/data/tipos";

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 5) return "Boa madrugada, tchê";
  if (h < 12) return "Buenos dias, tchê";
  if (h < 19) return "Buenas tardes, tchê";
  return "Buenas noites, tchê";
}

const semInscricao = () => () => {};

export default function Inicio() {
  const { repo, usuario, nuvemDisponivel, pronto } = useSessao();
  const [recentes, setRecentes] = useState<Projeto[] | null>(null);
  const ola = useSyncExternalStore(semInscricao, saudacao, () => "Buenas, tchê");

  useEffect(() => {
    if (!pronto) return;
    let vivo = true;
    repo
      .listar()
      .then((l) => vivo && setRecentes(l.slice(0, 3)))
      .catch(() => vivo && setRecentes([]));
    return () => {
      vivo = false;
    };
  }, [repo, pronto]);

  return (
    <main>
      <div className="faixa-gaucha h-1.5" />
      <section className="couro px-5 pb-8 pt-8 text-creme">
        <div className="flex items-center gap-3 text-amarelo-claro">
          <Cuia tamanho={40} />
          <p className="font-titulo text-lg">{ola}!</p>
        </div>
        <h1 className="mt-3 font-titulo text-4xl font-extrabold leading-tight text-palha">Galpão Estúdio</h1>
        <p className="mt-2 text-lg text-creme/85">
          Teu estúdio de bolso pra compor milonga, vaneira, chamamé e o que mais vier da querência.
        </p>
        <div className="mt-4 flex gap-4 text-amarelo/80" aria-hidden>
          <Gaita tamanho={30} />
          <Violao tamanho={30} />
          <Bombo tamanho={30} />
        </div>
      </section>

      <section className="-mt-5 space-y-3 px-4">
        <Link
          href="/projetos?novo=1"
          className="pesponto flex min-h-20 items-center gap-4 rounded-3xl bg-vermelho px-5 py-4 text-palha shadow-[0_4px_0_var(--color-vermelho-escuro)] active:translate-y-[2px]"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-palha/15">
            <Mais tamanho={30} />
          </span>
          <span>
            <span className="block font-titulo text-2xl font-bold">Nova composição</span>
            <span className="block text-sm text-palha/85">Título, ritmo, tom e bora pra letra</span>
          </span>
        </Link>
        <Link
          href="/ideias"
          className="flex min-h-20 items-center gap-4 rounded-3xl bg-verde px-5 py-4 text-palha shadow-[0_4px_0_var(--color-verde-escuro)] active:translate-y-[2px]"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-palha/15">
            <Gaita tamanho={30} />
          </span>
          <span>
            <span className="block font-titulo text-2xl font-bold">Ideias de acordes e temas</span>
            <span className="block text-sm text-palha/85">Progressões por ritmo e motes campeiros</span>
          </span>
        </Link>
      </section>

      <section className="mt-8 px-4">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-titulo text-2xl font-bold text-couro-escuro">Últimas do galpão</h2>
          <Link href="/projetos" className="text-base font-bold text-verde underline-offset-4 active:underline">
            Ver todas
          </Link>
        </div>
        {recentes === null ? (
          <p className="text-terra">Abrindo a porteira…</p>
        ) : recentes.length === 0 ? (
          <p className="rounded-3xl border-2 border-dashed border-couro/30 p-5 text-center text-terra">
            Nenhuma composição ainda. A primeira é a que mais custa — e a que mais vale.
          </p>
        ) : (
          <div className="space-y-3">
            {recentes.map((p) => (
              <CartaoProjeto key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 px-4">
        <Link href="/conta" className="flex items-center gap-3 rounded-2xl bg-creme-escuro/70 p-4 text-sm text-couro-escuro">
          {usuario ? <Nuvem tamanho={28} /> : <Celular tamanho={28} />}
          <span>
            {usuario
              ? `Guardando na nuvem como ${usuario.email}.`
              : nuvemDisponivel
                ? "Guardando só neste aparelho. Entra na conta pra guardar na nuvem."
                : "Guardando só neste aparelho (modo local)."}
          </span>
        </Link>
      </section>
    </main>
  );
}
