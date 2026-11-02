import type { Metadata } from "next";
import { Suspense } from "react";
import { TelaEntrada } from "./TelaEntrada";

export const metadata: Metadata = { title: "Entrar" };

export default function Page() {
  return (
    <Suspense>
      <TelaEntrada />
    </Suspense>
  );
}
