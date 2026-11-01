import type { Metadata } from "next";
import { Suspense } from "react";
import { EditorProjeto } from "./EditorProjeto";

export const metadata: Metadata = { title: "Projeto" };

// Rota estática (/projeto?id=...) para o service worker conseguir abrir offline.
export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 text-terra">Abrindo a porteira…</p>}>
      <EditorProjeto />
    </Suspense>
  );
}
