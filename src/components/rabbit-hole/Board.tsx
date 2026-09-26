"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./board.module.css";
import { cap, pad, pal, type Kind } from "./content";
import type { BoardFork, BoardNode } from "./share";
import ShareSheet from "./ShareSheet";
import Spark from "./Spark";
import { THEME_KEY, useTheme, writeStore } from "./store";

export type BoardMode = "journey" | "finale" | "shared";

interface Props {
  nodes: BoardNode[];
  mode: BoardMode;
  onClose?: () => void;
  onNewHole: () => void;
  onOpenDoor?: (kind: Kind, el: HTMLElement) => void;
  onStartAt?: (topic: string) => void;
}

type Base = { id: string; x: number; y: number; w: number; h: number };
type Item =
  | (Base & { type: "intro" })
  | (Base & { type: "page"; node: BoardNode; index: number })
  | (Base & { type: "door"; fork: BoardFork; kind: Kind; state: "ahead" | "skipped"; parent: number });
interface Edge { from: string; to: string; chosen: boolean; kind: Kind }
interface Cam { x: number; y: number; k: number }
type Offsets = Record<string, { dx: number; dy: number }>;
type Gesture =
  | { type: "pan"; sx: number; sy: number; cx: number; cy: number }
  | { type: "pinch"; d0: number; mid: { x: number; y: number }; cam: Cam }
  | { type: "card"; id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean };

const PAGE_W = 320, PAGE_H = 400, DOOR_W = 260, DOOR_H = 156, COL = 440, INTRO_W = 400;
const MIN_K = 0.2, MAX_K = 2;
const MM_W = 200, MM_H = 128;

const clampK = (k: number) => Math.min(MAX_K, Math.max(MIN_K, k));
const zoomAt = (c: Cam, px: number, py: number, k: number): Cam => {
  const nk = clampK(k);
  return { k: nk, x: px - ((px - c.x) * nk) / c.k, y: py - ((py - c.y) * nk) / c.k };
};
const anchorY = (it: Item) => (it.type === "door" ? 52 : 76);
const viaLabel = (k: Kind | null) => (k === "sideways" ? "→ Sideways" : "↓ Deeper");

function layout(nodes: BoardNode[]) {
  const items: Item[] = [{ id: "intro", type: "intro", x: -INTRO_W - 120, y: 0, w: INTRO_W, h: PAGE_H }];
  const edges: Edge[] = [];
  const lanes: number[] = [];
  nodes.forEach((n, i) => lanes.push(i === 0 ? 0 : lanes[i - 1] + (n.via === "sideways" ? -70 : 70)));
  nodes.forEach((n, i) => {
    items.push({ id: `p${i}`, type: "page", x: i * COL, y: lanes[i], w: PAGE_W, h: PAGE_H, node: n, index: i });
    if (i > 0) edges.push({ from: `p${i - 1}`, to: `p${i}`, chosen: true, kind: n.via ?? "deeper" });
    const next = nodes[i + 1];
    const kinds: Kind[] = next ? [next.via === "sideways" ? "deeper" : "sideways"] : ["sideways", "deeper"];
    for (const k of kinds) {
      const fork = n.forks?.[k];
      if (!fork) continue;
      const y = next
        ? lanes[i + 1] + (k === "deeper" ? PAGE_H + 44 : -DOOR_H - 44)
        : lanes[i] + (k === "sideways" ? 24 : PAGE_H - DOOR_H - 24);
      const id = `d${i}${k}`;
      items.push({ id, type: "door", x: (i + 1) * COL + 30, y, w: DOOR_W, h: DOOR_H, fork, kind: k, state: next ? "skipped" : "ahead", parent: i });
      edges.push({ from: `p${i}`, to: id, chosen: false, kind: k });
    }
  });
  return { items, edges };
}

function bounds(items: Item[], off: Offsets) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const it of items) {
    const o = off[it.id], x = it.x + (o?.dx ?? 0), y = it.y + (o?.dy ?? 0);
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x + it.w);
    y1 = Math.max(y1, y + it.h);
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

const VIEW_TOP = 76, VIEW_BOTTOM = 90, VIEW_SIDE = 48, READABLE_K = 0.6;

function fitCam(items: Item[], off: Offsets, vw: number, vh: number): Cam {
  const b = bounds(items, off);
  const k = clampK(Math.min((vw - VIEW_SIDE * 2) / b.w, (vh - VIEW_TOP - VIEW_BOTTOM) / b.h, 1));
  return { k, x: (vw - b.w * k) / 2 - b.x0 * k, y: VIEW_TOP + (vh - VIEW_TOP - VIEW_BOTTOM - b.h * k) / 2 - b.y0 * k };
}

/** Fit everything if it stays legible; otherwise zoom to a readable level anchored on the start (or current page). */
function initialCam(items: Item[], vw: number, vh: number, anchor: "start" | "current"): Cam {
  const fitted = fitCam(items, {}, vw, vh);
  if (fitted.k >= READABLE_K) return fitted;
  const byHeight = Math.max(READABLE_K, (vh - VIEW_TOP - VIEW_BOTTOM) / (PAGE_H + 240));
  const byWidth = Math.max(0.4, (vw - VIEW_SIDE) / (INTRO_W + 220));
  const k = clampK(Math.min(0.85, byHeight, byWidth));
  const pages = items.filter((it) => it.type === "page");
  const target = anchor === "current" ? pages[pages.length - 1] : items[0];
  const cy = VIEW_TOP + (vh - VIEW_TOP - VIEW_BOTTOM) / 2 - (target.y + target.h / 2) * k;
  const cx = anchor === "current" ? vw / 2 - (target.x + target.w / 2) * k : VIEW_SIDE - target.x * k;
  return { k, x: cx, y: cy };
}

export default function Board({ nodes, mode, onClose, onNewHole, onOpenDoor, onStartAt }: Props) {
  const theme = useTheme();
  const viewportRef = useRef<HTMLDivElement>(null);
  const anchor: "start" | "current" = mode === "journey" ? "current" : "start";
  const { items, edges } = useMemo(() => layout(nodes), [nodes]);
  const [off, setOff] = useState<Offsets>({});
  const [cam, setCam] = useState<Cam>({ x: 0, y: 0, k: 1 });
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [smooth, setSmooth] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const smoothT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fitted = useRef(false);
  const latest = useRef({ items, off, vp, cam, anchor });
  useEffect(() => {
    latest.current = { items, off, vp, cam, anchor };
  });

  const glide = useCallback((next: Cam) => {
    clearTimeout(smoothT.current);
    setSmooth(true);
    setCam(next);
    smoothT.current = setTimeout(() => setSmooth(false), 520);
  }, []);
  const fit = useCallback(() => {
    const { items: its, off: o, vp: v } = latest.current;
    if (v.w) glide(fitCam(its, o, v.w, v.h));
  }, [glide]);
  const zoomBy = useCallback(
    (f: number) => {
      const { vp: v, cam: c } = latest.current;
      glide(zoomAt(c, v.w / 2, v.h / 2, c.k * f));
    },
    [glide],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width, h = entry.contentRect.height;
      setVp({ w, h });
      if (!fitted.current && w) {
        fitted.current = true;
        setCam(initialCam(latest.current.items, w, h, latest.current.anchor));
      }
    });
    ro.observe(el);
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      clearTimeout(smoothT.current);
      setSmooth(false);
      if (e.ctrlKey || e.metaKey) {
        const d = Math.max(-40, Math.min(40, e.deltaY));
        setCam((c) => zoomAt(c, e.clientX, e.clientY, c.k * Math.exp(-d * 0.012)));
      } else {
        setCam((c) => ({ ...c, x: c.x - e.deltaX, y: c.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", onWheel);
      clearTimeout(smoothT.current);
    };
  }, []);

  useEffect(() => {
    if (sharing) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const step = e.shiftKey ? 240 : 80;
      switch (e.key) {
        case "Escape":
          onClose?.();
          return;
        case "+":
        case "=":
          zoomBy(1.2);
          break;
        case "-":
        case "_":
          zoomBy(1 / 1.2);
          break;
        case "0":
        case "f":
          fit();
          break;
        case "ArrowLeft":
          setCam((c) => ({ ...c, x: c.x + step }));
          break;
        case "ArrowRight":
          setCam((c) => ({ ...c, x: c.x - step }));
          break;
        case "ArrowUp":
          setCam((c) => ({ ...c, y: c.y + step }));
          break;
        case "ArrowDown":
          setCam((c) => ({ ...c, y: c.y - step }));
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sharing, onClose, zoomBy, fit]);

  const pos = (it: Item) => ({ x: it.x + (off[it.id]?.dx ?? 0), y: it.y + (off[it.id]?.dy ?? 0) });
  const byId = new Map(items.map((it) => [it.id, it]));

  const focusItem = (id: string) => {
    const it = byId.get(id);
    if (!it || !vp.w) return;
    const p = pos(it), k = clampK(Math.min(Math.max(cam.k, 0.9), 1.15));
    glide({ k, x: vp.w / 2 - (p.x + it.w / 2) * k, y: vp.h / 2 + 20 - (p.y + it.h / 2) * k });
  };

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    gesture.current = { type: "pinch", d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, cam };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a")) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    clearTimeout(smoothT.current);
    setSmooth(false);
    if (pointers.current.size === 2) return startPinch();
    if (pointers.current.size > 2) return;
    const card = target.closest<HTMLElement>("[data-card]")?.dataset.card;
    gesture.current = card
      ? { type: "card", id: card, sx: e.clientX, sy: e.clientY, ox: off[card]?.dx ?? 0, oy: off[card]?.dy ?? 0, moved: false }
      : { type: "pan", sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointers.current.get(e.pointerId), g = gesture.current;
    if (!p || !g) return;
    p.x = e.clientX;
    p.y = e.clientY;
    switch (g.type) {
      case "pinch": {
        const [a, b] = [...pointers.current.values()];
        const k = clampK((g.cam.k * Math.hypot(a.x - b.x, a.y - b.y)) / g.d0);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const wx = (g.mid.x - g.cam.x) / g.cam.k, wy = (g.mid.y - g.cam.y) / g.cam.k;
        setCam({ k, x: mid.x - wx * k, y: mid.y - wy * k });
        break;
      }
      case "pan":
        setCam((c) => ({ ...c, x: g.cx + e.clientX - g.sx, y: g.cy + e.clientY - g.sy }));
        break;
      case "card": {
        if (!g.moved && Math.hypot(e.clientX - g.sx, e.clientY - g.sy) < 5) return;
        if (!g.moved) setDragId(g.id);
        g.moved = true;
        setOff((o) => ({ ...o, [g.id]: { dx: g.ox + (e.clientX - g.sx) / cam.k, dy: g.oy + (e.clientY - g.sy) / cam.k } }));
        break;
      }
      default: {
        const never: never = g;
        return never;
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(e.pointerId)) return;
    const g = gesture.current;
    if (g?.type === "card" && !g.moved) focusItem(g.id);
    setDragId(null);
    if (pointers.current.size === 1 && g?.type === "pinch") {
      const [rest] = [...pointers.current.values()];
      gesture.current = { type: "pan", sx: rest.x, sy: rest.y, cx: cam.x, cy: cam.y };
    } else if (!pointers.current.size) gesture.current = null;
  };

  // Minimap
  const world = bounds(items, off);
  const mmPad = 80, mmW = world.w + mmPad * 2, mmH = world.h + mmPad * 2;
  const mmS = Math.min(MM_W / mmW, MM_H / mmH);
  const mmOx = (MM_W - mmW * mmS) / 2, mmOy = (MM_H - mmH * mmS) / 2;
  const toMm = (x: number, y: number) => ({ x: mmOx + (x - world.x0 + mmPad) * mmS, y: mmOy + (y - world.y0 + mmPad) * mmS });
  const view = toMm(-cam.x / cam.k, -cam.y / cam.k);
  const onMinimap = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.type === "pointerdown") e.currentTarget.setPointerCapture(e.pointerId);
    else if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const r = e.currentTarget.getBoundingClientRect();
    const wx = (e.clientX - r.left - mmOx) / mmS + world.x0 - mmPad, wy = (e.clientY - r.top - mmOy) / mmS + world.y0 - mmPad;
    clearTimeout(smoothT.current);
    setSmooth(false);
    setCam((c) => ({ ...c, x: vp.w / 2 - wx * c.k, y: vp.h / 2 - wy * c.k }));
  };

  const last = nodes[nodes.length - 1], first = nodes[0];
  const levels = nodes.length - 1;
  const sideways = nodes.filter((n) => n.via === "sideways").length;
  const closed = items.filter((it) => it.type === "door").length;
  const doorState = (s: "ahead" | "skipped") => (s === "skipped" ? "Not taken" : mode === "journey" ? "Waiting for you" : mode === "finale" ? "Left closed" : "Unexplored");
  const grid = 26 * cam.k;

  return (
    <div className={styles.root} data-theme={theme} role="dialog" aria-modal="true" aria-label="Journey board">
      <div
        ref={viewportRef}
        className={`${styles.viewport} ${smooth ? styles.smooth : ""}`}
        style={{ backgroundSize: `${grid}px ${grid}px`, backgroundPosition: `${cam.x}px ${cam.y}px` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className={styles.world} style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.k})` }}>
          <svg className={styles.edges} aria-hidden>
            {edges.map((e, i) => {
              const a = byId.get(e.from), b = byId.get(e.to);
              if (!a || !b) return null;
              const pa = pos(a), pb = pos(b);
              const x1 = pa.x + a.w, y1 = pa.y + anchorY(a), x2 = pb.x, y2 = pb.y + anchorY(b);
              const dx = Math.max(60, Math.abs(x2 - x1) / 2);
              return (
                <path
                  key={`${e.from}-${e.to}`}
                  d={`M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`}
                  className={e.chosen ? styles.edgeChosen : styles.edgeGhost}
                  pathLength={e.chosen ? 1 : undefined}
                  style={{ "--i": i } as React.CSSProperties}
                />
              );
            })}
          </svg>

          {edges.filter((e) => e.chosen).map((e) => {
            const a = byId.get(e.from), b = byId.get(e.to);
            if (!a || !b) return null;
            const pa = pos(a), pb = pos(b);
            return (
              <span key={`l-${e.to}`} className={styles.edgeLabel} style={{ left: (pa.x + a.w + pb.x) / 2, top: (pa.y + anchorY(a) + pb.y + anchorY(b)) / 2 }}>
                {viaLabel(e.kind)}
              </span>
            );
          })}

          {items.map((it, order) => {
            const p = pos(it);
            const style = { left: p.x, top: p.y, width: it.w, height: it.h, "--i": order } as React.CSSProperties;
            const cls = (base: string, extra = "") => `${styles.card} ${base} ${extra} ${dragId === it.id ? styles.dragging : ""}`;
            switch (it.type) {
              case "intro":
                return (
                  <div key={it.id} data-card={it.id} className={cls(styles.intro)} style={style}>
                    <div className={styles.eyebrow}>{mode === "finale" ? "The journey map" : mode === "shared" ? "A shared rabbit hole" : "Your board · so far"}</div>
                    <h2 className={styles.introTitle}>
                      {levels === 0 ? (
                        <>Still at the surface of <em>{first?.topic}</em>.</>
                      ) : mode === "journey" ? (
                        <>{levels} level{levels > 1 ? "s" : ""} below <em>{first?.topic}</em>, somewhere around <em>{last?.topic}</em>.</>
                      ) : (
                        <>Started at <em>{first?.topic}</em>, ended up at <em>{last?.topic}</em>.</>
                      )}
                    </h2>
                    <div className={styles.stats}>
                      {[
                        [pad(levels), "Levels down"],
                        [pad(nodes.length), "Pages read"],
                        [pad(sideways), "Sideways turns"],
                        [pad(closed), "Doors left closed"],
                      ].map(([v, l]) => (
                        <div key={l}>
                          <b>{v}</b>
                          <span>{l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              case "page": {
                const n = it.node, current = it.index === nodes.length - 1;
                return (
                  <div
                    key={it.id}
                    data-card={it.id}
                    className={cls(styles.page, current && mode !== "shared" ? styles.current : "")}
                    style={{ ...style, "--band-a": pal(it.index).accent, "--band-b": pal(it.index + 1).bg } as React.CSSProperties}
                  >
                    <div className={styles.band} />
                    <div className={styles.meta}>
                      <span>{it.index === 0 ? "Start" : `L${pad(it.index)} · ${viaLabel(n.via)}`}</span>
                      {n.layout && <span className={styles.tag}>{cap(n.layout)}</span>}
                    </div>
                    {n.figure && (
                      <div className={styles.fig}>
                        <b>{n.figure.value}</b>
                        <span>{n.figure.label}</span>
                      </div>
                    )}
                    <h3 className={styles.title}>{n.title}</h3>
                    {n.dek && <p className={styles.dek}>{n.dek}</p>}
                    {n.excerpt && <p className={styles.excerpt}>{n.excerpt}</p>}
                    {n.pending && <p className={styles.pending}>Claude is still writing this page…</p>}
                    <div className={styles.cardFoot}>
                      <span className={styles.topic}>{cap(n.topic)}</span>
                      {mode === "journey" && current && <span className={styles.here}>You are here</span>}
                      {mode === "shared" && onStartAt && (
                        <button className={styles.cardBtn} onClick={() => onStartAt(n.topic)}>Fall in here ↓</button>
                      )}
                    </div>
                  </div>
                );
              }
              case "door":
                return (
                  <div key={it.id} data-card={it.id} className={cls(styles.door, it.state === "ahead" ? styles.ahead : "")} data-kind={it.kind} style={style}>
                    <div className={styles.meta}>
                      <span>{viaLabel(it.kind)}</span>
                      <span>{doorState(it.state)}</span>
                    </div>
                    <h4 className={styles.doorTitle}>{it.fork.title}</h4>
                    {it.fork.teaser && <p className={styles.teaser}>{it.fork.teaser}</p>}
                    {mode === "journey" && it.state === "ahead" && onOpenDoor && (
                      <button
                        className={styles.cardBtn}
                        onClick={(e) => {
                          const el = e.currentTarget.closest<HTMLElement>("[data-card]");
                          if (el) onOpenDoor(it.kind, el);
                        }}
                      >
                        Open this door →
                      </button>
                    )}
                    {mode === "shared" && onStartAt && (
                      <button className={styles.cardBtn} onClick={() => onStartAt(it.fork.topic)}>Fall in here ↓</button>
                    )}
                  </div>
                );
              default: {
                const never: never = it;
                return never;
              }
            }
          })}
        </div>
      </div>

      <header className={styles.header}>
        <div className={styles.headLeft}>
          {onClose && (
            <button className={styles.ghostBtn} onClick={onClose}>
              ← {mode === "finale" ? "Keep falling" : "Back to page"}
            </button>
          )}
          <button className={styles.wordmark} onClick={mode === "shared" ? onNewHole : undefined} tabIndex={mode === "shared" ? 0 : -1}>
            <Spark className={styles.miniSpark} />
            claudescape
          </button>
        </div>
        <div className={styles.crumb}>
          {first && (
            <>
              <span>{first.topic}</span>
              {levels > 0 && (
                <>
                  <span className={styles.crumbArrow}>→</span>
                  <em>{last.topic}</em>
                </>
              )}
            </>
          )}
        </div>
        <div className={styles.headRight}>
          <button
            className={styles.iconBtn}
            onClick={() => writeStore(THEME_KEY, theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? (
              <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><circle cx={12} cy={12} r={4} /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
            )}
          </button>
          {mode !== "journey" && (
            <button className={styles.ghostBtn} onClick={onNewHole}>{mode === "shared" ? "Start your own" : "New hole"}</button>
          )}
          <button className={styles.primaryBtn} onClick={() => setSharing(true)}>
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
            Share
          </button>
        </div>
      </header>

      <div className={styles.controls}>
        <button className={styles.ctrl} onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out">−</button>
        <button className={`${styles.ctrl} ${styles.zoomLabel}`} onClick={() => vp.w && glide(zoomAt(cam, vp.w / 2, vp.h / 2, 1))} aria-label="Reset zoom to 100%">
          {Math.round(cam.k * 100)}%
        </button>
        <button className={styles.ctrl} onClick={() => zoomBy(1.2)} aria-label="Zoom in">+</button>
        <span className={styles.ctrlSep} />
        <button className={styles.ctrl} onClick={fit} aria-label="Fit board to screen" title="Fit (F)">
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
        </button>
        <button
          className={styles.ctrl}
          onClick={() => setOff({})}
          disabled={!Object.keys(off).length}
          aria-label="Tidy cards back into place"
          title="Tidy up"
        >
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" /></svg>
        </button>
      </div>

      <svg className={styles.minimap} width={MM_W} height={MM_H} onPointerDown={onMinimap} onPointerMove={onMinimap} aria-label="Minimap">
        {items.map((it) => {
          const p = pos(it), a = toMm(p.x, p.y);
          return <rect key={it.id} x={a.x} y={a.y} width={it.w * mmS} height={it.h * mmS} rx={2} className={styles[`mm_${it.type}`]} />;
        })}
        <rect x={view.x} y={view.y} width={(vp.w / cam.k) * mmS} height={(vp.h / cam.k) * mmS} rx={3} className={styles.mmView} />
      </svg>

      <div className={styles.hint}>Drag to pan · Ctrl/⌘ + scroll or pinch to zoom · Drag cards to rearrange</div>

      {sharing && <ShareSheet nodes={nodes} onClose={() => setSharing(false)} />}
    </div>
  );
}
