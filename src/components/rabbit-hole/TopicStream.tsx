import type { ReactNode } from "react";
import { css, MONO, NEWS, SERIF } from "./css";
import { EXAMPLES, pad, type Example, type Glyph } from "./content";

const TILT = [-4, 2.5, -1.5, 3.5, -3, 1.5, -2.5, 4, -1];
const LIFT = [14, -6, 10, -12, 6, -2, 16, -8, 4];

/** Line-art spot illustrations, drawn in currentColor on a 120×80 box. */
const GLYPHS: Record<Glyph, ReactNode> = {
  car: (
    <>
      <path d="M10 56 L14 46 L40 40 L58 28 L84 27 L100 40 L112 44 L112 56" />
      <path d="M60 31 L66 40 M44 40 L100 40" />
      <circle cx="34" cy="56" r="9" /><circle cx="34" cy="56" r="3" />
      <circle cx="92" cy="56" r="9" /><circle cx="92" cy="56" r="3" />
      <path d="M2 66 H118" strokeDasharray="2 5" />
    </>
  ),
  jelly: (
    <>
      <path d="M36 34 Q60 -2 84 34 Q60 28 36 34 Z" />
      <circle cx="60" cy="22" r="6" /><circle cx="60" cy="22" r="2" fill="currentColor" />
      {[42, 52, 60, 68, 78].map((x, i) => (
        <path key={x} d={`M${x} 33 q${i % 2 ? 6 : -6} 10 0 20 q${i % 2 ? -6 : 6} 10 0 22`} />
      ))}
    </>
  ),
  lattice: (
    <>
      {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => <circle key={`${r}${c}`} cx={36 + c * 20} cy={24 + r * 18} r="3.5" fill="currentColor" />))}
      {[0, 1, 2].map((i) => <path key={`h${i}`} d={`M36 ${24 + i * 18} H76 M${36 + i * 20} 24 V60`} />)}
      {[0, 1, 2].map((i) => <path key={`d${i}`} d={`M${36 + i * 20} 24 l12 -12 M76 ${24 + i * 18} l12 -12`} opacity=".6" />)}
      <path d="M48 12 H88 V48" opacity=".6" />
    </>
  ),
  slab: (
    <>
      <rect x="20" y="10" width="80" height="16" />
      <rect x="30" y="26" width="60" height="16" />
      <rect x="42" y="42" width="36" height="24" />
      {[28, 40, 52, 64, 76, 88].map((x) => <path key={x} d={`M${x} 14 V22`} />)}
      {[38, 50, 62, 74, 82].map((x) => <path key={x} d={`M${x} 30 V38`} />)}
      <path d="M4 66 H116" />
    </>
  ),
  moon: (
    <>
      <path d="M70 12 A26 26 0 1 0 90 56 A22 22 0 1 1 70 12 Z" />
      <path d="M22 18 l4 0 M24 16 l0 4 M100 16 l4 0 M102 14 l0 4 M16 54 l3 0 M17.5 52.5 l0 3" />
      <text x="88" y="30" fontSize="10" stroke="none" fill="currentColor" fontFamily="serif" fontStyle="italic">z</text>
      <text x="96" y="22" fontSize="7" stroke="none" fill="currentColor" fontFamily="serif" fontStyle="italic">z</text>
    </>
  ),
  record: (
    <>
      {[34, 27, 20, 13].map((r) => <circle key={r} cx="60" cy="40" r={r} />)}
      <circle cx="60" cy="40" r="3" fill="currentColor" />
      <path d="M94 40 H112 M60 6 V0" />
    </>
  ),
  army: (
    <>
      {[0, 1, 2, 3].flatMap((r) =>
        [0, 1, 2, 3, 4, 5].map((c) => {
          const x = 24 + c * 14 + (r % 2) * 7, y = 14 + r * 16;
          return <g key={`${r}${c}`}><circle cx={x} cy={y} r="3" /><path d={`M${x} ${y + 3} V${y + 10}`} /></g>;
        }),
      )}
    </>
  ),
  crater: (
    <>
      <circle cx="54" cy="34" r="24" />
      <circle cx="46" cy="28" r="5" /><circle cx="62" cy="40" r="7" /><circle cx="60" cy="22" r="3" />
      <path d="M2 74 Q60 56 118 74" />
      <path d="M92 66 V46 L102 49 L92 52" />
    </>
  ),
  columns: (
    <>
      <path d="M14 22 L60 6 L106 22 Z" />
      <path d="M18 26 H102 M16 66 H104 M12 72 H108" />
      {[26, 44, 62, 80, 94].map((x) => <path key={x} d={`M${x} 28 V64 M${x + 4} 28 V64`} />)}
    </>
  ),
};

function Card({ ex, i, hidden, onPick }: { ex: Example; i: number; hidden: boolean; onPick: (topic: string) => void }) {
  const h = ex.hue;
  return (
    <button
      onClick={() => onPick(ex.topic)}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
      aria-label={hidden ? undefined : `Fall into ${ex.title}`}
      className="rh-card"
      style={{
        ...css`flex:none; width:196px; height:236px; display:flex; flex-direction:column; text-align:left; padding:16px 16px 12px; border:1px solid oklch(0.85 0.06 ${h} / 0.22); border-radius:14px; cursor:pointer; background:linear-gradient(160deg, oklch(0.36 0.075 ${h}), oklch(0.22 0.045 ${h})); color:oklch(0.94 0.03 ${h}); box-shadow:0 24px 50px -30px oklch(0 0 0 / 0.5)`,
        ["--tilt" as string]: `${TILT[i % TILT.length]}deg`,
        ["--y" as string]: `${LIFT[i % LIFT.length]}px`,
      }}
    >
      <span style={css`display:flex; justify-content:space-between; gap:8px; font-family:${MONO}; font-size:9.5px; letter-spacing:.16em; text-transform:uppercase; color:oklch(0.82 0.07 ${h})`}>
        <span>{ex.tag}</span>
        <span>No.{pad(i + 1)}</span>
      </span>
      <span style={css`margin-top:14px; font-family:${SERIF}; font-size:40px; line-height:1; letter-spacing:-.02em; white-space:nowrap`}>{ex.figure}</span>
      <span style={css`margin-top:6px; font-family:${NEWS}; font-size:16px; line-height:1.2; text-wrap:balance`}>{ex.title}</span>
      <svg
        viewBox="0 0 120 80"
        aria-hidden
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={css`margin-top:auto; width:100%; height:auto; color:oklch(0.8 0.1 ${h}); opacity:.85`}
      >
        {GLYPHS[ex.glyph]}
      </svg>
    </button>
  );
}

/** Endless, slowly drifting row of topic cards. Pauses on hover/focus. */
export default function TopicStream({ onPick }: { onPick: (topic: string) => void }) {
  const fade = "linear-gradient(to right, transparent, #000 10%, #000 90%, transparent)";
  return (
    <div
      className="rh-stream"
      role="group"
      aria-label="Suggested topics"
      style={css`align-self:stretch; min-width:0; margin:0 -40px; overflow:hidden; contain:inline-size; -webkit-mask-image:${fade}; mask-image:${fade}`}
    >
      <div className="rh-stream-track" style={css`display:flex; width:max-content; padding:34px 0 40px`}>
        {[false, true].map((hidden) =>
          EXAMPLES.map((ex, i) => (
            <div key={`${hidden}${ex.topic}`} style={css`padding:0 11px`}>
              <Card ex={ex} i={i} hidden={hidden} onPick={onPick} />
            </div>
          )),
        )}
      </div>
    </div>
  );
}
