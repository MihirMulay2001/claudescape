import type { CSSProperties } from "react";

export const SERIF = "var(--font-instrument), serif";
export const MONO = "var(--font-jetbrains), monospace";
export const NEWS = "var(--font-newsreader), serif";

const cache = new Map<string, CSSProperties>();

function camel(prop: string) {
  if (prop.startsWith("--")) return prop;
  if (prop.startsWith("-webkit-")) prop = "Webkit-" + prop.slice(8);
  return prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Tagged template that turns a CSS declaration string into a React style object,
 * so the design's inline styles can be carried over verbatim.
 */
export function css(strings: TemplateStringsArray, ...vals: unknown[]): CSSProperties {
  const src = String.raw({ raw: strings }, ...vals);
  const hit = cache.get(src);
  if (hit) return hit;

  const out: Record<string, string> = {};
  let depth = 0;
  let start = 0;
  const flush = (end: number) => {
    const decl = src.slice(start, end);
    const i = decl.indexOf(":");
    if (i > 0) out[camel(decl.slice(0, i).trim())] = decl.slice(i + 1).trim();
  };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === ";" && depth === 0) {
      flush(i);
      start = i + 1;
    }
  }
  flush(src.length);

  if (cache.size > 4000) cache.clear();
  cache.set(src, out as CSSProperties);
  return out as CSSProperties;
}
