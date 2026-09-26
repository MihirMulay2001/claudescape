import { useEffect, useState } from "react";
import { css, MONO, NEWS, SERIF } from "./css";
import type { Demo, Theme } from "./content";

type SliderDemo = Extract<Demo, { kind: "slider" }>;
type GuessDemo = Extract<Demo, { kind: "guess" }>;

const card = (t: Theme) =>
  css`margin:40px 0 72px; padding:clamp(24px,4vw,56px); border-radius:14px; background:${t.soft}; border:1px solid ${t.rule}; display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr)); gap:clamp(28px,4vw,64px); align-items:center`;
const eyebrow = (t: Theme) => css`font-family:${MONO}; font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:${t.accent}`;
const heading = css`margin:14px 0 0; font-family:${SERIF}; font-weight:400; font-size:clamp(36px,4vw,56px); line-height:1; letter-spacing:-.01em; text-wrap:balance`;
const labelCss = (t: Theme) => `font-family:${MONO}; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:${t.muted}`;
const label = (t: Theme) => css`${labelCss(t)}`;

/** Readable numbers across many orders of magnitude: "4.3 billion", "12,000", "0.0021". */
export function fmt(v: number) {
  const a = Math.abs(v);
  if (a >= 1e5) return new Intl.NumberFormat("en", { notation: "compact", compactDisplay: "long", maximumSignificantDigits: 3 }).format(v);
  if (a >= 100) return Math.round(v).toLocaleString("en");
  return Number(v.toPrecision(2)).toLocaleString("en", { maximumFractionDigits: 8 });
}

/** "What happens if…": turn the dial through the stops and watch the readout escalate. */
function Slider({ d, t }: { d: SliderDemo; t: Theme }) {
  const [i, setI] = useState(0);
  const [touched, setTouched] = useState(false);
  const n = d.stops.length, st = d.stops[i], p = i / (n - 1);
  const go = (k: number) => {
    setI(k);
    setTouched(true);
  };
  return (
    <div style={card(t)}>
      <div>
        <div style={eyebrow(t)}>Try it · What happens if</div>
        <h3 style={heading}>{d.title}</h3>
        <div style={css`margin-top:40px; display:flex; justify-content:space-between; gap:12px; ${labelCss(t)}`}>
          <span>{d.control}</span>
          <span style={css`color:${t.ink}`}>{st.at}</span>
        </div>
        <input
          type="range" min={0} max={n - 1} step={1} value={i}
          onChange={(e) => go(Number(e.target.value))}
          aria-label={d.control} aria-valuetext={`${st.at}: ${st.value}`}
          style={css`display:block; width:100%; margin:16px 0 10px; accent-color:${t.accent}; cursor:pointer`}
        />
        <div style={css`display:grid; grid-template-columns:repeat(${n},minmax(0,1fr)); gap:4px`}>
          {d.stops.map((s, k) => (
            <button
              key={k} onClick={() => go(k)}
              style={css`border:0; background:transparent; padding:4px 0; font-family:${MONO}; font-size:10px; letter-spacing:.04em; line-height:1.3; text-align:${k === 0 ? "left" : k === n - 1 ? "right" : "center"}; color:${k === i ? t.accent : t.muted}; cursor:pointer; overflow-wrap:anywhere`}
            >
              {s.at}
            </button>
          ))}
        </div>
        <div style={css`margin-top:22px; font-family:${NEWS}; font-style:italic; font-size:17px; color:${t.muted}; opacity:${touched ? 0 : 1}; transition:opacity 400ms`}>
          Drag the dial and watch what happens →
        </div>
      </div>
      <div style={css`display:flex; flex-direction:column; align-items:center; text-align:center`}>
        <div style={css`position:relative; width:min(280px,70vw); aspect-ratio:1`}>
          <div style={css`position:absolute; inset:12%; border-radius:50%; background:${t.accent}; filter:blur(38px); opacity:${0.05 + p * 0.4}; transition:opacity 600ms ease`} />
          <svg viewBox="0 0 100 100" style={css`position:absolute; inset:0; width:100%; height:100%; transform:rotate(-90deg)`}>
            <circle cx={50} cy={50} r={44} fill="none" stroke={t.rule} strokeWidth={3} />
            <circle
              cx={50} cy={50} r={44} fill="none" stroke={t.accent} strokeWidth={3} strokeLinecap="round"
              pathLength={1} strokeDasharray={1} strokeDashoffset={1 - (0.04 + p * 0.96)}
              style={css`transition:stroke-dashoffset 600ms cubic-bezier(.2,.8,.2,1)`}
            />
          </svg>
          <div style={css`position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:0 18%`}>
            <div key={i} style={css`font-family:${SERIF}; font-size:${st.value.length > 10 ? 30 : st.value.length > 6 ? 44 : 64}px; text-wrap:balance; line-height:.95; color:${t.ink}; animation:rh-pop 400ms cubic-bezier(.2,.8,.2,1)`}>{st.value}</div>
            <div style={css`margin-top:10px; ${labelCss(t)}; font-size:10px`}>{d.readout}</div>
          </div>
        </div>
        <p key={i} aria-live="polite" style={css`margin:28px 0 0; max-width:420px; min-height:5.2em; font-family:${NEWS}; font-size:19px; line-height:1.5; text-wrap:pretty; animation:rh-pop 400ms ease`}>{st.caption}</p>
      </div>
    </div>
  );
}

/** Guess a number, lock it in, then see the real answer slide into place. */
function Guess({ d, t }: { d: GuessDemo; t: Theme }) {
  const [p, setP] = useState(0.5);
  const [locked, setLocked] = useState(false);
  const [shown, setShown] = useState(false);
  const at = (q: number) => (d.log ? d.min * Math.pow(d.max / d.min, q) : d.min + q * (d.max - d.min));
  const pos = (v: number) => (d.log ? Math.log(v / d.min) / Math.log(d.max / d.min) : (v - d.min) / (d.max - d.min));
  const g = Number(at(p).toPrecision(2)), a = d.answer, pa = Math.min(1, Math.max(0, pos(a)));
  useEffect(() => {
    if (!locked) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    return () => cancelAnimationFrame(id);
  }, [locked]);

  const ratio = g > 0 && a > 0 ? Math.max(g / a, a / g) : Infinity;
  const rel = Math.abs(g - a) / (Math.abs(a) || 1);
  const close = d.log || ratio !== Infinity ? ratio : 1 + rel;
  const verdict = close <= 1.15 ? "Spot on." : close <= 1.6 ? "Close." : close <= 4 ? "Not bad." : "Way off.";
  const how = ratio >= 2 && ratio !== Infinity ? `${fmt(ratio)}× too ${g < a ? "low" : "high"}` : `${Math.round(rel * 100)}% ${g < a ? "under" : "over"}`;
  const unit = d.unit ? ` ${d.unit}` : "";

  return (
    <div style={card(t)}>
      <div>
        <div style={eyebrow(t)}>Try it · Take a guess</div>
        <h3 style={heading}>{d.question}</h3>
        {locked && (
          <div aria-live="polite" style={css`margin-top:28px; animation:rh-pop 500ms ease 500ms both`}>
            <div style={css`font-family:${SERIF}; font-style:italic; font-size:32px; color:${t.accent}`}>{verdict}</div>
            <p style={css`margin:10px 0 0; font-family:${NEWS}; font-size:19px; line-height:1.5; text-wrap:pretty`}>
              You guessed {fmt(g)}{unit}. It’s <strong style={css`font-weight:600`}>{fmt(a)}{unit}</strong>
              {verdict === "Spot on." ? "." : `, so you were ${how}.`} {d.reveal}
            </p>
          </div>
        )}
      </div>
      <div>
        <div style={css`text-align:center`}>
          <div style={label(t)}>{locked ? "The real answer" : "Your guess"}</div>
          <div style={css`margin-top:10px; font-family:${SERIF}; font-size:clamp(52px,6vw,84px); line-height:1; color:${locked ? t.accent : t.ink}; transition:color 400ms`}>
            {fmt(locked ? a : g)}
          </div>
          <div style={css`margin-top:6px; font-family:${NEWS}; font-size:18px; color:${t.muted}; min-height:1.4em`}>{d.unit}</div>
        </div>
        <div style={css`position:relative; margin-top:32px`}>
          <input
            type="range" min={0} max={1000} value={Math.round(p * 1000)} disabled={locked}
            onChange={(e) => setP(Number(e.target.value) / 1000)}
            aria-label="Your guess" aria-valuetext={`${fmt(g)}${unit}`}
            style={css`display:block; width:100%; accent-color:${t.accent}; cursor:${locked ? "default" : "pointer"}; opacity:${locked ? 0.35 : 1}; transition:opacity 400ms`}
          />
          {locked && (
            <>
              <div aria-hidden style={css`position:absolute; top:-6px; left:calc(${p * 100}% - 1px); width:3px; height:28px; border-radius:2px; background:${t.muted}`}>
                <span style={css`position:absolute; bottom:calc(100% + 4px); left:50%; transform:translateX(-50%); ${labelCss(t)}; font-size:10px`}>You</span>
              </div>
              <div aria-hidden style={css`position:absolute; top:-6px; left:calc(${(shown ? pa : p) * 100}% - 1px); width:3px; height:28px; border-radius:2px; background:${t.accent}; transition:left 900ms cubic-bezier(.6,0,.2,1)`}>
                <span style={css`position:absolute; top:calc(100% + 4px); left:50%; transform:translateX(-50%); ${labelCss(t)}; font-size:10px; color:${t.accent}`}>Answer</span>
              </div>
            </>
          )}
          <div style={css`margin-top:${locked ? 28 : 10}px; display:flex; justify-content:space-between; ${labelCss(t)}; font-size:10px; transition:margin 400ms`}>
            <span>{fmt(d.min)}</span>
            <span>{fmt(d.max)}</span>
          </div>
        </div>
        {!locked && (
          <button
            onClick={() => setLocked(true)}
            className="rh-hbg"
            style={{ ...css`display:block; margin:28px auto 0; border:0; border-radius:999px; padding:14px 26px; background:${t.ink}; color:${t.bg}; font-family:${MONO}; font-size:12px; letter-spacing:.14em; text-transform:uppercase; cursor:pointer`, ["--h-bg" as string]: t.accent }}
          >
            Lock in my guess
          </button>
        )}
      </div>
    </div>
  );
}

export default function DemoBlock({ d, t }: { d: Demo; t: Theme }) {
  return d.kind === "slider" ? <Slider d={d} t={t} /> : <Guess d={d} t={t} />;
}
