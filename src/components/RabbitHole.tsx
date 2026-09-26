"use client";

import React from "react";
import Board, { type BoardMode } from "./rabbit-hole/Board";
import { css, MONO, NEWS, SERIF } from "./rabbit-hole/css";
import Landing from "./rabbit-hole/Landing";
import { decodeJourney, HASH_PREFIX, type BoardNode } from "./rabbit-hole/share";
import Spark from "./rabbit-hole/Spark";
import {
  ask, cap, DOOR, FORK_RULES, HEAD, HUES, LAYOUTS, layoutRule, LOAD_MSGS, pad, pal, sleep, SHAPES, TAIL,
  type Contender, type Kind, type Page, type Theme,
} from "./rabbit-hole/content";

type Status = "loading" | "ready" | "error";

interface JourneyNode {
  id: number;
  topic: string;
  title?: string;
  teaser?: string;
  depth: number;
  via: Kind | null;
  fromTitle?: string;
  prevLayout?: string;
  status: Status;
  page: Page | null;
  error?: string | null;
  chosen?: Kind;
}

interface Rect { top: number; left: number; right: number; bottom: number; width: number }

interface Trans {
  phase: "start" | "grow" | "out";
  rect: Rect;
  kind: Kind;
  title: string;
  depth: number;
  waiting: boolean;
}

interface State {
  screen: "landing" | "journey";
  query: string;
  falling: boolean;
  nodes: JourneyNode[];
  revealed: number;
  forkOpen: boolean;
  hover: Kind | null;
  trans: Trans | null;
  board: Exclude<BoardMode, "shared"> | null;
  shared: BoardNode[] | null;
  scrollP: number;
  ready: Record<string, "ready" | "error">;
  loadIdx: number;
}

interface Props {
  /** Levels before the "stop falling" button appears. */
  hops?: number;
  /** Blend the page toward the next level's palette as you scroll. */
  sinkOnScroll?: boolean;
}

type Block = { col: string } & (
  | { type: "figure"; value: string; label: string }
  | { type: "intro"; cap: string; rest: string }
  | { type: "section"; heading: string; paras: string[] }
  | { type: "quote"; text: string; cite: string }
  | { type: "event"; year: string; title: string; body: string; flip: boolean }
  | { type: "versus"; a: Contender; b: Contender }
  | { type: "rows"; rows: { label: string; a: string; b: string }[] }
  | { type: "verdict"; text: string }
  | { type: "plate"; name: string; year: string; tag: string; body: string; num: string; tone: string; minH: string; nameSize: string }
  | { type: "closing"; text: string }
);

/** Hover style: background (and optionally color) applied via the .rh-hbg / .rh-hc classes. */
const hover = (bg: string, c?: string) =>
  ({ className: c ? "rh-hbg rh-hc" : "rh-hbg", vars: { "--h-bg": bg, ...(c ? { "--h-c": c } : {}) } as React.CSSProperties });

function blocks(page: Page, depth: number): Block[] {
  const t = pal(depth), out: Block[] = [];
  if (page.figure?.value) out.push({ type: "figure", value: page.figure.value, label: page.figure.label, col: "1 / -1" });
  if (page.intro) out.push({ type: "intro", cap: page.intro.charAt(0), rest: page.intro.slice(1), col: "1 / span 8" });
  if (page.story) {
    (page.story.sections || []).forEach((s, i) => {
      out.push({ type: "section", heading: s.heading, paras: Array.isArray(s.body) ? s.body : [s.body], col: "3 / span 7" });
      if (i === 0 && page.story?.quote?.text) out.push({ type: "quote", text: page.story.quote.text, cite: page.story.quote.cite, col: "1 / -1" });
    });
  } else if (page.timeline) {
    (page.timeline.events || []).forEach((ev, i) => out.push({ type: "event", ...ev, flip: i % 2 === 1, col: "1 / -1" }));
  } else if (page.comparison) {
    const cm = page.comparison;
    if (cm.a && cm.b) out.push({ type: "versus", a: cm.a, b: cm.b, col: "1 / -1" });
    if (cm.rows?.length) out.push({ type: "rows", rows: cm.rows, col: "1 / -1" });
    if (cm.verdict) out.push({ type: "verdict", text: cm.verdict, col: "3 / span 8" });
  } else if (page.gallery) {
    const items = page.gallery.items || [], n = items.length;
    items.forEach((it, i) => {
      const full = i === 0 || (i === n - 1 && (n - 1) % 2 === 1);
      const col = full ? "1 / -1" : i % 2 === 1 ? "1 / span 6" : "7 / span 6";
      const h = HUES[i % HUES.length];
      out.push({
        type: "plate", ...it, num: pad(i + 1),
        tone: t.dark ? `oklch(0.4 0.07 ${h})` : `oklch(0.85 0.06 ${h})`,
        minH: full ? "440px" : "400px",
        nameSize: full ? "clamp(56px,6vw,96px)" : "clamp(40px,3.6vw,58px)",
        col,
      });
    });
  }
  if (page.closing) out.push({ type: "closing", text: page.closing, col: "3 / span 7" });
  return out;
}

function ctx(node: { via: Kind | null; topic: string; title?: string; teaser?: string }, path: string[]) {
  if (!node.via) return `The reader typed: "${node.topic}". Write the first page of the journey.`;
  return `Journey so far: ${path.join(" → ")}. The reader just chose the ${node.via.toUpperCase()} door titled "${node.title}" ("${node.teaser}"). Write the page for: ${node.topic}. The headline may echo the door title.`;
}

const errMsg = (e: unknown) => String((e as Error)?.message || e);

export default class RabbitHole extends React.Component<Props, State> {
  state: State = {
    screen: "landing", query: "", falling: false, nodes: [], revealed: 0, forkOpen: false, hover: null,
    trans: null, board: null, shared: null, scrollP: 0, ready: {}, loadIdx: 0,
  };
  boardCache: { src: JourneyNode[]; out: BoardNode[] } | null = null;
  forkRef = React.createRef<HTMLElement>();
  inputRef = React.createRef<HTMLInputElement>();
  pre: Record<string, { promise: Promise<Page> }> = {};
  nid = 1;
  revealT?: ReturnType<typeof setInterval>;
  loadT?: ReturnType<typeof setInterval>;

  onScroll = () => this.handleScroll();

  componentDidMount() {
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("resize", this.onScroll);
    this.revealT = setInterval(() => this.tickReveal(), 240);
    this.loadT = setInterval(() => {
      const c = this.cur();
      if (c && c.status === "loading") this.setState((s) => ({ loadIdx: s.loadIdx + 1 }));
    }, 1600);
    if (location.hash.startsWith(HASH_PREFIX)) {
      decodeJourney(location.hash.slice(HASH_PREFIX.length))
        .then((shared) => this.setState({ shared }))
        .catch(() => history.replaceState(null, "", location.pathname + location.search));
    }
  }
  componentWillUnmount() {
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("resize", this.onScroll);
    clearInterval(this.revealT);
    clearInterval(this.loadT);
  }
  cur() {
    const n = this.state.nodes;
    return n[n.length - 1];
  }
  hops() {
    return this.props.hops ?? 3;
  }

  handleScroll() {
    const h = document.documentElement, max = h.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, scrollY / max) : 0;
    let fo = this.state.forkOpen;
    const el = this.forkRef.current;
    if (el && !fo && el.getBoundingClientRect().top < innerHeight * 0.7) fo = true;
    if (Math.abs(p - this.state.scrollP) > 0.01 || fo !== this.state.forkOpen) this.setState({ scrollP: p, forkOpen: fo });
  }
  tickReveal() {
    const c = this.cur();
    if (!c || !c.page || this.state.trans?.phase === "grow") return;
    const n = blocks(c.page, c.depth).length;
    if (this.state.revealed < n) this.setState((s) => ({ revealed: s.revealed + 1 }), () => this.handleScroll());
  }
  updateNode(id: number, patch: Partial<JourneyNode>) {
    this.setState((s) => ({ nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
  }

  async genSplit(node: JourneyNode, path: string[]) {
    try {
      const head = await ask(`${ctx(node, path)}\n${layoutRule(node.prevLayout)}\nReturn only the opening of the page as JSON with exactly these keys:\n{${HEAD}}`, 700);
      if (!SHAPES[head.layout]) head.layout = "story";
      this.updateNode(node.id, { page: head });
      const body = await ask(`${ctx(node, path)}\nYou already wrote this opening: ${JSON.stringify(head)}\nNow write the rest of this ${head.layout} page. Return JSON with exactly these keys:\n{${SHAPES[head.layout]},\n${TAIL}}\n${FORK_RULES}`, 2600);
      const page = { ...head, ...body, layout: head.layout };
      this.updateNode(node.id, { page, status: "ready" });
      this.prefetch({ ...node, page }, path);
    } catch (e) {
      this.updateNode(node.id, { status: "error", error: errMsg(e) });
    }
  }
  prefetch(node: JourneyNode, path: string[]) {
    (["deeper", "sideways"] as const).forEach((kind) => {
      const f = node.page?.forks?.[kind];
      const key = node.id + ":" + kind;
      if (!f || this.pre[key]) return;
      const child = { topic: f.topic, title: f.title, teaser: f.teaser, via: kind };
      const prompt = `${ctx(child, [...path])}\n${layoutRule(node.page?.layout)}\nReturn one JSON object with exactly these keys (include ONLY the one layout key matching your chosen layout):\n{${HEAD},\n<layout key>: one of:\n  ${Object.values(SHAPES).join("\n  ")},\n${TAIL}}\n${FORK_RULES}`;
      const promise = ask(prompt, 3200).then((d) => {
        if (!d.title || !d.forks) throw new Error("Incomplete page.");
        if (!SHAPES[d.layout]) d.layout = LAYOUTS.find((k) => d[k]) || "story";
        this.setState((s) => ({ ready: { ...s.ready, [key]: "ready" } }));
        return d;
      });
      promise.catch(() => this.setState((s) => ({ ready: { ...s.ready, [key]: "error" } })));
      this.pre[key] = { promise };
    });
  }

  start(topic: string) {
    topic = (topic || "").trim();
    if (!topic || this.state.falling) return;
    this.setState({ falling: true, query: topic });
    setTimeout(() => {
      const node: JourneyNode = { id: this.nid++, topic: topic.toLowerCase(), depth: 0, via: null, status: "loading", page: null };
      window.scrollTo(0, 0);
      this.setState({ screen: "journey", falling: false, nodes: [node], revealed: 0, forkOpen: false, hover: null, board: null, trans: null, scrollP: 0 });
      this.genSplit(node, [node.topic]);
    }, 1000);
  }
  retry() {
    const c = this.cur();
    if (!c) return;
    const path = this.state.nodes.map((n) => n.topic);
    this.updateNode(c.id, { status: "loading", page: null, error: null });
    this.setState({ revealed: 0 });
    this.genSplit({ ...c }, path);
  }
  doorProps(kind: Kind, title?: string) {
    const setHover = (hover: Kind | null) => !this.state.trans && this.setState({ hover });
    return {
      role: "button",
      tabIndex: 0,
      "aria-label": `${kind === "deeper" ? "Go deeper" : "Go sideways"}${title ? `: ${title}` : ""}`,
      onClick: (e: React.MouseEvent<HTMLDivElement>) => this.pick(kind, e.currentTarget.getBoundingClientRect()),
      onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        this.pick(kind, e.currentTarget.getBoundingClientRect());
      },
      onMouseEnter: () => setHover(kind),
      onMouseLeave: () => setHover(null),
      onFocus: () => setHover(kind),
      onBlur: () => setHover(null),
    };
  }
  async pick(kind: Kind, r: DOMRect) {
    if (this.state.trans) return;
    const c = this.cur();
    const f = c?.page?.forks?.[kind];
    if (!c || !f) return;
    const depth = c.depth + 1, key = c.id + ":" + kind;
    const path = this.state.nodes.map((n) => n.topic);
    if (!this.pre[key]) this.prefetch(c, path);
    this.setState((s) => ({
      nodes: s.nodes.map((n) => (n.id === c.id ? { ...n, chosen: kind } : n)),
      trans: { phase: "start", rect: { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width }, kind, title: f.title, depth, waiting: false },
    }));
    requestAnimationFrame(() => requestAnimationFrame(() => this.setState((s) => ({ trans: s.trans && { ...s.trans, phase: "grow" } }))));
    const t0 = Date.now();
    const waitT = setTimeout(() => this.setState((s) => (s.trans ? { trans: { ...s.trans, waiting: true } } : null)), 1100);
    let data: Page | null = null, err: unknown = null;
    try {
      data = await this.pre[key].promise;
    } catch (x) {
      err = x;
    }
    clearTimeout(waitT);
    const el = Date.now() - t0;
    if (el < 950) await sleep(950 - el);
    const node: JourneyNode = {
      id: this.nid++, topic: f.topic, title: f.title, teaser: f.teaser, depth, via: kind, fromTitle: c.page?.title,
      prevLayout: c.page?.layout, status: data ? "ready" : "error", page: data, error: err ? errMsg(err) : null,
    };
    window.scrollTo(0, 0);
    this.setState((s) => ({ nodes: [...s.nodes, node], revealed: 1, forkOpen: false, hover: null, scrollP: 0, trans: s.trans && { ...s.trans, phase: "out", waiting: false } }));
    if (data) this.prefetch(node, [...path, node.topic]);
    setTimeout(() => this.setState({ trans: null }), 650);
  }
  openMap(finale: boolean) {
    this.setState({ board: finale ? "finale" : "journey" });
  }
  openDoorFromBoard(kind: Kind, el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    this.setState({ board: null });
    this.pick(kind, rect);
  }
  leaveShared() {
    history.replaceState(null, "", location.pathname + location.search);
    this.setState({ shared: null });
  }
  goHome() {
    window.scrollTo(0, 0);
    if (this.state.shared) this.leaveShared();
    this.setState({ screen: "landing", nodes: [], query: "", board: null, trans: null, revealed: 0, forkOpen: false, falling: false });
  }
  boardNodes(): BoardNode[] {
    const src = this.state.nodes;
    if (this.boardCache?.src === src) return this.boardCache.out;
    const out = src.map((n): BoardNode => ({
      topic: n.topic,
      title: n.page?.title || n.title || cap(n.topic),
      kicker: n.page?.kicker,
      dek: n.page?.dek,
      figure: n.page?.figure?.value ? n.page.figure : undefined,
      excerpt: n.page?.intro?.slice(0, 320),
      layout: n.page?.layout,
      via: n.via,
      forks: n.page?.forks,
      pending: n.status === "loading",
    }));
    this.boardCache = { src, out };
    return out;
  }

  // ─── Pieces ──────────────────────────────────────────────────────────────

  forkSvg(open: boolean, hv: Kind | null | undefined, t: Theme) {
    const mk = (d: string, key: string, delay: number, hl: boolean) => (
      <path
        key={key} d={d} fill="none" stroke={hl ? t.accent : t.ink} strokeOpacity={hl ? 1 : 0.55} strokeWidth={hl ? 2.5 : 1.5}
        pathLength={1} strokeDasharray={1} strokeDashoffset={open ? 0 : 1} vectorEffect="non-scaling-stroke"
        style={{ transition: `stroke-dashoffset 1.1s cubic-bezier(.6,0,.2,1) ${delay}s, stroke 300ms` }}
      />
    );
    return (
      <svg viewBox="0 0 1000 170" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 170 }}>
        {mk("M500 0 L500 60", "a", 0, false)}
        {mk("M500 60 C500 130 210 100 210 170", "d", 0.5, hv === "deeper")}
        {mk("M500 60 C500 130 790 100 790 170", "s", 0.5, hv === "sideways")}
        <circle cx={500} cy={60} r={4} fill={t.ink} style={{ opacity: open ? 1 : 0, transition: "opacity 300ms ease .45s" }} />
      </svg>
    );
  }
  streaks(ink: string) {
    const L = [];
    for (let i = 0; i < 16; i++) {
      const x = (i * 61 + 7) % 100, dur = 0.45 + ((i * 37) % 10) / 14, del = -((i * 13) % 10) / 10, ht = 18 + ((i * 29) % 40);
      L.push(
        <div key={i} style={{ position: "absolute", left: x + "%", top: 0, width: 1, height: ht + "vh", background: `linear-gradient(to bottom, transparent, ${ink}, transparent)`, opacity: 0.3, animation: `rh-streak ${dur}s linear ${del}s infinite` }} />,
      );
    }
    return <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>{L}</div>;
  }
  skeleton(t: Theme, short: boolean) {
    const bar = (w: string, k: number, ht = 16, mt = 14) => (
      <div key={k} style={{ height: ht, width: w, marginTop: mt, borderRadius: 3, background: t.soft, animation: `rh-pulse 1.6s ease-in-out ${(k % 7) * 0.12}s infinite` }} />
    );
    const bars = short
      ? [bar("70%", 0, 16, 28), bar("92%", 1), bar("86%", 2), bar("40%", 3)]
      : [bar("100%", 0, 160, 28), bar("92%", 1, 16, 40), bar("88%", 2), bar("95%", 3), bar("60%", 4), bar("34%", 5, 36, 56), bar("90%", 6), bar("84%", 7), bar("70%", 8)];
    return <div style={{ maxWidth: 820 }}>{bars}</div>;
  }
  renderBlock(b: Block, t: Theme) {
    switch (b.type) {
      case "figure":
        return (
          <div style={css`display:grid; grid-template-columns:auto minmax(0,1fr); gap:44px; align-items:end; margin:16px 0 56px; padding:48px 0; border-top:1px solid ${t.rule}; border-bottom:1px solid ${t.rule}`}>
            <div style={css`font-family:${SERIF}; font-size:clamp(120px,15vw,240px); line-height:.8; letter-spacing:-.03em; color:${t.accent}`}>{b.value}</div>
            <div style={css`max-width:440px; padding-bottom:14px; font-family:${NEWS}; font-size:26px; line-height:1.3; text-wrap:pretty`}>{b.label}</div>
          </div>
        );
      case "intro":
        return (
          <p style={css`margin:0 0 56px; font-family:${NEWS}; font-size:24px; line-height:1.55; text-wrap:pretty`}>
            <span style={css`float:left; padding:10px 14px 0 0; font-family:${SERIF}; font-size:122px; line-height:.76; color:${t.accent}`}>{b.cap}</span>
            {b.rest}
          </p>
        );
      case "section":
        return (
          <div style={css`padding:24px 0 36px`}>
            <h2 style={css`margin:0 0 22px; font-family:${SERIF}; font-weight:400; font-size:50px; line-height:1; letter-spacing:-.01em; text-wrap:balance`}>{b.heading}</h2>
            {b.paras.map((p, i) => (
              <p key={i} style={css`margin:0 0 20px; font-family:${NEWS}; font-size:20px; line-height:1.62; text-wrap:pretty`}>{p}</p>
            ))}
          </div>
        );
      case "quote":
        return (
          <figure style={css`margin:0; padding:64px 0 80px; display:grid; grid-template-columns:120px minmax(0,1fr); gap:24px`}>
            <div style={css`font-family:${SERIF}; font-size:220px; line-height:.72; color:${t.accent}`}>“</div>
            <div>
              <blockquote style={css`margin:0; font-family:${SERIF}; font-style:italic; font-size:clamp(40px,4.8vw,72px); line-height:1.04; letter-spacing:-.01em; text-wrap:balance`}>{b.text}</blockquote>
              <figcaption style={css`margin-top:26px; font-family:${MONO}; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:${t.muted}`}>— {b.cite}</figcaption>
            </div>
          </figure>
        );
      case "event": {
        const text = (right: boolean) => (
          <>
            <div style={css`font-family:${SERIF}; font-size:34px; line-height:1.05; text-wrap:balance`}>{b.title}</div>
            <p style={css`margin:${right ? "12px 0 0 auto" : "12px 0 0"}; max-width:460px; font-family:${NEWS}; font-size:18px; line-height:1.55; color:${t.muted}; text-wrap:pretty`}>{b.body}</p>
          </>
        );
        const year = <div style={css`font-family:${SERIF}; font-size:clamp(64px,7vw,112px); line-height:.84; color:${t.accent}`}>{b.year}</div>;
        return (
          <div style={css`display:grid; grid-template-columns:minmax(0,1fr) 80px minmax(0,1fr)`}>
            <div style={css`padding:34px 0; text-align:right`}>{b.flip ? text(true) : year}</div>
            <div style={css`position:relative; display:flex; justify-content:center`}>
              <div style={css`width:1px; height:100%; background:${t.muted}; opacity:.4`} />
              <div style={css`position:absolute; top:52px; width:13px; height:13px; border-radius:50%; background:${t.accent}; box-shadow:0 0 0 7px ${t.bg}`} />
            </div>
            <div style={css`padding:34px 0; text-align:left`}>{b.flip ? year : text(false)}</div>
          </div>
        );
      }
      case "versus": {
        const side = (label: string, c: Contender) => (
          <div>
            <div style={css`font-family:${MONO}; font-size:12px; letter-spacing:.16em; text-transform:uppercase; color:${t.muted}`}>{label}</div>
            <h3 style={css`margin:12px 0 10px; font-family:${SERIF}; font-weight:400; font-size:64px; line-height:.95; text-wrap:balance`}>{c.name}</h3>
            <div style={css`font-family:${SERIF}; font-style:italic; font-size:24px; color:${t.accent}`}>{c.tagline}</div>
            <p style={css`margin:18px 0 0; font-family:${NEWS}; font-size:19px; line-height:1.58; text-wrap:pretty`}>{c.body}</p>
          </div>
        );
        return (
          <div style={css`display:grid; grid-template-columns:minmax(0,1fr) 104px minmax(0,1fr); gap:36px; align-items:start; padding:32px 0 56px`}>
            {side("Contender A", b.a)}
            <div style={css`align-self:center; width:104px; height:104px; border-radius:50%; border:1px solid ${t.ink}; display:flex; align-items:center; justify-content:center; font-family:${SERIF}; font-style:italic; font-size:42px`}>vs</div>
            {side("Contender B", b.b)}
          </div>
        );
      }
      case "rows":
        return (
          <div style={css`margin-bottom:56px; border-top:1px solid ${t.ink}`}>
            {b.rows.map((r, i) => (
              <div key={i} style={css`display:grid; grid-template-columns:minmax(0,1fr) 240px minmax(0,1fr); align-items:baseline; padding:22px 0; border-bottom:1px solid ${t.rule}`}>
                <div style={css`text-align:right; font-family:${SERIF}; font-size:38px; line-height:1.05`}>{r.a}</div>
                <div style={css`text-align:center; font-family:${MONO}; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:${t.muted}`}>{r.label}</div>
                <div style={css`font-family:${SERIF}; font-size:38px; line-height:1.05`}>{r.b}</div>
              </div>
            ))}
          </div>
        );
      case "verdict":
        return (
          <div style={css`padding:16px 0 40px`}>
            <div style={css`font-family:${MONO}; font-size:12px; letter-spacing:.2em; text-transform:uppercase; color:${t.accent}`}>The verdict</div>
            <p style={css`margin:14px 0 0; font-family:${SERIF}; font-style:italic; font-size:34px; line-height:1.2; text-wrap:pretty`}>{b.text}</p>
          </div>
        );
      case "plate":
        return (
          <div style={css`padding:16px 0`}>
            <div style={css`min-height:${b.minH}; padding:36px; border-radius:6px; background:${b.tone}; display:flex; flex-direction:column; justify-content:space-between; gap:40px`}>
              <div style={css`display:flex; justify-content:space-between; font-family:${MONO}; font-size:12px; letter-spacing:.14em; text-transform:uppercase`}>
                <span>Plate {b.num}</span>
                <span>{b.year}</span>
              </div>
              <div>
                <div style={css`font-family:${MONO}; font-size:12px; letter-spacing:.16em; text-transform:uppercase; opacity:.75`}>{b.tag}</div>
                <h3 style={css`margin:12px 0 18px; font-family:${SERIF}; font-weight:400; font-size:${b.nameSize}; line-height:.95; letter-spacing:-.015em; text-wrap:balance`}>{b.name}</h3>
                <p style={css`margin:0; max-width:620px; font-family:${NEWS}; font-size:18px; line-height:1.5; text-wrap:pretty`}>{b.body}</p>
              </div>
            </div>
          </div>
        );
      case "closing":
        return (
          <p style={css`margin:0; padding:48px 0 140px; font-family:${NEWS}; font-size:22px; line-height:1.6; text-wrap:pretty`}>
            {b.text} <span style={css`color:${t.accent}`}>■</span>
          </p>
        );
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  render() {
    const s = this.state, nodes = s.nodes, c = nodes[nodes.length - 1];
    const depth = c ? c.depth : 0, t = pal(depth), tn = pal(depth + 1);
    const hops = this.hops(), page = c?.page;
    const tr0 = s.trans;
    const blockList = page ? blocks(page, depth) : [];
    const complete = c?.status === "ready";
    const showFork = !!(complete && page?.forks && s.revealed >= blockList.length);
    const sinkOn = this.props.sinkOnScroll ?? true;
    const p = s.scrollP;
    const mixPct = sinkOn ? Math.round(Math.pow(p, 1.5) * (t.dark === tn.dark ? 40 : 14)) : 0;
    const rootBg = s.screen === "journey" ? `color-mix(in oklch, ${t.bg} ${100 - mixPct}%, ${tn.bg})` : "oklch(0.965 0.012 85)";

    const rd = (k: Kind) => (c ? s.ready[c.id + ":" + k] : undefined);
    const rdTxt = (k: Kind) => (rd(k) === "ready" ? "● Ready" : rd(k) === "error" ? "○ Will write on entry" : "◌ Writing…");
    const open = s.forkOpen, hv = s.hover, chosen = tr0?.kind;
    const doorTf = (k: Kind, dir: number) => {
      if (!open) return `translate(${dir * 170}px, 60px) scale(.9)`;
      if (chosen) return chosen === k ? "scale(1.03)" : `translate(${-dir * 40}px, 20px) scale(.94)`;
      return hv === k ? "translateY(-14px) scale(1.015)" : "none";
    };
    const doorOp = (k: Kind) => (!open ? 0 : chosen ? (chosen === k ? 1 : 0.15) : hv && hv !== k ? 0.55 : 1);
    const doorSh = (k: Kind) => (hv === k ? "0 50px 90px -30px oklch(0 0 0 / 0.55)" : "0 24px 60px -34px oklch(0 0 0 / 0.45)");
    const fk = {
      d: page?.forks?.deeper, s: page?.forks?.sideways,
      dReadyC: rd("deeper") === "ready" ? "oklch(0.82 0.13 150)" : "oklch(0.78 0.03 290)",
      sReadyC: rd("sideways") === "ready" ? "oklch(0.36 0.1 150)" : "oklch(0.34 0.05 40)",
      orOp: open && !chosen ? 1 : 0,
    };

    let tr: { clip: string; bg: string; ink: string; muted: string; accent: string; op: number; pe: string; innerOp: number; innerTf: string; label: string; num: string; title: string; waiting: boolean } | null = null;
    if (tr0) {
      const r = tr0.rect, W = innerWidth, H = innerHeight, tp = pal(tr0.depth);
      const start = tr0.phase === "start";
      tr = {
        clip: start
          ? `inset(${r.top}px ${W - r.right}px ${H - r.bottom}px ${r.left}px round ${r.width / 2}px ${r.width / 2}px 18px 18px)`
          : "inset(0px 0px 0px 0px round 0px 0px 0px 0px)",
        bg: start ? DOOR[tr0.kind] : tp.bg, ink: tp.ink, muted: tp.muted, accent: tp.accent,
        op: tr0.phase === "out" ? 0 : 1, pe: tr0.phase === "out" ? "none" : "auto",
        innerOp: tr0.phase === "grow" ? 1 : 0,
        innerTf: start ? "translateY(60px) scale(.9)" : tr0.phase === "out" ? "translateY(-60px) scale(1.04)" : "none",
        label: `${tr0.kind === "deeper" ? "↓ Deeper" : "→ Sideways"} · falling to level`,
        num: pad(tr0.depth), title: tr0.title, waiting: !!tr0.waiting,
      };
    }
    const falling = !!tr0 && tr0.phase !== "out";

    const maxL = Math.max(hops, depth + 1);
    const ticks = [];
    for (let i = 0; i <= maxL; i++)
      ticks.push({ w: i === depth ? "34px" : i < depth ? "16px" : "8px", c: i === depth ? t.accent : i < depth ? t.muted : t.rule, label: pad(i), op: i === depth ? 1 : 0 });
    const crumbs = nodes.slice(-4).map((n, i, arr) => ({ label: n.topic, c: i === arr.length - 1 ? t.ink : t.muted, arrowOp: i === 0 && nodes.length <= 4 ? 0 : 1 }));

    const levelStr = pad(depth);
    const sinkOp = sinkOn ? Math.min(1, Math.pow(p, 1.4) * (t.dark === tn.dark ? 0.85 : 0.4)) : 0;

    const btnSoft = hover(t.soft);
    const btnClimb = hover(tn.ink, tn.bg);

    return (
      <div style={css`min-height:100vh; background:${rootBg}; color:${t.ink}; transition:background 900ms ease, color 900ms ease`}>
        {s.screen === "landing" && (
          <Landing
            query={s.query}
            onQuery={(query) => this.setState({ query })}
            onStart={(topic) => this.start(topic)}
            falling={s.falling}
            hops={hops}
            inputRef={this.inputRef}
          />
        )}

        {s.screen === "journey" && (
          <>
            <div style={css`position:fixed; top:0; left:0; right:0; z-index:30; height:64px; display:flex; align-items:center; gap:24px; padding:0 28px 0 32px; background:color-mix(in oklch, ${t.bg} 86%, transparent); backdrop-filter:blur(12px); border-bottom:1px solid ${t.rule}; transition:background 900ms ease`}>
              <button onClick={() => this.goHome()} style={css`flex:none; display:flex; align-items:center; gap:8px; border:0; background:transparent; padding:0; cursor:pointer; font-family:${SERIF}; font-size:23px; letter-spacing:-.01em; color:${t.ink}`}>
                <Spark style={css`width:18px; height:18px; color:${t.accent}`} />
                claudescape
              </button>
              <div style={css`flex:1; min-width:0; display:flex; justify-content:center; align-items:center; gap:10px; overflow:hidden; white-space:nowrap; font-family:${MONO}; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:${t.muted}`}>
                {crumbs.map((cr, i) => (
                  <span key={i} style={css`display:flex; gap:10px; color:${cr.c}; overflow:hidden; text-overflow:ellipsis`}>
                    <span style={css`opacity:${cr.arrowOp}`}>→</span>
                    {cr.label}
                  </span>
                ))}
              </div>
              <button
                onClick={() => this.openMap(false)}
                className={btnSoft.className}
                style={{ ...css`flex:none; display:flex; align-items:center; gap:10px; border:1px solid ${t.rule}; border-radius:999px; padding:9px 16px; background:transparent; color:${t.ink}; font-family:${MONO}; font-size:11px; letter-spacing:.14em; text-transform:uppercase; cursor:pointer`, ...btnSoft.vars }}
              >
                Board<span style={css`color:${t.accent}`}>L{levelStr}</span>
              </button>
            </div>

            <div style={css`position:fixed; left:30px; top:50%; transform:translateY(-50%); z-index:30; display:flex; flex-direction:column; gap:12px; font-family:${MONO}; font-size:11px; color:${t.muted}`}>
              {ticks.map((k) => (
                <div key={k.label} style={css`display:flex; align-items:center; gap:10px; height:10px`}>
                  <div style={css`height:2px; width:${k.w}; background:${k.c}; transition:width 700ms ease, background 700ms ease`} />
                  <span style={css`opacity:${k.op}; color:${t.ink}; letter-spacing:.1em; transition:opacity 500ms`}>{k.label}</span>
                </div>
              ))}
              <div style={css`margin-top:14px; writing-mode:vertical-rl; transform:rotate(180deg); letter-spacing:.22em; text-transform:uppercase`}>
                {depth === 0 ? "At the surface" : `${depth} level${depth > 1 ? "s" : ""} down`}
              </div>
            </div>

            <div style={css`position:fixed; left:0; right:0; bottom:0; height:60vh; z-index:0; pointer-events:none; background:linear-gradient(to top, ${tn.bg}, transparent); opacity:${sinkOp}`} />

            <div style={css`position:relative; z-index:1; transform-origin:50% 30vh; transform:${falling ? "scale(.9) translateY(-40px)" : "none"}; filter:${falling ? "blur(8px)" : "blur(0px)"}; opacity:${falling ? 0.35 : 1}; transition:transform 800ms cubic-bezier(.6,0,.2,1), filter 800ms ease, opacity 800ms ease`}>
              <header style={css`max-width:1280px; margin:0 auto; padding:160px 96px 48px; display:grid; grid-template-columns:repeat(12,minmax(0,1fr)); column-gap:32px`}>
                <div style={css`grid-column:1 / -1; display:flex; flex-wrap:wrap; gap:14px; padding-bottom:18px; border-bottom:1px solid ${t.ink}; font-family:${MONO}; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:${t.muted}`}>
                  <span style={css`color:${t.ink}`}>Level {levelStr}</span>
                  <span>·</span>
                  <span>{c?.via ? `${c.via === "deeper" ? "↓ Deeper" : "→ Sideways"} from “${c.fromTitle || ""}”` : "Where you started"}</span>
                  <span style={css`margin-left:auto`}>{page?.layout ? `Format · ${cap(page.layout)}` : "Format · choosing"}</span>
                </div>
                <div style={css`grid-column:1 / -1; margin-top:44px; font-family:${MONO}; font-size:12px; letter-spacing:.2em; text-transform:uppercase; color:${t.accent}; min-height:16px`}>{page?.kicker || ""}</div>
                <h1 style={css`grid-column:1 / span 11; margin:18px 0 0; font-family:${SERIF}; font-weight:400; font-size:clamp(60px,7.8vw,128px); line-height:.92; letter-spacing:-.022em; text-wrap:balance; opacity:${page ? 1 : 0.35}; transition:opacity 600ms ease`}>
                  {page?.title || (c ? c.title || cap(c.topic) : "")}
                </h1>
                {page?.dek && (
                  <p style={css`grid-column:1 / span 7; margin:36px 0 0; font-family:${NEWS}; font-size:27px; line-height:1.35; text-wrap:pretty; color:${t.ink}`}>{page.dek}</p>
                )}
              </header>

              <div style={css`max-width:1280px; margin:0 auto; padding:0 96px; display:grid; grid-template-columns:repeat(12,minmax(0,1fr)); column-gap:32px; row-gap:0`}>
                {blockList.map((b, i) => {
                  const shown = i < s.revealed;
                  return (
                    <div key={i} style={css`grid-column:${b.col}; opacity:${shown ? 1 : 0}; transform:${shown ? "none" : "translateY(36px)"}; transition:opacity 700ms ease, transform 900ms cubic-bezier(.2,.7,.2,1)`}>
                      {this.renderBlock(b, t)}
                    </div>
                  );
                })}
              </div>

              {c?.status === "loading" && (
                <div style={css`max-width:1280px; margin:0 auto; padding:0 96px 200px`}>
                  <div style={css`display:flex; align-items:center; gap:12px; font-family:${MONO}; font-size:12px; letter-spacing:.16em; text-transform:uppercase; color:${t.muted}`}>
                    <span style={css`color:${t.accent}`}>●</span>
                    {LOAD_MSGS[s.loadIdx % LOAD_MSGS.length] + "…"}
                  </div>
                  {this.skeleton(t, !!page)}
                </div>
              )}

              {c?.status === "error" && (
                <div style={css`max-width:1280px; margin:0 auto; padding:40px 96px 200px; display:flex; flex-direction:column; align-items:flex-start; gap:20px`}>
                  <p style={css`margin:0; font-family:${SERIF}; font-style:italic; font-size:40px`}>This page got lost on the way down.</p>
                  <p style={css`margin:0; font-family:${MONO}; font-size:12px; color:${t.muted}`}>{c.error || ""}</p>
                  <button onClick={() => this.retry()} style={css`border:1px solid ${t.ink}; border-radius:999px; padding:12px 22px; background:transparent; color:${t.ink}; font-family:${MONO}; font-size:12px; letter-spacing:.14em; text-transform:uppercase; cursor:pointer`}>Try again</button>
                </div>
              )}

              {showFork && (
                <section ref={this.forkRef} style={css`position:relative; min-height:100vh; padding:120px 64px 120px; background:linear-gradient(to bottom, ${t.bg} 0%, ${tn.bg} 78%)`}>
                  <div style={css`max-width:1000px; margin:0 auto; text-align:center`}>
                    <div style={css`font-family:${MONO}; font-size:12px; letter-spacing:.2em; text-transform:uppercase; color:${t.muted}`}>Bottom of level {levelStr}</div>
                    <h2 style={css`margin:18px 0 0; font-family:${SERIF}; font-weight:400; font-size:clamp(64px,7vw,116px); line-height:.92; letter-spacing:-.02em`}>The path splits.</h2>
                    <p style={css`margin:22px auto 0; max-width:520px; font-family:${NEWS}; font-size:21px; line-height:1.45; color:${t.muted}`}>Two doors lead further down, and both pages are already written. Pick one.</p>
                  </div>
                  <div style={css`max-width:1000px; margin:36px auto 0`}>{this.forkSvg(open, chosen || hv, t)}</div>
                  <div style={css`max-width:1000px; margin:0 auto; display:flex; justify-content:center`}>
                    <div
                      {...this.doorProps("deeper", fk.d?.title)}
                      style={css`position:relative; flex:none; width:420px; height:570px; border-radius:210px 210px 18px 18px; overflow:hidden; cursor:pointer; background:radial-gradient(ellipse 70% 55% at 50% 30%, oklch(0.07 0.02 285) 0%, oklch(0.16 0.035 290) 55%, oklch(0.23 0.05 305) 100%); color:oklch(0.95 0.015 70); box-shadow:${doorSh("deeper")}; transform:${doorTf("deeper", 1)}; opacity:${doorOp("deeper")}; transition:transform 900ms cubic-bezier(.2,.8,.2,1), opacity 700ms ease, box-shadow 400ms ease`}
                    >
                      <div style={css`position:absolute; inset:16px; border-radius:999px 999px 10px 10px; border:1px solid oklch(1 0 0 / 0.16)`} />
                      <div style={css`position:absolute; inset:50px 46px 130px 46px; border-radius:999px 999px 8px 8px; border:1px solid oklch(1 0 0 / 0.11)`} />
                      <div style={css`position:absolute; inset:88px 80px 250px 80px; border-radius:999px 999px 6px 6px; border:1px solid oklch(1 0 0 / 0.07)`} />
                      <div style={css`position:absolute; top:150px; left:0; right:0; text-align:center`}>
                        <div style={css`font-family:${MONO}; font-size:12px; letter-spacing:.24em; text-transform:uppercase`}>↓ Deeper</div>
                        <div style={css`margin-top:8px; font-family:${SERIF}; font-style:italic; font-size:22px; color:oklch(0.8 0.03 290)`}>Harder. Higher stakes.</div>
                      </div>
                      <div style={css`position:absolute; left:40px; right:40px; bottom:34px; display:flex; flex-direction:column; gap:14px`}>
                        <div style={css`font-family:${SERIF}; font-size:38px; line-height:1.02; text-wrap:balance`}>{fk.d?.title}</div>
                        <div style={css`font-family:${NEWS}; font-size:17px; line-height:1.4; color:oklch(0.82 0.03 290); text-wrap:pretty`}>{fk.d?.teaser}</div>
                        <div style={css`display:flex; justify-content:space-between; padding-top:14px; border-top:1px solid oklch(1 0 0 / 0.18); font-family:${MONO}; font-size:11px; letter-spacing:.14em; text-transform:uppercase`}>
                          <span>Open this door</span>
                          <span style={css`color:${fk.dReadyC}`}>{rdTxt("deeper")}</span>
                        </div>
                      </div>
                    </div>
                    <div style={css`flex:none; width:160px; display:flex; align-items:center; justify-content:center; font-family:${SERIF}; font-style:italic; font-size:30px; color:${t.muted}; opacity:${fk.orOp}; transition:opacity 800ms ease 400ms`}>or</div>
                    <div
                      {...this.doorProps("sideways", fk.s?.title)}
                      style={css`position:relative; flex:none; width:420px; height:570px; border-radius:210px 210px 18px 18px; overflow:hidden; cursor:pointer; background:radial-gradient(ellipse 80% 60% at 72% 28%, oklch(0.9 0.08 75) 0%, oklch(0.79 0.12 58) 58%, oklch(0.71 0.13 45) 100%); color:oklch(0.2 0.04 40); box-shadow:${doorSh("sideways")}; transform:${doorTf("sideways", -1)}; opacity:${doorOp("sideways")}; transition:transform 900ms cubic-bezier(.2,.8,.2,1), opacity 700ms ease, box-shadow 400ms ease`}
                    >
                      <div style={css`position:absolute; inset:16px; border-radius:999px 999px 10px 10px; border:1px solid oklch(0.2 0.04 40 / 0.22)`} />
                      <div style={css`position:absolute; inset:50px 16px 130px 90px; border-radius:999px 999px 8px 8px; border:1px solid oklch(0.2 0.04 40 / 0.16)`} />
                      <div style={css`position:absolute; inset:88px 16px 250px 170px; border-radius:999px 999px 6px 6px; border:1px solid oklch(0.2 0.04 40 / 0.11)`} />
                      <div style={css`position:absolute; top:150px; left:0; right:0; text-align:center`}>
                        <div style={css`font-family:${MONO}; font-size:12px; letter-spacing:.24em; text-transform:uppercase`}>→ Sideways</div>
                        <div style={css`margin-top:8px; font-family:${SERIF}; font-style:italic; font-size:22px; color:oklch(0.34 0.05 40)`}>Stranger. Off the map.</div>
                      </div>
                      <div style={css`position:absolute; left:40px; right:40px; bottom:34px; display:flex; flex-direction:column; gap:14px`}>
                        <div style={css`font-family:${SERIF}; font-size:38px; line-height:1.02; text-wrap:balance`}>{fk.s?.title}</div>
                        <div style={css`font-family:${NEWS}; font-size:17px; line-height:1.4; color:oklch(0.3 0.05 40); text-wrap:pretty`}>{fk.s?.teaser}</div>
                        <div style={css`display:flex; justify-content:space-between; padding-top:14px; border-top:1px solid oklch(0.2 0.04 40 / 0.22); font-family:${MONO}; font-size:11px; letter-spacing:.14em; text-transform:uppercase`}>
                          <span>Open this door</span>
                          <span style={css`color:${fk.sReadyC}`}>{rdTxt("sideways")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={css`margin-top:72px; display:flex; flex-direction:column; align-items:center; gap:18px; color:${tn.ink}`}>
                    {depth >= hops && (
                      <button
                        onClick={() => this.openMap(true)}
                        className={btnClimb.className}
                        style={{ ...css`border:1px solid ${tn.ink}; border-radius:999px; padding:16px 28px; background:transparent; color:${tn.ink}; font-family:${MONO}; font-size:12px; letter-spacing:.16em; text-transform:uppercase; cursor:pointer`, ...btnClimb.vars }}
                      >
                        Stop falling · see how far you drifted
                      </button>
                    )}
                    <button onClick={() => this.openMap(false)} style={css`border:0; background:transparent; padding:6px; color:${tn.muted}; font-family:${NEWS}; font-style:italic; font-size:18px; cursor:pointer; text-decoration:underline; text-underline-offset:4px`}>
                      or open the journey board
                    </button>
                  </div>
                </section>
              )}
            </div>
          </>
        )}

        {tr && (
          <div style={css`position:fixed; inset:0; z-index:50; display:flex; align-items:center; justify-content:center; background:${tr.bg}; color:${tr.ink}; clip-path:${tr.clip}; opacity:${tr.op}; pointer-events:${tr.pe}; transition:clip-path 780ms cubic-bezier(.76,0,.24,1), background 780ms ease, opacity 600ms ease`}>
            {this.streaks(tr.ink)}
            <div style={css`position:relative; max-width:960px; padding:0 48px; text-align:center; opacity:${tr.innerOp}; transform:${tr.innerTf}; transition:opacity 500ms ease, transform 800ms cubic-bezier(.2,.8,.2,1)`}>
              <div style={css`font-family:${MONO}; font-size:12px; letter-spacing:.24em; text-transform:uppercase; color:${tr.muted}`}>{tr.label}</div>
              <div style={css`margin:10px 0 4px; font-family:${SERIF}; font-size:220px; line-height:.9; letter-spacing:-.03em; color:${tr.accent}`}>{tr.num}</div>
              <div style={css`font-family:${SERIF}; font-size:56px; line-height:1; text-wrap:balance`}>{tr.title}</div>
              {tr.waiting && (
                <div style={css`margin-top:28px; font-family:${MONO}; font-size:12px; letter-spacing:.16em; text-transform:uppercase; color:${tr.muted}`}>Still writing the walls of this one…</div>
              )}
            </div>
          </div>
        )}

        {s.board && s.screen === "journey" && (
          <Board
            nodes={this.boardNodes()}
            mode={s.board}
            onClose={() => this.setState({ board: null })}
            onNewHole={() => this.goHome()}
            onOpenDoor={(kind, el) => this.openDoorFromBoard(kind, el)}
          />
        )}

        {s.shared && (
          <Board
            nodes={s.shared}
            mode="shared"
            onNewHole={() => this.leaveShared()}
            onStartAt={(topic) => {
              this.leaveShared();
              this.start(topic);
            }}
          />
        )}
      </div>
    );
  }
}
