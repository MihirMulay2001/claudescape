import { cap } from "./content";
import type { BoardNode } from "./share";
import { SPARK_RAYS } from "./Spark";

export type ImageFormat = "post" | "story" | "wide";

export const FORMATS: Record<ImageFormat, { w: number; h: number; label: string; hint: string }> = {
  post: { w: 1080, h: 1350, label: "Post", hint: "Instagram feed · 4:5" },
  story: { w: 1080, h: 1920, label: "Story", hint: "Stories & reels · 9:16" },
  wide: { w: 1600, h: 900, label: "Wide", hint: "X, LinkedIn, Threads · 16:9" },
};

const C = {
  bg: "#262624",
  ink: "#f5f4ee",
  muted: "#a6a39a",
  faint: "#6f6d66",
  line: "rgba(245,244,238,0.14)",
  accent: "#d97757",
};

interface Fonts {
  serif: string;
  sans: string;
  mono: string;
}

function readFonts(): Fonts {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback;
  return { serif: v("--font-instrument", "Georgia, serif"), sans: v("--font-geist", "system-ui, sans-serif"), mono: v("--font-jetbrains", "monospace") };
}

function spacing(ctx: CanvasRenderingContext2D, px: number) {
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${px}px`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean), lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width <= maxW || !line) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && ctx.measureText(`${last}…`).width > maxW) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last.trimEnd()}…`;
  return kept;
}

function drawSpark(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size / 100, size / 100);
  ctx.fillStyle = color;
  for (const ray of SPARK_RAYS) {
    ctx.save();
    ctx.rotate((ray.angle * Math.PI) / 180);
    ctx.fill(new Path2D(ray.d));
    ctx.restore();
  }
  ctx.restore();
}

type Row = { kind: "node"; node: BoardNode; index: number } | { kind: "gap"; count: number };

function rowMeta(n: BoardNode, i: number) {
  if (i === 0) return "Start";
  return `L${String(i).padStart(2, "0")} · ${n.via === "sideways" ? "→ Sideways" : "↓ Deeper"}`;
}

export async function renderShareImage(nodes: BoardNode[], format: ImageFormat): Promise<Blob> {
  const { w, h } = FORMATS[format];
  const f = readFonts();
  await Promise.all([
    document.fonts.load(`80px ${f.serif}`),
    document.fonts.load(`italic 80px ${f.serif}`),
    document.fonts.load(`24px ${f.mono}`),
    document.fonts.load(`24px ${f.sans}`),
  ]).catch(() => {});

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");

  const wide = format === "wide", pad = wide ? 72 : 80, levels = Math.max(0, nodes.length - 1);

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w / 2, h * 1.08, 0, w / 2, h * 1.08, Math.max(w, h) * 0.75);
  glow.addColorStop(0, "rgba(217,119,87,0.38)");
  glow.addColorStop(1, "rgba(217,119,87,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  const ringX = w - pad * 1.2, ringY = pad * 1.4;
  ctx.lineWidth = 1.5;
  for (let r = 60; r < Math.max(w, h) * 0.6; r += 56) {
    ctx.strokeStyle = `rgba(245,244,238,${Math.max(0, 0.08 - r / 12000)})`;
    ctx.beginPath();
    ctx.arc(ringX, ringY, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawSpark(ctx, ringX, ringY, 70, C.accent);

  // Left column (or full width): brand, headline, footer.
  const colW = wide ? 620 : w - pad * 2;
  ctx.textBaseline = "alphabetic";
  drawSpark(ctx, pad + 20, pad + 20, 40, C.accent);
  ctx.fillStyle = C.ink;
  ctx.font = `44px ${f.serif}`;
  spacing(ctx, 0);
  ctx.fillText("claudescape", pad + 52, pad + 35);

  let y = pad + (wide ? 150 : 170);
  ctx.fillStyle = C.accent;
  ctx.font = `500 22px ${f.mono}`;
  spacing(ctx, 4);
  ctx.fillText(levels ? `A RABBIT HOLE · ${levels} LEVEL${levels > 1 ? "S" : ""} DEEP` : "A RABBIT HOLE", pad, y);

  const headSize = wide ? 80 : format === "story" ? 104 : 92;
  ctx.font = `${headSize}px ${f.serif}`;
  spacing(ctx, -1);
  const headline = levels ? `I fell ${levels} level${levels > 1 ? "s" : ""} down a rabbit hole.` : "I fell into a rabbit hole.";
  y += headSize * 0.25;
  for (const line of wrap(ctx, headline, colW, 3)) {
    y += headSize * 0.98;
    ctx.fillStyle = C.ink;
    ctx.fillText(line, pad, y);
  }

  const footerY = h - pad;
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, footerY - 52);
  ctx.lineTo(wide ? pad + colW : w - pad, footerY - 52);
  ctx.stroke();
  ctx.font = `500 20px ${f.mono}`;
  spacing(ctx, 3);
  ctx.fillStyle = C.muted;
  ctx.fillText("START YOUR OWN RABBIT HOLE", pad, footerY);
  ctx.fillStyle = C.accent;
  const host = location.host.toUpperCase();
  const hostW = ctx.measureText(host).width;
  ctx.fillText(host, (wide ? pad + colW : w - pad) - hostW, footerY);

  // Timeline column.
  const tlX = wide ? pad + colW + 90 : pad, tlW = wide ? w - tlX - pad : w - pad * 2;
  const tlTop = wide ? pad + 110 : y + (format === "story" ? 110 : 80), tlBottom = footerY - (wide ? 52 : 110);
  const titleSize = wide ? 36 : format === "story" ? 46 : 40, textX = tlX + 52, textW = tlW - 52;

  const titleLines = wide ? 1 : 2, subGap = wide ? 30 : 36, rowPad = wide ? 16 : 28;
  const measure = (row: Row) => {
    if (row.kind === "gap") return 56;
    ctx.font = `${titleSize}px ${f.serif}`;
    spacing(ctx, 0);
    return 34 + wrap(ctx, row.node.title, textW, titleLines).length * titleSize * 1.08 + subGap + rowPad;
  };
  let rows: Row[] = nodes.map((node, index) => ({ kind: "node", node, index }));
  let hidden = 0;
  while (rows.reduce((s, r) => s + measure(r), 0) > tlBottom - tlTop && nodes.length - hidden > 2) {
    hidden++;
    const keepHead = 1, keepTail = nodes.length - hidden - keepHead;
    rows = [
      ...nodes.slice(0, keepHead).map((node, index): Row => ({ kind: "node", node, index })),
      { kind: "gap", count: hidden },
      ...nodes.slice(nodes.length - keepTail).map((node, k): Row => ({ kind: "node", node, index: nodes.length - keepTail + k })),
    ];
  }

  const spare = tlBottom - tlTop - rows.reduce((s, r) => s + measure(r), 0);
  const rowGap = rows.length > 1 ? Math.max(0, Math.min(spare / (rows.length - 1), 96)) : 0;
  const dotX = tlX + 14;
  let ty = tlTop;
  const centers: number[] = [];
  const draws: (() => void)[] = [];
  rows.forEach((row) => {
    const rh = measure(row), top = ty;
    ty += rh + rowGap;
    if (row.kind === "gap") {
      centers.push(top + 24);
      draws.push(() => {
        ctx.fillStyle = C.faint;
        ctx.font = `500 20px ${f.mono}`;
        spacing(ctx, 3);
        ctx.fillText(`· · ·  ${row.count} MORE PAGE${row.count > 1 ? "S" : ""}`, textX, top + 31);
      });
      return;
    }
    const isLast = row.index === nodes.length - 1;
    centers.push(top + 14);
    draws.push(() => {
      ctx.beginPath();
      ctx.arc(dotX, top + 14, isLast ? 12 : 9, 0, Math.PI * 2);
      if (isLast || row.index === 0) {
        ctx.fillStyle = C.accent;
        ctx.fill();
      } else {
        ctx.fillStyle = C.bg;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = C.accent;
        ctx.stroke();
      }
      if (isLast) {
        ctx.beginPath();
        ctx.arc(dotX, top + 14, 22, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(217,119,87,0.35)";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.fillStyle = C.accent;
      ctx.font = `500 20px ${f.mono}`;
      spacing(ctx, 3);
      ctx.fillText(rowMeta(row.node, row.index).toUpperCase(), textX, top + 21);
      ctx.font = `${isLast ? "italic " : ""}${titleSize}px ${f.serif}`;
      spacing(ctx, 0);
      ctx.fillStyle = isLast ? C.accent : C.ink;
      let ly = top + 34;
      for (const line of wrap(ctx, row.node.title, textW, titleLines)) {
        ly += titleSize * 1.08;
        ctx.fillText(line, textX, ly);
      }
      ctx.fillStyle = C.muted;
      ctx.font = `${wide ? 22 : 24}px ${f.sans}`;
      ctx.fillText(wrap(ctx, cap(row.node.topic), textW, 1)[0] ?? "", textX, ly + subGap);
    });
  });

  ctx.strokeStyle = "rgba(217,119,87,0.55)";
  ctx.lineWidth = 3;
  for (let i = 1; i < centers.length; i++) {
    const gap = rows[i].kind === "gap" || rows[i - 1].kind === "gap";
    ctx.setLineDash(gap ? [4, 10] : []);
    ctx.beginPath();
    ctx.moveTo(dotX, centers[i - 1] + 14);
    ctx.lineTo(dotX, centers[i] - 14);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  draws.forEach((d) => d());

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create the image."))), "image/png"));
}
