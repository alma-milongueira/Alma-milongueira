import type { Posicao } from "@/lib/music/afinacoes";

/** Diagrama de acorde para violão (6ª corda à esquerda). */
export function DiagramaAcorde({ nome, posicao, legenda }: { nome: string; posicao?: Posicao; legenda?: string }) {
  const L = 104;
  const A = 128;
  const x0 = 22;
  const y0 = 34;
  const dx = 12;
  const dy = 18;
  if (!posicao) {
    return (
      <figure className="flex w-[104px] flex-col items-center">
        <figcaption className="font-cifra text-lg font-bold text-vermelho">{nome}</figcaption>
        <div className="flex h-[100px] items-center text-center text-xs text-terra">sem desenho fácil</div>
      </figure>
    );
  }
  const casas = posicao.casas;
  const presas = casas.filter((c) => c > 0);
  const maxC = presas.length ? Math.max(...presas) : 0;
  const minC = presas.length ? Math.min(...presas) : 0;
  const inicio = maxC > 4 ? minC : 1;
  // Pestana: menor casa em 2+ cordas, cobrindo do 1º ao último uso dela
  const idxMin = casas.map((c, i) => (c === minC && minC > 0 ? i : -1)).filter((i) => i >= 0);
  const temPestana =
    idxMin.length >= 2 && presas.length > 4 && casas.slice(idxMin[0], idxMin[idxMin.length - 1] + 1).every((c) => c >= minC);

  return (
    <figure className="flex w-[104px] flex-col items-center">
      <figcaption className="font-cifra text-lg font-bold text-vermelho">{nome}</figcaption>
      <svg
        width={L}
        height={A}
        viewBox={`0 0 ${L} ${A}`}
        role="img"
        aria-label={`Diagrama de ${nome}: ${casas.map((c) => (c < 0 ? "x" : c)).join(" ")}`}
      >
        {/* trastes */}
        {Array.from({ length: 6 }, (_, j) => (
          <line
            key={j}
            x1={x0}
            x2={x0 + 5 * dx}
            y1={y0 + j * dy}
            y2={y0 + j * dy}
            stroke="#5a3a1f"
            strokeWidth={j === 0 && inicio === 1 ? 4 : 1.2}
          />
        ))}
        {/* cordas */}
        {Array.from({ length: 6 }, (_, i) => (
          <line key={i} x1={x0 + i * dx} x2={x0 + i * dx} y1={y0} y2={y0 + 5 * dy} stroke="#6e4b33" strokeWidth={1.2} />
        ))}
        {inicio > 1 && (
          <text x={x0 - 6} y={y0 + dy * 0.7} fontSize="11" textAnchor="end" fill="#6e4b33" fontWeight="700">
            {inicio}ª
          </text>
        )}
        {casas.map((c, i) => {
          const x = x0 + i * dx;
          if (c < 0)
            return (
              <text key={i} x={x} y={y0 - 8} fontSize="12" textAnchor="middle" fill="#b8232b" fontWeight="700">
                ×
              </text>
            );
          if (c === 0) return <circle key={i} cx={x} cy={y0 - 12} r={4} fill="none" stroke="#1f7a3e" strokeWidth={1.8} />;
          if (temPestana && c === minC) return null;
          const y = y0 + (c - inicio + 0.5) * dy;
          return <circle key={i} cx={x} cy={y} r={5} fill="#2a1e16" />;
        })}
        {temPestana && (
          <rect
            x={x0 + idxMin[0] * dx - 5}
            y={y0 + (minC - inicio + 0.5) * dy - 5}
            width={(idxMin[idxMin.length - 1] - idxMin[0]) * dx + 10}
            height={10}
            rx={5}
            fill="#2a1e16"
          />
        )}
      </svg>
      {legenda && <span className="text-center text-[11px] leading-tight text-terra">{legenda}</span>}
    </figure>
  );
}
