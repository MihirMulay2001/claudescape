export type Kind = "deeper" | "sideways";
export type Layout = "story" | "timeline" | "comparison" | "gallery";

export interface Fork {
  topic: string;
  title: string;
  teaser: string;
}
export interface Contender {
  name: string;
  tagline: string;
  body: string;
}
export interface Page {
  layout: Layout;
  kicker?: string;
  title?: string;
  dek?: string;
  figure?: { value: string; label: string };
  intro?: string;
  story?: {
    sections?: { heading: string; body: string | string[] }[];
    quote?: { text: string; cite: string };
  };
  timeline?: { events?: { year: string; title: string; body: string }[] };
  comparison?: {
    a?: Contender;
    b?: Contender;
    rows?: { label: string; a: string; b: string }[];
    verdict?: string;
  };
  gallery?: { items?: { name: string; year: string; tag: string; body: string }[] };
  closing?: string;
  forks?: Partial<Record<Kind, Fork>>;
  /** Web sources the page was grounded in (added client-side, not written by the model). */
  sources?: Source[];
}

export interface Source {
  title: string;
  url: string;
}
export interface Research {
  notes: string;
  sources: Source[];
}

export interface Theme {
  bg: string;
  ink: string;
  muted: string;
  rule: string;
  accent: string;
  soft: string;
  dark: boolean;
}

export const PAL: Theme[] = [
  { bg: "oklch(0.965 0.012 85)", ink: "oklch(0.2 0.02 60)", muted: "oklch(0.45 0.02 60)", rule: "oklch(0.2 0.02 60 / 0.14)", accent: "oklch(0.55 0.15 38)", soft: "oklch(0.925 0.018 80)", dark: false },
  { bg: "oklch(0.885 0.032 70)", ink: "oklch(0.2 0.03 50)", muted: "oklch(0.4 0.035 50)", rule: "oklch(0.2 0.03 50 / 0.16)", accent: "oklch(0.5 0.15 36)", soft: "oklch(0.845 0.04 68)", dark: false },
  { bg: "oklch(0.3 0.05 36)", ink: "oklch(0.95 0.02 75)", muted: "oklch(0.8 0.035 60)", rule: "oklch(0.95 0.02 75 / 0.16)", accent: "oklch(0.8 0.12 58)", soft: "oklch(0.35 0.055 36)", dark: true },
  { bg: "oklch(0.23 0.045 340)", ink: "oklch(0.94 0.02 50)", muted: "oklch(0.78 0.035 340)", rule: "oklch(0.94 0.02 50 / 0.15)", accent: "oklch(0.8 0.12 58)", soft: "oklch(0.28 0.05 340)", dark: true },
  { bg: "oklch(0.18 0.04 285)", ink: "oklch(0.93 0.015 280)", muted: "oklch(0.76 0.035 285)", rule: "oklch(0.93 0.015 280 / 0.15)", accent: "oklch(0.8 0.12 58)", soft: "oklch(0.225 0.045 285)", dark: true },
  { bg: "oklch(0.14 0.03 262)", ink: "oklch(0.93 0.012 262)", muted: "oklch(0.74 0.03 262)", rule: "oklch(0.93 0.012 262 / 0.14)", accent: "oklch(0.8 0.12 58)", soft: "oklch(0.185 0.035 262)", dark: true },
  { bg: "oklch(0.105 0.02 250)", ink: "oklch(0.92 0.01 250)", muted: "oklch(0.72 0.025 250)", rule: "oklch(0.92 0.01 250 / 0.14)", accent: "oklch(0.8 0.12 58)", soft: "oklch(0.15 0.025 250)", dark: true },
];
export const pal = (d: number) => PAL[Math.max(0, Math.min(d, PAL.length - 1))];

export const HUES = [30, 75, 140, 200, 262, 320];
export const DOOR: Record<Kind, string> = { deeper: "oklch(0.16 0.035 290)", sideways: "oklch(0.79 0.12 58)" };
export const LOAD_MSGS = ["Pulling files from the archive", "Finding the strange parts", "Checking the dates", "Setting the type", "Building two doors"];
export type Glyph = "car" | "jelly" | "lattice" | "slab" | "moon" | "record" | "army" | "crater" | "columns";
export interface Example {
  /** What gets searched when the card is picked. */
  topic: string;
  tag: string;
  figure: string;
  title: string;
  hue: number;
  glyph: Glyph;
}
export const EXAMPLES: Example[] = [
  { topic: "sports cars", tag: "Machine · Speed", figure: "V12", title: "Sports cars", hue: 28, glyph: "car" },
  { topic: "deep-sea gigantism", tag: "Ocean · Biology", figure: "11km", title: "Deep-sea gigantism", hue: 215, glyph: "jelly" },
  { topic: "the history of salt", tag: "Food · Trade", figure: "NaCl", title: "The history of salt", hue: 105, glyph: "lattice" },
  { topic: "brutalist libraries", tag: "Concrete · Books", figure: "Béton", title: "Brutalist libraries", hue: 60, glyph: "slab" },
  { topic: "lucid dreaming", tag: "Mind · Sleep", figure: "REM", title: "Lucid dreaming", hue: 295, glyph: "moon" },
  { topic: "the Voyager Golden Record", tag: "Space · Sound", figure: "1977", title: "The Voyager Golden Record", hue: 80, glyph: "record" },
  { topic: "the Terracotta Army", tag: "Empire · Clay", figure: "8,000", title: "The Terracotta Army", hue: 35, glyph: "army" },
  { topic: "the Apollo 11 landing", tag: "Space · History", figure: "1969", title: "The Apollo 11 landing", hue: 255, glyph: "crater" },
  { topic: "the Library of Alexandria", tag: "Ancient · Knowledge", figure: "~300 BC", title: "The Library of Alexandria", hue: 350, glyph: "columns" },
];

export const pad = (n: number) => String(n).padStart(2, "0");
export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const alpha = (c: string, a: number) => c.replace(")", ` / ${a})`);

export const SHAPES: Record<Layout, string> = {
  story: `"story": {"sections": [exactly 3 items: {"heading": "max 6 words", "body": ["paragraph, 60-90 words", "paragraph, 60-90 words"]}], "quote": {"text": "a memorable real quote or striking line, max 26 words", "cite": "who / source"}}`,
  timeline: `"timeline": {"events": [exactly 6 items in chronological order: {"year": "e.g. 1966", "title": "max 8 words", "body": "30-45 words"}]}`,
  comparison: `"comparison": {"a": {"name": "max 4 words", "tagline": "max 10 words", "body": "50-70 words"}, "b": {same shape as a}, "rows": [exactly 5 items: {"label": "max 4 words", "a": "short value, max 12 characters", "b": "short value, max 12 characters"}], "verdict": "40-60 words"}`,
  gallery: `"gallery": {"items": [exactly 6 items: {"name": "max 5 words", "year": "year or era", "tag": "2-3 words", "body": "30-45 words"}]}`,
};
export const LAYOUTS = Object.keys(SHAPES) as Layout[];

export const HEAD = `"layout": "story" | "timeline" | "comparison" | "gallery",
"kicker": "2-4 word section label, e.g. Speed · Engineering",
"title": "hooky headline, max 9 words",
"dek": "standfirst, max 32 words",
"figure": {"value": "one striking number or very short term, max 7 characters", "label": "what the figure means, max 14 words"},
"intro": "opening paragraph, 70-100 words, opening on a scene or a surprising fact"`;

export const TAIL = `"closing": "final paragraph, 40-60 words, leaving a thread dangling",
"forks": {"deeper": {"topic": "2-5 word lowercase noun phrase", "title": "hooky, specific door title, max 10 words", "teaser": "one line, max 18 words"}, "sideways": {same shape}}`;

export const FORK_RULES = `Forks are two doors at the bottom of the page. "deeper" goes into the more intense, extreme, high-stakes or technical side of THIS page (e.g. sports cars → "Inside the 5G forces of an F1 race"). "sideways" is a weird, delightful, surprising tangent linked by one unexpected thread (e.g. sports cars → "The whimsical car designs that never made it"). Both must be specific and irresistible, and must not revisit any topic already in the journey.`;

export const layoutRule = (prev?: string) =>
  `Choose the layout that best suits the content: story (a narrative, a person, an event), timeline (history, evolution), comparison (two rivals, eras or approaches), gallery (visual subjects: designs, creatures, objects, places).${prev ? ` Avoid "${prev}" (the previous page's layout) unless nothing else fits.` : ""}`;

export function parseJSON(t: string): Page {
  t = String(t || "").replace(/```json|```/g, "");
  const a = t.indexOf("{"),
    b = t.lastIndexOf("}");
  if (a < 0 || b < 0) throw new Error("The model did not return a page.");
  return JSON.parse(t.slice(a, b + 1));
}

/** Calls the server route (replaces the design preview's window.claude.complete). */
export async function ask(prompt: string, maxTokens: number): Promise<Page> {
  let last: unknown;
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch("/api/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, maxTokens }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`);
      return parseJSON(data.text);
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

const NO_RESEARCH: Research = { notes: "", sources: [] };

/**
 * Looks up real sources for a topic via /api/research (Anakin). "fast" is web search only (~1s);
 * "deep" also scrapes the Wikipedia article (~8-10s). Never throws and never exceeds `budgetMs`:
 * a slow or failed lookup resolves to `fallback()` (default: no notes) so pages are never blocked on it.
 * `context` (e.g. a door title) disambiguates short topics in the search.
 */
export function research(
  topic: string, context: string | undefined, mode: "fast" | "deep", budgetMs: number, fallback?: () => Promise<Research>,
): Promise<Research> {
  let done = false;
  const call = fetch("/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, context, mode }),
  })
    .then((r) => (r.ok ? r.json() : NO_RESEARCH))
    .catch(() => NO_RESEARCH)
    .finally(() => (done = true)) as Promise<Research>;
  return Promise.race([call, sleep(budgetMs).then(() => (!done && fallback ? fallback() : NO_RESEARCH))]);
}

/** Prompt block asking the model to ground the page in the research notes. Empty when there are none. */
export const grounding = (r: Research) =>
  r.notes
    ? `\nSOURCE NOTES (real web research on this topic):\n"""\n${r.notes}\n"""\nGround the page in these notes: prefer their names, places, dates and numbers, and never contradict them. Do not invent statistics or quotes: a quote must appear in the notes or be well documented. You may add well-known facts the notes omit. Never mention "the notes", "sources" or research in the page itself.\n`
    : "";
