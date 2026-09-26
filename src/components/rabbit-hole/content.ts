export type Kind = "deeper" | "sideways";
export type Layout = "story" | "timeline" | "comparison" | "gallery";

export interface Fork {
  topic: string;
  title: string;
  teaser: string;
}
/** A trapdoor hidden in the page text: tapping `term` opens a card that falls into `topic`. */
export interface Thread extends Fork {
  term: string;
}
/** How the reader reached a page: through one of the two doors, or through a trapdoor in the text. */
export type Via = Kind | "thread";
export const VIA: Record<Via, string> = { deeper: "↓ Deeper", sideways: "→ Sideways", thread: "↘ Trapdoor" };
/** An interactive toy placed in the page. */
export type Demo =
  | {
      /** "What happens if…": a dial the reader turns through escalating stops. */
      kind: "slider";
      title: string;
      control: string;
      readout: string;
      stops: { at: string; value: string; caption: string }[];
    }
  | {
      /** Guess a surprising number on a slider, then see how far off you were. */
      kind: "guess";
      question: string;
      unit: string;
      min: number;
      max: number;
      answer: number;
      log: boolean;
      reveal: string;
    };
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
  threads?: Thread[];
  demo?: Demo;
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
export const DOOR: Record<Via, string> = { deeper: "oklch(0.16 0.035 290)", sideways: "oklch(0.79 0.12 58)", thread: "oklch(0.55 0.15 38)" };
export const LOAD_MSGS = ["Pulling files from the archive", "Finding the strange parts", "Checking the dates", "Setting the type", "Building two doors"];
export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
export type Glyph =
  | "car" | "jelly" | "lattice" | "slab" | "moon" | "record" | "army" | "crater" | "columns"
  | "wave" | "gear" | "leaf" | "star" | "book" | "eye" | "flask" | "globe" | "note" | "mask" | "bone" | "coin" | "bolt" | "bug" | "bird";
export interface Example {
  /** What gets searched when the card is picked. */
  topic: string;
  tag: string;
  figure: string;
  title: string;
  hue: number;
  glyph: Glyph;
}
const ex = (topic: string, tag: string, figure: string, hue: number, glyph: Glyph): Example => ({ topic, tag, figure, title: cap(topic), hue, glyph });
export const EXAMPLES: Example[] = [
  ex("sports cars", "Machine · Speed", "V12", 28, "car"),
  ex("deep-sea gigantism", "Ocean · Biology", "11km", 215, "jelly"),
  ex("the history of salt", "Food · Trade", "NaCl", 105, "lattice"),
  ex("brutalist libraries", "Concrete · Books", "Béton", 60, "slab"),
  ex("lucid dreaming", "Mind · Sleep", "REM", 295, "moon"),
  ex("the Voyager Golden Record", "Space · Sound", "1977", 80, "record"),
  ex("the Terracotta Army", "Empire · Clay", "8,000", 35, "army"),
  ex("the Apollo 11 landing", "Space · History", "1969", 255, "crater"),
  ex("the Library of Alexandria", "Ancient · Knowledge", "~300 BC", 350, "columns"),
  ex("tardigrades", "Life · Extremes", "0.5mm", 150, "bug"),
  ex("the Antikythera mechanism", "Greek · Gears", "~100 BC", 45, "gear"),
  ex("bioluminescence", "Ocean · Light", "76%", 190, "jelly"),
  ex("the Tunguska event", "Space · Impact", "1908", 20, "crater"),
  ex("octopus intelligence", "Ocean · Mind", "500M", 330, "jelly"),
  ex("the Dancing Plague of 1518", "Plague · Dance", "1518", 10, "mask"),
  ex("black holes", "Space · Gravity", "Sgr A*", 270, "star"),
  ex("the Voynich manuscript", "Books · Cipher", "240pp", 70, "book"),
  ex("mycelium networks", "Fungi · Networks", "Hyphae", 95, "leaf"),
  ex("the Great Emu War", "History · Absurd", "1932", 40, "bird"),
  ex("the Mariana Trench", "Ocean · Depth", "10,935m", 225, "wave"),
  ex("the Silk Road", "Trade · Routes", "6,400km", 50, "globe"),
  ex("Nikola Tesla", "Genius · Power", "AC", 200, "bolt"),
  ex("ball lightning", "Storm · Mystery", "Plasma", 240, "bolt"),
  ex("the Dead Sea Scrolls", "Ancient · Text", "1947", 55, "book"),
  ex("the Rosetta Stone", "Language · Code", "196 BC", 30, "columns"),
  ex("Pompeii", "Rome · Volcano", "AD 79", 15, "columns"),
  ex("synesthesia", "Mind · Senses", "4%", 310, "eye"),
  ex("the placebo effect", "Medicine · Mind", "0 mg", 180, "flask"),
  ex("Stradivarius violins", "Music · Craft", "1700s", 35, "note"),
  ex("the Wow! signal", "Space · Signal", "72s", 260, "record"),
  ex("the Great Pyramid of Giza", "Egypt · Stone", "146m", 75, "slab"),
  ex("honeybee dances", "Bees · Language", "Waggle", 85, "bug"),
  ex("the Bermuda Triangle", "Ocean · Myth", "△", 200, "wave"),
  ex("quantum entanglement", "Physics · Spooky", "EPR", 280, "bolt"),
  ex("the sinking of the Titanic", "Ocean · Disaster", "1912", 210, "wave"),
  ex("the cave paintings of Lascaux", "Art · Prehistory", "17k yrs", 30, "mask"),
  ex("Venetian glassmaking", "Craft · Fire", "Murano", 175, "flask"),
  ex("the Fibonacci sequence", "Math · Nature", "1,1,2,3", 120, "leaf"),
  ex("the Manhattan Project", "War · Physics", "1945", 20, "bolt"),
  ex("carnivorous plants", "Plants · Hunt", "0.1s", 135, "leaf"),
  ex("the Kowloon Walled City", "City · Density", "33,000", 45, "slab"),
  ex("the Oort cloud", "Space · Edge", "~1 ly", 230, "star"),
  ex("the Black Death", "Plague · Europe", "1347", 0, "bug"),
  ex("the Gutenberg printing press", "Books · Machine", "1440", 50, "book"),
  ex("the Hindenburg disaster", "Airship · Fire", "1937", 25, "gear"),
  ex("Victorian mourning jewelry", "Grief · Craft", "Jet", 320, "mask"),
  ex("the Moai of Easter Island", "Pacific · Stone", "887", 20, "army"),
  ex("axolotls", "Axolotl · Regrow", "Ajolote", 350, "bug"),
  ex("the Bayeux Tapestry", "Art · Conquest", "70m", 40, "book"),
  ex("the Svalbard Global Seed Vault", "Seeds · Arctic", "−18°C", 200, "leaf"),
  ex("the Cuban Missile Crisis", "Cold War · Brink", "13 days", 5, "globe"),
  ex("mirror neurons", "Brain · Empathy", "1992", 300, "eye"),
  ex("origami in space engineering", "Math · Folding", "Miura", 180, "lattice"),
  ex("the Hanging Gardens of Babylon", "Wonder · Myth", "Lost", 100, "leaf"),
  ex("Viking longships", "Norse · Sea", "793", 215, "wave"),
  ex("the Eiffel Tower", "Iron · Paris", "1889", 30, "lattice"),
  ex("the Enigma machine", "War · Cipher", "Rotor", 60, "gear"),
  ex("the Great Stink of 1858", "London · Sewers", "1858", 90, "wave"),
  ex("bird migration", "Birds · Compass", "Tern", 190, "bird"),
  ex("the Chernobyl exclusion zone", "Nuclear · Wild", "1986", 110, "leaf"),
  ex("medieval alchemy", "Gold · Magic", "Au", 65, "flask"),
  ex("the Nazca Lines", "Desert · Mystery", "~500 BC", 40, "globe"),
  ex("the Great Molasses Flood", "Boston · Flood", "1919", 30, "wave"),
  ex("sourdough fermentation", "Food · Microbes", "Levain", 70, "flask"),
  ex("the Doomsday Clock", "Nuclear · Alarm", "1947", 0, "gear"),
  ex("whale song", "Ocean · Sound", "52Hz", 210, "note"),
  ex("tulip mania", "Money · Bubble", "1637", 340, "coin"),
  ex("lost cities of the Amazon", "Jungle · Ruins", "LiDAR", 130, "leaf"),
  ex("the invention of zero", "Math · Nothing", "0", 55, "coin"),
  ex("the Kármán line", "Space · Border", "100km", 250, "star"),
  ex("Japanese wood joinery", "Wood · Craft", "Kigumi", 45, "lattice"),
  ex("phantom limbs", "Brain · Body", "Mirror", 290, "eye"),
  ex("the Mary Celeste", "Sea · Mystery", "1872", 190, "wave"),
  ex("the Sistine Chapel ceiling", "Art · Fresco", "1512", 25, "columns"),
  ex("Dyson spheres", "Space · Futures", "Type II", 45, "star"),
  ex("the Great Fire of London", "London · Fire", "1666", 20, "slab"),
  ex("homing pigeons in war", "Birds · War", "WWI", 210, "bird"),
  ex("the dodo", "Island · Extinct", "1662", 100, "bird"),
  ex("the Fermi paradox", "Space · Silence", "1950", 265, "star"),
  ex("the Shroud of Turin", "Relic · Mystery", "1988", 40, "book"),
  ex("periodical cicadas", "Insects · Cycles", "17 yrs", 80, "bug"),
  ex("the Hope Diamond", "Gem · Curse", "45.52ct", 225, "coin"),
  ex("Roman concrete", "Rome · Material", "CaO", 40, "slab"),
  ex("the northern lights", "Sky · Plasma", "Aurora", 160, "wave"),
  ex("the Burgess Shale", "Fossils · Weird", "508 Ma", 60, "bone"),
  ex("Tyrannosaurus rex", "Dinosaurs · Bite", "66 Ma", 20, "bone"),
  ex("the Hubble Deep Field", "Space · Deep", "1995", 240, "star"),
  ex("the Great Wall of China", "Empire · Stone", "21,196", 30, "slab"),
  ex("the Rubik's Cube", "Puzzle · Math", "20", 0, "lattice"),
  ex("invisible ink and spycraft", "Spies · Secrets", "Culper", 60, "eye"),
  ex("sea shanties", "Sea · Song", "Heave", 205, "note"),
  ex("the Harlem Renaissance", "Jazz · Poetry", "1920s", 35, "note"),
  ex("Ötzi the Iceman", "Alps · Mummy", "5,300yr", 190, "bone"),
  ex("the first computer bug", "Code · Legend", "1947", 140, "bug"),
  ex("ant supercolonies", "Insects · Empire", "6,000km", 25, "bug"),
  ex("perfume making", "Scent · Craft", "Attar", 330, "flask"),
  ex("the Kola Superdeep Borehole", "Earth · Depth", "12,262m", 15, "crater"),
  ex("the Lost Colony of Roanoke", "Colony · Mystery", "1590", 90, "globe"),
  ex("Stonehenge", "Stone · Solstice", "Sarsen", 200, "columns"),
  ex("time crystals", "Physics · Time", "2017", 275, "lattice"),
];

export const pad = (n: number) => String(n).padStart(2, "0");
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
"forks": {"deeper": {"topic": "2-5 word lowercase noun phrase", "title": "hooky, specific door title, max 10 words", "teaser": "one line, max 18 words"}, "sideways": {same shape}},
"threads": [exactly 4 items: {"term": "1-4 words copied EXACTLY, same spelling, from this page's paragraphs (not the title, headings or figure)", "topic": "2-5 word lowercase noun phrase", "title": "hooky page title, max 9 words", "teaser": "one line, max 16 words"}]`;

export const FORK_RULES = `Forks are two doors at the bottom of the page. "deeper" goes into the more intense, extreme, high-stakes or technical side of THIS page (e.g. sports cars → "Inside the 5G forces of an F1 race"). "sideways" is a weird, delightful, surprising tangent linked by one unexpected thread (e.g. sports cars → "The whimsical car designs that never made it"). Both must be specific and irresistible, and must not revisit any topic already in the journey.
Threads are trapdoors hidden in the text: the most intriguing names, phenomena, objects or places the page mentions in passing, each worth a page of its own. Spread them across the page, and make each topic distinct from the forks, from each other and from the journey so far.`;

const DEMO_SHAPES: Record<Demo["kind"], string> = {
  slider: `{"kind": "slider", "title": "a 'What happens if…' question, max 10 words", "control": "what the reader turns up, max 5 words", "readout": "what the big number measures, max 6 words", "stops": [5-7 items, from mildest to most extreme: {"at": "the setting, shown on the slider track, max 10 characters", "value": "the big readout at that setting: a number with a short unit, max 8 characters", "caption": "what is happening at this setting, vivid and concrete, 18-30 words"}]}`,
  guess: `{"kind": "guess", "question": "a question whose answer is one surprising number, max 16 words", "unit": "unit shown after the number, max 14 characters, may be empty", "min": number, "max": number, "answer": number, "log": true when max is 1000+ times min, "reveal": "why the answer is what it is, 30-45 words"}`,
};
const DEMO_RULE: Record<Demo["kind"], string> = {
  slider: `a dial the reader turns to watch something escalate. Each stop's value is a real figure or a sound estimate, and the last stop is jaw-dropping.`,
  guess: `the reader guesses one number, then sees the real one. Choose the number about this page's subject that people misjudge most wildly (a count, size, duration, speed, age or percentage). min and max are plain numbers bracketing the answer, with the answer well away from the middle of the range; min is above 0 when log is true.`,
};

/** Picks the demo kind in code so pages alternate: random on the first page, then the other kind from the previous page. */
export const demoKind = (prev?: string): Demo["kind"] => (prev === "slider" ? "guess" : prev === "guess" ? "slider" : Math.random() < 0.5 ? "slider" : "guess");
export const demoSchema = (kind: Demo["kind"]) => `"demo": ${DEMO_SHAPES[kind]}`;
export const demoRule = (kind: Demo["kind"]) =>
  `The demo is an interactive toy placed in the middle of the page, the moment readers remember: ${DEMO_RULE[kind]} Never contradict the page, and do not invent statistics.`;

export const layoutRule = (prev?: string) =>
  `Choose the layout that best suits the content: story (a narrative, a person, an event), timeline (history, evolution), comparison (two rivals, eras or approaches), gallery (visual subjects: designs, creatures, objects, places).${prev ? ` Avoid "${prev}" (the previous page's layout) unless nothing else fits.` : ""}`;

const num = (v: unknown) => (typeof v === "number" ? v : Number(String(v ?? "").replace(/[,\s]/g, "")));
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Checks a model-written demo and normalises it; anything unusable becomes undefined so the page simply has no demo. */
export function checkDemo(d: unknown): Demo | undefined {
  let o = (d || {}) as Record<string, unknown>;
  // The model sometimes nests the demo one level down ({"demo": …} or {"page": {"demo": …}}).
  for (let i = 0; i < 2 && !o.kind; i++) o = ((o.demo || (o.page as Record<string, unknown>)?.demo || {}) as Record<string, unknown>);
  if (o.kind === "slider") {
    const stops = (Array.isArray(o.stops) ? o.stops : [])
      .map((x: Record<string, unknown>) => ({ at: str(x?.at), value: str(x?.value), caption: str(x?.caption) }))
      .filter((x) => x.at && x.value && x.caption);
    if (!str(o.title) || stops.length < 3) return undefined;
    return { kind: "slider", title: str(o.title), control: str(o.control), readout: str(o.readout), stops: stops.slice(0, 8) };
  }
  if (o.kind === "guess") {
    let min = num(o.min), max = num(o.max);
    const answer = num(o.answer);
    if (![min, max, answer].every(Number.isFinite) || !str(o.question) || !str(o.reveal) || max <= min) return undefined;
    let log = o.log === true || o.log === "true";
    if (log && min <= 0) log = false;
    // Keep the answer on the track, off its very ends.
    if (answer <= min) min = log ? answer / 10 : answer - (max - min) * 0.2;
    if (answer >= max) max = log ? answer * 10 : answer + (max - min) * 0.2;
    return { kind: "guess", question: str(o.question), unit: str(o.unit), min, max, answer, log, reveal: str(o.reveal) };
  }
  return undefined;
}

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
