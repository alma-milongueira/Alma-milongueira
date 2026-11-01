import type { Metadata } from "next";
import { Suspense } from "react";
import { ListaProjetos } from "./ListaProjetos";

export const metadata: Metadata = { title: "Projetos" };

export default function Page() {
  return (
    <Suspense>
      <ListaProjetos />
    </Suspense>
  );
}
