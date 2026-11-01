// Ícones desenhados à mão: gaita, violão, bombo, cuia + ícones de interface.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { tamanho?: number };

function base({ tamanho = 24, ...p }: P) {
  return {
    width: tamanho,
    height: tamanho,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...p,
  };
}

export function Gaita(p: P) {
  return (
    <svg {...base(p)}>
      <rect x="2" y="5" width="5" height="14" rx="1" />
      <rect x="17" y="5" width="5" height="14" rx="1" />
      <path d="M7 5l2 2-2 2 2 2-2 2 2 2-2 2 2 2M17 5l-2 2 2 2-2 2 2 2-2 2 2 2-2 2M9 7h6M9 17h6" />
      <circle cx="4.5" cy="8.5" r=".6" fill="currentColor" />
      <circle cx="4.5" cy="12" r=".6" fill="currentColor" />
      <circle cx="4.5" cy="15.5" r=".6" fill="currentColor" />
      <circle cx="19.5" cy="9" r=".6" fill="currentColor" />
      <circle cx="19.5" cy="12" r=".6" fill="currentColor" />
      <circle cx="19.5" cy="15" r=".6" fill="currentColor" />
    </svg>
  );
}

export function Violao(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M14.5 9.5l6-6M19 2.5l2.5 2.5" />
      <path d="M13.2 8.3c-1-.7-2.4-.6-3.3.3-.6.6-.8 1.3-.8 2-.9 0-1.8.3-2.5 1-1.8 1.8-1.4 5 .8 7.2s5.4 2.6 7.2.8c.7-.7 1-1.6 1-2.5.7 0 1.4-.2 2-.8.9-.9 1-2.3.3-3.3" />
      <circle cx="10.5" cy="14" r="1.4" />
      <path d="M8.2 17.4l1.4-1.4" />
    </svg>
  );
}

export function Bombo(p: P) {
  return (
    <svg {...base(p)}>
      <ellipse cx="12" cy="6" rx="7" ry="2.5" />
      <path d="M5 6v11c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6" />
      <path d="M5 8.5l3.5 8 3.5-8 3.5 8 3.5-8" />
      <path d="M17 2.5l3-1.5M7 2.5L4 1" />
    </svg>
  );
}

export function Cuia(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M6 10c-1 1.2-1.5 2.8-1.5 4.5C4.5 18.6 7.9 22 12 22s7.5-3.4 7.5-7.5c0-1.7-.5-3.3-1.5-4.5" />
      <path d="M5.5 10h13" />
      <path d="M8.5 10c.6-.9 2-1.5 3.5-1.5s2.9.6 3.5 1.5" />
      <path d="M13 9L17 2l1.2.6" />
      <path d="M7.5 15c1 .6 2.8 1 4.5 1s3.5-.4 4.5-1" opacity=".6" />
    </svg>
  );
}

export function Casa(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

export function Pessoa(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M4 9.5c2.5-1 13.5-1 16 0" />
      <path d="M7 9.2c.3-2.5 2.2-4.2 5-4.2s4.7 1.7 5 4.2" />
      <circle cx="12" cy="13.5" r="2.8" />
      <path d="M6 21c.8-2.8 3.2-4.4 6-4.4s5.2 1.6 6 4.4" />
    </svg>
  );
}

export function Mais(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function Menos(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function Voltar(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function Lixo(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
  );
}

export function Cima(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M6 14l6-6 6 6" />
    </svg>
  );
}

export function Baixo(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M6 10l6 6 6-6" />
    </svg>
  );
}

export function Faisca(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />
    </svg>
  );
}

export function Play(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M7 4.5v15l12-7.5z" fill="currentColor" />
    </svg>
  );
}

export function Parar(p: P) {
  return (
    <svg {...base(p)}>
      <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" />
    </svg>
  );
}

export function Copiar(p: P) {
  return (
    <svg {...base(p)}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3" />
    </svg>
  );
}

export function Nuvem(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M7 18h10.5a4 4 0 00.6-7.95A6 6 0 006.3 9.2 4.5 4.5 0 007 18z" />
    </svg>
  );
}

export function Celular(p: P) {
  return (
    <svg {...base(p)}>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </svg>
  );
}

export function Fechar(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
