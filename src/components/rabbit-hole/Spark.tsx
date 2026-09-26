import type { CSSProperties } from "react";

const RAYS = [44, 39, 45, 38, 43, 40, 46, 38, 44, 39, 45, 37];
const R = 4.8;

/** Ray geometry in a -50..50 box, shared with the canvas share-image renderer. */
export const SPARK_RAYS = RAYS.map((len, i) => ({
  angle: i * 30 + ((i * 7) % 5) - 2,
  d: `M-1.6 -6 L${-R} ${R - len} A${R} ${R} 0 0 1 ${R} ${R - len} L1.6 -6 Z`,
}));

export default function Spark({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="-50 -50 100 100" className={className} style={style} aria-hidden>
      {SPARK_RAYS.map((ray, i) => (
        <g key={i} transform={`rotate(${ray.angle})`}>
          <path d={ray.d} fill="currentColor" style={{ "--i": i } as CSSProperties} />
        </g>
      ))}
    </svg>
  );
}
