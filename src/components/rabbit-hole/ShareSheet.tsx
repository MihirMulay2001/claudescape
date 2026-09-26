"use client";

import React, { useEffect, useRef, useState } from "react";
import { encodeJourney, HASH_PREFIX, intentUrl, shareText, type BoardNode, type Platform } from "./share";
import { FORMATS, renderShareImage, type ImageFormat } from "./shareImage";
import styles from "./share.module.css";

interface Props {
  nodes: BoardNode[];
  onClose: () => void;
}

const ICON = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const PLATFORMS: { id: Platform; label: string; icon: React.ReactNode }[] = [
  { id: "x", label: "X", icon: <svg {...ICON} stroke="none" fill="currentColor"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.2-8.2L2 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.5l11.2 14.5Z" /></svg> },
  { id: "threads", label: "Threads", icon: <svg {...ICON}><path d="M16.3 11.2c-.4-2.6-2-3.9-4.4-3.9-2.6 0-4.3 1.8-4.3 4.7s1.7 4.7 4.2 4.7c2.3 0 3.8-1.4 3.8-3.5 0-2.4-2.2-3.2-4.5-2.8M16.3 11.2c.9 5.3 4.2 4.6 4.2.3C20.5 6.4 17 3 12 3S3.5 6.7 3.5 12 7 21 12 21c2.3 0 4.1-.6 5.5-1.8" /></svg> },
  { id: "whatsapp", label: "WhatsApp", icon: <svg {...ICON}><path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3.2 3.2l-4.7 1.3Z" /><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2L9 9.5Z" /></svg> },
  { id: "linkedin", label: "LinkedIn", icon: <svg {...ICON}><rect x={3} y={3} width={18} height={18} rx={4} /><path d="M8 10.5V17M8 7.5v.01M12 17v-3.8a2.2 2.2 0 0 1 4.4 0V17M12 10.5V17" /></svg> },
  { id: "reddit", label: "Reddit", icon: <svg {...ICON}><ellipse cx={12} cy={14} rx={8} ry={5.5} /><path d="M12 8.5 13.2 3.8l3.8.9M9 13.5v.01M15 13.5v.01M9.5 16.3c1.5.9 3.5.9 5 0" /><circle cx={18.5} cy={5} r={1.5} /></svg> },
  { id: "facebook", label: "Facebook", icon: <svg {...ICON} stroke="none" fill="currentColor"><path d="M13.5 21v-7.5H16l.4-3H13.5V8.7c0-.9.3-1.5 1.5-1.5h1.6V4.5c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.2H8v3h2.5V21h3Z" /></svg> },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "journey";

export default function ShareSheet({ nodes, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const urls = useRef<string[]>([]);
  const toastT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [format, setFormat] = useState<ImageFormat>("post");
  const [img, setImg] = useState<{ url: string; blob: Blob; format: ImageFormat } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const text = shareText(nodes);
  const fileName = `claudescape-${slug(nodes[nodes.length - 1]?.topic ?? "")}-${format}.png`;
  const loading = img?.format !== format;

  useEffect(() => {
    let live = true;
    renderShareImage(nodes, format)
      .then((blob) => {
        if (!live) return;
        const url = URL.createObjectURL(blob);
        urls.current.push(url);
        setImg({ url, blob, format });
        setError(null);
      })
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [nodes, format]);

  useEffect(() => {
    let live = true;
    encodeJourney(nodes)
      .then((code) => live && setLink(`${location.origin}${location.pathname}${HASH_PREFIX}${code}`))
      .catch(() => live && setLink(location.origin));
    return () => {
      live = false;
    };
  }, [nodes]);

  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    const owned = urls.current;
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(toastT.current);
      owned.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const say = (msg: string) => {
    clearTimeout(toastT.current);
    setToast(msg);
    toastT.current = setTimeout(() => setToast(null), 3200);
  };
  const file = () => (img ? new File([img.blob], fileName, { type: "image/png" }) : null);
  const canShareFiles = (f: File | null) => !!f && typeof navigator.canShare === "function" && navigator.canShare({ files: [f] });
  const copy = async (value: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(value);
      say(msg);
    } catch {
      say("Couldn’t reach the clipboard. Long-press to copy instead.");
    }
  };
  const download = () => {
    if (!img) return;
    const a = document.createElement("a");
    a.href = img.url;
    a.download = fileName;
    a.click();
  };

  const nativeShare = async () => {
    const f = file();
    try {
      if (canShareFiles(f)) await navigator.share({ files: [f as File], title: "claudescape", text: `${text} ${link ?? ""}`.trim() });
      else if (navigator.share) await navigator.share({ title: "claudescape", text, url: link ?? undefined });
      else await copy(`${text} ${link ?? ""}`.trim(), "Share text and link copied.");
    } catch (e) {
      if ((e as DOMException)?.name !== "AbortError") say("Sharing was blocked. Try downloading the image instead.");
    }
  };

  const instagram = async () => {
    const f = file();
    if (canShareFiles(f)) {
      await navigator.clipboard?.writeText(`${text} ${link ?? ""}`.trim()).catch(() => {});
      try {
        await navigator.share({ files: [f as File] });
        return;
      } catch (e) {
        if ((e as DOMException)?.name === "AbortError") return;
      }
    }
    download();
    await navigator.clipboard?.writeText(`${text} ${link ?? ""}`.trim()).catch(() => {});
    say("Image saved and caption copied. Post it from the Instagram app, or pick Story for your story.");
  };

  const copyImage = async () => {
    if (!img) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": img.blob })]);
      say("Image copied. Paste it straight into a post.");
    } catch {
      download();
      say("Your browser can’t copy images, so it was downloaded instead.");
    }
  };

  const openIntent = (p: Platform) => {
    if (!link) return;
    window.open(intentUrl(p, text, link), "_blank", "noopener,noreferrer,width=680,height=760");
  };

  return (
    <div className={styles.scrim} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} className={styles.sheet} role="dialog" aria-modal="true" aria-label="Share your journey" tabIndex={-1}>
        <div className={styles.head}>
          <div>
            <div className={styles.eyebrow}>Share your rabbit hole</div>
            <h2 className={styles.title}>Show them how far you fell.</h2>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Close share sheet">
            <svg {...ICON}><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.previewCol}>
            <div className={styles.formats} role="radiogroup" aria-label="Image format">
              {(Object.keys(FORMATS) as ImageFormat[]).map((f) => (
                <button key={f} role="radio" aria-checked={format === f} className={`${styles.format} ${format === f ? styles.formatOn : ""}`} onClick={() => setFormat(f)}>
                  <span>{FORMATS[f].label}</span>
                  <small>{FORMATS[f].hint}</small>
                </button>
              ))}
            </div>
            <div className={styles.preview}>
              {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL from a canvas, nothing for next/image to optimize */}
              {img && <img src={img.url} alt="Preview of your share image" className={loading ? styles.stale : ""} />}
              {loading && !error && <span className={styles.loader} />}
              {error && <p className={styles.error}>{error}</p>}
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.primary} onClick={nativeShare} disabled={!img}>
              <svg {...ICON}><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
              Share image…
            </button>

            <button className={styles.insta} onClick={instagram} disabled={!img}>
              <svg {...ICON}><rect x={3} y={3} width={18} height={18} rx={5} /><circle cx={12} cy={12} r={4} /><path d="M17.5 6.5v.01" /></svg>
              <span>
                Instagram
                <small>{format === "story" ? "Story-ready 9:16 image" : "Feed-ready image + caption"}</small>
              </span>
            </button>

            <div className={styles.grid}>
              {PLATFORMS.map((p) => (
                <button key={p.id} className={styles.platform} onClick={() => openIntent(p.id)} disabled={!link} aria-label={`Share on ${p.label}`}>
                  {p.icon}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>

            <div className={styles.linkRow}>
              <input readOnly value={link ?? "Packing your journey…"} aria-label="Share link" onFocus={(e) => e.currentTarget.select()} />
              <button onClick={() => link && copy(link, "Link copied. Anyone who opens it sees your board.")} disabled={!link}>Copy link</button>
            </div>

            <div className={styles.row}>
              <button className={styles.secondary} onClick={download} disabled={!img}>
                <svg {...ICON}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
                Download
              </button>
              <button className={styles.secondary} onClick={copyImage} disabled={!img}>
                <svg {...ICON}><rect x={8} y={8} width={12} height={12} rx={2} /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>
                Copy image
              </button>
            </div>

            <p className={styles.note}>X, Threads and LinkedIn share the link. Copy the image first and paste it into the post to include the picture.</p>
          </div>
        </div>

        <div className={`${styles.toast} ${toast ? styles.toastOn : ""}`} role="status" aria-live="polite">{toast}</div>
      </div>
    </div>
  );
}
