"use client";

import React from "react";
import { css, MONO } from "./css";

interface View { x: number; y: number; k: number }

interface Props {
  /** Size of the content in canvas pixels (unscaled). */
  width: number;
  height: number;
  /** Canvas point to center on when the map opens ("you are here"). */
  focus: { x: number; y: number };
  ink: string;
  muted: string;
  rule: string;
  bg: string;
  children: React.ReactNode;
}

const MIN_K = 0.25, MAX_K = 2.5, PAD = 48, DRAG_PX = 4;
const clampK = (k: number) => Math.min(MAX_K, Math.max(MIN_K, k));

/**
 * A pannable, zoomable viewport. Drag or scroll to pan, pinch / ctrl+scroll / buttons to zoom.
 * Clicks on children still work — a click is only swallowed if the pointer actually dragged.
 */
export default function MapCanvas({ width, height, focus, ink, muted, rule, bg, children }: Props) {
  const vpRef = React.useRef<HTMLDivElement>(null);
  const [view, setView] = React.useState<View>({ x: 0, y: 0, k: 1 });
  const [anim, setAnim] = React.useState(false);
  const [grabbing, setGrabbing] = React.useState(false);
  // Mirror of `view` for event handlers; only ever written through go().
  const viewRef = React.useRef(view);
  const ptrs = React.useRef(new Map<number, { x: number; y: number }>());
  const gesture = React.useRef<{ sx: number; sy: number; moved: boolean; dist: number } | null>(null);
  const dragged = React.useRef(false);

  const size = () => {
    const r = vpRef.current?.getBoundingClientRect();
    return { w: r?.width ?? 800, h: r?.height ?? 560, left: r?.left ?? 0, top: r?.top ?? 0 };
  };
  const go = (v: View, animate: boolean) => {
    viewRef.current = v;
    setAnim(animate);
    setView(v);
  };
  const fitView = React.useCallback((): View => {
    const { w, h } = size();
    const k = clampK(Math.min((w - PAD * 2) / width, (h - PAD * 2) / height, 1));
    return { k, x: (w - width * k) / 2, y: (h - height * k) / 2 };
  }, [width, height]);
  const focusView = React.useCallback((k: number): View => {
    const { w, h } = size();
    return { k, x: w / 2 - focus.x * k, y: h / 2 - focus.y * k };
  }, [focus.x, focus.y]);
  /** Zoom by factor f keeping the viewport point (cx, cy) fixed. */
  const zoomAt = (f: number, cx: number, cy: number, animate: boolean) => {
    const v = viewRef.current, k = clampK(v.k * f), r = k / v.k;
    go({ k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r }, animate);
  };
  const zoomCenter = (f: number) => {
    const { w, h } = size();
    zoomAt(f, w / 2, h / 2, true);
  };

  // Initial framing: show everything if it's still legible, otherwise center on the current page.
  React.useLayoutEffect(() => {
    const fit = fitView();
    // Needs the measured viewport, so it has to run after layout (but before paint).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    go(fit.k >= 0.7 ? fit : focusView(0.9), false);
    // Only on mount — later re-renders (e.g. the draw-in animation) shouldn't reframe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wheel must be non-passive to stop the page from scrolling underneath.
  React.useEffect(() => {
    const el = vpRef.current;
    if (!el) return;
    // A scroll gesture that began outside the canvas keeps scrolling the page even once the
    // canvas slides under the cursor; only gestures that start on the canvas pan it.
    let passUntil = 0;
    const onWindowWheel = (e: WheelEvent) => {
      if (!el.contains(e.target as Node) || performance.now() < passUntil) passUntil = performance.now() + 250;
    };
    window.addEventListener("wheel", onWindowWheel, { capture: true, passive: true });
    const onWheel = (e: WheelEvent) => {
      if (performance.now() < passUntil) return;
      e.preventDefault();
      const { left, top } = size();
      if (e.ctrlKey || e.metaKey) {
        zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - left, e.clientY - top, false);
      } else {
        const v = viewRef.current, dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX, dy = e.shiftKey ? 0 : e.deltaY;
        go({ ...v, x: v.x - dx, y: v.y - dy }, false);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("wheel", onWindowWheel, { capture: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-canvas-ui]")) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const ps = [...ptrs.current.values()];
    const dist = ps.length === 2 ? Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) : 0;
    gesture.current = { sx: e.clientX, sy: e.clientY, moved: false, dist };
    dragged.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current, prev = ptrs.current.get(e.pointerId);
    if (!g || !prev) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!g.moved && Math.hypot(e.clientX - g.sx, e.clientY - g.sy) < DRAG_PX) return;
    if (!g.moved) {
      // Capture only once it's a real drag, so plain clicks still reach the nodes.
      g.moved = true;
      dragged.current = true;
      try {
        vpRef.current?.setPointerCapture(e.pointerId);
      } catch {
        // Pointer already gone (released mid-gesture); panning still works without capture.
      }
      setGrabbing(true);
    }
    const ps = [...ptrs.current.values()];
    if (ps.length === 2) {
      const d = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
      const { left, top } = size();
      if (g.dist) zoomAt(d / g.dist, (ps[0].x + ps[1].x) / 2 - left, (ps[0].y + ps[1].y) / 2 - top, false);
      g.dist = d;
      return;
    }
    const v = viewRef.current;
    go({ ...v, x: v.x + e.clientX - prev.x, y: v.y + e.clientY - prev.y }, false);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size === 0) {
      gesture.current = null;
      setGrabbing(false);
    }
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const v = viewRef.current, step = 60;
    const moves: Record<string, () => void> = {
      "+": () => zoomCenter(1.25), "=": () => zoomCenter(1.25), "-": () => zoomCenter(0.8), "0": () => go(fitView(), true),
      ArrowLeft: () => go({ ...v, x: v.x + step }, true), ArrowRight: () => go({ ...v, x: v.x - step }, true),
      ArrowUp: () => go({ ...v, y: v.y + step }, true), ArrowDown: () => go({ ...v, y: v.y - step }, true),
    };
    if (moves[e.key]) {
      e.preventDefault();
      moves[e.key]();
    }
  };

  const grid = 28 * view.k;
  const btn = css`min-width:34px; height:34px; padding:0 10px; border:0; border-radius:999px; background:transparent; color:${ink}; font-family:${MONO}; font-size:12px; letter-spacing:.12em; text-transform:uppercase; cursor:pointer`;
  return (
    <div
      ref={vpRef}
      tabIndex={0}
      aria-label="Path map canvas. Drag to pan, pinch or use + and − to zoom."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={(e) => {
        if (dragged.current) {
          e.stopPropagation();
          dragged.current = false;
        }
      }}
      onKeyDown={onKeyDown}
      style={{
        ...css`position:relative; height:min(64vh,680px); min-height:380px; overflow:hidden; border:1px solid ${rule}; border-radius:8px; outline:none; touch-action:none; user-select:none`,
        cursor: grabbing ? "grabbing" : "grab",
        backgroundImage: `radial-gradient(circle, ${rule} 1px, transparent 1.2px)`,
        backgroundSize: `${grid}px ${grid}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
      }}
    >
      <div
        style={{
          position: "absolute", left: 0, top: 0, width, height, transformOrigin: "0 0",
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
          transition: anim ? "transform 380ms cubic-bezier(.2,.8,.2,1)" : "none",
        }}
      >
        {children}
      </div>

      <div data-canvas-ui style={css`position:absolute; right:14px; bottom:14px; display:flex; align-items:center; gap:2px; padding:4px; border:1px solid ${rule}; border-radius:999px; background:color-mix(in oklch, ${bg} 88%, transparent); backdrop-filter:blur(8px); cursor:default`}>
        <button className="rh-hbg" style={{ ...btn, ["--h-bg" as string]: rule }} onClick={() => zoomCenter(0.8)} aria-label="Zoom out">−</button>
        <span style={css`min-width:48px; text-align:center; font-family:${MONO}; font-size:11px; letter-spacing:.08em; color:${muted}`}>{Math.round(view.k * 100)}%</span>
        <button className="rh-hbg" style={{ ...btn, ["--h-bg" as string]: rule }} onClick={() => zoomCenter(1.25)} aria-label="Zoom in">+</button>
        <span style={css`width:1px; height:18px; margin:0 4px; background:${rule}`} />
        <button className="rh-hbg" style={{ ...btn, ["--h-bg" as string]: rule }} onClick={() => go(fitView(), true)}>Fit</button>
        <button className="rh-hbg" style={{ ...btn, ["--h-bg" as string]: rule }} onClick={() => go(focusView(Math.max(viewRef.current.k, 0.9)), true)}>You</button>
      </div>
      <div data-canvas-ui className="rh-map-hint" style={css`position:absolute; left:16px; bottom:18px; font-family:${MONO}; font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:${muted}; pointer-events:none`}>
        Drag to pan · pinch or ⌘-scroll to zoom · click a page to open it
      </div>
    </div>
  );
}
