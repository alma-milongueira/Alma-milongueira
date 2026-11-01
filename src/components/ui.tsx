"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Fechar } from "./Icones";

type Variante = "vermelho" | "verde" | "couro" | "amarelo" | "fantasma" | "contorno";

const VARIANTES: Record<Variante, string> = {
  vermelho:
    "bg-vermelho text-palha shadow-[0_3px_0_var(--color-vermelho-escuro)] active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-vermelho-escuro)]",
  verde:
    "bg-verde text-palha shadow-[0_3px_0_var(--color-verde-escuro)] active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-verde-escuro)]",
  couro:
    "bg-couro text-palha shadow-[0_3px_0_var(--color-couro-escuro)] active:translate-y-[2px] active:shadow-[0_1px_0_var(--color-couro-escuro)]",
  amarelo: "bg-amarelo text-carvao shadow-[0_3px_0_#b88a00] active:translate-y-[2px] active:shadow-[0_1px_0_#b88a00]",
  fantasma: "bg-transparent text-couro-escuro active:bg-creme-escuro",
  contorno: "bg-palha text-couro-escuro border-2 border-couro/40 active:bg-creme-escuro",
};

export function Botao({
  variante = "couro",
  grande,
  className = "",
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; grande?: boolean }) {
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition disabled:opacity-50 disabled:pointer-events-none select-none ${
        grande ? "min-h-14 px-6 text-lg" : "min-h-12 px-4 text-base"
      } ${VARIANTES[variante]} ${className}`}
    />
  );
}

export function BotaoIcone({ rotulo, className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { rotulo: string }) {
  return (
    <button
      aria-label={rotulo}
      title={rotulo}
      {...p}
      className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-couro-escuro active:bg-creme-escuro disabled:opacity-40 ${className}`}
    />
  );
}

export function Cartao({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-couro/15 bg-palha p-4 shadow-sm ${className}`}>{children}</div>;
}

export function Rotulo({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-bold uppercase tracking-wide text-terra">
      {children}
    </label>
  );
}

export const classeCampo =
  "w-full min-h-12 rounded-2xl border-2 border-couro/25 bg-white/70 px-4 text-lg text-carvao placeholder:text-terra/50 focus:border-verde focus:outline-none";

export function Chip({ ativo, children, className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { ativo?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      {...p}
      className={`min-h-11 shrink-0 rounded-full border-2 px-4 text-base font-semibold transition ${
        ativo ? "border-verde bg-verde text-palha" : "border-couro/25 bg-palha text-couro-escuro active:bg-creme-escuro"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** Folha que sobe de baixo (bottom sheet). */
export function Folha({
  aberta,
  aoFechar,
  titulo,
  children,
}: {
  aberta: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberta) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", esc);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", esc);
  }, [aberta, aoFechar]);
  if (!aberta) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-carvao/50" onClick={aoFechar}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-creme p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl outline-none"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-titulo text-2xl font-bold text-couro-escuro">{titulo}</h2>
          <BotaoIcone rotulo="Fechar" onClick={aoFechar}>
            <Fechar />
          </BotaoIcone>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------- Avisos rápidos (toast) ----------
type Aviso = { id: number; texto: string; tipo: "ok" | "erro" };
const AvisoCtx = createContext<(texto: string, tipo?: "ok" | "erro") => void>(() => {});

export function AvisosProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const avisar = useCallback((texto: string, tipo: "ok" | "erro" = "ok") => {
    const id = Date.now() + Math.random();
    setAvisos((a) => [...a, { id, texto, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <AvisoCtx.Provider value={avisar}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-28 z-[60] flex flex-col items-center gap-2 px-4">
        {avisos.map((a) => (
          <div
            key={a.id}
            className={`max-w-md rounded-2xl px-5 py-3 text-base font-semibold shadow-lg ${
              a.tipo === "erro" ? "bg-vermelho text-palha" : "bg-carvao text-creme"
            }`}
          >
            {a.texto}
          </div>
        ))}
      </div>
    </AvisoCtx.Provider>
  );
}

export const useAviso = () => useContext(AvisoCtx);
