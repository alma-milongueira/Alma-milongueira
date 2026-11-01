import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";
import { Cuia } from "@/components/Icones";

export const metadata = { title: "Sem sinal" };

export default function Offline() {
  return (
    <main>
      <Cabecalho titulo="Sem sinal no rincão" />
      <div className="flex flex-col items-center gap-4 p-8 text-center text-couro-escuro">
        <Cuia tamanho={72} />
        <p className="text-lg">
          A internet não chegou até aqui. Enquanto isso, ceva um mate: o que está guardado no aparelho segue funcionando.
        </p>
        <Link href="/projetos" className="rounded-2xl bg-couro px-6 py-3 font-bold text-palha">
          Ver projetos
        </Link>
      </div>
    </main>
  );
}
