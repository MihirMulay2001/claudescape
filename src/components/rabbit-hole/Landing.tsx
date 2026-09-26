"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { EXAMPLES } from "./content";
import styles from "./landing.module.css";
import Logo from "./Logo";
import { RECENT_KEY, THEME_KEY, useStored, useTheme, writeStore } from "./store";

interface Props {
  query: string;
  onQuery: (q: string) => void;
  onStart: (topic: string) => void;
  falling: boolean;
  hops: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

type Motif = "record" | "moon" | "army" | "perspective" | "abyss" | "lattice" | "blocks" | "dream" | "speed" | "glyphs";

interface Card {
  title: string;
  kicker: string;
  figure: string;
  motif: Motif;
  hue: number;
}

const CARDS: Card[] = [
  { title: "The Voyager Golden Record", kicker: "Space · Sound", figure: "1977", motif: "record", hue: 80 },
  { title: "The Apollo 11 landing", kicker: "Space · History", figure: "1969", motif: "moon", hue: 255 },
  { title: "The Terracotta Army", kicker: "Empire · Clay", figure: "8,000", motif: "army", hue: 38 },
  { title: "The Last Supper", kicker: "Art · Renaissance", figure: "1498", motif: "perspective", hue: 18 },
  { title: "Deep-sea gigantism", kicker: "Ocean · Biology", figure: "11km", motif: "abyss", hue: 225 },
  { title: "The history of salt", kicker: "Food · Trade", figure: "NaCl", motif: "lattice", hue: 110 },
  { title: "Brutalist libraries", kicker: "Architecture", figure: "1968", motif: "blocks", hue: 60 },
  { title: "Lucid dreaming", kicker: "Mind · Sleep", figure: "REM", motif: "dream", hue: 295 },
  { title: "Sports cars", kicker: "Speed · Engineering", figure: "5G", motif: "speed", hue: 28 },
  { title: "The Voynich manuscript", kicker: "Mystery · Codex", figure: "240pp", motif: "glyphs", hue: 150 },
];
const FAN: [number, number][] = [[-5, 18], [3, 4], [-2, 26], [6, 10], [-4, 0], [2, 22], [-6, 8], [4, 30], [-3, 12], [5, 2]];

const PROMPTS = [
  "What is the Golden Record?",
  "Why are deep-sea creatures so huge?",
  "How did salt build empires?",
  "Who sculpted the Terracotta Army?",
  "Can you learn to control your dreams?",
  "What makes a supercar fast?",
];

const MOTES = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 2 + ((i * 7) % 4),
  dur: 14 + ((i * 13) % 16),
  delay: -((i * 29) % 30),
  drift: ((i * 17) % 60) - 30,
  o: 0.2 + ((i * 11) % 5) / 12,
}));

function parseRecent(raw: string | null): string[] {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

const noopSubscribe = () => () => {};
function greetingNow() {
  const h = new Date().getHours();
  return h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

const vars = (v: Record<string, string | number>) => v as React.CSSProperties;

function useTypewriter(lines: readonly string[], paused: boolean) {
  const [st, setSt] = useState({ i: 0, n: 0, del: false });
  useEffect(() => {
    if (paused) return;
    const line = lines[st.i];
    let next = st, wait: number;
    if (!st.del && st.n < line.length) {
      next = { ...st, n: st.n + 1 };
      wait = 35 + ((st.n * 29) % 50);
    } else if (!st.del) {
      next = { ...st, del: true };
      wait = 2200;
    } else if (st.n > 0) {
      next = { ...st, n: st.n - 1 };
      wait = 16;
    } else {
      next = { i: (st.i + 1) % lines.length, n: 0, del: false };
      wait = 300;
    }
    const t = setTimeout(() => setSt(next), wait);
    return () => clearTimeout(t);
  }, [st, paused, lines]);
  return { text: lines[st.i].slice(0, st.n), full: lines[st.i] };
}

function MotifArt({ motif }: { motif: Motif }) {
  const g = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const };
  switch (motif) {
    case "record":
      return (
        <g {...g}>
          {[88, 80, 72, 64, 56, 48, 40].map((r) => <circle key={r} cx={100} cy={100} r={r} strokeOpacity={r > 84 ? 1 : 0.5} />)}
          <circle cx={100} cy={100} r={22} fill="currentColor" fillOpacity={0.22} />
          <circle cx={100} cy={100} r={3} fill="currentColor" />
          <path d="M100 12 L100 30 M188 100 L170 100" />
        </g>
      );
    case "moon":
      return (
        <g {...g}>
          <circle cx={100} cy={90} r={60} fill="currentColor" fillOpacity={0.12} />
          <circle cx={78} cy={72} r={11} />
          <circle cx={124} cy={98} r={15} />
          <circle cx={94} cy={118} r={7} />
          <circle cx={120} cy={62} r={5} />
          <path d="M8 176 Q100 146 192 176" />
          <path d="M150 158 L150 124 L172 131 L150 138" />
        </g>
      );
    case "army":
      return (
        <g {...g}>
          {[0, 1, 2, 3, 4].map((r) => {
            const n = 5 + r, y = 50 + r * 26 + r * r * 2, sz = 4 + r * 1.6, gap = 170 / n;
            return Array.from({ length: n }, (_, k) => {
              const x = 15 + gap / 2 + k * gap;
              return (
                <g key={`${r}-${k}`}>
                  <circle cx={x} cy={y} r={sz} fill="currentColor" fillOpacity={0.2 + r * 0.1} />
                  <path d={`M${x} ${y + sz} L${x} ${y + sz * 2.6}`} />
                </g>
              );
            });
          })}
        </g>
      );
    case "perspective":
      return (
        <g {...g}>
          {[[0, 0], [200, 0], [0, 200], [200, 200], [0, 90], [200, 90], [60, 200], [140, 200]].map(([x, y]) => (
            <path key={`${x}-${y}`} d={`M100 90 L${x} ${y}`} strokeOpacity={0.45} />
          ))}
          <rect x={78} y={66} width={44} height={44} />
          <path d="M18 148 L182 148" />
          {Array.from({ length: 13 }, (_, i) => <circle key={i} cx={28 + i * 12} cy={140} r={4} fill="currentColor" fillOpacity={i === 6 ? 0.8 : 0.3} />)}
        </g>
      );
    case "abyss":
      return (
        <g {...g}>
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <path key={k} d={`M${40 + k * 24} 70 C ${24 + k * 24} 110, ${66 + k * 24} 140, ${36 + k * 24 + (k % 2) * 16} 190`} />
          ))}
          <ellipse cx={100} cy={52} rx={46} ry={30} fill="currentColor" fillOpacity={0.14} />
          <circle cx={100} cy={52} r={12} />
          <circle cx={100} cy={52} r={4} fill="currentColor" />
        </g>
      );
    case "lattice":
      return (
        <g {...g}>
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => {
              const x = 40 + c * 44, y = 70 + r * 44;
              return (
                <g key={`${r}-${c}`}>
                  <path d={`M${x} ${y} L${x + 22} ${y - 22}`} strokeOpacity={0.5} />
                  {c < 2 && <path d={`M${x} ${y} L${x + 44} ${y}`} />}
                  {r < 2 && <path d={`M${x} ${y} L${x} ${y + 44}`} />}
                  <circle cx={x} cy={y} r={5} fill="currentColor" fillOpacity={0.35} />
                  <circle cx={x + 22} cy={y - 22} r={3} fill="currentColor" fillOpacity={0.7} />
                </g>
              );
            }),
          )}
        </g>
      );
    case "blocks":
      return (
        <g {...g}>
          <rect x={24} y={116} width={152} height={56} fill="currentColor" fillOpacity={0.12} />
          <rect x={46} y={74} width={108} height={42} />
          <rect x={70} y={40} width={60} height={34} fill="currentColor" fillOpacity={0.2} />
          <path d="M12 172 L188 172" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={i} d={`M${36 + i * 21} 128 L${36 + i * 21} 160`} strokeOpacity={0.6} />)}
          {[0, 1, 2, 3].map((i) => <path key={i} d={`M${58 + i * 28} 86 L${74 + i * 28} 86`} />)}
        </g>
      );
    case "dream":
      return (
        <g {...g}>
          <path d="M122 38 A54 54 0 1 0 160 124 A42 42 0 1 1 122 38 Z" fill="currentColor" fillOpacity={0.18} />
          {[[40, 40], [160, 50], [150, 160], [48, 160], [100, 20]].map(([x, y]) => (
            <path key={`${x}-${y}`} d={`M${x} ${y - 7} L${x} ${y + 7} M${x - 7} ${y} L${x + 7} ${y}`} />
          ))}
          <path d="M100 150 m-4 0 a4 4 0 1 1 8 0 a8 8 0 1 1 -16 0 a12 12 0 1 1 24 0 a16 16 0 1 1 -32 0" strokeOpacity={0.6} />
        </g>
      );
    case "speed":
      return (
        <g {...g}>
          {[40, 58, 76, 94].map((y, i) => <path key={y} d={`M${10 + i * 14} ${y} L${120 - i * 6} ${y}`} strokeOpacity={0.35 + i * 0.12} />)}
          <path d="M24 146 Q34 110 84 104 L136 100 Q172 102 186 134 L186 146 Z" fill="currentColor" fillOpacity={0.14} />
          <circle cx={64} cy={148} r={17} />
          <circle cx={150} cy={148} r={17} />
          <circle cx={64} cy={148} r={5} fill="currentColor" />
          <circle cx={150} cy={148} r={5} fill="currentColor" />
        </g>
      );
    case "glyphs":
      return (
        <g {...g}>
          <path d="M30 180 C 60 120, 20 96, 70 62 S 140 40, 120 100 S 170 160, 176 56" />
          {[[58, 110], [96, 60], [136, 118], [168, 88]].map(([x, y], i) => (
            <ellipse key={i} cx={x} cy={y} rx={12} ry={5} transform={`rotate(${i * 50 - 30} ${x} ${y})`} fill="currentColor" fillOpacity={0.25} />
          ))}
          {[0, 1, 2].map((i) => <path key={i} d={`M${24 + i * 8} ${28 + i * 12} q 12 -8 24 0 t 24 0 t 24 0 t 24 0`} strokeOpacity={0.45} />)}
        </g>
      );
    default: {
      const never: never = motif;
      return never;
    }
  }
}

export default function Landing({ query, onQuery, onStart, falling, hops, inputRef }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const raf = useRef(0);
  const rollTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [focused, setFocused] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [rolling, setRolling] = useState(false);

  const theme = useTheme();
  const recentRaw = useStored(RECENT_KEY);
  const recent = useMemo(() => parseRecent(recentRaw), [recentRaw]);
  const greeting = useSyncExternalStore(noopSubscribe, greetingNow, () => "Hello");
  const tw = useTypewriter(PROMPTS, !!query || falling);

  const go = useCallback(
    (topic: string) => {
      const t = topic.trim();
      if (!t || falling) return;
      clearTimeout(rollTimer.current);
      setRolling(false);
      const next = [t, ...recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 6);
      writeStore(RECENT_KEY, JSON.stringify(next));
      setDrawer(false);
      onStart(t);
    },
    [falling, recent, onStart],
  );

  const surprise = () => {
    if (rolling || falling) return;
    setRolling(true);
    const pool = [...CARDS.map((c) => c.title), ...EXAMPLES, ...PROMPTS];
    const pick = () => pool[Math.floor(Math.random() * pool.length)];
    let n = 0;
    const tick = () => {
      n++;
      onQuery(pick());
      if (n < 14) {
        rollTimer.current = setTimeout(tick, 40 + n * 14);
        return;
      }
      const final = pick();
      onQuery(final);
      rollTimer.current = setTimeout(() => go(final), 380);
    };
    tick();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const el = rootRef.current;
    if (!el) return;
    const x = e.clientX, y = e.clientY;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty("--gx", `${x}px`);
      el.style.setProperty("--gy", `${y}px`);
    });
  };

  const tilt = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = e.currentTarget, r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--ry", `${(px - 0.5) * 18}deg`);
    el.style.setProperty("--rx", `${(0.5 - py) * 18}deg`);
    el.style.setProperty("--px", `${px * 100}%`);
    el.style.setProperty("--py", `${py * 100}%`);
  };
  const untilt = (e: React.PointerEvent<HTMLButtonElement>) => {
    for (const p of ["--rx", "--ry", "--px", "--py"]) e.currentTarget.style.removeProperty(p);
  };

  const closeDrawer = useCallback((restoreFocus: boolean) => {
    setDrawer(false);
    if (restoreFocus) menuBtnRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (drawer) {
        if (e.key === "Escape") closeDrawer(true);
        return;
      }
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inputRef, drawer, closeDrawer]);

  useEffect(() => {
    if (drawer) closeBtnRef.current?.focus({ preventScroll: true });
  }, [drawer]);

  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      clearTimeout(rollTimer.current);
    },
    [],
  );

  const newHole = () => {
    closeDrawer(false);
    onQuery("");
    inputRef.current?.focus({ preventScroll: true });
  };

  const deck = [...CARDS, ...CARDS];
  const rootCls = [styles.root, falling && styles.falling, (focused || !!query) && styles.active].filter(Boolean).join(" ");

  return (
    <main ref={rootRef} className={rootCls} data-theme={theme} onPointerMove={onPointerMove}>
      <div className={styles.backdrop} />
      <div className={styles.glow} />
      <div className={styles.motes} aria-hidden>
        {MOTES.map((m, i) => (
          <span
            key={i}
            className={styles.mote}
            style={vars({ left: `${m.left}%`, width: m.size, height: m.size, "--dur": `${m.dur}s`, "--delay": `${m.delay}s`, "--drift": `${m.drift}px`, "--o": m.o })}
          />
        ))}
      </div>

      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button ref={menuBtnRef} className={styles.menuBtn} onClick={() => setDrawer(true)} aria-expanded={drawer} aria-controls="cs-drawer">
            <span className={styles.burger}><span /><span /><span /></span>
            menu
          </button>
        </div>
        <span className={styles.wordmark}>
          <Logo className={styles.logo} />
          claudescape
        </span>
        <div className={styles.headerRight}>
          <span className={styles.depth} title={`A fresh page is written at every level. After ${hops} levels you can stop and see your map.`}>
            <span className={styles.steps} aria-hidden><i /><i /><i /></span>
            <span className={styles.depthText}>{hops} levels down</span>
          </span>
          <button
            className={`${styles.iconBtn} ${styles.themeBtn}`}
            onClick={() => writeStore(THEME_KEY, theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            <span className={styles.themeIcons}>
              <svg className={styles.moon} viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
              </svg>
              <svg className={styles.sun} viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                <circle cx={12} cy={12} r={4} />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            </span>
          </button>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.greeting}>{greeting}, curious one.</p>
          <h1 className={styles.title}>
            <span className={styles.word} style={vars({ "--i": 0 })}>Start</span>{" "}
            <span className={styles.word} style={vars({ "--i": 1 })}>your</span>{" "}
            <span className={`${styles.word} ${styles.accentWord}`} style={vars({ "--i": 2 })}>
              rabbit hole
              <svg className={styles.squiggle} viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden>
                <path d="M2 8 C 18 2, 28 13, 44 7 S 72 2, 98 7" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" pathLength={1} vectorEffect="non-scaling-stroke" />
              </svg>
            </span>
          </h1>
          <p className={styles.sub}>Ask anything. Claude writes you a page, then offers two doors: one deeper, one sideways.</p>

          <div className={styles.composerRing}>
            <div className={styles.composer}>
              <div className={styles.inputRow}>
                <input
                  ref={inputRef}
                  className={styles.input}
                  value={query}
                  onChange={(e) => {
                    onQuery(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) go(query || tw.full);
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  aria-label="What are you curious about?"
                  autoComplete="off"
                  spellCheck={false}
                />
                {!query && (
                  <span className={styles.ghost} aria-hidden>
                    {tw.text}
                    <span className={styles.caret} />
                  </span>
                )}
                <button className={styles.send} onClick={() => go(query || tw.full)} aria-label="Fall in">
                  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M6 13l6 6 6-6" />
                  </svg>
                </button>
              </div>
              <div className={styles.composerFoot}>
                <span className={styles.footLeft}>
                  <Logo className={styles.logo} />
                  Written live by Claude
                </span>
                <span className={styles.footRight}>
                  <span className={styles.kbd}>/</span> to focus
                  <span className={styles.kbd}>↵</span> to fall in
                </span>
              </div>
            </div>
          </div>

          <div className={styles.chips}>
            {EXAMPLES.map((label, i) => (
              <button key={label} className={styles.chip} style={vars({ "--i": i })} onClick={() => go(label)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
                {label}
              </button>
            ))}
            <button
              className={`${styles.chip} ${styles.chipSurprise} ${rolling ? styles.rolling : ""}`}
              style={vars({ "--i": EXAMPLES.length })}
              onClick={surprise}
              disabled={rolling}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
                <rect x={3.5} y={3.5} width={17} height={17} rx={4} />
                <circle cx={8.5} cy={8.5} r={1.2} fill="currentColor" />
                <circle cx={15.5} cy={15.5} r={1.2} fill="currentColor" />
                <circle cx={12} cy={12} r={1.2} fill="currentColor" />
              </svg>
              Surprise me
            </button>
          </div>
        </div>
      </section>

      <div className={styles.stripLabel}>or fall into one of these</div>
      <section className={styles.strip} aria-label="Popular rabbit holes">
        <div className={styles.track}>
          {deck.map((c, i) => {
            const clone = i >= CARDS.length, [rot, lift] = FAN[i % FAN.length];
            return (
              <div key={i} className={styles.slot} style={vars({ "--i": i % CARDS.length })} aria-hidden={clone || undefined}>
                <div className={styles.fan} style={vars({ "--rot": `${rot}deg`, "--lift": `${lift}px` })}>
                  <button
                    className={styles.card}
                    style={vars({ "--hue": c.hue })}
                    onClick={() => go(c.title)}
                    onPointerMove={tilt}
                    onPointerLeave={untilt}
                    tabIndex={clone ? -1 : 0}
                  >
                    <span className={styles.cardTop}>
                      <span>{c.kicker}</span>
                      <span>No.{String((i % CARDS.length) + 1).padStart(2, "0")}</span>
                    </span>
                    <span className={styles.cardHead}>
                      <span className={styles.figure}>{c.figure}</span>
                      <span className={styles.cardTitle}>{c.title}</span>
                      <span className={styles.cardCta}>Fall in ↓</span>
                    </span>
                    <svg className={styles.motif} viewBox="0 0 200 200" aria-hidden>
                      <MotifArt motif={c.motif} />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className={`${styles.scrim} ${drawer ? styles.scrimOpen : ""}`} onClick={() => closeDrawer(true)} />
      <aside id="cs-drawer" className={`${styles.drawer} ${drawer ? styles.drawerOpen : ""}`} inert={!drawer} aria-label="Menu">
        <div className={styles.drawerHead}>
          <span className={styles.wordmark}>
            <Logo className={styles.logo} />
            claudescape
          </span>
          <button ref={closeBtnRef} className={styles.iconBtn} onClick={() => closeDrawer(true)} aria-label="Close menu">
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className={styles.dItem} style={vars({ "--i": 0 })}>
          <button className={styles.newBtn} onClick={newHole}>
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New rabbit hole
          </button>
        </div>

        <div className={styles.dItem} style={vars({ "--i": 1 })}>
          <div className={styles.sectionLabel}>
            <span>Recent holes</span>
            {recent.length > 0 && (
              <button className={styles.linkBtn} onClick={() => writeStore(RECENT_KEY, null)}>Clear</button>
            )}
          </div>
          {recent.length ? (
            recent.map((r) => (
              <button key={r} className={styles.recent} onClick={() => go(r)}>
                <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                  <circle cx={12} cy={12} r={8.5} />
                  <path d="M12 7.5V12l3 2" />
                </svg>
                <span>{r}</span>
                <svg className={styles.recentArrow} viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            ))
          ) : (
            <p className={styles.empty}>Nothing yet. Every hole you fall into will be waiting here.</p>
          )}
        </div>

        <div className={styles.dItem} style={vars({ "--i": 2 })}>
          <div className={styles.sectionLabel}><span>How it works</span></div>
          <ol className={styles.steps}>
            <li><span className={styles.stepNum}>01</span><span><b>Ask anything</b>A question, a word, a half-remembered fact.</span></li>
            <li><span className={styles.stepNum}>02</span><span><b>Claude writes a page</b>A magazine feature, laid out as you read it.</span></li>
            <li><span className={styles.stepNum}>03</span><span><b>Pick a door</b>Deeper into the topic, or sideways into something stranger.</span></li>
          </ol>
        </div>

        <div className={styles.drawerFoot}>
          <Logo className={styles.logo} />
          Powered by Claude
        </div>
      </aside>
    </main>
  );
}
