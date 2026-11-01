import type { RitmoId } from "@/lib/music/ritmos";
import { Bombo, Gaita, Violao } from "../Icones";

// Cada ritmo puxa um instrumento que costuma liderar.
export function IconeRitmo({ ritmo, tamanho = 24 }: { ritmo: RitmoId; tamanho?: number }) {
  if (ritmo === "milonga" || ritmo === "valsa") return <Violao tamanho={tamanho} />;
  if (ritmo === "chamame" || ritmo === "xote") return <Bombo tamanho={tamanho} />;
  return <Gaita tamanho={tamanho} />;
}
