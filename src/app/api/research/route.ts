// Grounds pages in real sources via Anakin (https://anakin.io/docs/api-reference).
//   mode "fast": web search only (~1s) — used while the reader is waiting.
//   mode "deep": search + scrape of the topic's Wikipedia article (~8-10s) — used for background prefetches.
// Research is best-effort: on any failure or timeout it returns whatever it has (possibly nothing),
// and the page is written from the model's own knowledge as before.

const BASE = "https://api.anakin.io/v1";
const SEARCH_TIMEOUT_MS = 4_000;
const SCRAPE_TIMEOUT_MS = 14_000;
const SNIPPET_CHARS = 900;
const ARTICLE_CHARS = 7_000;
const CACHE_TTL_MS = 60 * 60 * 1000;

export interface Source {
  title: string;
  url: string;
}
interface Research {
  notes: string;
  sources: Source[];
}
interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

// In-memory cache of in-flight/settled promises, so a page and its prefetch share one Anakin call.
const cache = new Map<string, { at: number; promise: Promise<unknown> }>();
function cached<T>(key: string, make: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.promise as Promise<T>;
  const promise = make();
  cache.set(key, { at: Date.now(), promise });
  promise.catch(() => cache.delete(key));
  return promise;
}

async function anakin<T>(path: string, body: object, timeoutMs: number): Promise<T> {
  const key = process.env.ANAKIN_API_KEY;
  if (!key) throw new Error("ANAKIN_API_KEY is not set.");
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "X-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Anakin ${path} failed (${res.status}).`);
  return res.json();
}

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

function search(topic: string): Promise<SearchResult[]> {
  return cached("search:" + topic, async () => {
    const data = await anakin<{ results?: SearchResult[] }>("/search", { prompt: topic, limit: 6 }, SEARCH_TIMEOUT_MS);
    return (data.results || []).filter((r) => r.url && r.snippet);
  });
}

/** Strips Wikipedia chrome, citations and link targets from Anakin's markdown, keeping the article prose. */
function cleanWikipedia(md: string): string {
  const start = md.indexOf("From Wikipedia, the free encyclopedia");
  let body = start >= 0 ? md.slice(start + 37) : md;
  const end = body.search(/\n#{2,3} (See also|References|Notes|Gallery|External links|Further reading|Bibliography)\b/);
  if (end >= 0) body = body.slice(0, end);
  // Link targets may contain one level of parentheses, e.g. (url "Salting (food)").
  const target = String.raw`\((?:[^()]|\([^)]*\))*\)`;
  return body
    .replace(new RegExp(String.raw`!\[[^\]]*\]` + target, "g"), "") // images
    .replace(new RegExp(String.raw`\[\\\[[^\]]*\\\]\]` + target, "g"), "") // [\[1\]](...) citations
    .replace(new RegExp(String.raw`\\\[\[edit\]` + target + String.raw`\\\]`, "g"), "") // \[[edit](...)\] markers
    .replace(new RegExp(String.raw`\[([^\]]*)\]` + target, "g"), "$1") // links → text
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function wikipedia(url: string): Promise<string> {
  return cached("wiki:" + url, async () => {
    const data = await anakin<{ status?: string; markdown?: string }>("/url-scraper/scrape", { url }, SCRAPE_TIMEOUT_MS);
    if (data.status !== "completed" || !data.markdown) throw new Error("Scrape did not complete in time.");
    return cleanWikipedia(data.markdown).slice(0, ARTICLE_CHARS);
  });
}

// Real articles only: skips Category:, List of…, File:, Special: and other non-article pages.
const WIKI_ARTICLE = /^https:\/\/en\.wikipedia\.org\/wiki\/(?!List_of|Lists_of)[^:#?]+$/;

/** The best Wikipedia article for a query: from the main results, else one targeted search (deep mode only). */
async function findWikipedia(query: string, results: SearchResult[]): Promise<SearchResult | undefined> {
  const hit = results.find((r) => WIKI_ARTICLE.test(r.url));
  if (hit) return hit;
  try {
    return (await search(`${query} Wikipedia`)).find((r) => WIKI_ARTICLE.test(r.url));
  } catch {
    return undefined;
  }
}

async function research(query: string, deep: boolean): Promise<Research> {
  let results: SearchResult[] = [];
  try {
    results = await search(query);
  } catch {
    return { notes: "", sources: [] };
  }
  const sources: Source[] = results.slice(0, 5).map((r) => ({ title: oneLine(r.title), url: r.url }));
  const parts = results.slice(0, 5).map((r, i) => `[${i + 1}] ${oneLine(r.title)} (${r.url})\n${oneLine(r.snippet).slice(0, SNIPPET_CHARS)}`);

  const wiki = deep ? await findWikipedia(query, results) : undefined;
  if (wiki) {
    try {
      parts.push(`WIKIPEDIA ARTICLE — ${oneLine(wiki.title)}:\n${await wikipedia(wiki.url)}`);
      if (!sources.some((s) => s.url === wiki.url)) sources.push({ title: oneLine(wiki.title), url: wiki.url });
    } catch {
      // Snippets alone still ground the page.
    }
  }
  return { notes: parts.join("\n\n"), sources };
}

export async function POST(request: Request) {
  let body: { topic?: unknown; context?: unknown; mode?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 200) : "";
  if (!topic) return Response.json({ error: "Invalid topic." }, { status: 400 });
  // Short fork topics ("false lights") are ambiguous on their own; the door title pins down the meaning.
  const context = typeof body.context === "string" ? body.context.trim().slice(0, 200) : "";
  const query = (context ? `${topic}: ${context}` : topic).toLowerCase();
  return Response.json(await research(query, body.mode === "deep"));
}
