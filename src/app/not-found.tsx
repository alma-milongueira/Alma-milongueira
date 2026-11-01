import Link from "next/link";
import { Cabecalho } from "@/components/Cabecalho";

export default function NaoAchado() {
  return (
    <main>
      <Cabecalho titulo="Pegou o corredor errado" />
      <div className="p-8 text-center">
        <p className="text-lg text-terra">Essa página não existe. Volta pro galpão que o mate tá servido.</p>
        <Link href="/" className="mt-4 inline-block rounded-2xl bg-couro px-6 py-3 font-bold text-palha">
          Voltar pro início
        </Link>
      </div>
    </main>
  );
}
