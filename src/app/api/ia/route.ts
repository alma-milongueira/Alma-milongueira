import { NextResponse, type NextRequest } from "next/server";
import { ehRitmo } from "@/lib/music/ritmos";
import { TEMAS, type TemaId } from "@/lib/ia/temas";
import { pedirJSON, provedorAtivo } from "@/lib/ia/provedores";
import {
  SISTEMA,
  promptAcordes,
  promptRimas,
  promptTemas,
  regrasAcordes,
  regrasTemas,
  tomValido,
  validarAcordesIA,
  validarRimasIA,
  validarTemasIA,
} from "@/lib/ia/compositor";

// A IA pode levar alguns segundos (tentativas + reserva)
export const maxDuration = 60;

// Limite simples por IP (protege a cota gratuita). Em produção com várias instâncias,
// troque por um limitador compartilhado (ex.: Upstash) se precisar.
const janelas = new Map<string, number[]>();
const LIMITE = 20;
const JANELA_MS = 60_000;

function permitido(ip: string): boolean {
  const agora = Date.now();
  const lista = (janelas.get(ip) ?? []).filter((t) => agora - t < JANELA_MS);
  if (lista.length >= LIMITE) {
    janelas.set(ip, lista);
    return false;
  }
  lista.push(agora);
  janelas.set(ip, lista);
  if (janelas.size > 5000) janelas.clear();
  return true;
}

export async function GET() {
  return NextResponse.json({ provedor: provedorAtivo() });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!permitido(ip)) {
    return NextResponse.json(
      { erro: "Devagar com o andor, tchê! Muitas perguntas seguidas. Tenta de novo em um minuto." },
      { status: 429 },
    );
  }

  let corpo: Record<string, unknown>;
  try {
    const txt = await req.text();
    if (txt.length > 8000) return NextResponse.json({ erro: "Pedido grande demais." }, { status: 413 });
    corpo = JSON.parse(txt);
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const pedido = typeof corpo.pedido === "string" ? corpo.pedido.slice(0, 500) : "";
  const temIA = provedorAtivo() !== null;
  const avisoSemIA = "IA não configurada no servidor: mostrando só as sugestões do motor de teoria.";

  try {
    switch (corpo.tipo) {
      case "acordes": {
        if (!ehRitmo(corpo.ritmo) || !tomValido(corpo.tom)) return NextResponse.json({ erro: "Ritmo ou tom inválido." }, { status: 400 });
        const regras = regrasAcordes(corpo.ritmo, corpo.tom);
        if (!temIA) return NextResponse.json({ regras, ia: null, aviso: avisoSemIA });
        try {
          const bruto = await pedirJSON(SISTEMA, promptAcordes(corpo.ritmo, corpo.tom, pedido, regras));
          return NextResponse.json({ regras, ia: validarAcordesIA(bruto, corpo.tom), provedor: provedorAtivo() });
        } catch (e) {
          return NextResponse.json({
            regras,
            ia: null,
            aviso: `A IA não respondeu (${(e as Error).message}). Ficam as sugestões do motor de teoria.`,
          });
        }
      }
      case "temas": {
        const tema = corpo.tema as TemaId;
        if (!ehRitmo(corpo.ritmo) || !(tema in TEMAS)) return NextResponse.json({ erro: "Tema ou ritmo inválido." }, { status: 400 });
        const semente = Number(corpo.semente) || 1;
        const regras = regrasTemas(tema, corpo.ritmo, semente);
        if (!temIA) return NextResponse.json({ regras, ia: null, aviso: avisoSemIA });
        try {
          const bruto = await pedirJSON(SISTEMA, promptTemas(tema, corpo.ritmo, pedido));
          return NextResponse.json({ regras, ia: { ideias: validarTemasIA(bruto) }, provedor: provedorAtivo() });
        } catch (e) {
          return NextResponse.json({
            regras,
            ia: null,
            aviso: `A IA não respondeu (${(e as Error).message}). Ficam as ideias do nosso banco.`,
          });
        }
      }
      case "rimas": {
        const palavra = typeof corpo.palavra === "string" ? corpo.palavra.trim().slice(0, 40) : "";
        if (!palavra) return NextResponse.json({ erro: "Palavra vazia." }, { status: 400 });
        if (!temIA) return NextResponse.json({ ia: null, aviso: avisoSemIA });
        const contexto = typeof corpo.contexto === "string" ? corpo.contexto.slice(0, 200) : "";
        try {
          const bruto = await pedirJSON(SISTEMA, promptRimas(palavra, contexto));
          return NextResponse.json({ ia: { rimas: validarRimasIA(bruto) }, provedor: provedorAtivo() });
        } catch (e) {
          return NextResponse.json({ ia: null, aviso: `A IA não respondeu (${(e as Error).message}).` });
        }
      }
      default:
        return NextResponse.json({ erro: "Tipo de pedido desconhecido." }, { status: 400 });
    }
  } catch (e) {
    console.error("[api/ia]", e);
    return NextResponse.json({ erro: "Deu um trancaço aqui no servidor." }, { status: 500 });
  }
}
