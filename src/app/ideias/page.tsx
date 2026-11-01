import type { Metadata } from "next";
import { Cabecalho } from "@/components/Cabecalho";
import { IdeiasPainel } from "@/components/ideias/IdeiasPainel";

export const metadata: Metadata = { title: "Ideias" };

export default function Page() {
  return (
    <main>
      <Cabecalho titulo="Ideias de acordes e temas" subtitulo="Teoria de galpão + uma mãozinha da IA" />
      <div className="p-4">
        <IdeiasPainel ritmoInicial="milonga" tomInicial="Em" />
      </div>
    </main>
  );
}
