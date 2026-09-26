import { useSyncExternalStore, type ReactNode } from "react";
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
  wave: (
    <>
      {[26, 40, 54].map((y, i) => <path key={y} d={`M${8 + i * 6} ${y} q13 -12 26 0 t26 0 t26 0 t26 0`} opacity={1 - i * 0.25} />)}
      <path d="M2 70 H118" strokeDasharray="2 5" />
    </>
  ),
  gear: (
    <>
      <circle cx="60" cy="40" r="20" /><circle cx="60" cy="40" r="7" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6, p = (r: number) => `${(60 + Math.cos(a) * r).toFixed(2)} ${(40 + Math.sin(a) * r).toFixed(2)}`;
        return <path key={i} d={`M${p(20)} L${p(27)}`} strokeWidth="3" />;
      })}
      <circle cx="96" cy="60" r="10" /><circle cx="96" cy="60" r="3" />
    </>
  ),
  leaf: (
    <>
      <path d="M60 72 V20" />
      <path d="M60 30 Q34 30 30 8 Q56 8 60 30 Z M60 46 Q88 46 92 22 Q66 22 60 46 Z M60 60 Q36 62 28 42 Q54 40 60 60 Z" />
      <path d="M30 76 Q60 64 90 76" />
    </>
  ),
  star: (
    <>
      <path d="M60 14 L65 34 L86 40 L65 46 L60 66 L55 46 L34 40 L55 34 Z" />
      <circle cx="60" cy="40" r="3" fill="currentColor" />
      <path d="M20 16 h4 M22 14 v4 M98 60 h4 M100 58 v4 M96 14 h3 M97.5 12.5 v3 M18 62 h3 M19.5 60.5 v3" />
      <ellipse cx="60" cy="40" rx="50" ry="12" opacity=".5" />
    </>
  ),
  book: (
    <>
      <path d="M60 20 Q40 10 18 16 V66 Q40 60 60 70 Q80 60 102 66 V16 Q80 10 60 20 Z M60 20 V70" />
      {[28, 36, 44, 52].map((y) => <path key={y} d={`M26 ${y} Q40 ${y - 5} 52 ${y + 2} M68 ${y + 2} Q80 ${y - 5} 94 ${y}`} opacity=".6" />)}
    </>
  ),
  eye: (
    <>
      <path d="M12 40 Q60 0 108 40 Q60 80 12 40 Z" />
      <circle cx="60" cy="40" r="14" /><circle cx="60" cy="40" r="5" fill="currentColor" />
      {[-30, -15, 0, 15, 30].map((x) => <path key={x} d={`M${60 + x} ${14 - Math.abs(x) / 5} l${x / 6} -8`} />)}
    </>
  ),
  flask: (
    <>
      <path d="M50 8 H70 M53 8 V32 L30 70 H90 L67 32 V8" />
      <path d="M40 54 Q60 48 80 54" />
      <circle cx="52" cy="62" r="3" /><circle cx="66" cy="58" r="2" /><circle cx="60" cy="44" r="2" /><circle cx="58" cy="24" r="1.5" />
    </>
  ),
  globe: (
    <>
      <circle cx="60" cy="40" r="30" />
      <ellipse cx="60" cy="40" rx="12" ry="30" /><path d="M30 40 H90 M34 26 H86 M34 54 H86" />
      <path d="M8 70 Q40 40 60 40 T112 10" strokeDasharray="3 4" opacity=".7" />
    </>
  ),
  note: (
    <>
      {[22, 30, 38, 46, 54].map((y) => <path key={y} d={`M6 ${y} H114`} opacity=".45" />)}
      <ellipse cx="38" cy="54" rx="7" ry="5" fill="currentColor" /><path d="M45 54 V16 L80 10 V46" />
      <ellipse cx="73" cy="46" rx="7" ry="5" fill="currentColor" /><path d="M45 24 L80 18" />
    </>
  ),
  mask: (
    <>
      <path d="M20 14 Q50 6 58 14 Q60 50 40 62 Q20 50 20 14 Z" />
      <path d="M62 22 Q70 14 100 22 Q100 58 80 70 Q60 58 62 22 Z" />
      <path d="M28 26 q5 -4 10 0 M44 26 q5 -4 10 0 M32 46 q8 6 16 0" />
      <path d="M70 36 q5 4 10 0 M86 36 q5 4 10 0 M74 58 q8 -6 16 0" />
    </>
  ),
  bone: (
    <>
      <path d="M22 62 Q24 36 46 34 Q62 32 74 22 Q86 12 100 20" />
      {[34, 44, 54, 64, 74, 84].map((x, i) => <path key={x} d={`M${x} ${[46, 38, 34, 30, 22, 17][i]} l${i % 2 ? 3 : -3} 9`} />)}
      <circle cx="102" cy="22" r="6" /><circle cx="104" cy="21" r="1.5" fill="currentColor" />
      <path d="M2 70 H118" strokeDasharray="2 5" />
    </>
  ),
  coin: (
    <>
      {[62, 56, 50, 44].map((y) => <ellipse key={y} cx="44" cy={y} rx="22" ry="6" />)}
      <circle cx="84" cy="34" r="22" /><circle cx="84" cy="34" r="17" opacity=".6" />
      <path d="M84 24 V44 M78 28 Q84 22 90 28 Q84 34 78 40 Q84 46 90 40" />
    </>
  ),
  bolt: (
    <>
      <path d="M66 6 L42 44 H60 L50 74 L80 32 H62 Z" />
      <path d="M22 22 l8 4 M18 44 h9 M98 22 l-8 4 M102 44 h-9 M24 64 l7 -4 M96 64 l-7 -4" opacity=".7" />
    </>
  ),
  bug: (
    <>
      <ellipse cx="60" cy="44" rx="14" ry="20" /><circle cx="60" cy="18" r="7" /><path d="M60 26 V64" />
      {[34, 44, 54].flatMap((y) => [<path key={`l${y}`} d={`M46 ${y} L30 ${y - 6} L24 ${y + 2}`} />, <path key={`r${y}`} d={`M74 ${y} L90 ${y - 6} L96 ${y + 2}`} />])}
      <path d="M56 12 Q50 2 42 4 M64 12 Q70 2 78 4" />
    </>
  ),
  bird: (
    <>
      <path d="M20 44 Q40 18 60 40 Q80 18 100 44" />
      <path d="M36 62 Q44 52 52 60 Q60 52 68 62" opacity=".7" />
      <path d="M78 20 Q84 14 90 19 Q96 14 102 20" opacity=".5" />
      <path d="M2 72 H118" strokeDasharray="2 5" />
    </>
  ),
};

function Card({ ex, i, hidden, onPick }: { ex: Example; i: number; hidden: boolean; onPick: (topic: string) => void }) {
  const no = EXAMPLES.indexOf(ex) + 1;
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
        <span>No.{pad(no)}</span>
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

/** Seconds each card takes to drift one card-width, so speed stays constant however many cards there are. */
const SECS_PER_CARD = 5;

/** One shuffle per page load, shared by every render so the order stays put. */
let shuffled: Example[] | null = null;
function getShuffled() {
  if (!shuffled) {
    shuffled = [...EXAMPLES];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
  }
  return shuffled;
}
const noop = () => () => {};

/** Endless, slowly drifting row of topic cards, shuffled each visit. Pauses on hover/focus. */
export default function TopicStream({ onPick }: { onPick: (topic: string) => void }) {
  // The server renders the catalog order; the client swaps in its shuffle while hydrating.
  const examples = useSyncExternalStore(noop, getShuffled, () => EXAMPLES);
  const fade = "linear-gradient(to right, transparent, #000 10%, #000 90%, transparent)";
  return (
    <div
      className="rh-stream"
      role="group"
      aria-label="Suggested topics"
      style={css`align-self:stretch; min-width:0; margin:0 -40px; overflow:hidden; contain:inline-size; -webkit-mask-image:${fade}; mask-image:${fade}`}
    >
      <div className="rh-stream-track" style={{ ...css`display:flex; width:max-content; padding:34px 0 40px`, animationDuration: `${examples.length * SECS_PER_CARD}s` }}>
        {[false, true].map((hidden) =>
          examples.map((ex, i) => (
            <div key={`${hidden}${ex.topic}`} style={css`padding:0 11px`}>
              <Card ex={ex} i={i} hidden={hidden} onPick={onPick} />
            </div>
          )),
        )}
      </div>
    </div>
  );
}
