import type { Kind } from "./content";

export interface BoardFork {
  topic: string;
  title: string;
  teaser?: string;
}

export interface BoardNode {
  topic: string;
  title: string;
  kicker?: string;
  dek?: string;
  figure?: { value: string; label: string };
  excerpt?: string;
  layout?: string;
  via: Kind | null;
  forks?: Partial<Record<Kind, BoardFork>>;
  pending?: boolean;
}

export const HASH_PREFIX = "#j=";
const MAX_NODES = 40;

type Wire = [
  topic: string,
  title: string,
  kicker: string,
  dek: string,
  figure: [string, string] | 0,
  excerpt: string,
  layout: string,
  via: 0 | 1 | 2,
  deeper: [string, string, string] | 0,
  sideways: [string, string, string] | 0,
];

const VIA: (Kind | null)[] = [null, "deeper", "sideways"];
const fork = (f?: BoardFork): [string, string, string] | 0 => (f ? [f.topic, f.title, f.teaser ?? ""] : 0);

function toBase64Url(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodeJourney(nodes: BoardNode[]): Promise<string> {
  const wire: Wire[] = nodes.slice(0, MAX_NODES).map((n) => [
    n.topic,
    n.title,
    n.kicker ?? "",
    n.dek ?? "",
    n.figure ? [n.figure.value, n.figure.label] : 0,
    (n.excerpt ?? "").slice(0, 320),
    n.layout ?? "",
    n.via === "deeper" ? 1 : n.via === "sideways" ? 2 : 0,
    fork(n.forks?.deeper),
    fork(n.forks?.sideways),
  ]);
  const json = new TextEncoder().encode(JSON.stringify(wire));
  return toBase64Url(await pipe(json, new CompressionStream("deflate-raw")));
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const decodeFork = (v: unknown): BoardFork | undefined =>
  Array.isArray(v) && typeof v[0] === "string" && typeof v[1] === "string"
    ? { topic: str(v[0], 120), title: str(v[1], 160), teaser: str(v[2], 240) || undefined }
    : undefined;

export async function decodeJourney(code: string): Promise<BoardNode[]> {
  const bytes = await pipe(fromBase64Url(code), new DecompressionStream("deflate-raw"));
  const wire: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!Array.isArray(wire)) throw new Error("Not a journey.");
  const nodes = wire.slice(0, MAX_NODES).flatMap((w): BoardNode[] => {
    if (!Array.isArray(w) || typeof w[0] !== "string" || typeof w[1] !== "string") return [];
    const fig = Array.isArray(w[4]) ? { value: str(w[4][0], 12), label: str(w[4][1], 140) } : undefined;
    return [{
      topic: str(w[0], 120),
      title: str(w[1], 160),
      kicker: str(w[2], 60) || undefined,
      dek: str(w[3], 280) || undefined,
      figure: fig?.value ? fig : undefined,
      excerpt: str(w[5], 320) || undefined,
      layout: str(w[6], 20) || undefined,
      via: VIA[Number(w[7])] ?? null,
      forks: { deeper: decodeFork(w[8]), sideways: decodeFork(w[9]) },
    }];
  });
  if (!nodes.length) throw new Error("Empty journey.");
  return nodes;
}

export function shareText(nodes: BoardNode[]) {
  const first = nodes[0], last = nodes[nodes.length - 1], levels = nodes.length - 1;
  if (!first) return "";
  if (!levels) return `I just fell into a rabbit hole about ${first.topic} on claudescape.`;
  return `I fell ${levels} level${levels > 1 ? "s" : ""} down a rabbit hole on claudescape: started at ${first.topic}, ended up at ${last.topic}.`;
}

export type Platform = "x" | "threads" | "linkedin" | "whatsapp" | "reddit" | "facebook";

export function intentUrl(platform: Platform, text: string, url: string) {
  const t = encodeURIComponent(text), u = encodeURIComponent(url);
  switch (platform) {
    case "x":
      return `https://x.com/intent/post?text=${t}&url=${u}`;
    case "threads":
      return `https://www.threads.net/intent/post?text=${encodeURIComponent(`${text} ${url}`)}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
    case "reddit":
      return `https://www.reddit.com/submit?url=${u}&title=${t}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    default: {
      const never: never = platform;
      return never;
    }
  }
}
